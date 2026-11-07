/* ================= « Crée avec {g} » : Nouveau projet + ATELIER D'IMAGES =================
   borne 2.0.170, 6 nov. 2026 (équipe Études ; « Oui, lance-le » de l'admin transmis par le chef). Étude, maquettes et règles :
   ~/jdv-tools/etudes/espaces-sur-mesure/SPEC.md. Serveur : source/atelier-images.sql (SQL v160 : at_esp_*), fonction Edge atelier-image v18.
   Chargé par build2.py JUSTE APRÈS shell2.js : on garde shell2.js intact et on SURCHARGE trois fonctions de l'Atelier :
     atlNouveau        → l'écran « Qu'est-ce qu'on crée aujourd'hui ? » (Un jeu = l'ancien parcours, Des images = ce fichier, le reste « bientôt ») ;
     atlOuvrir(id)     → un projet de type « images » s'ouvre ici, un jeu comme avant ;
     atlRenderProjets  → les tuiles des projets Images (vignette, « 🎨 Images · N images »), en-tête « Crée avec {g} ».
   Structure (admin) : arborescence à gauche comme un CRM | l'OUTIL au centre | la discussion de {g} toujours À PART à droite ;
   au téléphone : tiroir ☰ et {g} en bouton flottant qui ouvre la discussion en plein écran. Ce que {g} fait s'applique dans l'outil
   (« ✅ Fait dans ton atelier : … » dans sa discussion). Prix par utilisation (réglages du serveur) : nouvelle image 20 💎 (confirmée la
   1re fois), le reste gratuit. Jamais « IA », « coût », « € » ni le nom du service dans ce que voit le joueur. */
(() => {
  'use strict';
  if (typeof atlOuvrir !== 'function' || typeof atlNouveau !== 'function' || typeof atlRenderProjets !== 'function') return;
  const AIM = { open: false, root: null, fiche: null, d: null, cur: null, vue: 'atelier', mode: 'comparer', pos: 0.5, msgs: [], loc: [], prop: null,
    types: {}, typesAt: 0, off: false, prix: { image: 20 }, solde: null, poll: 0, tick: 0, busy: false, nv: null, vuAt: 0, ouverts: {} };
  try { if (navigator.webdriver) window.JDW_ESSAI_AIM = AIM; } catch (e) {}
  const _ouvrir = atlOuvrir, _nouveau = atlNouveau, _renderProjets = atlRenderProjets;
  const E = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const B = (cls, txt, fn) => { const b = E('button', cls, txt); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };
  const D = '💎';
  const nom = () => (typeof profile !== 'undefined' && profile && profile.name) || '';
  const joli = n => String(n || '').charAt(0) + String(n || '').slice(1).toLowerCase();
  const PK = () => { try { return gNM() || ''; } catch (e) { return ''; } };   // le nom de la mascotte (serveur), comme « Crée avec … » de la tuile
  const AV = () => ROOT + 'accueil/guide-portrait.webp';
  const POSE = k => ROOT + 'accueil/guide-' + ({ idee: 'p-idee', dessine: 'p-dessine' }[k] || k) + '.webp';   // accueil/guide-joie, guide-coucou, guide-p-idee, guide-p-dessine
  const base = () => CFG.url.replace(/\/+$/, '');
  function urlImg(p, w) {
    p = String(p || '');
    let u = '';
    if (/^i\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(p)) u = base() + '/storage/v1/object/public/atelier-ia/' + p;
    else if (/^e\/[0-9a-f-]{36}\.jpg$/.test(p)) u = base() + '/storage/v1/object/public/atelier/' + p;
    if (u && w) u = u.replace('/object/public/', '/render/image/public/') + '?width=' + w + '&quality=78';
    return u;
  }
  const typeDe = id => (AIM.types[id] && AIM.types[id].type) || 'jeu';
  // l'admin (6 nov., 23 h) : un atelier se monte COMME UN JEU. Avant sa V1 (aménagement payé puis livré par l'équipe) un projet Images n'a
  // PAS d'outils : il passe par le montage de l'Interface (discussion, questions, photo d'exemple, offre « Aménager mon atelier », étapes).
  // V1 livrée = version ≥ 1 ou état alpha / publié (posés par l'équipe à la livraison), ou déjà des images (ateliers d'avant ce correctif)
  function livre(id) {
    if (typeDe(id) !== 'images') return false;
    if ((AIM.types[id].images | 0) > 0) return true;
    const x = AIM.types[id];   // SQL v166 : la version et l'état viennent avec le type (l'admin n'a pas le projet d'un joueur dans sa liste)
    if ((x.version | 0) >= 1 || ['alpha', 'publie_salle', 'publie_monde'].includes(String(x.etat || ''))) return true;
    let pj = null; try { pj = atlProjets().find(x => x && x.id === id); } catch (e) {}
    return !!pj && ((pj.version | 0) >= 1 || ['alpha', 'publie_salle', 'publie_monde'].includes(String(pj.etat || '')));
  }
  const atelierOuvert = id => typeDe(id) === 'images' && livre(id);
  // VUE ADMIN (7 nov.) : l'atelier d'un autre joueur (type « autre », SQL v166) se LIT seulement : rien n'est écrit ni dépensé à sa place ;
  // seule la discussion reste ouverte : l'admin y répond comme {g} (at_admin_agir 'discussion', comme le mode admin de l'Interface)
  const adm = () => !!(AIM.fiche && AIM.types[AIM.fiche] && AIM.types[AIM.fiche].autre && AIM.vue !== 'nouveau');
  const joueurAdm = () => { const j = (AIM.types[AIM.fiche] || {}).joueur || ''; try { return dispName(j) || j; } catch (e) { return j; } };
  const lectureSeule = () => { if (!adm()) return false; toast('🛡️ Vue admin : tu regardes l’atelier de ' + joueurAdm() + ' sans rien y changer'); return true; };
  // l'admin (7 nov.) : LE MODÈLE DES ATELIERS. Un atelier livré a la page d'un projet, comme un jeu : le menu du projet à gauche, la zone de
  // travail au centre, la discussion de {g} à part. Ce qui change d'un type à l'autre vient d'ICI (menus, libellés, invite, résultat, fond) :
  // un nouveau type d'atelier = une entrée de plus, jamais un cas spécial pour un joueur
  const ATELIERS = {
    images: {
      nom: 'Atelier photo',
      menu: [['atelier', '🖼️', 'Mon atelier'], ['guide', '💬', ''], ['resultats', '✨', 'Photos retouchées'], ['route', '🗺️', 'Feuille de route'], ['versions_at', '🗂️', 'Versions'], ['params', '⚙️', 'Paramètres']],
      depot: 'Dépose ta photo ici', ajouter: '＋ Ajouter une photo', invite: 'Dis-moi ce que tu veux faire avec cette photo',
      resultat: 'Photos retouchées', videResultat: 'Tes photos retouchées arriveront ici : chaque retouche faite dans ton atelier, prête à télécharger.',
      fond: 'studio'
    }
  };
  const atelierDe = id => ATELIERS[typeDe(id)] || ATELIERS.images;
  const versionAt = id => { try { const pj = atlProjets().find(x => x && x.id === id); return (pj && pj.version | 0) || 0; } catch (e) { return 0; } };
  const toast = t => { try { atlToast(t); } catch (e) { try { toastCheer(t); } catch (e2) {} } };
  const dire = m => { m.pk = m.pk === undefined ? 1 : m.pk; m.at = new Date().toISOString(); AIM.loc.push(m); };   // un mot de {g} (ou du joueur) seulement sur cet appareil
  const pourquoi = e => String((e && e.message) || e || '');

  // ---------- types des projets (pour l'arbre, les tuiles et l'aiguillage) ----------
  async function chargerTypes(force) {
    if (!force && Date.now() - AIM.typesAt < 15000) return;
    try {
      const r = await rpc('at_esp_types', { p_name: nom() }, { quiet: true, quiet404: true });
      AIM.types = {}; for (const p of (r && r.projets) || []) AIM.types[p.id] = p;
      for (const p of (r && r.autres) || []) if (p && p.id && !AIM.types[p.id]) AIM.types[p.id] = Object.assign({}, p, { autre: true });   // admins (SQL v166) : les ateliers des joueurs
      if (r && r.prix) AIM.prix = r.prix; if (r && typeof r.solde === 'number') AIM.solde = r.solde;
      AIM.typesAt = Date.now(); AIM.off = false;
    } catch (e) { if (/404|could not find|does not exist/i.test(pourquoi(e))) AIM.off = true; AIM.typesAt = Date.now(); }
  }

  // ---------- surcharges de l'Atelier ----------
  atlOuvrir = function (id) {   // eslint-disable-line no-global-assign
    // l'admin (7 nov.) : l'atelier LIVRÉ d'un joueur ouvert depuis « PROJETS DES JOUEURS » = le même atelier que le joueur (vue admin)
    if (!AIM.types[id] && ATL.adminVoir && ATL.adminVoir.id === id) { chargerTypes(true).then(() => (atelierOuvert(id) ? ouvrir(id) : _ouvrir(id))); return; }
    if (AIM.types[id]) { if (atelierOuvert(id)) return ouvrir(id); if (AIM.open) fermer(); return _ouvrir(id); }
    if (AIM.open && !(AIM.types[id])) fermer();
    if (Date.now() - AIM.typesAt > 60000) { chargerTypes(true).then(() => (atelierOuvert(id) ? ouvrir(id) : _ouvrir(id))); return; }
    return _ouvrir(id);
  };
  atlNouveau = function () {   // eslint-disable-line no-global-assign
    const cr = atlCred(), max = (cr && cr.projets_max | 0) || 5;
    if (atlProjets().length >= max) { toast(max + ' projets au plus'); return; }
    nouveau();
  };
  // le chef (6 nov., 21 h) : « ＋ Nouveau projet » de l'arbre → un NOUVEAU message de {g} arrive dans la discussion (on y raconte son idée),
  // le curseur dans la case au PC ; déjà sur l'écran sous les nuages : le message s'ajoute à la discussion en cours
  function nouveauDepuisArbre() {
    const cr = atlCred(), max = (cr && cr.projets_max | 0) || 5;
    if (atlProjets().length >= max) { toast(max + ' projets au plus'); return; }
    if (AIM.open && AIM.vue === 'nouveau') {
      AIM.prop = null; render(); curseur();
      const der = AIM.loc[AIM.loc.length - 1]; if (der && der.pk && der.t === DIT_NOUVEAU) return;   // déjà dit, rien de neuf depuis : pas de doublon
      setTimeout(() => { if (!AIM.open || AIM.vue !== 'nouveau') return; dire({ pk: 1, img: 'joie', t: DIT_NOUVEAU }); render(); curseur(); }, 350);
      return;
    }
    nouveau(DIT_NOUVEAU);
  }
  atlRenderProjets = function () {   // eslint-disable-line no-global-assign
    _renderProjets.apply(this, arguments);
    try { decorer(); } catch (e) {}
    setTimeout(() => { try { if (lireCartes() && (AIM.open || AIM.cadre)) renderArbre(); } catch (e) {} }, 0);
    if (Date.now() - AIM.typesAt > 15000) chargerTypes().then(() => { try { decorer(); } catch (e) {} });
  };
  // l'admin (6 nov., 2.1) : TOUT le monde arrive sur l'écran « Nouveau projet » sous les nuages dès qu'il ouvre « Crée avec {g} » ;
  // l'ancienne grille de projets reste dessous (ses cartes donnent statuts et bulles à l'arbre), jamais montrée en premier
  if (typeof atlOpen === 'function') { const _open = atlOpen; atlOpen = function () { if (!ATL.open) { ATL.cur = null; ATL.nouveau = false; } const r = _open.apply(this, arguments); try { if (ATL.open && !ATL.cur && !AIM.open) nouveau(); } catch (e) {} return r; }; }   // eslint-disable-line no-global-assign
  if (typeof atlListe === 'function') { const _liste = atlListe; atlListe = function () { const r = _liste.apply(this, arguments); try { if (ATL.open && !AIM.open && !AIM.calme) nouveau(); } catch (e) {} return r; }; }   // eslint-disable-line no-global-assign
  if (typeof jdwBack === 'function') { const _back = jdwBack; jdwBack = function () { if (AIM.open && retour()) return true; if (AIM.cadre && AIM.root && AIM.root.classList.contains('tiroir')) { AIM.root.classList.remove('tiroir'); return true; } if (AIM.cadre && ATL.root && ![...ATL.root.querySelectorAll('.atl-mod, .atl-zoom, .atl-lv')].some(m => !m.hidden)) { fermerVersProjets(); return true; } return _back.apply(this, arguments); }; }
  // le chef (6 nov., nuit, frontière avec l'Interface) : un jeu PAS ENCORE jouable (atlAvantV1) se monte dans le NOUVEAU design. On ne réécrit
  // RIEN du montage : la discussion, les offres, at_dire, le paiement et le micro restent ceux de l'Interface (#jdw-atelier) ; on l'HABILLE
  // (classe crea-mt : ciel de nuages, feuille blanche, sans barre d'étapes ni feuille de route) et #jdw-crea passe en « cadre » par-dessus
  // (en-tête « Crée avec … › Mes projets › titre » + l'arbre), rangé DANS #jdw-atelier pour que la manette voie tout. atlJouable → la main
  // revient à l'Interface (sa révélation des nuages joue)
  if (typeof atlLoad === 'function') { const _load = atlLoad; atlLoad = async function () { const cur0 = ATL.cur, libre = !ATL.busy; try { return await _load.apply(this, arguments); } finally { if (libre && cur0 && ATL.cur === cur0) { AIM.luPour = cur0; try { cadreMaj(); } catch (e) {} } } }; }   // eslint-disable-line no-global-assign
  if (typeof atlRender === 'function') { const _rendu = atlRender; atlRender = function () { const r = _rendu.apply(this, arguments); try { cadreMaj(); } catch (e) {} return r; }; }   // eslint-disable-line no-global-assign

  // les tuiles « Mes projets » de l'Atelier : un projet Images montre son image et « 🎨 Images · N images »
  function decorer() {
    const R = ATL.root; if (!R || ATL.cur) return;
    const ps = atlProjets(), tiles = R.querySelectorAll('.atl-pgrid .atl-pwrap > .atl-ptile');
    ps.forEach((pj, i) => {
      const t = tiles[i], x = AIM.types[pj.id]; if (!t || !x || x.type !== 'images') return;
      const v = t.querySelector('.atl-pv'); if (v) { v.textContent = ''; const u = urlImg(x.image, 300); if (u) { const im = E('img'); im.alt = ''; im.src = u; v.appendChild(im); } else v.textContent = '🎨'; }
      const s = t.querySelector('.atl-pver'); if (s) { s.className = 'atl-pver'; s.textContent = '🎨 Images · ' + (x.images | 0) + ' image' + ((x.images | 0) > 1 ? 's' : '') + ((x.en_cours | 0) ? ' · ⏳' : ''); }
      for (const q of t.querySelectorAll('.atl-pver2, .atl-pprepa')) q.remove();
    });
  }

  // ---------- la fenêtre ----------
  function construire() {
    if (AIM.root) return AIM.root;
    const R = E('section', 'crea'); R.id = 'jdw-crea'; R.hidden = true; R.setAttribute('role', 'dialog'); R.setAttribute('aria-label', 'Crée avec ' + PK());
    R.innerHTML = '<header class="crea-bar"><button class="crea-rond crea-menu" type="button" aria-label="Mes projets">☰</button>'
      + '<button class="crea-rond crea-retour" type="button" aria-label="Retour">‹</button>'
      + '<div class="crea-marque"><img alt="" src="' + AV() + '"><b></b></div><div class="crea-fil"></div>'
      + '<button class="crea-rond crea-monde" type="button"></button><button class="crea-cred" type="button" title="Tes crédits : en avoir plus"></button></header>'
      + '<div class="crea-ciel" aria-hidden="true"></div>'
      + '<div class="crea-corps"><nav class="crea-arbre crea-carte" aria-label="Mes projets"></nav><main class="crea-outil"></main>'
      + '<aside class="crea-masc crea-carte" aria-label="Discussion avec ' + PK() + '"></aside></div>'
      + '<button class="crea-flot" type="button" aria-label="Parler à ' + PK() + '"><span class="bb" hidden></span><span class="pk"><img alt="" src="' + AV() + '"></span></button>'
      + '<div class="crea-voile"></div><div class="crea-mod" hidden role="dialog" aria-modal="true"></div>'
      + '<input class="crea-file" type="file" accept="image/*,.heic,.heif" hidden>';
    document.body.appendChild(R); AIM.root = R;
    try { atlEspCiel(R.querySelector('.crea-ciel'), false); } catch (e) {}   // le MÊME ciel que la création d'un jeu (2.0.152 / 2.0.161)
    const q = s => R.querySelector(s);
    q('.crea-menu').addEventListener('click', () => { R.classList.toggle('tiroir'); if (R.classList.contains('tiroir')) setTimeout(() => { const b = R.querySelector('.crea-arbre button'); if (b) b.focus({ preventScroll: true }); }, 60); });
    q('.crea-voile').addEventListener('click', () => R.classList.remove('tiroir'));
    q('.crea-retour').addEventListener('click', fermerVersProjets);
    q('.crea-flot').addEventListener('click', () => { R.classList.add('pk-plein'); AIM.vuAt = Date.now(); renderFlot(); setTimeout(() => { const t = q('.crea-masc textarea'); if (t) t.focus({ preventScroll: true }); }, 60); });
    q('.crea-file').addEventListener('change', e => { const f = e.target.files && e.target.files[0], nv = e.target.dataset.nv; e.target.value = ''; delete e.target.dataset.nv; if (!f) return; if (nv && AIM.vue === 'nouveau') imageNouveau(f); else importer(f); });
    q('.crea-cred').addEventListener('click', () => { try { atlRecharger(); } catch (e) {} });
    q('.crea-monde').addEventListener('click', () => { const n = !R.classList.contains('nuit'); try { store.set('jdw.crea.monde', n ? 'nuit' : 'jour'); } catch (e) {} monde(); });
    monde();
    try { if (store.get('jdw.crea.pkreplie', false)) R.classList.add('pk-replie'); } catch (e) {}
    return R;
  }
  function monde() {   // nuages de nuit / nuages de jour (le choix reste sur l'appareil)
    const R = AIM.root; if (!R) return; let n = false; try { n = store.get('jdw.crea.monde', 'jour') === 'nuit'; } catch (e) {}
    R.classList.toggle('nuit', n); try { if (ATL.root) ATL.root.classList.toggle('crea-nuit', n); } catch (e) {} const b = R.querySelector('.crea-monde'); b.textContent = n ? '☀️' : '🌙';
    b.setAttribute('aria-label', n ? 'Monde clair' : 'Monde sombre'); b.title = n ? 'Monde clair' : 'Monde sombre';
  }
  function ficheMontage() {   // la fiche du projet ouvert dans l'Interface (ou sa ligne dans les listes) ; null = nouveau jeu
    if (!ATL.cur) return null;
    let f = null; try { f = atlFiche(); } catch (e) {}
    if (!f) f = atlProjets().find(x => x && x.id === ATL.cur) || ((ATL.tous && Array.isArray(ATL.tous.l)) ? ATL.tous.l.find(x => x && x.id === ATL.cur) : null);
    return f;
  }
  function enMontage() {
    if (AIM.open || !ATL.open || !ATL.root || ATL.root.hidden) return false;
    if (ATL.nouveau && !ATL.cur) return true;
    if (!ATL.cur || atelierOuvert(ATL.cur)) return false;
    const f = ficheMontage(); return !!f && atlAvantV1(f);   // les fonctions de l'Interface, jamais une copie de la règle
  }
  // l'admin (6 nov., 23 h) : un atelier (projet Images) en montage montre AU MILIEU, en direct, ce qui se prépare : l'offre « Aménager mon atelier »
  // avec « Choisir » (la carte de l'Interface : mêmes boutons, même paiement) puis, une fois choisie, l'avancement étape par étape
  // (at_demande_avancer, la bulle « en direct » de l'Interface). Avant la V1 de l'Interface, ces cartes n'étaient que dans « Mes demandes »
  function offresMt() {
    const A = ATL.root; if (!A) return;
    const C = A.querySelector('.atl-main > .atl-chat:not(.atl-disc)'); let box = A.querySelector('.crea-mtof');
    let f = null; try { f = atlFiche(); } catch (e) {}
    const img = !!(f && ATL.cur === f.id && typeDe(ATL.cur) === 'images' && A.classList.contains('crea-mt'));
    let ouv = [], cours = [];
    if (img) { try { const ds = atlDiscDems(f).filter(x => x && !['faite', 'impossible', 'regroupee', 'plus_tard'].includes(x.etat)); ouv = ds.filter(atlPropOuverte); cours = ds.filter(x => x.choix && !atlPropOuverte(x)); } catch (e) {} }
    if (!img || !C || (!ouv.length && !cours.length)) { if (box) box.remove(); return; }
    let sig = ''; try { sig = JSON.stringify([ATL.cur, ouv.map(atlDiscSig), cours.map(atlDiscSig)]); } catch (e) {}
    if (box && box.dataset.sig === sig && box.parentNode === C) return;
    if (!box) { box = E('div', 'crea-mtof'); box.setAttribute('aria-live', 'polite'); }
    box.textContent = ''; box.dataset.sig = sig;
    for (const x of cours) {   // choisie : je prépare ton atelier (étapes faites + la dernière en direct)
      const c = E('div', 'crea-mtprep'), et = Array.isArray(x.etapes) ? x.etapes : [];
      { const lb = String((x.choix && x.choix.libelle) || 'Ton atelier').trim(); c.appendChild(E('b', '', (/^[\p{L}\p{N}]/u.test(lb) ? '🛠️ ' : '') + lb + ' : ' + PK() + ' le prépare')); }
      et.forEach((e, i) => { const der = i === et.length - 1; const l = E('div', 'crea-mtet' + (der ? ' der' : '')); l.textContent = (der ? '⏳ ' : '✅ ') + String(e.texte || e.etape || ''); c.appendChild(l); });
      if (!et.length) c.appendChild(E('div', 'crea-mtet der', '⏳ Je commence à préparer ton atelier. Je te préviens ici dès qu’il est prêt.'));
      box.appendChild(c);
    }
    for (const x of ouv) { try { box.appendChild(atlDiscBulleDem(x, x.etat_at || x.at)); } catch (e) {} }
    const comp = C.querySelector(':scope > .atl-comp'); C.insertBefore(box, comp || null);
  }
  // l'admin (6 nov. soir) : JAMAIS l'ancienne page, même une image. Un projet ouvert mais pas encore chargé (jeu jouable, projet d'un joueur
  // pas encore dans la liste) : l'Interface dessinerait son ancien écran le temps du chargement → on ne montre que le ciel (+ un petit anneau)
  // jusqu'à ce que sa fiche arrive (6 s au plus, ou une erreur : la main revient à l'Interface)
  function projetSeCharge() {
    if (AIM.open || !ATL.open || !ATL.root || ATL.root.hidden || !ATL.cur || atelierOuvert(ATL.cur) || ATL.err) return false;
    let f0 = null; try { f0 = atlFiche(); } catch (e) {}
    if (f0 || AIM.luPour === ATL.cur) return false;   // chargé (avec ou sans fiche) : la main revient à l'Interface
    const f = ficheMontage(); if (f && atlAvantV1(f)) return false;   // un montage : le cadre s'en occupe
    if (AIM.attId !== ATL.cur) { AIM.attId = ATL.cur; AIM.attAt = Date.now(); setTimeout(() => { try { cadreMaj(); } catch (e) {} }, 6100); }
    return Date.now() - AIM.attAt < 6000;
  }
  function cielDans(A) { if (!A.querySelector('.crea-mtciel')) { const c = E('div', 'crea-mtciel'); c.setAttribute('aria-hidden', 'true'); try { atlEspCiel(c, false); } catch (e) {} A.insertBefore(c, A.firstChild); } }
  function cadreMaj() {
    const A = ATL.root; if (!A) return;
    // l'atelier vient d'être LIVRÉ (V1) pendant que le joueur est dans sa discussion : il passe tout seul dans son atelier, jamais l'ancien écran
    if (!AIM.open && ATL.open && !A.hidden && ATL.cur && atelierOuvert(ATL.cur) && AIM.bascule !== ATL.cur) { AIM.bascule = ATL.cur; const id = ATL.cur; setTimeout(() => { try { if (ATL.cur === id && !AIM.open) { if (AIM.cadre) cadreFin(); ouvrir(id); } } catch (e) {} }, 0); }
    const att = projetSeCharge(); if (att) cielDans(A);
    A.classList.toggle('crea-charge', att);
    const on = enMontage();
    A.classList.toggle('crea-mt', on);
    A.classList.toggle('crea-img', on && !!ATL.cur && typeDe(ATL.cur) === 'images');   // un atelier en montage : la discussion y est gratuite (at_dire en discussion = 0 💎)
    try { A.classList.toggle('crea-nuit', store.get('jdw.crea.monde', 'jour') === 'nuit'); } catch (e) {}
    if (on) {
      const R = construire();
      if (!AIM.cadre) {
        AIM.cadre = true; R.classList.remove('tiroir', 'pk-plein', 'nv'); R.classList.add('cadre'); R.removeAttribute('role'); R.style.backgroundImage = '';
        A.appendChild(R);
        cielDans(A);
        if (!AIM.obs) montrerObs();
      }
      R.hidden = false; monde(); renderCadre(); enteteMt(); try { offresMt(); } catch (e) {}
      try {   // un atelier (projet Images) en montage : les mots d'un atelier, pas d'un jeu
        const img = ATL.cur && typeDe(ATL.cur) === 'images', inp = A.querySelector('.atl-in'), hs = A.querySelector('.atl-hs');
        if (inp && img && /jeu/.test(inp.placeholder || '')) inp.placeholder = 'Dis à ' + PK() + ' ce que tu veux faire avec tes images…';
        if (hs && img && /V1|lancer/.test(hs.textContent || '')) hs.textContent = 'Ton atelier se prépare avec ' + PK();
      } catch (e) {}
    } else if (AIM.cadre) cadreFin();
  }
  function enteteMt() {   // « Nouveau jeu » : le même en-tête que « Nouveau projet » (montré par le CSS seulement quand l'Interface est en .ecrire)
    const C = ATL.root && ATL.root.querySelector('.atl-main > .atl-chat'); if (!C || C.querySelector(':scope > .crea-mth')) return;
    const h = E('div', 'crea-mth'), im = E('img'); im.src = POSE('coucou'); im.alt = '';
    const tx = E('div'); tx.append(E('h1', '', 'Raconte-moi ton jeu !'), E('div', 'sous', 'Écris ou dicte ton idée : je monte tout ton projet.'));
    h.append(im, tx); C.insertBefore(h, C.firstChild);
  }
  function cadreFin() {
    AIM.cadre = false; const R = AIM.root; if (!R) return;
    R.classList.remove('cadre', 'tiroir'); R.setAttribute('role', 'dialog'); document.body.appendChild(R);
    if (!AIM.open) R.hidden = true;
    if (ATL.root) { ATL.root.classList.remove('crea-mt'); const ob = ATL.root.querySelector('.crea-mtof'); if (ob) ob.remove(); }
  }
  function renderCadre() {
    const R = AIM.root, q = s => R.querySelector(s), f = ficheMontage();
    const fil = q('.crea-fil'); fil.textContent = '';
    if (f && f.titre) fil.append(E('span', 'lien', '· Mes projets'), E('span', 'lien', ' › '), E('strong', '', f.titre));   // l'admin (6 nov. soir) : un nouveau jeu = « CRÉE AVEC … » seul
    q('.crea-marque b').textContent = 'CRÉE AVEC ' + PK().toUpperCase(); R.style.setProperty('--crea-nom', JSON.stringify('CRÉE AVEC ' + PK().toUpperCase()));
    let so = null; try { const cr = atlCred(); if (cr && typeof cr.solde === 'number') so = cr.solde; } catch (e) {}
    if (so == null && typeof AIM.solde === 'number') so = AIM.solde;
    q('.crea-cred').textContent = typeof so === 'number' ? D + ' ' + so + (etroit() ? '' : ' crédits') : '';
    renderArbre();
  }
  function montrerObs() {
    if (!AIM.obs && ATL.root) { try { let t = 0; AIM.obs = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { try { if (lireCartes() && (AIM.open || AIM.cadre)) renderArbre(); } catch (e) {} try { if (AIM.cadre) offresMt(); } catch (e) {} }, 250); }); AIM.obs.observe(ATL.root, { childList: true, subtree: true, characterData: true }); } catch (e) {} }
  }
  function montrer() {
    if (AIM.cadre) cadreFin();
    if (!AIM.obs && ATL.root) { try { let t = 0; AIM.obs = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { try { if (lireCartes() && (AIM.open || AIM.cadre)) renderArbre(); } catch (e) {} try { if (AIM.cadre) offresMt(); } catch (e) {} }, 250); }); AIM.obs.observe(ATL.root, { childList: true, subtree: true, characterData: true }); } catch (e) {} }
    construire(); AIM.open = true; AIM.root.hidden = false;
    AIM.root.style.backgroundImage = AIM.vue === 'nouveau' || (AIM.fiche && atelierOuvert(AIM.fiche)) ? '' : 'url("' + ROOT + 'accueil/pgv-cosy-1600.webp")';
    AIM.root.classList.remove('tiroir', 'pk-plein');
  }
  function fermer() {
    AIM.open = false; clearInterval(AIM.poll); AIM.poll = 0; AIM.prop = null;
    try { if (typeof ATL_MIC !== 'undefined' && ATL_MIC && AIM.root && AIM.root.contains(ATL_MIC.field)) atlMicFin(); } catch (e) {}
    if (AIM.root) { AIM.root.hidden = true; modFermer(); }
  }
  function fermerVersProjets() { if (AIM.cadre) { try { atlListe(); } catch (e) {} return; } if (AIM.vue !== 'nouveau' && AIM.open) { nouveau(); return; } fermer(); try { atlClose(); } catch (e) {} }   // le « Mes projets » de chacun = l'écran sous les nuages
  function retour() {   // Android ← et B de la manette
    const R = AIM.root; if (!R) return false;
    if (!R.querySelector('.crea-mod').hidden) { modFermer(); return true; }
    if (R.classList.contains('tiroir')) { R.classList.remove('tiroir'); return true; }
    if (R.classList.contains('pk-plein')) { R.classList.remove('pk-plein'); return true; }
    if (AIM.fiche && AIM.vue !== 'atelier') { AIM.vue = 'atelier'; render(); return true; }
    fermerVersProjets(); return true;
  }

  // ---------- Nouveau projet : un ciel de nuages + la discussion de {g}, claire, AU CENTRE (admin, 6 nov. : PAS de grille de types, pas de
  // feuille de route ni d'étapes ; {g} comprend ce que le joueur veut faire, choisit le type et dit seulement ce qui existe vraiment) ----------
  // ce que {g} raconte quand le joueur ne sait pas quoi faire, ou demande « tu sais faire quoi ? » (seulement ce qui existe VRAIMENT)
  const DIT_POSSIBLE = () => 'Plein de choses ! 🤩 Avec moi, tu peux créer :\n'
    + '🎮 un JEU pour la borne : une course dans l’espace, un chat ninja qui saute de toit en toit, un quiz sur tes copains… Tu me racontes, je le fabrique, et tes copains y jouent !\n'
    + (AIM.off ? '' : '🎨 des IMAGES : tu me montres ta photo ou ton dessin, et je la mets de nuit, en aquarelle, en dessin animé, en pixel… ou je change ce que tu veux dedans.\n')
    + 'Alors, une idée ? 😊';
  const DIT_NOUVEAU = 'C’est parti pour un nouveau projet ! ✨ Raconte-moi ton idée ici : un jeu, des images… je te dis tout ce qu’on peut faire ensemble.';
  async function nouveau(premier) {
    AIM.fiche = null; AIM.d = null; AIM.cur = null; AIM.vue = 'nouveau'; AIM.prop = null;
    AIM.nv = { choix: null, titre: 'Mes images' };
    AIM.loc = [];
    dire({ pk: 1, img: 'coucou', t: premier || ('Bonjour ' + joli(nom()) + ' ! Qu’est-ce qu’on crée aujourd’hui ? Raconte-moi ton idée 😊') });
    montrer(); render(); curseur();
    await chargerTypes(true); render(); if (AIM.vue === 'nouveau') curseur();   // la discussion est redessinée : le curseur y revient
  }
  // ce que le joueur veut faire, d'après ses mots ({g} décide ; dans le doute, une seule question)
  const RX_BIENTOT = [[/\b(musique|chanson|m[ée]lodie|son[s]? |instrument|piano|beat)/i, 'La musique'], [/\b(dj|mixer|mix|platines?)\b/i, 'Le DJ'], [/\b(bd|bande dessin[ée]e|manga|histoire illustr)/i, 'Les BD'],
    [/(dessin anim|vid[ée]o|film|clip)/i, 'Les dessins animés'], [/\b(carte d|carte pour|invitation|anniversaire|affiche)/i, 'Les cartes'], [/\b(avatar|autocollant|sticker|emoji)/i, 'Les avatars']];
  const RX_IMG = /(photo|image|dessin|retouch|fond d.?[ée]cran|style|couleur|filtre|selfie|paysage|aquarelle|pixel)/i;
  const RX_JEU = /(\bjeu\b|\bjeux\b|jouer|niveau|personnage qui|score|ennemi|course|plateforme|labyrinthe|tirer|sauter)/i;
  const RX_AIDE = /(sais pas|sais faire quoi|tu sais faire|tu fais quoi|quoi faire|qu.est.ce (que )?(tu|je|on) (peu[xt]|sai[st])|aide|id[ée]e[s]? \?|propose|inspire|^\s*\?+\s*$)/i;
  function comprendre(t) {
    if (RX_AIDE.test(t) && !RX_IMG.test(t) && !RX_JEU.test(t)) return 'aide';
    const img = RX_IMG.test(t), jeu = RX_JEU.test(t), bt = RX_BIENTOT.find(([r]) => r.test(t));
    if (/^\s*(un |une |des |les |le )?(jeu|jeux)\s*!?\s*$/i.test(t)) return 'jeu';
    if (/^\s*(une |des |les |l’|l')?(images?|photos?)\s*!?\s*$/i.test(t)) return 'images';
    if (img && !jeu) return 'images';
    if (jeu && !img) return 'jeu';
    if (img && jeu) return 'doute';
    if (bt) return 'bientot:' + bt[1];
    return 'doute';
  }
  function choisirType(k, depuisTexte) {
    if (k === 'jeu') {   // l'atelier des jeux, avec l'idée déjà écrite
      dire({ pk: 1, img: 'joie', t: 'Super, un jeu ! 🎮 Je t’emmène dans l’atelier des jeux avec ton idée.' }); render();
      setTimeout(() => { const t = depuisTexte || ''; fermer(); _nouveau(); if (t) setTimeout(() => { const i = ATL.root && ATL.root.querySelector('.atl-in'); if (i) { i.value = t; i.focus(); } }, 120); }, 900);
      return;
    }
    if (k === 'images') {
      if (AIM.off) { dire({ pk: 1, t: 'L’atelier d’images arrive très bientôt 🎨 (pas encore aujourd’hui). En attendant, je peux t’aider à créer un jeu 🎮' }); render(); return; }
      AIM.nv.choix = 'images';
      dire({ pk: 1, img: 'joie', t: 'Super idée ! 🎨 Je ne peux pas le faire tout de suite, mais je peux te créer un atelier rien que pour ça. On en parle ensemble : je te pose quelques questions, puis je te dis combien de 💎 il faut pour l’aménager 👇', offre: 1 });
      render(); return;
    }
    if (k === 'aide') { dire({ pk: 1, img: 'idee', t: DIT_POSSIBLE() }); render(); return; }
    if (k.startsWith('bientot:')) { dire({ pk: 1, t: k.slice(8) + ' : ça arrive bientôt ! Aujourd’hui je sais faire des jeux 🎮 et des images 🎨. Tu veux qu’on fasse l’un des deux ?' }); render(); return; }
    dire({ pk: 1, img: 'idee', t: 'J’adore ! Tu veux plutôt en faire un jeu 🎮 (pour jouer sur la borne) ou une image 🎨 (retoucher une photo, changer son style) ?' }); render();
  }
  function imageNouveau(f) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type || '') || f.size > 5 * 1024 * 1024) { dire({ pk: 1, t: 'Seulement des images JPEG, PNG ou WebP, 5 Mo au plus (photo, capture d’écran, dessin…) 🙂' }); render(); return; }
    try { if (AIM.nv.apercu) URL.revokeObjectURL(AIM.nv.apercu); } catch (e) {}
    AIM.nv.fichier = f; AIM.nv.apercu = URL.createObjectURL(f);
    dire({ pk: 0, t: '', image: AIM.nv.apercu }); render();
    setTimeout(() => { dire({ pk: 1, img: 'joie', t: 'Oh, jolie image ! 😍 Tu veux la retoucher ou changer son style ?' }); choisirType('images'); }, 450);
  }
  const etroit = () => matchMedia('(max-width: 899px)').matches;
  // le curseur prêt dans la discussion de {g} à chaque entrée (Interface / chef) ; jamais tout seul au toucher (le clavier s'ouvrirait)
  function curseur() { if (TOUCH) { try { if (window.JDW_PAD && JDW_PAD.active()) setTimeout(() => { const m = AIM.root && AIM.root.querySelector(AIM.vue === 'nouveau' ? '.crea-nv .crea-mic:not(.crea-imgb)' : '.crea-masc .crea-mic'); if (m && m.getClientRects().length) JDW_PAD.focusEl(m); }, 120); } catch (e) {} return; }   /* téléphone + manette (testeurs, 6 nov.) : le curseur de la manette sur 🎤, sans ouvrir le clavier */ setTimeout(() => { const t = AIM.root && AIM.root.querySelector(AIM.vue === 'nouveau' ? '.crea-nv textarea' : '.crea-masc textarea'); if (t && t.getClientRects().length) t.focus({ preventScroll: true }); }, 80); }
  function renderNouveau(O) {
    const C = E('div', 'crea-nv crea-carte'), hd = E('div', 'crea-nvh'), im = E('img'); im.src = POSE('coucou'); im.alt = '';
    const tx = E('div'); tx.append(E('h1', '', 'Qu’est-ce qu’on crée aujourd’hui ?'), E('div', 'sous', 'Raconte ton idée à ' + PK() + ' : il te dit ce qu’on peut faire ensemble.'));
    hd.append(im, tx); C.appendChild(hd);
    const F = E('div', 'crea-fil2'); F.setAttribute('role', 'log'); F.setAttribute('aria-live', 'polite');
    for (const m of AIM.loc) { F.appendChild(bulle(m)); if (m.offre && AIM.nv.choix === 'images') { const o = offreImages(); o.classList.add('dans-fil'); F.appendChild(o); } }
    C.appendChild(F);
    C.appendChild(saisie('Raconte-moi ton idée…', true));
    O.appendChild(C);
    requestAnimationFrame(() => { F.scrollTop = F.scrollHeight; });
  }
  // la case pour écrire (ou dicter) à {g} : dans son panneau, ou au centre pendant la création d'un projet
  function saisie(ph, avecImage) {
    const S = E('form', 'crea-saisie'), ch = E('div', 'crea-champ'), ta = E('textarea'); ta.rows = 1; ta.maxLength = 2000; ta.placeholder = ph || 'Écris à ' + PK() + '…'; ta.setAttribute('aria-label', 'Ton message à ' + PK());
    ta.value = AIM.brouPk || ''; ta.addEventListener('input', () => { AIM.brouPk = ta.value; });
    const mic = B('crea-mic', '🎤', () => { try { atlMicBascule(ta, mic); } catch (e) {} }); mic.setAttribute('aria-label', 'Parler au micro');
    ch.append(ta, mic);
    if (avecImage) {   // joindre une image dès la création (elle ira dans l'atelier d'images une fois le projet accepté)
      const ib = B('crea-mic crea-imgb', '🖼️', () => { const f = AIM.root.querySelector('.crea-file'); f.dataset.nv = '1'; f.click(); }); ib.setAttribute('aria-label', 'Joindre une image'); ch.insertBefore(ib, mic);
    }
    const env = E('button', 'crea-env', '➤'); env.type = 'submit'; env.setAttribute('aria-label', 'Envoyer');
    S.append(ch, env);
    S.addEventListener('submit', e => { e.preventDefault(); const v = ta.value.trim(); if (!v) return; ta.value = ''; AIM.brouPk = ''; envoyerMasc(v); });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !TOUCH) { e.preventDefault(); S.requestSubmit(); } });
    return S;
  }
  // l'admin (6 nov., 23 h) : « je veux retoucher cette photo » → {g} ne le fait pas tout de suite : il propose de CRÉER UN ATELIER sur mesure.
  // Le projet est créé (gratuit), l'idée part dans sa discussion, et on continue DANS LE MONTAGE de l'Interface comme pour un jeu :
  // questions, photo d'exemple (🖼️), résumé, puis l'offre chiffrée « Aménager mon atelier » ; les outils n'existent qu'après la V1 livrée
  function offreImages() {
    const c = E('div', 'crea-offre');
    const h = E('div', 'haut'), ic = E('div', 'ic', '🎨'), t = E('div'); t.style.flex = '1';
    const inp = E('input'); inp.value = AIM.nv.titre; inp.maxLength = 60; inp.setAttribute('aria-label', 'Nom du projet'); inp.addEventListener('input', () => { AIM.nv.titre = inp.value; });
    t.append(E('div', 'ty', 'Ton atelier sur mesure · avec ' + PK()), inp, E('div', '', 'Un atelier préparé rien que pour ce que tu veux faire')); t.lastChild.style.cssText = 'font-size:13.5px;color:#5b4f75;margin-top:3px';
    h.append(ic, t); c.appendChild(h);
    const corps = E('div', 'corps'), ul = E('ul');
    const li = txt => { const l = E('li'); l.append(E('span', '', txt)); ul.appendChild(l); };
    li('💬 Je te pose quelques questions sur ce que tu veux faire'); li('🖼️ Tu peux m’envoyer une photo d’exemple'); li('🛠️ Puis je te dis le prix pour aménager ton atelier');
    const c1 = E('div'); c1.append(E('div', 'ttl', 'Comment ça se passe'), ul); corps.appendChild(c1); c.appendChild(corps);
    c.appendChild(E('div', 'note', 'Parler avec moi est gratuit. Rien n’est payé avant que tu acceptes mon offre.'));
    const act = E('div', 'act');
    const ok = B('crea-bt', '✨ Oui, on en parle', async () => {
      if (AIM.busy) return; AIM.busy = true; ok.disabled = true;
      try {
        const r = await rpc('at_esp_nouveau', { p_name: nom(), p_titre: AIM.nv.titre }, { quiet: true });
        AIM.types[r.id] = { id: r.id, type: 'images', titre: r.titre, images: 0 };
        const idee = AIM.loc.filter(m => !m.pk && m.t).map(m => m.t).join('\n').trim() || (AIM.nv.fichier ? '🖼️ Voilà ma photo, je voudrais la retoucher' : 'Je voudrais créer des images');   // toujours un 1er message (gratuit) : les suivants passent par at_dire, gratuit en discussion
        if (idee) { try { await rpc('at_esp_parler', { p_name: nom(), p_fiche: r.id, p_texte: idee, p_micro: false }, { quiet: true }); } catch (e) {} }
        const fj = AIM.nv.fichier; AIM.nv.fichier = null;
        try { if (ATL.data && Array.isArray(ATL.data.projets)) ATL.data.projets.unshift({ id: r.id, titre: r.titre, etat: 'en_discussion' }); } catch (e) {}
        fermer(); _ouvrir(r.id);   // le montage de l'Interface (habillé ici), comme un jeu
        if (fj) {   // la photo jointe pendant la création part dans la discussion, comme une photo d'exemple
          const t0 = Date.now(), go = () => { let f0 = null; try { f0 = atlFiche(); } catch (e) {} if (f0 && ATL.cur === r.id) { try { atlImage(fj); } catch (e) {} } else if (Date.now() - t0 < 8000) setTimeout(go, 300); };
          setTimeout(go, 300);
        }
      } catch (e) {
        const m = pourquoi(e);
        dire({ pk: 1, t: /trop de projets/.test(m) ? 'Tu as déjà le maximum de projets : termine ou supprime un projet avant d’en commencer un autre.' : /filtre/.test(m) ? 'Ce nom-là, je ne peux pas le garder 🙈 Choisis-en un autre !' : 'Oups, ça n’a pas marché (' + m.slice(0, 60) + '). Réessaie dans un moment 🙏' });
        render();
      } finally { AIM.busy = false; ok.disabled = false; }
    });
    act.appendChild(ok); c.appendChild(act);
    return c;
  }
  function nuages(titre, sous) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { toast('✨ ' + titre); return; }
    const O = E('div', 'crea-nuages'), V = E('div', 'voile'); O.appendChild(V);
    const tel = innerWidth < 700, N = [];
    for (const [k, cote, x, y, w] of [[1, -1, -18, -6, 78], [2, -1, -26, 34, 86], [3, -1, -14, 70, 80], [2, 1, 44, -10, 82], [3, 1, 52, 30, 84], [1, 1, 40, 68, 86]]) {
      const n = E('img', 'n'); n.alt = ''; n.src = ROOT + 'accueil/atelier-nuage-' + k + '.webp';
      n.style.left = (tel ? x * 1.4 : x) + 'vw'; n.style.top = y + 'vh'; n.style.width = (tel ? w * 1.7 : w) + 'vw'; N.push([n, cote]); O.appendChild(n);
    }
    const M = E('div', 'msg'), im = E('img'); im.alt = ''; im.src = POSE('joie');
    M.append(im, E('h1', '', titre), E('p', '', sous)); O.appendChild(M);
    document.body.appendChild(O);
    const ease = 'cubic-bezier(.33,0,.15,1)';
    M.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.05)', opacity: 1, offset: .65 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 650, easing: ease, fill: 'forwards' });
    let fini = false; const fin = () => { if (fini) return; fini = true; O.remove(); };
    O.addEventListener('click', fin);
    setTimeout(() => {
      if (fini) return;
      for (const [n, cote] of N) n.animate([{ transform: 'translate3d(0,0,0) scale(1)', opacity: 1 }, { transform: 'translate3d(' + (cote * 105) + 'vw,0,0) scale(1.1)', opacity: .6 }], { duration: 1400, easing: ease, fill: 'forwards' });
      V.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: 300, easing: ease, fill: 'forwards' });
      M.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 1100, fill: 'forwards' });
    }, 1500);
    setTimeout(fin, 3200);
  }

  // ---------- un projet Images ----------
  async function ouvrir(id, vue) {
    AIM.fiche = id; AIM.vue = vue || 'atelier'; AIM.prop = null; AIM.loc = []; AIM.msgs = []; AIM.vuAt = Date.now(); AIM.d = null; AIM.errLire = ''; AIM.ouvAt = Date.now();
    if (AIM.ouverts[id] === undefined) AIM.ouverts[id] = true;
    if (ATL.cur) { AIM.calme = true; try { atlListe(); } catch (e) {} AIM.calme = false; }   // l'Interface revient à sa liste dessous (un atelier ouvert depuis son montage)
    montrer(); render();
    await Promise.all([charger(), chargerMsgs()]);
    render(); suivre(); curseur();
  }
  async function charger() {
    if (!AIM.fiche) return;
    try {
      const d = await rpc('at_esp_lire', { p_name: nom(), p_fiche: AIM.fiche }, { quiet: true });
      const avant = AIM.d; AIM.d = d; AIM.errLire = '';
      if (typeof d.solde === 'number') { if (AIM.solde != null && d.solde !== AIM.solde && !adm()) bougerCred(); AIM.solde = d.solde; }
      if (d.prix) AIM.prix = d.prix;
      const cs = d.creations || [];
      if (!cs.some(c => c.id === AIM.cur)) AIM.cur = cs.length ? cs[0].id : null;
      if (AIM.types[d.id]) { AIM.types[d.id].titre = d.titre; AIM.types[d.id].images = cs.length; }
      if (avant && JSON.stringify(avant.creations) !== JSON.stringify(cs)) { AIM.pos = 0.5; }
      return true;
    } catch (e) {
      if (/projet inconnu|pas un projet images/.test(pourquoi(e))) { fermerVersProjets(); toast('Ce projet n’existe plus'); }
      else { AIM.errLire = pourquoi(e) || 'erreur'; try { console.error('[atelier-images] at_esp_lire', AIM.errLire); } catch (e2) {} }   // jamais un chargement sans fin : l'erreur se montre
      return false;
    }
  }
  async function chargerMsgs() {
    if (!AIM.fiche) return;
    try {
      const r = adm() ? await rpc('at_admin_lire', { p_name: nom(), p_fiche: AIM.fiche }, { quiet: true }) : await rpc('at_lire', { p_name: nom(), p_fiche: AIM.fiche }, { quiet: true });
      AIM.fi = (r && r.fiche) || AIM.fi || null;
      AIM.msgs = ((r && r.messages) || []).filter(m => !m.remplacee).map(m => ({ t: String(m.texte || ''), pk: !!m.atelier, at: m.at }));
    } catch (e) {}
  }
  function enAttente() { const c = curCrea(); return !!(c && c.versions.some(v => ['envoi', 'controle', 'en_cours'].includes(v.etat))); }
  function suivre() {
    clearInterval(AIM.poll); AIM.tick = 0;
    AIM.poll = setInterval(async () => {
      if (!AIM.open || !AIM.fiche || document.hidden) return;
      AIM.tick++;
      const att = (AIM.d && (AIM.d.creations || []).some(c => c.versions.some(v => ['controle', 'en_cours'].includes(v.etat))));
      if (!att && AIM.tick % 4) return;   // au calme : toutes les 12 s ; une image en cours : toutes les 3 s
      const avant = JSON.stringify(AIM.d && AIM.d.creations), nm = AIM.msgs.length;
      await Promise.all([charger(), chargerMsgs()]);
      if (JSON.stringify(AIM.d && AIM.d.creations) !== avant || AIM.msgs.length !== nm) render();
    }, 3000);
  }
  const curCrea = () => (AIM.d && (AIM.d.creations || []).find(c => c.id === AIM.cur)) || null;
  const verDe = (c, id) => c && c.versions.find(v => v.id === id);
  function bougerCred() { const c = AIM.root && AIM.root.querySelector('.crea-cred'); if (c) { c.classList.remove('bouge'); void c.offsetWidth; c.classList.add('bouge'); } }

  // ---------- rendu ----------
  function render() {
    if (!AIM.root || !AIM.open) return;
    const R = AIM.root, q = s => R.querySelector(s);
    const pj = AIM.fiche && AIM.types[AIM.fiche];
    const fil = q('.crea-fil'); fil.textContent = '';
    if (AIM.vue !== 'nouveau') {   // l'admin (6 nov. soir) : plus de « · Mes projets › Nouveau projet » en haut, seulement « CRÉE AVEC … »
      const ti = (AIM.d && AIM.d.titre) || (pj && pj.titre) || 'Mes images';
      fil.append(E('span', 'lien', adm() ? '· Projets des joueurs' : '· Mes projets'), E('span', 'lien', ' › '), E('strong', '', ti));
      if (adm()) { const ab = E('span', 'crea-admb', '🛡️ '); ab.append(E('span', 'l', 'Vue admin · '), joueurAdm()); fil.appendChild(ab); }
    }
    q('.crea-marque b').textContent = 'CRÉE AVEC ' + PK().toUpperCase(); R.style.setProperty('--crea-nom', JSON.stringify('CRÉE AVEC ' + PK().toUpperCase()));
    let so = AIM.solde; if (typeof so !== 'number') { try { const cr = atlCred(); if (cr && typeof cr.solde === 'number') so = cr.solde; } catch (e) {} }   // sans SQL v160 : le solde de l'Atelier (testeurs, 6 nov.)
    q('.crea-cred').textContent = typeof so === 'number' ? D + ' ' + (adm() ? joueurAdm() + ' ' : '') + so + (etroit() || adm() ? '' : ' crédits') : '';
    renderArbre(); renderOutil(); renderMasc(); renderFlot();
  }
  // ---------- l'arbre « Mes projets » : la VRAIE jaquette (atlPvJaq de l'Interface), son STATUT et ses BULLES, lus tels quels sur les cartes
  // de projets que l'Interface dessine (atlRenderProjets, atlTousProjets : rien n'est recalculé ici) ; admins : les projets des joueurs à la suite
  AIM.cartes = {};   // id du projet → { statut, bulles: [{t, c}], cls }
  function lireCarte(t) {
    const st = [t.querySelector('.atl-pver'), t.querySelector('.atl-pver2')].filter(Boolean).map(e => e.textContent.trim()).filter(Boolean).join(' · ');
    const bulles = [...t.querySelectorAll('.atl-patt, .atl-pnew, .atl-pprepa')].map(e => ({ t: (e.querySelector('.lg') || e).textContent.trim(), c: e.className })).filter(x => x.t);
    return { statut: st, bulles, cls: ['choix', 'rep', 'new', 'att'].filter(k => t.classList.contains(k)) };
  }
  function lireCartes() {
    const R = ATL.root; if (!R) return false;
    const avant = JSON.stringify(AIM.cartes);
    const ps = atlProjets(), tiles = R.querySelectorAll('.atl-projets .atl-pgrid .atl-pwrap > .atl-ptile');
    // la grille de l'Interface peut être en retard sur sa liste (projet tout neuf, ordre changé) : jamais les bulles d'un AUTRE projet
    if (tiles.length === ps.length) ps.forEach((pj, i) => { const t = tiles[i]; if (t && (!pj.titre || (t.textContent || '').includes(pj.titre))) AIM.cartes[pj.id] = lireCarte(t); });
    for (const t of R.querySelectorAll('.atl-tous .atl-ptile')) { const r = t.querySelector('.atl-rent[data-f]'); if (r) AIM.cartes[r.dataset.f] = lireCarte(t); }
    return JSON.stringify(AIM.cartes) !== avant;
  }
  function jaquette(pj, img) {
    const ic = E('span', 'ic jaq');
    if (!img && typeDe(pj.id) === 'images') { ic.textContent = '🎨'; ic.style.background = '#efe6ff'; return ic; }   // un atelier pas encore livré : une ligne comme un jeu en montage
    if (img) { const x = AIM.types[pj.id], u = x && urlImg(x.image, 120); if (u) { const im = E('img'); im.alt = ''; im.src = u; ic.appendChild(im); } else ic.textContent = '🎨'; ic.style.background = '#efe6ff'; }
    else { try { atlPvJaq(ic, pj); } catch (e) { ic.textContent = '🎮'; } ic.style.background = '#2a1f45'; }
    return ic;
  }
  function ligneProjet(pj, opts) {
    const img = atelierOuvert(pj.id) && !opts.autre, ouvert = (img && AIM.fiche === pj.id) || (AIM.cadre && !opts.autre && ATL.cur === pj.id), ca = AIM.cartes[pj.id] || {};
    const n = B('crea-nd crea-proj' + (ouvert ? ' ouvert' : '') + (ca.cls || []).map(k => ' ' + k).join(''), null, () => {
      AIM.root.classList.remove('tiroir');
      if (opts.autre) { fermer(); try { atlVoirProjet(pj.id); } catch (e) {} return; }   // admin : le projet d'un joueur, exactement comme il le voit (fonctions admin existantes)
      if (img) { if (AIM.fiche === pj.id) { AIM.ouverts[pj.id] = !AIM.ouverts[pj.id]; render(); } else ouvrir(pj.id); }
      else { fermer(); _ouvrir(pj.id); }
    });
    const ic = jaquette(pj, img);
    const nb = (ca.bulles || []).filter(b => !/atl-(pprepa|pdc)\b/.test(b.c) && !/^(⏳|🛠️)/u.test(b.t)).reduce((t, b) => t + (parseInt((b.t.match(/\d+/) || [1])[0], 10) || 1), 0);   // seulement ce qui attend le joueur (questions, réponses, à choisir, à valider) ; pas « en préparation », « en cours », « mise de côté »
    if (nb) ic.appendChild(E('i', 'pastille', String(Math.min(99, nb))));   // la pastille rouge : le nombre de ses bulles (réponses, questions, à choisir…)
    const nm = E('span', 'nm', pj.titre || (img ? 'Mes images' : 'Sans nom'));
    const st = opts.autre ? '👤 ' + (typeof dispName === 'function' ? dispName(pj.joueur || '') : pj.joueur || '') + (ca.statut ? ' · ' + ca.statut : '') : (typeDe(pj.id) === 'images' && !img) ? 'En préparation avec ' + PK() : ca.statut || (img ? 'Images' : 'Jeu');
    nm.appendChild(E('small', '', st));
    for (const b of (ca.bulles || []).slice(0, 2)) nm.appendChild(E('em', 'bulle ' + b.c.replace(/\batl-/g, 'b-'), b.t));
    n.append(E('span', 'fl', opts.autre ? '' : ouvert && AIM.ouverts[pj.id] ? '▾' : '▸'), ic, nm);
    n.title = (pj.titre || '') + (st ? ' — ' + st : '');
    return n;
  }
  function renderArbre() {
    const A = AIM.root.querySelector('.crea-arbre'), sy = A.scrollTop; A.textContent = '';
    A.classList.toggle('menu-at', !!(AIM.open && AIM.fiche && AIM.vue !== 'nouveau' && atelierOuvert(AIM.fiche)));
    if (A.classList.contains('menu-at')) { renderMenuAtelier(A); A.scrollTop = sy; return; }
    try { lireCartes(); } catch (e) {}
    const ps = atlProjets(), cr = atlCred(), max = (cr && cr.projets_max | 0) || 5;
    const h = E('div', 'crea-tarb'); h.append(E('b', '', '📁 MES PROJETS'), E('span', '', ps.length + ' / ' + max)); A.appendChild(h);
    // l'admin (6 nov., 23 h 50) : plus de bouton « ＋ Nouveau projet » dans l'arbre (« pas besoin ») : la tuile et ← ramènent à l'écran sous les nuages
    for (const pj of ps) {
      A.appendChild(ligneProjet(pj, {}));
      if (atelierOuvert(pj.id) && AIM.fiche === pj.id && AIM.ouverts[pj.id]) {
        const s = E('div', 'crea-sous'), c = curCrea(), cs = (AIM.d && AIM.d.creations) || [];
        const sub = (k, e, t, n0) => { const b = B('crea-nd' + (AIM.vue === k ? ' on' : ''), null, () => { AIM.vue = k; AIM.root.classList.remove('tiroir'); render(); }); b.append(E('i', '', e), E('span', 'nm', t)); if (n0 != null) b.appendChild(E('span', 'n', String(n0))); s.appendChild(b); };
        sub('atelier', '🎨', 'Mon atelier'); sub('images', '🖼️', 'Mes images', cs.length); sub('versions', '🕘', 'Versions', c ? c.versions.filter(v => v.etat === 'prete').length : 0); sub('reglages', '⚙️', 'Réglages');
        A.appendChild(s);
      }
    }
    // ADMINS : les projets des autres joueurs, à la suite, dans une section à part (liste de l'admin : at_tous_projets, déjà ouverte aux admins seulement)
    if (cr && cr.tous_projets) {
      const moi = new Set(ps.map(x => x.id)), l = ((ATL.tous && Array.isArray(ATL.tous.l)) ? ATL.tous.l : []).filter(x => x && !moi.has(x.id));
      const hs = E('div', 'crea-tarb crea-tarb2'); hs.append(E('b', '', '👥 PROJETS DES JOUEURS'), E('span', '', l.length ? String(l.length) : '…')); A.appendChild(hs);
      if (!ATL.tous && !AIM.tousLit) { AIM.tousLit = true; rpc('at_tous_projets', { p_name: nom() }, { quiet: true }).then(l2 => { ATL.tous = { at: Date.now(), l: l2 }; render(); }).catch(() => {}).finally(() => { AIM.tousLit = false; }); }
      const tri = [...l].sort((a, c) => String(a.joueur || '').localeCompare(String(c.joueur || '')) || String(c.maj_at || '').localeCompare(String(a.maj_at || '')));
      for (const x of tri) A.appendChild(ligneProjet(x, { autre: true }));
    }
    A.appendChild(E('div', 'crea-pied', 'Ce que tu crées ici reste privé : toi seul le vois.'));
    A.scrollTop = sy;
  }
  // le menu du projet d'un atelier livré (comme le menu d'un jeu : {g} en haut, les sections, ← Mes projets)
  function renderMenuAtelier(A) {
    const cfg = atelierDe(AIM.fiche), pj = AIM.types[AIM.fiche] || {};
    const h = E('div', 'crea-mat-h'); h.append(E('b', '', (AIM.d && AIM.d.titre) || pj.titre || cfg.nom), E('small', '', '🧪 ' + cfg.nom + ' · V' + Math.max(1, versionAt(AIM.fiche))));
    A.appendChild(h);
    const pk = B('crea-mat-pk', null, () => ouvrirGuide()), im = E('img'), t = E('span'); im.alt = ''; im.src = AV();
    t.append(E('b', '', PK()), E('small', '', enAttente() ? 'prépare ta photo…' : 'Je suis là ! Une idée ?')); pk.append(im, t); A.appendChild(pk);
    for (const [k, ic, lab] of cfg.menu) {
      const b = B('crea-nd crea-mat-b' + (AIM.vue === k ? ' on' : ''), null, () => { AIM.root.classList.remove('tiroir'); if (k === 'guide') { ouvrirGuide(); return; } AIM.vue = k; render(); });
      b.dataset.k = k; b.append(E('i', '', ic), E('span', 'nm', lab || PK()));
      if (k === 'resultats') { const n = resultats().length; if (n) b.appendChild(E('span', 'n', String(n))); }
      A.appendChild(b);
    }
    A.appendChild(E('div', 'crea-mat-sp'));
    const r = B('crea-nd crea-mat-ret', null, () => { AIM.root.classList.remove('tiroir'); fermerVersProjets(); }); r.append(E('i', '', '←'), E('span', 'nm', 'Mes projets')); A.appendChild(r);
    A.appendChild(E('div', 'crea-pied', adm() ? '🛡️ Vue admin : l’atelier de ' + joueurAdm() + ', tel qu’il le voit. Tu peux lui répondre comme ' + PK() + ' ; rien d’autre n’est changé.' : 'Ce que tu crées ici reste privé : toi seul le vois.'));
  }
  function ouvrirGuide() {
    const R = AIM.root; if (!R) return;
    if (etroit()) { R.classList.add('pk-plein'); AIM.vuAt = Date.now(); renderFlot(); }
    else { R.classList.remove('pk-replie'); try { store.set('jdw.crea.pkreplie', false); } catch (e) {} }
    setTimeout(() => { const t = R.querySelector('.crea-masc textarea'); if (t && !TOUCH) t.focus({ preventScroll: true }); }, 60);
  }
  function renderOutil() {
    const O = AIM.root.querySelector('.crea-outil'), sy = O.scrollTop; O.textContent = '';
    const at = AIM.vue !== 'nouveau' && !!AIM.fiche && atelierOuvert(AIM.fiche), fd = at ? atelierDe(AIM.fiche).fond : '';
    AIM.root.classList.toggle('studio', fd === 'studio');
    AIM.root.style.backgroundImage = AIM.vue === 'nouveau' || fd ? '' : 'url("' + ROOT + 'accueil/pgv-cosy-1600.webp")';
    if (AIM.vue === 'nouveau') { renderNouveau(O); return; }
    if (!AIM.d) {   // l'admin (6 nov., 23 h) : JAMAIS un chargement sans fin. Une erreur (ou 10 s sans réponse) → un message clair + Réessayer
      const c = E('div', 'crea-carte crea-page'), v = E('div', 'crea-vide');
      const trop = Date.now() - (AIM.ouvAt || 0) > 10000;
      if (AIM.errLire || trop) {
        v.append(E('p', '', '😕 Ton atelier ne s’ouvre pas pour le moment.'), E('p', '', 'Ce n’est pas de ta faute : ' + PK() + ' est prévenu. Tes crédits ne bougent pas.'));
        v.lastChild.style.cssText = 'font-size:14px;opacity:.8';
        const re = B('crea-bt', '🔄 Réessayer', async () => { AIM.errLire = ''; AIM.ouvAt = Date.now(); render(); await charger(); render(); }); v.appendChild(re);
      } else {
        v.append(E('div', 'crea-anneau'), E('p', '', 'J’ouvre ton atelier…')); v.firstChild.style.borderColor = '#e4d7ff'; v.firstChild.style.borderTopColor = '#6a3fc2';
        clearTimeout(AIM.ouvT); AIM.ouvT = setTimeout(() => { if (AIM.open && !AIM.d) render(); }, 10200);
      }
      c.appendChild(v); O.appendChild(c); return;
    }
    if (AIM.vue === 'images') renderMesImages(O);
    else if (AIM.vue === 'versions') renderVersions(O);
    else if (AIM.vue === 'reglages' || AIM.vue === 'params') renderReglages(O);
    else if (AIM.vue === 'resultats') renderResultats(O);
    else if (AIM.vue === 'route') renderRoute(O);
    else if (AIM.vue === 'versions_at') renderVersionsAt(O);
    else renderAtelier(O);
    O.scrollTop = sy;
  }
  function videImport(O, titre, texte) {
    const c = E('div', 'crea-carte crea-page'), v = E('div', 'crea-vide'), im = E('img'); im.src = POSE('dessine'); im.alt = '';
    v.append(im, E('b', '', titre), E('p', '', texte), B('crea-bt', '＋ Importer une image', () => choisirFichier()), E('p', '', 'Gratuit · JPEG, PNG ou WebP · 5 Mo au plus'));
    v.lastChild.style.fontSize = '13px'; c.appendChild(v); O.appendChild(c);
  }
  function choisirFichier() { if (lectureSeule()) return; if (enAttenteImport()) { toast('Je regarde encore ta photo… 👀'); return; } AIM.root.querySelector('.crea-file').click(); }
  const enAttenteImport = () => !!(AIM.d && (AIM.d.creations || []).some(c => c.versions.some(v => v.etat === 'controle' || v.etat === 'envoi')));

  function renderAtelier(O) {
    const c = curCrea();
    if (!c) { if (atelierOuvert(AIM.fiche)) renderDepot(O); else videImport(O, 'Importe ta première image', 'Une photo de Pégase, un dessin, un paysage, ton animal… Ensuite, dis-moi ce que tu veux changer. (Pas de photo où l’on voit le visage d’une vraie personne.)'); return; }
    const act = verDe(c, c.actuelle), att = c.versions.find(v => ['envoi', 'controle', 'en_cours'].includes(v.etat));
    const avant = act && (verDe(c, act.parent) || (act.n > 1 ? c.versions.find(v => v.n === 1 && v.etat === 'prete') : null));
    const G = E('div', 'crea-oimg' + (atelierOuvert(AIM.fiche) ? ' at' : ''));
    // la scène
    const S = E('div', 'crea-carte crea-scene'), L = E('div', 'crea-lh');
    const tb = B('crea-titreimg', '🖼️ ' + (c.titre || 'Mon image').toUpperCase(), () => renommerImage(c)); tb.title = 'Renommer cette image';
    L.appendChild(tb);
    if (att && att.etat === 'en_cours') { const p = E('span', 'crea-prix', '⏳ V' + att.n + ' en cours…'); L.appendChild(p); }
    const seg = E('div', 'crea-seg');
    for (const [k, t] of [['image', 'Image'], ['comparer', 'Comparer'], ['cote', 'Côte à côte']]) {
      const b = B((AIM.mode === k ? 'on ' : '') + k, t, () => { AIM.mode = k; render(); });
      if (k !== 'image' && !avant) b.disabled = true; seg.appendChild(b);
    }
    L.appendChild(seg); S.appendChild(L);
    const mode = avant ? AIM.mode : 'image';
    const Cd = E('div', 'crea-cadre' + (mode === 'cote' ? ' cote' : ''));
    const img = (p, cls) => { const i = E('img', cls || ''); i.alt = ''; i.src = urlImg(p) || ''; i.draggable = false; return i; };
    if (!act) {
      const w = E('div', 'crea-attente'); w.append(E('div', 'crea-anneau'), E('div', '', att && att.etat === 'controle' ? 'Je regarde ta photo… 👀' : 'J’ouvre ta photo…')); Cd.appendChild(w);
    } else if (mode === 'comparer') {
      Cd.append(img(avant.path), img(act.path, 'apres'), E('div', 'ligne'), E('div', 'poignee', '⟷'));
      const e1 = E('span', 'et', 'Avant · V' + avant.n), e2 = E('span', 'et', 'Après · V' + act.n); e1.style.left = '10px'; e2.style.right = '10px'; Cd.append(e1, e2);
      const poser = x => { AIM.pos = Math.max(0, Math.min(1, x)); Cd.querySelector('.apres').style.clipPath = 'inset(0 0 0 ' + (AIM.pos * 100) + '%)'; Cd.querySelector('.ligne').style.left = Cd.querySelector('.poignee').style.left = (AIM.pos * 100) + '%'; };
      let tire = false; const xr = e => { const r = Cd.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
      Cd.addEventListener('pointerdown', e => { tire = true; try { Cd.setPointerCapture(e.pointerId); } catch (x) {} poser(xr(e)); });
      Cd.addEventListener('pointermove', e => { if (tire) poser(xr(e)); });
      Cd.addEventListener('pointerup', () => { tire = false; }); Cd.addEventListener('pointercancel', () => { tire = false; });
      Cd.tabIndex = 0; Cd.setAttribute('aria-label', 'Avant / après : flèches gauche et droite'); Cd.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); poser(AIM.pos + (e.key === 'ArrowLeft' ? -0.08 : 0.08)); } });
      setTimeout(() => poser(AIM.pos), 0);
    } else if (mode === 'cote') {
      for (const [v, t] of [[avant, 'Avant · V'], [act, 'Après · V']]) { const d = E('div'); d.appendChild(img(v.path)); const e = E('span', 'et', t + v.n); e.style.left = '10px'; d.appendChild(e); Cd.appendChild(d); }
    } else Cd.appendChild(img(act.path));
    S.appendChild(Cd); depotSur(Cd);
    // 👁️ {g} regarde la photo : son commentaire (ce qu'il voit, ce qu'il propose, le prix), « Oui, fais-le » ou « Je veux autre chose »
    if (act && !att) S.appendChild(carteRegard(c, act));
    // « Dis ce que tu veux changer »
    const dem = E('div', 'crea-dem'), ch = E('div', 'crea-champ'), ta = E('textarea'); ta.rows = 1; ta.maxLength = 400; ta.placeholder = etroit() ? '✨ Que veux-tu faire ?' : '✨ ' + atelierDe(AIM.fiche).invite + '… « éclaircis-la, floute le fond »'; ta.setAttribute('aria-label', 'Ce que tu veux changer');
    ta.value = AIM.brouillon || ''; ta.addEventListener('input', () => { AIM.brouillon = ta.value; });
    const mic = B('crea-mic', '🎤', () => { try { atlMicBascule(ta, mic); } catch (e) { toast('Le micro ne marche pas ici : écris au clavier'); } }); mic.setAttribute('aria-label', 'Parler au micro');
    ch.append(ta, mic);
    const go = B('crea-bt go', null, () => { const t = ta.value.trim(); if (t.length < 3) { ta.focus(); toast('Dis-moi ce que tu veux changer ✏️'); return; } fabriquer('parole', t, () => { ta.value = ''; AIM.brouillon = ''; }); });
    go.append(E('span', 'lbl', 'Retoucher '), '✨ ', E('span', 'crea-prix', (AIM.prix.image | 0) + ' ' + D)); go.setAttribute('aria-label', 'Retoucher mon image'); if (!act || att) go.disabled = true;
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !TOUCH) { e.preventDefault(); go.click(); } });
    dem.append(ch, go); S.appendChild(dem); G.appendChild(S);
    // les versions
    const Vb = E('div', 'crea-carte crea-versions'), vh = E('div', 'crea-h', '🕘 VERSIONS'); vh.appendChild(E('small', '', etroit() ? '' : 'toutes gardées, reviens à n’importe laquelle')); Vb.appendChild(vh);
    Vb.appendChild(bande(c)); G.appendChild(Vb);
    // outils + mon image
    const col = E('div', 'crea-colo'), ob = E('div', 'crea-carte crea-boite'); ob.appendChild(E('div', 'crea-h', '🧰 OUTILS'));
    const gr = E('div', 'crea-grille');
    const outil = (e, t, prix, bg, fn, off) => { const b = B('crea-ot', null, fn); const ic = E('span', 'e', e); ic.style.background = bg; b.append(ic, E('b', '', t), E('span', 'crea-prix' + (prix === 'gratuit' ? ' gratuit' : prix === 'bientôt' ? ' bientot' : ''), prix)); if (off) b.disabled = true; gr.appendChild(b); };
    const libre = !!act && !att, px = (AIM.prix.image | 0) + ' ' + D;
    outil('🗣️', 'Retoucher en parlant', px, '#efe6ff', () => { ta.focus(); try { atlMicBascule(ta, mic); } catch (e) {} }, !libre);
    outil('🖌️', 'Changer le style', px, '#e2f4ff', () => styles(c), !libre);
    outil('✂️', 'Recadrer', 'gratuit', '#e5f7ea', () => recadrer(c, act), !libre);
    outil('🧽', 'Enlever un objet', 'bientôt', '#ffe9e1', null, true);
    outil('🌟', 'Ajouter un objet', 'bientôt', '#fff4cf', null, true);
    outil('🔍', 'Agrandir', 'bientôt', '#ffe6f3', null, true);
    ob.appendChild(gr); col.appendChild(ob);
    const mb = E('div', 'crea-carte crea-boite crea-actions'); mb.appendChild(E('div', 'crea-h', '📦 MON IMAGE'));
    const dl = B('crea-bt violet', '⬇️ Télécharger', () => telecharger(c, act)); if (!act) dl.disabled = true; dl.style.justifyContent = 'flex-start';
    const imp = B('crea-bt blanc', '＋ Importer une autre image', () => choisirFichier()); imp.style.justifyContent = 'flex-start';
    const rt = B('crea-bt blanc', '🗑️ Retirer cette image', () => retirerImage(c)); rt.style.justifyContent = 'flex-start';
    mb.append(dl, imp, rt); col.appendChild(mb);
    G.appendChild(col);
    O.appendChild(G);
  }
  function renderDepot(O) {
    const cfg = atelierDe(AIM.fiche), c = E('div', 'crea-carte crea-page crea-depot'), z = E('div', 'crea-zone');
    z.tabIndex = 0; z.setAttribute('role', 'button'); z.setAttribute('aria-label', cfg.ajouter);
    const im = E('img'); im.src = POSE('dessine'); im.alt = '';
    const bt = B('crea-bt', cfg.ajouter, e => { e.stopPropagation(); choisirFichier(); });
    z.append(im, E('b', '', TOUCH ? 'Ajoute ta photo' : cfg.depot), E('p', '', TOUCH ? 'Depuis ta galerie ou ton appareil photo.' : 'Glisse-la ici depuis ton ordinateur, ou choisis-la.'), bt,
      E('small', '', 'Gratuit · JPEG, PNG, WebP ou HEIC (iPhone) · 5 Mo au plus · pas de photo où l’on voit le visage d’une vraie personne'));
    z.addEventListener('click', () => choisirFichier());
    z.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choisirFichier(); } });
    depotSur(z); c.appendChild(z); O.appendChild(c);
  }
  function depotSur(el) {   // glisser-déposer une photo (PC)
    el.addEventListener('dragover', e => { if (!e.dataTransfer || ![...(e.dataTransfer.types || [])].includes('Files')) return; e.preventDefault(); el.classList.add('survol'); });
    el.addEventListener('dragleave', () => el.classList.remove('survol'));
    el.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return; e.preventDefault(); el.classList.remove('survol'); if (lectureSeule()) return; importer(f); });
  }
  // 👁️ la demande part dans la discussion du projet (gratuit, at_esp_parler) avec le chemin de la photo : {g} la regarde et répond ;
  // sa réponse s'affiche ici en commentaire, sous la photo. Tout se relit dans les messages (rien de gardé sur l'appareil)
  const RX_REGARD = /^👁️ Regarde ma photo/;
  const sansChemin = t => String(t || '').replace(/\s*\((?:e|i)\/[0-9a-f-]{36}\.(?:jpg|png|webp)\)/g, '');
  function regardDe(c) {
    const paths = new Set(c.versions.map(v => v.path).filter(Boolean));
    const dem = [...AIM.msgs].reverse().find(m => !m.pk && RX_REGARD.test(m.t) && [...paths].some(p => m.t.includes(p)));
    if (!dem) return null;
    const rep = AIM.msgs.find(m => m.pk && m.at && dem.at && m.at > dem.at && !/^(✅|⏳)/.test(m.t));
    if (rep && c.versions.some(v => v.outil !== 'import' && v.at && v.at > rep.at)) return null;   // déjà fait : la carte s'en va
    return { dem, rep };
  }
  function proposition(t) { const m = String(t).match(/je te propose\s*:?\s*([\s\S]+)/i); return sansChemin(m ? m[1] : t).replace(/[·•]?\s*\d+\s*💎/g, '').replace(/\s+/g, ' ').trim().slice(0, 380); }
  function carteRegard(c, act) {
    const K = E('div', 'crea-regard'), r = regardDe(c), px = (AIM.prix.image | 0) + ' ' + D;
    if (!r) {
      const b = B('crea-bt blanc crea-regard-go', '👁️ ' + PK() + ' regarde ma photo', () => regarder(c, act));
      K.append(b, E('small', '', 'Il te dit ce qu’il voit et ce qu’il te propose, avec le prix. Gratuit.')); return K;
    }
    const im = E('img'); im.alt = ''; im.src = POSE(r.rep ? 'idee' : 'dessine');
    const col = E('div');
    if (!r.rep) col.append(E('b', '', '👁️ ' + PK() + ' regarde ta photo…'), E('p', '', 'Il t’écrit ici ce qu’il voit et ce qu’il te propose, avec le prix. Rien n’est fait sans ton accord.'));
    else {
      col.append(E('b', '', '👁️ ' + PK() + ' a regardé ta photo'), E('p', '', sansChemin(r.rep.t)));
      const act2 = E('div', 'crea-regard-act');
      const oui = B('crea-bt', '✨ Oui, fais-le · ' + px, () => { const t = proposition(r.rep.t); if (t.length < 3) { ouvrirGuide(); return; } fabriquer('parole', t); });
      const non = B('crea-bt blanc', '💬 Je veux autre chose', () => ouvrirGuide());
      act2.append(oui, non); col.appendChild(act2);
    }
    K.classList.add('vu'); K.append(im, col); return K;
  }
  async function regarder(c, a) {
    if (!c || !a || !a.path || lectureSeule()) return;
    const t = '👁️ Regarde ma photo « ' + (c.titre || 'Mon image') + ' » (V' + a.n + ') et dis-moi ce que tu me proposes, avec le prix. (' + a.path + ')';
    const at = new Date().toISOString(); AIM.msgs.push({ t, at }); render();
    try { await rpc('at_esp_parler', { p_name: nom(), p_fiche: AIM.fiche, p_texte: t, p_micro: false }, { quiet: true }); }
    catch (e) { AIM.msgs = AIM.msgs.filter(m => m.at !== at); toast('Oups, ta demande n’est pas partie. Réessaie 🙏'); render(); return; }
    chargerMsgs().then(render);
  }
  // ✨ le résultat fini du type (atelier photo : les photos retouchées), à télécharger
  const resultats = () => { const L = []; for (const c of (AIM.d && AIM.d.creations) || []) for (const v of c.versions) if (v.etat === 'prete' && v.outil !== 'import' && v.path) L.push({ c, v }); return L.sort((a, b) => String(b.v.at || '').localeCompare(String(a.v.at || ''))); };
  function renderResultats(O) {
    const cfg = atelierDe(AIM.fiche), L = resultats(), p = E('div', 'crea-carte crea-page');
    const h = E('div', 'crea-h', '✨ ' + cfg.resultat.toUpperCase()); h.appendChild(E('small', '', L.length ? L.length + ' prête' + (L.length > 1 ? 's' : '') + ' à télécharger' : '')); p.appendChild(h);
    if (!L.length) { p.append(E('p', 'crea-vide-t', cfg.videResultat), B('crea-bt', '🖼️ Aller dans mon atelier', () => { AIM.vue = 'atelier'; render(); })); p.lastChild.style.alignSelf = 'flex-start'; O.appendChild(p); return; }
    const g = E('div', 'crea-res');
    for (const { c, v } of L) {
      const d = E('div', 'crea-resi'), i = B('i', null, () => { AIM.cur = c.id; AIM.vue = 'atelier'; AIM.mode = 'comparer'; render(); }); i.title = 'Ouvrir dans mon atelier';
      i.style.backgroundImage = 'url("' + urlImg(v.path, 500) + '")';
      const t = E('div', 't'); t.append(E('b', '', (c.titre || 'Mon image') + ' · V' + v.n), E('small', '', sansChemin(v.consigne || '')));
      d.append(i, t, B('crea-bt violet', '⬇️ Télécharger', () => telecharger(c, v))); g.appendChild(d);
    }
    p.appendChild(g); O.appendChild(p);
  }
  // 🗺️ la feuille de route du projet (la fiche que {g} remplit, comme pour un jeu)
  const ROUTE_LAB = { idee: '💡 L’idée', but: '🎯 Le but', photos: '📷 Les photos', retouches: '✨ Les retouches', style: '🎨 Le style', outils: '🧰 Les outils', prix: '💎 Les prix', resume: '📝 Le résumé' };
  function renderRoute(O) {
    const p = E('div', 'crea-carte crea-page'); p.appendChild(E('div', 'crea-h', '🗺️ LA FEUILLE DE ROUTE DE TON ATELIER'));
    const fi = (AIM.fi && AIM.fi.fiche && typeof AIM.fi.fiche === 'object') ? AIM.fi.fiche : {}, dl = E('dl', 'crea-route'); let n = 0;
    for (const [k, v] of Object.entries(fi)) {
      const t = Array.isArray(v) ? v.map(x => (x && typeof x === 'object') ? (x.nom || x.texte || '') : String(x || '')).filter(Boolean).join(' · ') : typeof v === 'string' ? v : '';
      if (!t.trim() || /^(bases|planches|assets|prix_detail)$/.test(k)) continue;
      dl.append(E('dt', '', ROUTE_LAB[k] || ('• ' + k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' '))), E('dd', '', t.trim())); n++;
    }
    if (n) p.appendChild(dl); else p.appendChild(E('p', 'crea-vide-t', 'La feuille de route se remplit avec ' + PK() + ' au fil de vos discussions.'));
    p.appendChild(E('p', 'crea-vide-t', 'Une envie de changer quelque chose ? Dis-le ' + PK() + ' : il met la feuille de route à jour.'));
    O.appendChild(p);
  }
  // 🗂️ les versions de l'ATELIER (livrées comme celles d'un jeu) ; les versions d'une photo sont dans « Mon atelier »
  function renderVersionsAt(O) {
    const p = E('div', 'crea-carte crea-page'); p.appendChild(E('div', 'crea-h', '🗂️ LES VERSIONS DE TON ATELIER'));
    const vs = (AIM.fi && Array.isArray(AIM.fi.versions) ? AIM.fi.versions.slice() : []).filter(v => v && (v.v | 0)).sort((a, b) => (b.v | 0) - (a.v | 0));
    if (!vs.length) { const n = Math.max(1, versionAt(AIM.fiche)); const r = E('div', 'crea-vat'); r.append(E('b', '', 'V' + n + ' · ton atelier'), E('p', '', 'Préparé par ' + PK() + ' pour toi. Chaque amélioration de ton atelier arrive ici comme une nouvelle version.')); p.appendChild(r); }
    for (const v of vs) {
      const d0 = new Date(v.at), r = E('div', 'crea-vat');
      r.append(E('b', '', 'V' + v.v + (isNaN(d0) ? '' : ' · ' + d0.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }))), E('p', '', String(v.note || '')));
      if (Array.isArray(v.demandes) && v.demandes.length) { const ul = E('ul'); for (const t of v.demandes.slice(0, 8)) ul.appendChild(E('li', '', String(t))); r.appendChild(ul); }
      p.appendChild(r);
    }
    O.appendChild(p);
  }
  function bande(c, grand) {
    const Bd = E('div', 'crea-bande'); if (grand) { Bd.style.flexWrap = 'wrap'; Bd.style.overflow = 'visible'; }
    for (const v of c.versions) {
      const cours = ['envoi', 'controle', 'en_cours'].includes(v.etat), rate = v.etat === 'ratee' || v.etat === 'refusee';
      const b = B('crea-vign' + (v.id === c.actuelle ? ' on' : '') + (cours ? ' cours' : '') + (rate ? ' rate' : ''), null, async () => {
        if (v.etat === 'prete' && v.id !== c.actuelle && adm()) { c.actuelle = v.id; AIM.pos = 0.5; render(); }   // vue admin : on regarde l'autre version, rien n'est écrit
        else if (v.etat === 'prete' && v.id !== c.actuelle) { try { await rpc('at_esp_choisir', { p_name: nom(), p_creation: c.id, p_version: v.id }, { quiet: true }); c.actuelle = v.id; AIM.pos = 0.5; render(); charger(); } catch (e) { toast('Oups, réessaie'); } }
        else if (rate) toast(v.etat === 'refusee' ? 'Celle-là, je n’ai pas pu la faire (crédits rendus)' : 'Celle-là a raté : tes crédits t’ont été rendus');
        else if (cours) toast('⏳ Je la fabrique… elle arrive !');
      });
      if (grand) { b.style.width = '190px'; b.style.flexBasis = '190px'; }
      const i = E('span', 'i'); const src = v.path ? urlImg(v.path, 300) : (verDe(c, v.parent) ? urlImg(verDe(c, v.parent).path, 300) : '');
      if (src) i.style.backgroundImage = 'url("' + src + '")'; if (grand) i.style.height = '110px';
      b.appendChild(i); if (cours) b.appendChild(E('span', 'crea-anneau'));
      const lib = v.outil === 'import' ? 'Originale' : v.outil === 'recadrer' ? 'Recadrée' : v.consigne || 'Retouche';
      const t = E('span', 't', 'V' + v.n + ' · ' + lib);
      t.appendChild(E('small', '', cours ? (v.etat === 'en_cours' ? 'je m’y mets… ' + v.prix + ' ' + D : 'je regarde…') : rate ? 'ratée · rendus' : v.prix ? v.prix + ' ' + D : v.outil === 'import' ? 'ta photo' : 'gratuit'));
      b.appendChild(t); Bd.appendChild(b);
    }
    return Bd;
  }
  function renderMesImages(O) {
    const cs = AIM.d.creations || [];
    const c = E('div', 'crea-carte crea-page'); c.appendChild(E('div', 'crea-h', '🖼️ MES IMAGES'));
    const g = E('div', 'crea-gimgs');
    for (const cr of cs) {
      const a = verDe(cr, cr.actuelle), n = cr.versions.filter(v => v.etat === 'prete').length;
      const b = B('crea-gimg', null, () => { AIM.cur = cr.id; AIM.vue = 'atelier'; AIM.pos = 0.5; render(); });
      const i = E('span', 'i'); if (a && a.path) i.style.backgroundImage = 'url("' + urlImg(a.path, 400) + '")';
      const t = E('span', 't', cr.titre || 'Mon image'); t.appendChild(E('small', '', n + ' version' + (n > 1 ? 's' : '')));
      b.append(i, t); g.appendChild(b);
    }
    const p = B('crea-gimg plus', null, () => choisirFichier()); p.append(E('span', '', '＋'), E('b', '', 'Importer une image'), E('span', 'crea-prix gratuit', 'gratuit')); p.lastChild.style.fontSize = '13px'; g.appendChild(p);
    c.appendChild(g); O.appendChild(c);
  }
  function renderVersions(O) {
    const c = curCrea();
    if (!c) { videImport(O, 'Pas encore de version', 'Importe une image : chaque retouche en fait une nouvelle version, toutes gardées.'); return; }
    const p = E('div', 'crea-carte crea-page'), h = E('div', 'crea-h', '🕘 VERSIONS DE « ' + (c.titre || 'Mon image').toUpperCase() + ' »'); h.appendChild(E('small', '', 'touche une version pour y revenir (gratuit)'));
    p.append(h, bande(c, true)); O.appendChild(p);
  }
  function renderReglages(O) {
    const p = E('div', 'crea-carte crea-page'); p.appendChild(E('div', 'crea-h', '⚙️ RÉGLAGES DU PROJET'));
    const l = E('label', '', 'Nom du projet'); l.style.cssText = 'font-weight:700;font-size:14px;color:#6b6280';
    const row = E('div', 'crea-dem'), ch = E('div', 'crea-champ'), inp = E('input'); inp.value = AIM.d.titre || ''; inp.maxLength = 60; inp.style.cssText = 'flex:1;border:0;outline:0;font:inherit;font-size:15px;padding:8px 0;background:none';
    ch.appendChild(inp);
    const ok = B('crea-bt violet', 'Renommer', async () => {
      const v = inp.value.trim(); if (!v || lectureSeule()) return; ok.disabled = true;
      try { await rpc('at_fiche_etape', { p_name: nom(), p_fiche: AIM.fiche, p_cle: 'titre', p_valeur: v }, { quiet: true }); AIM.d.titre = v; if (AIM.types[AIM.fiche]) AIM.types[AIM.fiche].titre = v; try { const pj = atlProjets().find(x => x.id === AIM.fiche); if (pj) pj.titre = v; } catch (e) {} toast('✏️ Projet renommé'); render(); }
      catch (e) { toast(/filtre/.test(pourquoi(e)) ? 'Ce nom-là, je ne peux pas le garder 🙈' : 'Oups, réessaie'); } finally { ok.disabled = false; }
    });
    row.append(ch, ok); p.append(l, row);
    p.appendChild(E('p', '', 'Tes images restent privées : personne d’autre ne les voit. Une nouvelle image = ' + (AIM.prix.image | 0) + ' ' + D + ' ; importer, recadrer, revenir à une version et télécharger sont gratuits.'));
    p.lastChild.style.cssText = 'margin:0;color:#6b6280;font-size:14px';
    const del = B('crea-bt rouge', '🗑️ Supprimer ce projet', () => {
      if (lectureSeule()) return;
      modal('🗑️ Supprimer « ' + (AIM.d.titre || 'ce projet') + ' » ?', 'Ce projet et toutes ses images disparaîtront. Les crédits déjà utilisés ne sont pas rendus.', [['Annuler', 'blanc', modFermer], ['Supprimer', 'rouge', async (b) => {
        b.disabled = true;
        try { await rpc('at_supprimer', { p_name: nom(), p_fiche: AIM.fiche }, { quiet: true }); delete AIM.types[AIM.fiche]; try { ATL.data.projets = ATL.data.projets.filter(x => x.id !== AIM.fiche); } catch (e) {} modFermer(); toast('🗑️ Projet supprimé'); fermerVersProjets(); }
        catch (e) { b.disabled = false; toast('Oups, réessaie'); }
      }]]);
    }); del.style.alignSelf = 'flex-start'; p.appendChild(del);
    O.appendChild(p);
  }

  // ---------- {g}, À PART ----------
  function renderMasc() {
    const P = AIM.root.querySelector('.crea-masc'), vieux = P.querySelector('.crea-fil2'), bas = vieux ? vieux.scrollHeight - vieux.scrollTop - vieux.clientHeight < 40 : true;
    const foc = !!(document.activeElement && document.activeElement.tagName === 'TEXTAREA' && AIM.root.contains(document.activeElement) && document.activeElement.closest('.crea-saisie'));
    P.textContent = '';
    AIM.root.classList.toggle('nv', AIM.vue === 'nouveau');   // pendant la création : la discussion est AU CENTRE, pas de panneau à droite
    if (AIM.vue === 'nouveau') { if (foc) setTimeout(() => { const t = AIM.root.querySelector('.crea-nv textarea'); if (t) t.focus({ preventScroll: true }); }, 0); return; }
    const t = B('crea-pkt', null, () => { if (AIM.root.classList.contains('pk-replie')) { AIM.root.classList.remove('pk-replie'); try { store.set('jdw.crea.pkreplie', false); } catch (e) {} curseur(); } });
    const im = E('img'); im.alt = ''; im.src = AV();
    const tx = E('div'); tx.append(E('b', '', PK()), E('small', '', '● en ligne · je t’écoute'));
    const rep = B('crea-pkrep', etroit() ? '✕' : '⟩', e => { e.stopPropagation(); if (etroit()) AIM.root.classList.remove('pk-plein'); else { AIM.root.classList.add('pk-replie'); try { store.set('jdw.crea.pkreplie', true); } catch (x) {} } });
    rep.setAttribute('aria-label', etroit() ? 'Retour à l’outil' : 'Replier ' + PK());
    t.append(im, tx, rep); P.appendChild(t);
    const F = E('div', 'crea-fil2'); F.setAttribute('role', 'log'); F.setAttribute('aria-live', 'polite');
    for (const m of filMasc().slice(-60)) F.appendChild(bulle(m));
    if (AIM.prop) F.appendChild(propCarte());
    P.appendChild(F);
    const S = saisie(); P.appendChild(S);
    if (bas) F.scrollTop = F.scrollHeight;
    if (foc) S.querySelector('textarea').focus({ preventScroll: true });
  }
  function bulle(m) {
    if (!m.pk) { const b = E('div', 'crea-b moi', sansChemin(m.t) || null); if (m.image) { const i = E('img', 'crea-bimg'); i.alt = 'Ton image'; i.src = m.image; b.appendChild(i); } return b; }
    const l = E('div', 'crea-lpk'), im = E('img'); im.alt = ''; im.src = m.img ? POSE(m.img) : AV();
    const b = E('div', 'crea-b');
    const tag = /^(✅|⏳)/.test(m.t);
    if (tag) { b.appendChild(E('span', 'crea-tag' + (m.t.startsWith('⏳') ? ' cours' : ''), m.t)); b.firstChild.style.marginTop = '0'; }
    else b.textContent = sansChemin(m.t);
    if (m.puces) { const p = E('div', 'crea-puces'); for (const [k, t] of m.puces) p.appendChild(B('crea-puce' + (AIM.nv && AIM.nv.choix === k ? ' on' : ''), t, () => choisirType(k))); b.appendChild(p); }
    l.append(im, b); return l;
  }
  function propCarte() {
    const c = curCrea(), a = c && verDe(c, c.actuelle);
    const l = E('div', 'crea-lpk'), im = E('img'); im.alt = ''; im.src = POSE('idee');
    const b = E('div', 'crea-b'); b.appendChild(E('span', '', 'Je le fais sur ton image' + (a ? ' (V' + a.n + ')' : '') + ' ? Ça fera une nouvelle version.'));
    const p = E('div', 'crea-puces');
    const oui = B('crea-puce on', '✨ Oui, crée-la · ' + (AIM.prix.image | 0) + ' ' + D, () => { const t = AIM.prop; AIM.prop = null; fabriquer('parole', t); });
    const non = B('crea-puce', 'Non, on discute', () => { AIM.prop = null; dire({ pk: 1, t: 'D’accord ! Je te réponds ici dès que possible 🙂' }); render(); });
    p.append(oui, non); b.appendChild(p); l.append(im, b); return l;
  }
  async function envoyerMasc(t) {
    if (AIM.vue === 'nouveau') {
      dire({ pk: 0, t });
      const k = comprendre(t);
      setTimeout(() => choisirType(k, k === 'jeu' ? t : ''), 450); render();
      return;
    }
    AIM.msgs.push({ t, at: new Date().toISOString(), pk: adm() }); render();
    try { if (adm()) await rpc('at_admin_agir', { p_name: nom(), p_fiche: AIM.fiche, p_action: 'discussion', p_args: { texte: t } }, { quiet: true }); else await rpc('at_esp_parler', { p_name: nom(), p_fiche: AIM.fiche, p_texte: t, p_micro: false }, { quiet: true }); }
    catch (e) { dire({ pk: 1, t: 'Oups, ton message n’est pas parti. Réessaie 🙏' }); render(); return; }
    const c = curCrea(), a = c && verDe(c, c.actuelle);
    if (a && !adm() && !enAttente() && !/\?\s*$/.test(t) && t.length >= 4) { AIM.prop = t; render(); }
    chargerMsgs().then(render);
  }
  const filMasc = () => (AIM.vue === 'nouveau' ? AIM.loc : AIM.msgs.concat(AIM.loc).sort((a, b) => String(a.at || '').localeCompare(String(b.at || ''))));
  function renderFlot() {
    const R = AIM.root; if (!R) return;
    const f = R.querySelector('.crea-flot'), bb = f.querySelector('.bb'), pk = f.querySelector('.pk');
    const liste = filMasc(), der = [...liste].reverse().find(m => m.pk);
    const neufs = AIM.vue === 'nouveau' ? 0 : AIM.msgs.filter(m => m.pk && m.at && +new Date(m.at) > AIM.vuAt).length;
    let i = pk.querySelector('i'); if (neufs) { if (!i) { i = E('i'); pk.appendChild(i); } i.textContent = String(Math.min(9, neufs)); } else if (i) i.remove();
    // la petite bulle : quelques secondes quand {g} dit quelque chose de neuf (jamais sur l'écran « Nouveau projet » : elle cacherait l'offre)
    const cle = AIM.prop ? 'prop' : der ? der.at + der.t : '';
    if (cle !== AIM.bulleCle) { AIM.bulleCle = cle; AIM.bulleAt = Date.now(); clearTimeout(AIM.bulleT); AIM.bulleT = setTimeout(renderFlot, 6500); }
    const t = AIM.vue === 'nouveau' || (AIM.fiche && atelierOuvert(AIM.fiche) && AIM.vue === 'atelier') || Date.now() - (AIM.bulleAt || 0) > 6000 ? '' :   // le testeur (7 nov.) : jamais par-dessus « Mon atelier » (le commentaire de {g} y est déjà)
      AIM.prop ? 'Je le fais sur ton image ? 👆' : der ? der.t.replace(/\s+/g, ' ').slice(0, 70) + (der.t.length > 70 ? '…' : '') : '';
    bb.textContent = t; bb.hidden = !t;
  }

  // ---------- actions ----------
  async function fabriquer(outil, consigne, apres) {
    const c = curCrea(); if (!c || AIM.busy || lectureSeule()) return;
    const p = AIM.prix.image | 0;
    if (typeof AIM.solde === 'number' && AIM.solde < p) { manque(p); return; }
    const cle = 'jdw.crea.okprix.' + nom();
    let ok = false; try { ok = !!store.get(cle, false) || (AIM.d && AIM.d.deja_paye); } catch (e) {}
    if (!ok) {
      modal('✨ Créer une nouvelle image ?', 'Une nouvelle image = ' + p + ' ' + D + '.' + (typeof AIM.solde === 'number' ? ' Il te restera ' + (AIM.solde - p) + ' ' + D + '.' : '') + ' Ta version d’avant reste gardée, et si ça rate, tes crédits te sont rendus.',
        [['Annuler', 'blanc', modFermer], ['✨ Oui, crée-la', '', () => { try { store.set(cle, true); } catch (e) {} modFermer(); fabriquer(outil, consigne, apres); }]]);
      return;
    }
    AIM.busy = true;
    try {
      const r = await rpc('at_esp_fabriquer', { p_name: nom(), p_creation: c.id, p_outil: outil, p_consigne: consigne }, { quiet: true });
      if (typeof r.solde === 'number') { AIM.solde = r.solde; bougerCred(); }
      if (apres) apres();
      AIM.root.classList.remove('pk-plein');
      await Promise.all([charger(), chargerMsgs()]); render();
    } catch (e) {
      const m = pourquoi(e);
      if (/credits insuffisants/.test(m)) manque(p);
      else dire({ pk: 1, t: /filtre/.test(m) ? 'Ça, je ne peux pas le faire 🙈 Essaie autre chose ! (Rien n’a été dépensé.)' : /deja en cours/.test(m) ? 'Je fabrique déjà une version de cette image : attends qu’elle arrive ⏳' : /aujourd hui/.test(m) ? 'Tu as créé beaucoup d’images aujourd’hui ! Reviens demain 🙂' : /trop de versions/.test(m) ? 'Cette image a déjà beaucoup de versions : importe-la de nouveau pour continuer.' : /consigne vide/.test(m) ? 'Dis-moi un peu plus ce que tu veux changer ✏️' : 'Oups, ça n’a pas marché (rien n’a été dépensé). Réessaie dans un moment 🙏' });
      render();
    } finally { AIM.busy = false; }
  }
  function manque(p) {
    const s = typeof AIM.solde === 'number' ? AIM.solde : 0;
    modal('💎 Il te manque des crédits', 'Une nouvelle image = ' + p + ' ' + D + ', et tu en as ' + s + '. Tu peux recharger tes crédits.', [['Plus tard', 'blanc', modFermer], ['💎 Recharger', 'violet', () => { modFermer(); try { atlRecharger(); } catch (e) {} }]]);
  }
  const STYLES = [['anime', '🎬', 'Dessin animé'], ['aquarelle', '🎨', 'Aquarelle'], ['pixel', '👾', 'Pixel'], ['manga', '🌸', 'Manga'], ['peinture', '🖼️', 'Peinture'], ['bd', '💬', 'BD'],
    ['crayon', '✏️', 'Crayons de couleur'], ['nuit', '🌙', 'Nuit étoilée'], ['soir', '🌅', 'Coucher de soleil'], ['neige', '❄️', 'Neige']];
  function styles(c) {
    const M = modOuvrir(true);
    M.append(E('h2', '', '🖌️ Changer le style'), E('p', '', 'Choisis un style : ton image est redessinée avec. Chaque style = une nouvelle version (' + (AIM.prix.image | 0) + ' ' + D + ').'));
    const g = E('div', 'crea-styles');
    for (const [k, e, t] of STYLES) { const b = B('crea-sty', null, () => { modFermer(); fabriquer('style', k); }); b.append(E('span', 'e', e), E('span', '', t)); g.appendChild(b); }
    M.appendChild(g);
    const r = E('div', 'crea-mbt'); r.appendChild(B('crea-bt blanc', 'Fermer', modFermer)); M.appendChild(r);
    setTimeout(() => { const b = g.querySelector('button'); if (b) b.focus(); }, 30);
    void c;
  }
  async function importer(file) {
    if (!AIM.fiche || AIM.busy || lectureSeule()) return; AIM.busy = true;
    dire({ pk: 1, t: 'Je reçois ta photo… 📸' }); render();
    try {
      const blob = await jpegDe(file);
      const r = await rpc('at_esp_importer', { p_name: nom(), p_fiche: AIM.fiche, p_titre: null }, { quiet: true });
      await deposer(r.path, blob);
      await rpc('at_esp_envoye', { p_name: nom(), p_version: r.version }, { quiet: true });
      AIM.cur = r.creation; AIM.vue = 'atelier'; AIM.mode = 'comparer';
      dire({ pk: 1, t: 'Je regarde ta photo… 👀 (quelques secondes)' });
      await charger(); render();
    } catch (e) {
      const m = pourquoi(e);
      dire({ pk: 1, t: /heic/.test(m) ? 'Cette photo d’iPhone (format HEIC) ne s’ouvre pas ici : choisis-la depuis « Photos », ou fais-en une capture d’écran 📸' : /trop lourde/.test(m) ? 'Cette image est trop lourde (5 Mo au plus) : essaie une autre 🙂' : /illisible|pas une image/.test(m) ? 'Seulement des images JPEG, PNG ou WebP (photo, capture d’écran, dessin…).' : /trop d imports/.test(m) ? 'Tu as importé beaucoup d’images aujourd’hui : reviens demain 🙂' : /trop d images/.test(m) ? 'Ce projet a déjà beaucoup d’images : retires-en une ou commence un nouveau projet.' : 'Oups, ta photo n’est pas arrivée. Réessaie 🙏' });
      render();
    } finally { AIM.busy = false; }
  }
  async function jpegDe(file) {
    try { return await atlJpeg(file); } catch (e) {
      if (!/pas une image|illisible/.test(pourquoi(e)) || !file || file.size > 15 * 1024 * 1024 || typeof createImageBitmap !== 'function') throw e;
      let bm; try { bm = await createImageBitmap(file); } catch (x) { throw new Error(/heic|heif/i.test(String(file.type || '') + String(file.name || '')) ? 'heic' : 'pas une image'); }
      let w = bm.width, h = bm.height; const k = Math.min(1, 1600 / Math.max(w, h)); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(bm, 0, 0, w, h); try { bm.close(); } catch (x) {}
      for (const qy of [0.86, 0.72, 0.58]) { const b = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', qy)); if (b && b.size <= 1400000) return b; }
      throw new Error('image trop lourde');
    }
  }
  async function deposer(path, blob) {
    if (!/^e\/[0-9a-f-]{36}\.jpg$/.test(String(path || ''))) throw new Error('réponse');
    const tok = await acctToken(profile);
    const up = await netFetch(base() + '/storage/v1/object/atelier/' + path, { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + tok, 'Content-Type': 'image/jpeg' }, body: blob }, 60000);
    if (!up.ok) throw new Error('envoi ' + up.status);
  }
  function recadrer(c, act) {
    if (lectureSeule()) return;
    if (!act || !act.path) return;
    const M = modOuvrir(true);
    M.append(E('h2', '', '✂️ Recadrer'), E('p', '', 'Tire le cadre ou ses coins. Gratuit : ça fait une nouvelle version.'));
    const Z = E('div', 'crea-crop'), im = E('img'); im.alt = ''; im.crossOrigin = 'anonymous'; im.src = urlImg(act.path); im.draggable = false;
    const r = E('div', 'r'); for (let k = 0; k < 4; k++) r.appendChild(E('i'));
    Z.append(im, r); M.appendChild(Z);
    let q = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }, ratio = 0;
    const place = () => { r.style.left = q.x * 100 + '%'; r.style.top = q.y * 100 + '%'; r.style.width = q.w * 100 + '%'; r.style.height = q.h * 100 + '%'; };
    const fixe = () => {   // garder le rapport choisi (largeur / hauteur de l'IMAGE)
      if (!ratio || !im.naturalWidth) return;
      const k = ratio * im.naturalHeight / im.naturalWidth; let w = q.w, h = w / k;
      if (h > 1) { h = 1; w = h * k; } if (w > 1) { w = 1; h = w / k; }
      const cx = q.x + q.w / 2, cy = q.y + q.h / 2; q.w = w; q.h = h; q.x = Math.min(1 - w, Math.max(0, cx - w / 2)); q.y = Math.min(1 - h, Math.max(0, cy - h / 2));
    };
    im.addEventListener('load', () => { fixe(); place(); });
    place();
    let g = null;
    const pt = e => { const b = Z.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height }; };
    Z.addEventListener('pointerdown', e => { const p = pt(e), k = [...r.children].indexOf(e.target); g = { p, q: Object.assign({}, q), k: e.target.parentElement === r ? k : e.target === r ? -1 : -2 }; if (g.k === -2) { g = null; return; } try { Z.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    Z.addEventListener('pointermove', e => {
      if (!g) return; const p = pt(e), dx = p.x - g.p.x, dy = p.y - g.p.y, o = g.q, mn = 0.08;
      if (g.k === -1) { q.x = Math.min(1 - o.w, Math.max(0, o.x + dx)); q.y = Math.min(1 - o.h, Math.max(0, o.y + dy)); }
      else {
        let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
        if (g.k === 0 || g.k === 2) x0 = Math.min(x1 - mn, Math.max(0, x0 + dx)); else x1 = Math.max(x0 + mn, Math.min(1, x1 + dx));
        if (g.k === 0 || g.k === 1) y0 = Math.min(y1 - mn, Math.max(0, y0 + dy)); else y1 = Math.max(y0 + mn, Math.min(1, y1 + dy));
        q = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        if (ratio && im.naturalWidth) { const k = ratio * im.naturalHeight / im.naturalWidth; q.h = Math.min(1 - q.y, q.w / k); q.w = q.h * k; }
      }
      place();
    });
    const lacher = () => { g = null; }; Z.addEventListener('pointerup', lacher); Z.addEventListener('pointercancel', lacher);
    const rr = E('div', 'crea-ratios');
    for (const [t, v] of [['Libre', 0], ['Carré', 1], ['4:3', 4 / 3], ['16:9', 16 / 9], ['Téléphone', 9 / 16]]) {
      const b = B('crea-puce' + (v === ratio ? ' on' : ''), t, () => { ratio = v; for (const x of rr.children) x.classList.toggle('on', x === b); fixe(); place(); }); rr.appendChild(b);
    }
    M.appendChild(rr);
    const bt = E('div', 'crea-mbt'), ok = B('crea-bt', null, async () => {
      if (AIM.busy) return; AIM.busy = true; ok.disabled = true;
      try {
        const W = im.naturalWidth, H = im.naturalHeight; if (!W) throw new Error('image');
        const sx = Math.round(q.x * W), sy = Math.round(q.y * H), sw = Math.max(8, Math.round(q.w * W)), sh = Math.max(8, Math.round(q.h * H)), k = Math.min(1, 1600 / Math.max(sw, sh));
        const cv = document.createElement('canvas'); cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
        let blob = null; for (const qy of [0.88, 0.76, 0.62]) { blob = await new Promise(okb => cv.toBlob(okb, 'image/jpeg', qy)); if (blob && blob.size <= 1400000) break; }
        if (!blob || blob.size > 1400000) throw new Error('trop lourde');
        const r2 = await rpc('at_esp_recadrer', { p_name: nom(), p_creation: c.id }, { quiet: true });
        await deposer(r2.path, blob);
        await rpc('at_esp_envoye', { p_name: nom(), p_version: r2.version }, { quiet: true });
        modFermer(); AIM.mode = 'comparer'; AIM.pos = 0.5; toast('✂️ Recadrée : V' + r2.n);
        await charger(); render();
      } catch (e) { toast('Oups, le recadrage n’a pas marché. Réessaie 🙏'); ok.disabled = false; }
      finally { AIM.busy = false; }
    });
    ok.append('✂️ Recadrer ', E('span', 'crea-prix', 'gratuit'));
    bt.append(B('crea-bt blanc', 'Annuler', modFermer), ok); M.appendChild(bt);
  }
  async function telecharger(c, a) {
    if (!a || !a.path) return;
    const u = urlImg(a.path), ext = (a.path.match(/\.(png|jpg|webp)$/) || [, 'jpg'])[1];
    const nomf = (String(c.titre || 'image').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'image') + '-v' + a.n + '.' + ext;
    try {
      const r = await fetch(u); if (!r.ok) throw new Error('http ' + r.status);
      const b = await r.blob();
      const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (ios) {   // Safari d'iPhone ignore souvent « download » : la feuille de partage propose « Enregistrer l'image »
        try { const fl = new File([b], nomf, { type: b.type || 'image/jpeg' }); if (navigator.canShare && navigator.canShare({ files: [fl] })) { await navigator.share({ files: [fl], title: c.titre || 'Mon image' }); return; } }
        catch (x) { if (x && x.name === 'AbortError') return; }
        try { window.open(u, '_blank', 'noopener'); } catch (x) {} toast('Appuie longuement sur l’image pour l’enregistrer 📲'); return;
      }
      const o = URL.createObjectURL(b), l = document.createElement('a'); l.href = o; l.download = nomf; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(o), 20000);
      toast('⬇️ Image téléchargée');
    } catch (e) { try { window.open(u, '_blank', 'noopener'); } catch (x) {} }
  }
  function renommerImage(c) {
    if (lectureSeule()) return;
    const M = modOuvrir(); M.appendChild(E('h2', '', '✏️ Renommer l’image'));
    const ch = E('div', 'crea-champ'), inp = E('input'); inp.value = c.titre || ''; inp.maxLength = 60; inp.style.cssText = 'flex:1;border:0;outline:0;font:inherit;font-size:15px;padding:8px 0;background:none'; ch.appendChild(inp); M.appendChild(ch);
    const ok = B('crea-bt violet', 'Renommer', async () => { const v = inp.value.trim(); if (!v) return; try { await rpc('at_esp_image', { p_name: nom(), p_creation: c.id, p_titre: v }, { quiet: true }); c.titre = v; modFermer(); render(); } catch (e) { toast('Ce nom-là, je ne peux pas le garder 🙈'); } });
    const r = E('div', 'crea-mbt'); r.append(B('crea-bt blanc', 'Annuler', modFermer), ok); M.appendChild(r);
    setTimeout(() => inp.focus(), 30);
  }
  function retirerImage(c) {
    if (lectureSeule()) return;
    modal('🗑️ Retirer « ' + (c.titre || 'cette image') + ' » ?', 'L’image et toutes ses versions disparaissent de ton atelier. Les crédits déjà utilisés ne sont pas rendus.', [['Annuler', 'blanc', modFermer], ['Retirer', 'rouge', async (b) => {
      b.disabled = true; try { await rpc('at_esp_image', { p_name: nom(), p_creation: c.id, p_retirer: true }, { quiet: true }); modFermer(); AIM.cur = null; await charger(); render(); } catch (e) { b.disabled = false; toast('Oups, réessaie'); }
    }]]);
  }

  // ---------- petites fenêtres ----------
  function modOuvrir(large) {
    const M = AIM.root.querySelector('.crea-mod'); M.textContent = ''; M.hidden = false;
    const c = E('div', 'crea-mcarte' + (large ? ' large' : '')); M.appendChild(c);
    M.onclick = e => { if (e.target === M) modFermer(); };
    return c;
  }
  function modFermer() { const M = AIM.root && AIM.root.querySelector('.crea-mod'); if (M) { M.hidden = true; M.textContent = ''; } }
  function modal(titre, texte, boutons) {
    const c = modOuvrir(); c.append(E('h2', '', titre), E('p', '', texte));
    const r = E('div', 'crea-mbt'); let der = null;
    for (const [t, cls, fn] of boutons) { const b = B('crea-bt' + (cls ? ' ' + cls : ''), t); b.addEventListener('click', () => fn(b)); r.appendChild(b); der = b; }
    c.appendChild(r); setTimeout(() => der && der.focus(), 30);
  }

  addEventListener('resize', () => { if (AIM.open) { clearTimeout(AIM.rz); AIM.rz = setTimeout(render, 150); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && AIM.open && AIM.fiche) Promise.all([charger(), chargerMsgs()]).then(render); });
})();
