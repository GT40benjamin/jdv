/* ================= 💎 Gagner des crédits =================
   Glissé par build2.py à la fin de la grande fonction de shell2.js (même portée : rpc, profile, GAMES, CHRONO_TRACKS, atlEl, store…).
   Tout gain est décidé par le serveur (source/gagner-credits.sql) : la page lit le résultat, elle ne dit jamais combien donner.
   Les « surcharges » (rpc, mountGame, jdwBack) gardent shell2.js quasi intact : l'équipe Interface peut y travailler sans conflit. */
const GC = { st: null, adm: null, carte: null, ouvert: false, file: [], grand: false, regie: null, pending: false, bulle: null, nomCarte: null, jeu: null, course: null, sim: new Set() };   // sim : gains simulés du mode test (rien sur le serveur)
const GC_ALIAS = { sensinterdit: 'sensinterdit-km', pleingaz: 'pleingaz-1vie' };   // la tuile → le score qui compte au classement mondial
const gcNom = () => (typeof profile !== 'undefined' && profile.name) || '';
const gcPasCompte = () => isGuest() || !gcNom();
const gcNb = n => (+n || 0).toLocaleString('fr-FR');
const gcEl = (t, c, x) => atlEl(t, c, x);
const gcBt = (c, x, f) => { const b = gcEl('button', c, x); b.type = 'button'; if (f) b.addEventListener('click', f); return b; };
function gcTitre(id) { const g = GAMES.find(x => x.id === id || GC_ALIAS[x.id] === id); return g ? (typeof atlTitre === 'function' ? atlTitre(g) : g.title) : id; }
function gcJeu(id) { return GAMES.find(x => x.id === id || GC_ALIAS[x.id] === id) || null; }
function gcCircuit(t) { const c = CHRONO_TRACKS.find(x => x[0] === t); return c ? c[1] : t; }

// ---------- les crochets, sans toucher à shell2.js ----------
GUEST_RPC.add('gc_records_carte');   // le sigle 🏆 se voit aussi en invité
CREA_RPC.add('gc_partie_debut');     // mode créateur : rien n'est enregistré
const gcRpc0 = rpc;
rpc = async function (fn, args, opts) {
  const r = await gcRpc0.call(this, fn, args, opts);
  if (fn === 'add_score' || fn === 'chrono_save') setTimeout(gcApresScore, 500);   // le serveur a déjà décidé : on regarde s'il y a quelque chose à annoncer
  if ((fn === 'chrono_ghost' || fn === 'chrono_save') && args && args.p_track) GC.course = args.p_track;
  return r;
};
const gcMount0 = mountGame;
mountGame = function (g) { GC.jeu = g ? g.id : null; GC.course = null; gcPartie(g && g.id); return gcMount0.apply(this, arguments); };
const gcOpen0 = openGame;
openGame = function (g) { GC.jeu = g ? g.id : null; GC.course = null; const r = gcOpen0.apply(this, arguments); setTimeout(gcJauge, 60); return r; };   // la jauge se voit dès l'ouverture du jeu, écran-titre compris
const gcBack0 = jdwBack;
jdwBack = function () { if (gcFermerHaut()) return true; return gcBack0.apply(this, arguments); };

// ---------- le bouton ----------
function gcCreerBouton(cls) {
  const b = gcBt('gc-btn ' + (cls || ''), '', e => { GC.ouvreur = e.currentTarget; gcOuvrir(); }); b.setAttribute('aria-label', 'Gagner des crédits');
  b.append(gcEl('span', 'gc-btn-ic', '💎'), gcEl('span', 'gc-btn-t', 'Gagner des crédits'), gcEl('span', 'gc-btn-c', 'Gagner'));
  return b;
}
// « à l'endroit du bouton Admin pour les non-admins, à côté de lui pour les admins » : juste devant 🛡️ Admin, ou devant les crédits s'il n'y en a pas
function gcDans(bar, cred, adm, cls) {
  if (!bar || !cred) return; const ici = adm || cred; let b = bar.querySelector(':scope > .gc-btn');
  if (!b) { b = gcCreerBouton(cls); ici.before(b); } else if (b.nextElementSibling !== ici) ici.before(b);
}
function gcBouton() {
  const voir = GC.carte && GC.carte.actif && !(typeof CREA !== 'undefined' && CREA);
  if (!voir) { document.querySelectorAll('.gc-btn').forEach(b => b.remove()); return; }
  if ($('jdw-me') && !document.getElementById('jdw-gc-btn')) { const b = gcCreerBouton(''); b.id = 'jdw-gc-btn'; $('jdw-me').before(b); }
  const vis = e => !!e && e.checkVisibility();
  const admAtl = [...document.querySelectorAll('.atl-bar .atl-adminbt')].find(vis), cred = [...document.querySelectorAll('.crea-cred')].find(vis);
  for (const c of document.querySelectorAll('.crea-cred')) { if (admAtl) { const b = c.parentElement.querySelector(':scope > .gc-btn'); if (b) b.remove(); } else gcDans(c.parentElement, c, c.parentElement.querySelector(':scope > .crea-admbt'), 'gc-btn-crea'); }
  for (const c of document.querySelectorAll('.atl-bar .atl-cred')) { const adm = c.parentElement.querySelector(':scope > .atl-adminbt'); if (vis(adm) || !cred) gcDans(c.parentElement, c, adm, 'gc-btn-atl'); else { const b = c.parentElement.querySelector(':scope > .gc-btn'); if (b) b.remove(); } }
}

// ---------- le menu ----------
const gcTexteErreur = w => ({ code: 'Ce code n’existe pas.', deja: 'Ton compte a déjà un parrain.', soi: 'Tu ne peux pas être ton propre parrain.', ancien: 'Le parrainage est réservé aux nouveaux comptes.', complet: 'Ce parrain a déjà tous ses filleuls.', test: '🧪 Mode test : rien n’est enregistré.', coupe: 'Le parrainage est en pause.' }[w] || 'Ça n’a pas marché, réessaie.');

async function gcOuvrir() {
  if (GC.ouvert) return; GC.ouvert = true;
  const V = gcEl('div', 'gc-voile'); V.id = 'jdw-gc'; V.setAttribute('role', 'dialog'); V.setAttribute('aria-modal', 'true'); V.setAttribute('aria-label', 'Gagner des crédits');
  const B = gcEl('div', 'gc-boite'), H = gcEl('div', 'gc-tete'), Ti = gcEl('div', 'gc-titre');
  Ti.append(gcEl('h2', '', '💎 Gagner des crédits'));
  const so = gcEl('b', 'gc-solde'); so.hidden = true; Ti.append(so);
  const X = gcBt('gc-x', '✕', gcFermer); X.setAttribute('aria-label', 'Fermer');
  H.append(Ti, X); const C = gcEl('div', 'gc-corps'); C.tabIndex = -1; B.append(H, C); V.append(B); document.body.appendChild(V);
  V.addEventListener('click', e => { if (e.target === V) gcFermer(); });
  V._esc = e => { if (e.key === 'Escape' && !GC.video) gcFermer(); }; document.addEventListener('keydown', V._esc);
  GC.corps = C; GC.solde = so; X.focus({ preventScroll: true });
  C.appendChild(gcEl('p', 'gc-charge', 'Chargement…'));
  gcRecharger();
  GC.majMenu = setInterval(gcMajMenu, 30000);   // reste à jour tout seul tant que le menu est ouvert
}
function gcFermer() {
  const V = document.getElementById('jdw-gc'); if (!V) return false;
  document.removeEventListener('keydown', V._esc); V.remove(); GC.ouvert = false; gcBulleFerme();
  clearInterval(GC.majMenu); const b = GC.ouvreur && GC.ouvreur.isConnected ? GC.ouvreur : $('jdw-gc-btn'); if (b) b.focus({ preventScroll: true }); return true;
}
function gcFermerHaut() {
  const G = document.querySelector('.gc-grand'); if (G) { G._fin(); return true; }
  if (GC.video) { GC.video(); return true; }
  if (GC.bulle) { gcBulleFerme(); return true; }
  if (document.getElementById('jdw-gc')) return gcFermer();
  return false;
}
async function gcRecharger() {
  const C = GC.corps; if (!C || !document.getElementById('jdw-gc')) return;
  if (gcPasCompte()) { gcRenduInvite(C); return; }
  try {
    const [st, carte] = await Promise.all([rpc('gc_etat', { p_name: gcNom() }, { quiet: true }), gcCarte()]);
    GC.st = st; GC.carte = carte || GC.carte;
    if (!st || !st.actif) { C.textContent = ''; C.appendChild(gcEl('p', 'gc-vide', 'Cette section est fermée pour le moment.')); return; }
    if (st.admin) { try { GC.adm = await rpc('gc_admin_etat', { p_name: gcNom() }, { quiet: true }); } catch (e) { GC.adm = null; } } else GC.adm = null;
    gcRendu(C);
  } catch (e) {
    C.textContent = ''; C.appendChild(gcEl('p', 'gc-vide', netOff() ? '📡 Il faut du réseau pour gagner des crédits.' : 'Le serveur ne répond pas pour le moment.'));
    C.appendChild(gcBt('gc-bt gc-bt2', 'Réessayer', gcRecharger));
  }
}
function gcRenduInvite(C) {
  C.textContent = '';
  const s = gcEl('section', 'gc-sec');
  s.append(gcEl('h3', '', 'Crée ton compte pour gagner des crédits'), gcEl('p', 'gc-p', 'Regarde des pubs, parraine tes amis et bats les records du monde : chaque gain arrive sur ton compte.'));
  s.appendChild(gcBt('gc-bt', 'Créer un compte', () => { gcFermer(); $('jdw-guest-new').click(); }));
  C.appendChild(s);
}
function gcRendu(C) {
  const st = GC.st; C.textContent = '';
  if (GC.solde) { GC.solde.hidden = false; GC.solde.textContent = gcNb(st.solde) + ' 💎'; }
  GC.etat = gcEl('p', 'gc-etat'); GC.etat.setAttribute('role', 'status'); GC.etat.hidden = true; C.appendChild(GC.etat);
  if (gcTest()) C.appendChild(gcEl('p', 'gc-test gc-test-haut', '🧪 Mode test, visible seulement par toi : gains et compteurs simulés, aucun crédit réel n’est versé.'));
  GC.secRecap = gcSectionRecap(st); GC.secRec = gcSectionRecords(st);
  C.append(GC.secRecap, gcSectionPub(st), gcSectionParrain(st), GC.secRec);
  if (GC.adm) C.appendChild(gcSectionAdmin());
}
const gcTest = () => !!(GC.st && GC.st.actif && GC.st.ouvert === false);
const gcDeja = (k, r) => !!(r && r.deja) || GC.sim.has(k);   // gagné aujourd'hui : vrai, ou simulé en mode test
// ce qui reste à gagner aujourd'hui sur les records
function gcReste() {
  const ca = GC.carte || {}, R = (GC.st && GC.st.records) || {}, gj = R.gain_jeu || ca.gain_jeu || 0, gc = R.gain_course || ca.gain_course || 0;
  const js = Object.entries(ca.jeux || {}), cs = Object.entries(ca.courses || {});
  const rj = js.filter(([id, r]) => !gcDeja(id, r)).length, rc = cs.filter(([id, r]) => !gcDeja('c:' + id, r)).length;
  return { gj, gc, nj: js.length, nc: cs.length, rj, rc };
}
// 4. le récapitulatif : le gain, la limite et ce qui reste aujourd'hui, ligne par ligne (tout vient du serveur : les réglages changent, le texte suit)
function gcSectionRecap(st) {
  const s = gcEl('section', 'gc-sec'), P = st.pub, Pa = st.parrain, Re = gcReste(), test = gcTest() ? ' (test)' : '';
  s.appendChild(gcEl('h3', '', '✨ Ce que tu peux gagner'));
  const t = gcEl('div', 'gc-recap'); t.setAttribute('role', 'table');
  const ligne = (a, g, l, r, cls) => { const d = gcEl('div', 'gc-ligne' + (cls ? ' ' + cls : '')); d.setAttribute('role', 'row'); for (const [c, x] of [['q', a], ['g', g], ['l', l], ['r', r]]) { const e = gcEl('span', 'gc-r' + c, x); e.setAttribute('role', 'cell'); d.appendChild(e); } t.appendChild(d); };
  const h = gcEl('div', 'gc-ligne gc-rh'); h.setAttribute('role', 'row'); for (const x of ['', 'Gain', 'Limite', 'Reste aujourd’hui']) { const e = gcEl('span', '', x); e.setAttribute('role', 'columnheader'); h.appendChild(e); } t.appendChild(h);
  const left = Math.max(0, P.max - P.faites), libres = Math.max(0, Pa.max - Pa.recompenses), sansPack = (Pa.liste || []).filter(f => f.ok && !f.achat).length;
  ligne('🎬 Une pub', P.courte.credits + ' ou ' + P.longue.credits + ' 💎', P.max + ' par jour', left + ' pub' + (left > 1 ? 's' : '') + test);
  ligne('🤝 Parrainer un ami', Pa.gain + ' 💎 chacun', Pa.max + ' filleuls au total', libres + ' filleul' + (libres > 1 ? 's' : '') + ' possible' + (libres > 1 ? 's' : ''));
  ligne('🛍️ Pack acheté par ton filleul', '+' + Pa.gain_achat + ' 💎', '1 fois par filleul', sansPack ? sansPack + ' filleul' + (sansPack > 1 ? 's' : '') + ' sans pack' : 'aucun pour l’instant');
  ligne('🏆 Record d’un jeu', Re.gj + ' 💎', 'par jeu et par jour', Re.nj ? Re.rj + ' jeu' + (Re.rj > 1 ? 'x' : '') + ' · ' + gcNb(Re.rj * Re.gj) + ' 💎' + test : 'aucun jeu ouvert');
  ligne('🏁 Record d’une course', Re.gc + ' 💎', 'par course et par jour', Re.nc ? Re.rc + ' course' + (Re.rc > 1 ? 's' : '') + ' · ' + gcNb(Re.rc * Re.gc) + ' 💎' + test : 'aucune course ouverte');
  s.appendChild(t); return s;
}
// la mise à jour toute seule : le récapitulatif et les records seulement, sans perdre ce qu'on est en train de taper ou de toucher
async function gcMajMenu() {
  if (!GC.corps || !document.getElementById('jdw-gc') || gcPasCompte() || GC.busy) return;
  try {
    const [st] = await Promise.all([rpc('gc_etat', { p_name: gcNom() }, { quiet: true }), gcCarte()]);
    if (!st || !st.actif || !GC.st || !GC.secRecap || !GC.secRecap.isConnected) return;
    GC.st = st; if (GC.solde) GC.solde.textContent = gcNb(st.solde) + ' 💎';
    const a = gcSectionRecap(st); GC.secRecap.replaceWith(a); GC.secRecap = a;
    if (!GC.secRec.contains(document.activeElement)) { const b = gcSectionRecords(st); GC.secRec.replaceWith(b); GC.secRec = b; }
  } catch (e) {}
}
function gcDire(t, kind) { const e = GC.etat; if (!e) return; e.hidden = !t; e.textContent = t || ''; e.className = 'gc-etat' + (kind ? ' ' + kind : ''); if (t) e.scrollIntoView({ block: 'nearest' }); }

// ---------- 1. les pubs ----------
const gcAppli = () => !!window.BorneApp;   // l'appli Android : la régie du site n'y marche pas (AdMob à brancher dans une version de l'appli)
function gcSectionPub(st) {
  const P = st.pub, s = gcEl('section', 'gc-sec'), left = Math.max(0, P.max - P.faites);
  const h = gcEl('div', 'gc-sech'); h.append(gcEl('h3', '', '🎬 Regarde une pub'), gcEl('span', 'gc-pastille', P.faites + ' / ' + P.max + ' aujourd’hui')); s.appendChild(h);
  s.appendChild(gcEl('p', 'gc-p', 'Tu choisis de regarder une pub : le gain arrive à la fin.'));
  const appli = gcAppli() && !P.test;
  if (P.test && P.dispo && !gcTest()) s.appendChild(gcEl('p', 'gc-test', '🧪 Mode test, visible seulement par les admins : ce ne sont pas de vraies pubs et aucun crédit n’est versé.'));
  const g = gcEl('div', 'gc-pubs');
  for (const [so, nom] of [['courte', 'Pub courte'], ['longue', 'Pub longue']]) {
    const v = P[so], b = gcBt('gc-pub', '', () => gcRegarder(so)); b.disabled = !P.dispo || !left || appli;
    const tx = gcEl('span', 'gc-pub-t'); tx.append(gcEl('b', '', nom), gcEl('small', '', '≈ ' + v.duree + ' s'));
    b.append(tx, gcEl('span', 'gc-gain', '+' + v.credits + ' 💎' + (P.test ? ' test' : ''))); g.appendChild(b);
  }
  s.appendChild(g);
  if (appli) s.appendChild(gcEl('p', 'gc-p gc-petit', 'Bientôt dans l’appli. En attendant, les pubs se regardent sur le site.'));
  else if (!P.dispo) s.appendChild(gcEl('p', 'gc-p gc-petit', 'Bientôt disponible.'));
  else if (!left) s.appendChild(gcEl('p', 'gc-p gc-petit', 'C’est tout pour aujourd’hui. Reviens demain !'));
  return s;
}
function gcChargerRegie(client, test) {
  if (GC.regie && GC.regie.client === client) return GC.regie.p;
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.requestNonPersonalizedAds = 1;   // pubs non personnalisées : il y a des enfants parmi les joueurs
  window.adBreak = window.adConfig = o => { window.adsbygoogle.push(o); };
  const p = new Promise((ok, no) => {
    const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(client);
    s.setAttribute('data-ad-client', client); s.setAttribute('data-ad-frequency-hint', '30s');
    s.setAttribute('data-tag-for-child-directed-treatment', '1'); s.setAttribute('data-tag-for-age-treatment', '1');
    if (test) s.setAttribute('data-adbreak-test', 'on');
    s.onload = () => ok(); s.onerror = () => no(new Error('regie')); document.head.appendChild(s);
  });
  GC.regie = { client, p }; return p;
}
function gcPubGoogle(sorte) {
  return new Promise(fin => {
    let vu = false, ok = false, t = setTimeout(() => { if (!ok) fin('aucune'); }, 12000);
    window.adBreak({ type: 'reward', name: 'gc-' + sorte,
      beforeReward: show => { ok = true; clearTimeout(t); show(); },
      adDismissed: () => { vu = false; }, adViewed: () => { vu = true; },
      adBreakDone: info => { clearTimeout(t); fin(vu ? 'vue' : (info && info.breakStatus === 'dismissed' ? 'coupee' : 'aucune')); } });
  });
}
function gcPubDemo(t) {   // sans identifiant de régie : une minuterie qui dit clairement ce que c'est. Jamais présentée comme une pub.
  return new Promise(fin => {
    const V = gcEl('div', 'gc-demo'); V.setAttribute('role', 'dialog'); V.setAttribute('aria-modal', 'true'); V.setAttribute('aria-label', 'Essai de vidéo');
    const b = gcEl('div', 'gc-demo-b'), n = gcEl('b', 'gc-demo-n', String(t.duree)), bar = gcEl('i'), jauge = gcEl('div', 'gc-demo-j');
    jauge.appendChild(bar); const quit = gcBt('gc-bt gc-bt2', 'Arrêter (sans gain)', () => stop('coupee'));
    b.append(gcEl('p', 'gc-test', '🧪 Mode test'), gcEl('h3', '', 'Ceci n’est pas une vraie pub'), gcEl('p', 'gc-p', 'Cet écran remplace la vidéo tant que la régie n’est pas branchée. Aucun crédit n’est versé.'), n, jauge, quit);
    V.appendChild(b); document.body.appendChild(V); quit.focus({ preventScroll: true });
    const t0 = Date.now(), iv = setInterval(() => { const r = t.duree - (Date.now() - t0) / 1000; n.textContent = String(Math.max(0, Math.ceil(r))); bar.style.width = Math.min(100, (1 - r / t.duree) * 100) + '%'; if (r <= 0) stop('vue'); }, 200);
    const stop = k => { clearInterval(iv); V.remove(); GC.video = null; fin(k); };
    GC.video = () => stop('coupee');
  });
}
async function gcRegarder(sorte) {
  if (GC.busy) return; GC.busy = true; gcDire('');
  let t = null;
  try {
    t = await rpc('gc_pub_debut', { p_name: gcNom(), p_sorte: sorte });
    if (!t || !t.ok) { gcDire({ plafond: 'Tu as regardé toutes les pubs d’aujourd’hui. Reviens demain !', en_cours: 'Une pub est déjà en cours.', bientot: 'Bientôt disponible.' }[t && t.why] || 'Pub indisponible pour le moment.'); return; }
    const P = GC.st.pub; let r;
    if (P.regie && !gcAppli()) {
      await gcChargerRegie(P.regie, P.test); r = await gcPubGoogle(sorte);
    } else if (P.test) r = await gcPubDemo(t);
    else r = 'aucune';
    if (r !== 'vue') {
      await rpc('gc_pub_annuler', { p_name: gcNom(), p_id: t.id }, { quiet: true }).catch(() => {});
      gcDire(r === 'coupee' ? 'Pub arrêtée : pas de gain cette fois.' : 'Aucune pub disponible pour le moment. Réessaie plus tard.'); return;
    }
    const f = await rpc('gc_pub_fin', { p_name: gcNom(), p_id: t.id });
    if (f && f.ok) {
      if (f.test) gcDire('🧪 Test réussi : +' + f.simule + ' 💎 simulés, aucun crédit versé.', 'ok');
      else gcDire('Bravo ! +' + f.credits + ' 💎 ajoutés à ton compte.', 'ok');
      gcMajSolde(f.solde);
    } else gcDire(f && f.why === 'trop_tot' ? 'Cette pub était trop courte : pas de gain.' : 'Le gain n’a pas pu être validé.', 'non');
  } catch (e) {
    if (t && t.id) rpc('gc_pub_annuler', { p_name: gcNom(), p_id: t.id }, { quiet: true }).catch(() => {});
    gcDire('Pub indisponible pour le moment.', 'non');
  } finally { GC.busy = false; const m = GC.etat && GC.etat.textContent, k = GC.etat && GC.etat.className; await gcRecharger(); if (m && GC.etat) { GC.etat.hidden = false; GC.etat.textContent = m; GC.etat.className = k; } }
}
function gcMajSolde(s) {   // le compteur de la borne suit tout de suite
  if (s == null) return; if (GC.solde) GC.solde.textContent = gcNb(s) + ' 💎';
  try { const cr = typeof atlCred === 'function' && atlCred(); if (cr) { cr.solde = s; for (const q of ['.atl-cred', '.crea-cred']) document.querySelectorAll(q).forEach(c => { c.textContent = atlCredTxt(s); }); } } catch (e) {}
}

// ---------- 2. le parrainage ----------
const gcLien = code => location.origin + location.pathname + '?parrain=' + code;
function gcSectionParrain(st) {
  const P = st.parrain, s = gcEl('section', 'gc-sec');
  const h = gcEl('div', 'gc-sech'); h.append(gcEl('h3', '', '🤝 Parraine tes amis'), gcEl('span', 'gc-pastille', P.recompenses + ' / ' + P.max + ' filleuls')); s.appendChild(h);
  s.appendChild(gcEl('p', 'gc-p', '+' + P.gain + ' 💎 pour toi et +' + P.gain_filleul + ' 💎 pour ton ami, quand il a vérifié son compte et créé quelque chose (ou dépensé ' + P.depense_min + ' 💎). +' + P.gain_achat + ' 💎 pour toi s’il achète un pack.'));
  const box = gcEl('div', 'gc-code'), lab = gcEl('div', 'gc-code-t'); lab.append(gcEl('small', '', 'Ton code'), gcEl('b', '', P.code));
  const copie = gcBt('gc-bt gc-bt2', 'Copier', async () => { const ok = await gcCopier(gcLien(P.code)); gcDire(ok ? 'Lien copié !' : gcLien(P.code), ok ? 'ok' : ''); });
  const part = gcBt('gc-bt', 'Partager', async () => {
    const texte = 'Viens jouer à la Borne d’arcade avec moi ! Avec mon code ' + P.code + ', on gagne ' + P.gain_filleul + ' 💎 chacun.';
    if (navigator.share && TOUCH) { try { await navigator.share({ title: 'Borne d’arcade', text: texte, url: gcLien(P.code) }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const ok = await gcCopier(gcLien(P.code)); gcDire(ok ? 'Lien copié : envoie-le à ton ami !' : gcLien(P.code), ok ? 'ok' : '');
  });
  const bs = gcEl('div', 'gc-code-b'); bs.append(copie, part); box.append(lab, bs); s.appendChild(box);
  if (P.liste && P.liste.length) {
    const ul = gcEl('ul', 'gc-liste');
    for (const f of P.liste.slice(0, 10)) { const li = gcEl('li'); li.append(gcEl('span', '', dispName(f.nom)), gcEl('small', f.ok ? 'gc-vert' : '', f.achat ? '✓ récompensé + pack' : f.ok ? '✓ récompensé' : 'en attente')); ul.appendChild(li); }
    s.appendChild(ul);
  }
  if (P.mon_parrain) s.appendChild(gcEl('p', 'gc-p gc-petit', 'Ton parrain : ' + dispName(P.mon_parrain) + (P.mon_parrain_ok ? ' ✓' : ' (ton cadeau arrive quand ton compte est vérifié et que tu as créé quelque chose)')));
  else {
    const f = gcEl('form', 'gc-form'), i = gcEl('input', 'gc-input'); i.type = 'text'; i.maxLength = 12; i.placeholder = 'Un ami t’a donné un code ?'; i.autocomplete = 'off'; i.spellcheck = false; i.setAttribute('aria-label', 'Code de parrainage');
    const ok = gcBt('gc-bt gc-bt2', 'Valider'); ok.type = 'submit'; f.append(i, ok);
    f.addEventListener('submit', async e => {
      e.preventDefault(); const v = i.value.trim(); if (!v) return; ok.disabled = true;
      try { const r = await rpc('gc_parrain_lier', { p_name: gcNom(), p_code: v }); if (r && r.ok) { store.set('jdw.gc.parrain', null); gcDire('Code accepté, parrain : ' + dispName(r.parrain) + ' !', 'ok'); gcRecharger(); } else gcDire(gcTexteErreur(r && r.why), 'non'); }
      catch (x) { gcDire('Le serveur ne répond pas.', 'non'); }
      ok.disabled = false;
    });
    s.appendChild(f);
  }
  return s;
}
async function gcCopier(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
  try { const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch (e) { return false; }
}
// le lien ?parrain=CODE : gardé jusqu'à la connexion, puis envoyé une seule fois au serveur (qui vérifie tout)
function gcLienRecu() {
  try {
    const sp = new URLSearchParams(location.search), c = (sp.get('parrain') || '').toUpperCase();
    if (/^[A-Z0-9]{4,12}$/.test(c)) { store.set('jdw.gc.parrain', c); sp.delete('parrain'); const q = sp.toString(); history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash); }
  } catch (e) {}
}
async function gcLienEnvoyer() {
  const c = store.get('jdw.gc.parrain', null); if (!c || gcPasCompte() || GC.pending || !GC.carte || GC.carte.test) return;
  GC.pending = true;
  try { const r = await rpc('gc_parrain_lier', { p_name: gcNom(), p_code: c }, { quiet: true }); if (r && (r.ok || ['deja', 'soi', 'ancien', 'complet', 'code'].includes(r.why))) store.set('jdw.gc.parrain', null); } catch (e) {}
  GC.pending = false;
}

// ---------- 3. les records ----------
function gcSectionRecords(st) {
  const R = st.records, s = gcEl('section', 'gc-sec'), ca = GC.carte || {};
  s.appendChild(gcEl('h3', '', '🏆 Bats les records du monde'));
  s.appendChild(gcEl('p', 'gc-p', '+' + R.gain_jeu + ' 💎 par jeu d’arcade, une fois par jour. +' + R.gain_course + ' 💎 par course, une fois par jour. Il faut au moins ' + R.min + ' joueurs sur le jeu ou la course. Cherche le sigle 🏆 !'));
  if (!R.auto && !gcTest()) s.appendChild(gcEl('p', 'gc-p gc-petit', 'Sur les jeux à score, le gain arrive une fois le record vérifié par l’équipe. Les courses sont vérifiées tout de suite.'));
  const L = [], ul = gcEl('ul', 'gc-liste gc-rec');
  for (const [id, x] of Object.entries(ca.jeux || {})) L.push({ k: id, titre: gcTitre(id), v: gcNb(x.record), nom: x.nom, gain: ca.gain_jeu, deja: gcDeja(id, x), g: gcJeu(id) });
  for (const [t, x] of Object.entries(ca.courses || {})) L.push({ k: 'c' + t, titre: gcCircuit(t), v: chronoMs(x.record), nom: x.nom, gain: ca.gain_course, deja: gcDeja('c:' + t, x), g: gcJeu('chrono') });
  L.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
  if (!L.length) { s.appendChild(gcEl('p', 'gc-p gc-petit', 'Aucun jeu n’a encore assez de joueurs.')); return s; }
  for (const x of L) {
    const li = gcEl('li'), b = gcBt('gc-rec-b', '', () => { if (x.g) { gcFermer(); openGame(x.g); } });
    const t = gcEl('span', 'gc-rec-t'); t.append(gcEl('b', '', x.titre), gcEl('small', '', 'Record : ' + x.v + ' · ' + dispName(x.nom)));
    b.append(t, gcEl('span', x.deja ? 'gc-rec-d' : 'gc-gain', x.deja ? '✓ aujourd’hui' : '+' + x.gain + ' 💎')); li.appendChild(b); ul.appendChild(li);
  }
  s.appendChild(ul);
  return s;
}

// ---------- 4. l'admin (le seul endroit avec des euros) ----------
function gcSectionAdmin() {
  const A = GC.adm, s = gcEl('section', 'gc-sec gc-admin');
  s.appendChild(gcEl('h3', '', '🛡️ Admin'));
  const M = A.par_motif || {}, nom = { gc_pub: 'Vidéos', gc_parrain: 'Parrains', gc_filleul: 'Filleuls', gc_parrain_achat: 'Bonus packs', gc_record: 'Records', gc_course: 'Courses' };
  s.appendChild(gcEl('p', 'gc-p', '💎 donnés ce mois : ' + gcNb(A.donnes_mois) + ' · coût maximum si tout est dépensé en images : ' + (A.cout_max_centimes / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'));
  const det = Object.keys(M).map(k => (nom[k] || k) + ' ' + gcNb(M[k])).join(' · '); if (det) s.appendChild(gcEl('p', 'gc-p gc-petit', det));
  s.appendChild(gcEl('p', 'gc-p gc-petit', 'Revenus publicitaires : aucun (régie pas encore branchée).'));
  if (A.attente && A.attente.length) {
    s.appendChild(gcEl('h4', '', 'Records à vérifier'));
    const ul = gcEl('ul', 'gc-liste');
    for (const r of A.attente) {
      const li = gcEl('li', 'gc-av'), t = gcEl('span', 'gc-rec-t'); t.append(gcEl('b', '', dispName(r.joueur) + ' · ' + gcTitre(r.jeu)), gcEl('small', '', gcNb(r.score) + ' (ancien : ' + gcNb(r.ancien) + ' · ' + dispName(r.ancien_nom || '') + ') +' + r.credits + ' 💎'));
      const oui = gcBt('gc-bt', '✓ Payer', () => gcAdminRecord(r.id, true)), non = gcBt('gc-bt gc-bt2', '✕ Refuser', () => gcAdminRecord(r.id, false));
      const bs = gcEl('div', 'gc-code-b'); bs.append(oui, non); li.append(t, bs); ul.appendChild(li);
    }
    s.appendChild(ul);
  }
  const f = gcEl('form', 'gc-form'), i = gcEl('input', 'gc-input'); i.type = 'text'; i.placeholder = 'Identifiant Google : ca-pub-…'; i.value = (A.regie && A.regie.adsense) || ''; i.autocomplete = 'off'; i.spellcheck = false; i.setAttribute('aria-label', 'Identifiant de la régie Google');
  const ok = gcBt('gc-bt gc-bt2', 'Enregistrer'); ok.type = 'submit'; f.append(i, ok);
  f.addEventListener('submit', async e => {
    e.preventDefault(); ok.disabled = true;
    try { const r = await rpc('gc_admin_regie', { p_name: gcNom(), p_adsense: i.value.trim(), p_admob_app: (A.regie && A.regie.admob_app) || '', p_admob_recompense: (A.regie && A.regie.admob_recompense) || '' }); gcDire(r && r.ok ? 'Identifiant enregistré.' : 'Identifiant mal écrit (ca-pub- suivi de chiffres).', r && r.ok ? 'ok' : 'non'); if (r && r.ok) gcRecharger(); }
    catch (x) { gcDire('Le serveur ne répond pas.', 'non'); }
    ok.disabled = false;
  });
  s.appendChild(f);
  s.appendChild(gcEl('p', 'gc-p gc-petit', A.ouvert === false ? 'Section fermée aux joueurs (réglage gagner_credits_ouvert = 0).' : A.pub_test ? 'Pubs : mode test (réglage gc_pub_test).' : 'Pubs : ouvertes aux joueurs.'));
  if (A.ouvert === false) {
    s.appendChild(gcEl('h4', '', '🧪 Essayer (simulation)'));
    s.appendChild(gcEl('p', 'gc-p gc-petit', 'Montre le grand message et fait bouger les jauges sur cet appareil. Rien n’est enregistré.'));
    const bs = gcEl('div', 'gc-code-b gc-sim'), ca = GC.carte || {};
    const prem = o => Object.keys(o || {})[0];
    const go = g => { GC.file.push(Object.assign({ test: true, score: 12345, ancien: 12000, ancien_nom: 'SAMBA' }, g)); gcFermer(); gcGrandSuivant(); };
    bs.append(gcBt('gc-bt gc-bt2', 'Record d’un jeu', () => { const k = Object.keys(ca.jeux || {}).find(i => !GC.sim.has(i)) || prem(ca.jeux); if (k) GC.sim.add(k); go({ sorte: 'jeu', jeu: k || 'neon', credits: (ca.gain_jeu || 20), etat: 'paye' }); }),
      gcBt('gc-bt gc-bt2', 'Record d’une course', () => { const k = Object.keys(ca.courses || {}).find(i => !GC.sim.has('c:' + i)) || prem(ca.courses) || 'stade'; GC.sim.add('c:' + k); go({ sorte: 'course', jeu: 'chrono', niveau: k, credits: (ca.gain_course || 10), etat: 'paye', score: 22000, ancien: 23000 }); }),
      gcBt('gc-bt gc-bt2', 'En attente de vérification', () => go({ sorte: 'jeu', jeu: prem(ca.jeux) || 'neon', credits: (ca.gain_jeu || 20), etat: 'attente' })));
    s.appendChild(bs);
  }
  return s;
}
async function gcAdminRecord(id, ok) {
  try { await rpc('gc_admin_record', { p_name: gcNom(), p_id: id, p_ok: ok }); gcDire(ok ? 'Record payé.' : 'Record refusé.', 'ok'); } catch (e) { gcDire('Le serveur ne répond pas.', 'non'); }
  gcRecharger();
}

// ---------- le grand message ----------
async function gcApresScore() {
  if (gcPasCompte() || !ONLINE || netOff() || !GC.carte || GC.carte.test) return;
  try { const L = await rpc('gc_mes_gains', { p_name: gcNom() }, { quiet: true, quiet404: true }); if (Array.isArray(L) && L.length) { GC.file.push(...L); gcGrandSuivant(); gcCarte(); } } catch (e) {}
}
function gcGrandSuivant() {
  if (GC.grand) return; const g = GC.file.shift(); if (!g) return; GC.grand = true;
  const V = gcEl('div', 'gc-grand'); V.setAttribute('role', 'alertdialog'); V.setAttribute('aria-modal', 'true'); V.setAttribute('aria-label', 'Record mondial battu');
  const b = gcEl('div', 'gc-grand-b'), course = g.sorte === 'course', quoi = course ? gcCircuit(g.niveau) : gcTitre(g.jeu), val = v => course ? chronoMs(v) : gcNb(v);
  b.append(gcEl('div', 'gc-grand-ic', '🏆'), gcEl('h2', '', 'Record mondial battu !'));
  if (g.test) b.appendChild(gcEl('p', 'gc-test', '🧪 Test : aucun crédit versé'));
  if (g.etat === 'paye') b.appendChild(gcEl('p', 'gc-grand-g', '+' + g.credits + ' 💎'));
  else b.appendChild(gcEl('p', 'gc-grand-a', 'Tes ' + g.credits + ' 💎 arrivent dès que l’équipe a vérifié ton score.'));
  b.appendChild(gcEl('p', 'gc-p', quoi + ' : ' + val(g.score) + (g.ancien_nom ? ' (ancien record : ' + val(g.ancien) + ' · ' + dispName(g.ancien_nom) + ')' : '')));
  const ok = gcBt('gc-bt', 'Super !', () => V._fin()); b.appendChild(ok); V.appendChild(b); document.body.appendChild(V); ok.focus({ preventScroll: true });
  const t = setTimeout(() => V._fin(), 9000);
  V._fin = () => { clearTimeout(t); V.remove(); GC.grand = false; gcGrandSuivant(); };
  gcCarte();
}

// ---------- le sigle 🏆 ----------
// une partie qui commence : on attend la première réponse du serveur si elle n'est pas encore là (sinon un record battu tôt serait refusé sans explication)
async function gcPartie(id) {
  try {
    if (!id || gcPasCompte() || !ONLINE || netOff()) return;
    if (!GC.carteVue) await gcCarte();
    if (GC.carte && !GC.carte.test) await rpc('gc_partie_debut', { p_name: gcNom(), p_jeu: id }, { quiet: true, quiet404: true });
  } catch (e) {}
}
function gcCarte() {   // un seul appel à la fois
  if (!GC.carteP) GC.carteP = gcCarte1().finally(() => { GC.carteP = null; });
  return GC.carteP;
}
async function gcCarte1() {
  GC.nomCarte = gcNom();
  try {
    const c = await rpc('gc_records_carte', { p_name: gcPasCompte() ? '' : gcNom() }, { quiet: true, quiet404: true });
    GC.carte = c && c.actif ? c : null; GC.carteVue = true;
    gcBouton(); gcSigles(); gcJauge(); return c;
  } catch (e) { return null; }
}
function gcBulleFerme() { if (GC.bulle) { GC.bulle.remove(); GC.bulle = null; } }
function gcBulle(a, x) {
  gcBulleFerme();
  const B = gcEl('div', 'gc-bulle'); B.setAttribute('role', 'tooltip');
  B.append(gcEl('b', '', '🏆 Record mondial : +' + x.gain + ' 💎'), gcEl('span', '', x.sans ? x.v : 'Record actuel : ' + x.v)); if (!x.sans) B.append(gcEl('span', '', 'Détenteur : ' + dispName(x.nom))); B.append(gcEl('small', '', x.deja ? '✓ Déjà gagné aujourd’hui' : x.course ? 'Une fois par jour et par course' : 'Une fois par jour'));
  document.body.appendChild(B);
  const r = a.getBoundingClientRect(), w = B.offsetWidth, h = B.offsetHeight;
  B.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
  B.style.top = (r.bottom + 8 + h > innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8) + 'px';
  GC.bulle = B;
}
function gcSigleEl(x, cls) {
  const b = gcBt('gc-sigle ' + (cls || ''), x.jauge ? '🏆 ' + x.jauge : '🏆', e => { e.stopPropagation(); e.preventDefault(); if (GC.bulle && GC.bulle._a === b) { if (TOUCH) gcBulleFerme(); } else { gcBulle(b, x); GC.bulle._a = b; } });   // à la souris, le survol l'a déjà ouverte : le clic ne la referme pas
  for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'touchstart', 'touchend']) b.addEventListener(ev, e => e.stopPropagation());   // le toucher du sigle ne lance pas le jeu ni le circuit
  b.setAttribute('aria-label', 'Record mondial : +' + x.gain + ' crédits. ' + (x.sans ? x.v : 'Record actuel ' + x.v + ' par ' + dispName(x.nom)) + (x.deja ? '. Déjà gagné aujourd’hui.' : '.'));
  if (!TOUCH) { b.addEventListener('mouseenter', () => { if (!GC.bulle) { gcBulle(b, x); GC.bulle._a = b; } }); b.addEventListener('mouseleave', gcBulleFerme); }
  if (x.deja) b.classList.add('deja');
  return b;
}
// pose le sigle seulement s'il a changé : sinon l'observateur de la page se relancerait sans fin
function gcPose(parent, x, cls, sel) {
  const old = parent.querySelector(sel || ':scope > .gc-sigle'), k = x ? JSON.stringify(x) + cls : '';
  if (old && old._k === k) return; if (old) old.remove(); if (!x) return;
  const e = gcSigleEl(x, cls); e._k = k; parent.appendChild(e);
}
const gcNormeTitre = t => String(t || '').replace(/[’']/g, '’').trim().toLowerCase();
function gcPlacerTuile(w) {   // le 🏆 juste après le nom du jeu
  const n = w.querySelector('.tile-name'), e = w.querySelector(':scope > .gc-sur-tuile'); if (!n || !e) return;
  const rg = document.createRange(); rg.selectNodeContents(n); const t = rg.getBoundingClientRect(), wr = w.getBoundingClientRect(), box = n.getBoundingClientRect();
  if (!t.width) return;
  const left = Math.min(t.right, box.right - 22) - wr.left + 5, top = t.top - wr.top + t.height / 2 - 11;
  e.style.left = Math.round(left) + 'px'; e.style.top = Math.round(top) + 'px';
}
function gcSigles() {
  const ca = GC.carte;
  if (!ca) { document.querySelectorAll('.gc-sigle').forEach(e => { const w = e.closest('.tile-wrap'); if (w) w.classList.remove('gc-a-sigle'); e.remove(); }); return; }
  if ($('jdw-lib') && !$('jdw-lib').hidden) for (const w of document.querySelectorAll('#jdw-grid .tile-wrap')) {   // les tuiles des jeux
    const t = w.querySelector(':scope > .tile'); if (!t) continue;
    const g = GAMES.find(y => 'Jouer à ' + y.title === t.getAttribute('aria-label')); let x = null;
    if (g && g.id === 'chrono') { const ids = Object.keys(ca.courses || {}); if (ids.length) x = { gain: ca.gain_course, v: ids.length > 1 ? ids.length + ' courses avec un record à battre' : gcCircuit(ids[0]), nom: '', sans: true, deja: ids.every(i => gcDeja('c:' + i, ca.courses[i])), course: true }; }
    else if (g) { const id = ca.jeux[GC_ALIAS[g.id]] ? GC_ALIAS[g.id] : g.id, r = ca.jeux[id]; if (r) x = { gain: ca.gain_jeu, v: gcNb(r.record), nom: r.nom, deja: gcDeja(id, r) }; }
    gcPose(w, x, 'gc-sur-tuile'); w.classList.toggle('gc-a-sigle', !!x); if (x) gcPlacerTuile(w);
  }
  for (const c of document.querySelectorAll('.chb-col')) {   // les colonnes des circuits dans le classement
    const m = [...c.classList].find(k => k.startsWith('chb-') && k !== 'chb-col'), h = c.querySelector('h3'); if (!m || !h) continue;
    const r = (ca.courses || {})[m.slice(4)]; gcPose(h, r ? { gain: ca.gain_course, v: chronoMs(r.record), nom: r.nom, deja: gcDeja('c:' + m.slice(4), r), course: true } : null, 'gc-sur-titre');
  }
  if (!$('jdw-play').hidden) for (const h of document.querySelectorAll('#jdw-play .tc-veil h3')) {   // l'écran de choix des circuits de Turbo Chrono : le 🏆 et ce qui reste, course par course
    const tr = CHRONO_TRACKS.find(c => gcNormeTitre(c[1]) === gcNormeTitre(h.childNodes[0] && h.childNodes[0].textContent || h.textContent)); if (!tr) continue;
    const r = (ca.courses || {})[tr[0]], d = gcDeja('c:' + tr[0], r);
    gcPose(h, r ? { gain: ca.gain_course, v: chronoMs(r.record), nom: r.nom, deja: d, course: true, jauge: (d ? ca.gain_course : 0) + ' / ' + ca.gain_course + ' 💎' + (ca.test ? ' test' : '') } : null, 'gc-sur-titre');
  }
}
// ---------- la jauge pendant le jeu : discrète, jamais sur un bouton, ne capte aucun toucher ----------
function gcJaugeDonnees() {
  const ca = GC.carte, id0 = GC.jeu; if (!ca || !id0 || $('jdw-play').hidden) return null;
  if (id0 === 'chrono') {
    const ids = Object.keys(ca.courses || {}); if (!ids.length) return null;
    const menu = !!document.querySelector('#jdw-play .tc-veil h3');
    if (!menu && GC.course) { const r = ca.courses[GC.course]; if (!r) return null; return { t: gcCircuit(GC.course), g: gcDeja('c:' + GC.course, r) ? ca.gain_course : 0, m: ca.gain_course }; }
    return { t: 'Record mondial', g: ids.filter(i => gcDeja('c:' + i, ca.courses[i])).length * ca.gain_course, m: ids.length * ca.gain_course };
  }
  const id = ca.jeux[GC_ALIAS[id0]] ? GC_ALIAS[id0] : id0, r = ca.jeux[id]; if (!r) return null;
  return { t: 'Record mondial', g: gcDeja(id, r) ? ca.gain_jeu : 0, m: ca.gain_jeu };
}
function gcJauge() {
  let J = document.getElementById('jdw-gc-jauge'); const d = gcJaugeDonnees();
  if (!d) { if (J) J.remove(); $('jdw-play').classList.remove('gc-sans-titre'); return; }
  if (!J) {
    J = gcEl('div', 'gc-jauge'); J.id = 'jdw-gc-jauge'; J.setAttribute('aria-hidden', 'true');
    J.append(gcEl('span', 'gc-j-t'), gcEl('i', 'gc-j-b'), gcEl('span', 'gc-j-v')); J.children[1].appendChild(gcEl('b'));
    $('jdw-play').appendChild(J);
  }
  J.children[0].textContent = '🏆 ' + d.t; J.children[2].textContent = d.g + ' / ' + d.m + ' 💎' + (GC.carte.test ? ' test' : '');
  J.children[1].firstChild.style.width = (d.m ? Math.min(100, d.g / d.m * 100) : 0) + '%';
  gcJaugePlace(J);
}
// place la jauge en haut à droite, puis la décale tant qu'elle touche un bouton de la borne ou du jeu
function gcJaugePlace(J) {
  const bar = document.querySelector('#jdw-play .topbar'), br = bar && bar.getBoundingClientRect(), enBarre = br && br.width > innerWidth * .6 && br.height < 90;
  const court = innerWidth < 760 || innerHeight < 500; J.classList.toggle('court', court);
  const w = J.offsetWidth, h = J.offsetHeight; let right = innerWidth - 8, top = enBarre ? br.top + (br.height - h) / 2 : 8;
  const els = [...document.querySelectorAll('#jdw-play button, #jdw-play a[href], #jdw-play [role=button]')].filter(e => e.getClientRects().length && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden').map(e => e.getBoundingClientRect()).filter(r => r.width > 2 && r.height > 2 && r.left < innerWidth && r.top < 140);
  for (let k = 0; k < 12; k++) {
    const hit = els.find(r => r.left < right + 6 && r.right > right - w - 6 && r.top < top + h + 4 && r.bottom > top - 4);
    if (!hit) break; right = hit.left - 6;
  }
  const x = Math.max(4, right - w);
  J.style.left = Math.round(x) + 'px'; J.style.top = Math.round(top) + 'px';
  let surTitre = false;
  if (enBarre) for (const t of [$('jdw-gtitle'), $('jdw-recline')]) {
    if (!t || t.hidden) continue; const rg = document.createRange(); rg.selectNodeContents(t); const r = rg.getBoundingClientRect();
    if (r.width && r.left < x + w + 4 && r.right > x - 4) surTitre = true;
  }
  $('jdw-play').classList.toggle('gc-sans-titre', surTitre);
}

// ---------- départ ----------
(() => {
  gcLienRecu();
  let t = 0; const refait = () => { clearTimeout(t); t = setTimeout(() => { gcBouton(); gcSigles(); }, 180); };
  new MutationObserver(refait).observe(document.body, { childList: true, subtree: true });
  addEventListener('resize', refait); try { document.fonts.ready.then(refait); } catch (e) {}
  document.addEventListener('pointerdown', e => { if (GC.bulle && !e.target.closest('.gc-bulle, .gc-sigle')) gcBulleFerme(); });
  // Turbo Chrono : la course choisie (la jauge passe à « cette course »)
  document.addEventListener('click', e => { const c = e.target.closest && e.target.closest('#jdw-play .tc-veil *'); if (!c || c.closest('.gc-sigle')) return; let n = c; while (n && n !== document.body && !n.querySelector('h3')) n = n.parentElement; const h = n && n.querySelector && n.querySelector('h3'), tr = h && CHRONO_TRACKS.find(x => gcNormeTitre(x[1]) === gcNormeTitre(h.childNodes[0].textContent)); if (tr) GC.course = tr[0]; }, true);
  setTimeout(async () => { await gcCarte(); gcLienEnvoyer(); gcApresScore(); }, 3500);   // après la carte : c'est elle qui dit si la section est ouverte
  setInterval(() => { if (GC.carte && !GC.carte.test) gcLienEnvoyer(); }, 45000);
  setInterval(() => { if (gcNom() !== GC.nomCarte) gcCarte(); if (GC.jeu) gcJauge(); }, 1500);   // changement de joueur ; la jauge suit le jeu ouvert
  setInterval(() => { if (GC.carte && !document.hidden) gcCarte(); }, 60000);                   // reste à jour tout seul
})();
