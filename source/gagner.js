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
function gcTitre(id) { const g = GAMES.find(x => x.id === id || GC_ALIAS[x.id] === id) || (window.JDW_GAMES || {})[id]; return g ? (typeof atlTitre === 'function' ? atlTitre(g) : g.title) || g.title || id : id; }
function gcJeu(id) { return GAMES.find(x => x.id === id || GC_ALIAS[x.id] === id) || null; }
function gcCircuit(t) { const c = CHRONO_TRACKS.find(x => x[0] === t); return c ? c[1] : t; }

// ---------- les crochets, sans toucher à shell2.js ----------
GUEST_RPC.add('gc_records_carte');   // le sigle 🏆 se voit aussi en invité
CREA_RPC.add('gc_partie_debut');     // mode créateur : rien n'est enregistré
const gcRpc0 = rpc;
rpc = async function (fn, args, opts) {
  const r = await gcRpc0.call(this, fn, args, opts);
  if (fn === 'add_score' || fn === 'chrono_save' || fn === 'put_level_best') setTimeout(gcApresScore, 500);   // le serveur a déjà décidé : on regarde s'il y a quelque chose à annoncer
  if ((fn === 'chrono_ghost' || fn === 'chrono_save') && args && args.p_track) GC.course = args.p_track;
  return r;
};
const gcMount0 = mountGame;
mountGame = function (g) { GC.jeu = g ? g.id : null; GC.course = null; gcPartie(g && g.id); return gcMount0.apply(this, arguments); };
const gcOpen0 = openGame;
openGame = function (g) { GC.jeu = g ? g.id : null; GC.course = null; const r = gcOpen0.apply(this, arguments); setTimeout(gcJauge, 60); return r; };   // la jauge se voit dès l'ouverture du jeu, écran-titre compris
// le lien de la salle (bouton « Inviter ») et le partage de la borne partent avec le jeton du joueur
const gcInv0 = invMake;
invMake = async function () { gcNoteInvite(); if (INV.link) INV.link = INV.link.replace(/&parrain=[^&]*$/, ''); const r = await gcInv0.apply(this, arguments); gcLienSalle(); return r; };
function gcLienSalle() { if (GC.code && INV.link && !/[?&]parrain=/.test(INV.link)) { INV.link += '&parrain=' + GC.code; invShareLink(INV.link); } }
// une ligne dans la fenêtre de la salle, seulement si le joueur peut encore gagner (section ouverte, moins de 10 amis)
async function gcNoteInvite() {
  let n = document.getElementById('jdw-gc-invnote');
  if (!n) { const lk = $('jdw-invshare-link'); if (!lk) return; n = gcEl('p', 'gc-inv-note'); n.id = 'jdw-gc-invnote'; n.hidden = true; lk.before(n); }
  try {
    const st = !gcPasCompte() && GC.carte && !GC.carte.test ? await rpc('gc_etat', { p_name: gcNom() }, { quiet: true, quiet404: true }) : null, P = st && st.actif && st.ouvert && st.parrain;
    n.hidden = !(P && P.recompenses < P.max);
    if (!n.hidden) n.textContent = '+' + P.gain + ' 💎 chacun quand un copain s’inscrit avec ce lien et vérifie son compte';
  } catch (e) { n.hidden = true; }
}
const GC_SHARE0 = SHARE.borne.path;
async function gcMonCode() {
  const nom = gcNom();
  if (!GC.carte || gcPasCompte()) { GC.code = null; GC.codeNom = null; SHARE.borne.path = GC_SHARE0; return; }
  if (GC.code && GC.codeNom === nom) return;
  try { const c = await rpc('gc_mon_code', { p_name: nom }, { quiet: true, quiet404: true }); if (c && nom === gcNom()) { GC.code = c; GC.codeNom = nom; SHARE.borne.path = GC_SHARE0 + '&parrain=' + c; gcLienSalle(); } } catch (e) {}
}
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
  const so = gcBt('gc-solde', '', gcAchat); so.hidden = true; so.title = 'Acheter des crédits'; so.setAttribute('aria-label', 'Mes crédits : acheter des crédits'); Ti.append(so);
  const es = gcEl('span', 'gc-essai', '🧪 Essai'); es.hidden = true; es.title = 'Visible seulement par les admins : aucun crédit réel'; Ti.append(es); GC.essai = es;
  const X = gcBt('gc-x', '✕', gcFermer); X.setAttribute('aria-label', 'Fermer');
  H.append(Ti, X); const C = gcEl('div', 'gc-corps'); C.tabIndex = -1; B.append(H, C); V.append(B); document.body.appendChild(V);
  V.addEventListener('click', e => { if (e.target === V) gcFermer(); });
  V._esc = e => { if (e.key === 'Escape' && !GC.video) gcFermerHaut(); }; document.addEventListener('keydown', V._esc);
  GC.corps = C; GC.solde = so; X.focus({ preventScroll: true });
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
  if (GC.achat) { const m = document.querySelector('.atl-ofmod'); if (m) { if (m._fermer) m._fermer(); else m.remove(); } else GC.achat(); return true; }
  if (GC.bulle) { gcBulleFerme(); return true; }
  if (GC.vue === 'niveaux') { gcVueRecords('jeux'); return true; }
  if (GC.vue && GC.corps) { gcRendu(GC.corps); return true; }
  if (document.getElementById('jdw-gc')) return gcFermer();
  return false;
}
// l'ouverture : les 5 tuiles tout de suite (grisées, avec les derniers gains connus), le reste derrière ; si le serveur traîne ou ne répond pas, on le dit
const GC_ST0 = { c: 3, l: 5, p: 100, j: 20, k: 10 };
const gcCleApercu = () => 'jdw.gc.apercu.' + gcNom();
function gcZone(C, txt, bouton) {
  let z = C.querySelector(':scope > .gc-charge-z'); if (!z) { z = gcEl('div', 'gc-charge-z'); C.appendChild(z); }
  z.textContent = ''; z.appendChild(gcEl('p', 'gc-charge', txt));
  if (bouton) z.appendChild(gcBt('gc-bt gc-bt2', 'Réessayer', gcRecharger));
}
function gcApercu(C) {
  const m = Object.assign({}, GC_ST0, store.get(gcCleApercu(), null) || {});
  C.textContent = ''; GC.vue = null;
  if (GC.solde && m.solde != null) { GC.solde.hidden = false; GC.solde.textContent = gcNb(m.solde) + ' 💎'; }
  const c = gcTuiles({ pub: { courte: { credits: m.c }, longue: { credits: m.l }, dispo: true, test: true, faites: 0, max: 10 }, parrain: { gain: m.p, recompenses: 0, max: 10 }, records: { gain_jeu: m.j, gain_course: m.k } });
  c.classList.add('gc-apercu');
  for (const b of c.querySelectorAll('.gc-tuile')) { b.disabled = true; const n = b.querySelector('.gc-t-non'); if (n) n.remove(); b.classList.remove('off'); }
  C.append(c, gcEl('p', 'gc-a-quoi', GC_A_QUOI));
  gcZone(C, 'Chargement…');
}
function gcAdminPose(C) {
  if (GC.admT) GC.admT.remove(); if (GC.admB) GC.admB.remove(); GC.admT = GC.admB = null;
  if (!GC.adm) return;
  const b = gcSectionAdmin(), t = gcBt('gc-admin-t', '🛡️ Admin', () => { GC.adminOuvert = !GC.adminOuvert; b.hidden = !GC.adminOuvert; });
  b.hidden = !GC.adminOuvert; C.append(t, b); GC.admT = t; GC.admB = b;
}
async function gcRecharger() {
  const C = GC.corps; if (!C || !document.getElementById('jdw-gc')) return;
  if (gcPasCompte()) { gcRenduInvite(C); return; }
  const n = GC.chargeN = (GC.chargeN || 0) + 1, vivant = () => n === GC.chargeN && C.isConnected;
  if (!(GC.cartes && GC.cartes.isConnected)) gcApercu(C);
  gcCarte();   // derrière : les tuiles Record et Course se mettent à jour quand elle arrive
  const t = setTimeout(() => { if (vivant()) gcZone(C, 'Le serveur met du temps à répondre.', true); }, 8000);
  try {
    const st = await rpc('gc_etat', { p_name: gcNom() }, { quiet: true });
    clearTimeout(t); if (!vivant()) return;
    GC.st = st;
    if (!st || !st.actif) { C.textContent = ''; C.appendChild(gcEl('p', 'gc-vide', 'Cette section est fermée pour le moment.')); return; }
    store.set(gcCleApercu(), { solde: st.solde, c: st.pub.courte.credits, l: st.pub.longue.credits, p: st.parrain.gain, j: st.records.gain_jeu, k: st.records.gain_course });
    if (!st.admin) GC.adm = null;
    gcRendu(C);
    if (st.admin) rpc('gc_admin_etat', { p_name: gcNom() }, { quiet: true }).then(a => { if (vivant() && !GC.vue) { GC.adm = a; gcAdminPose(C); } }, () => {});   // derrière : les tuiles n'attendent pas
  } catch (e) {
    clearTimeout(t); if (!vivant()) return;
    gcZone(C, netOff() ? '📡 Il faut du réseau pour gagner des crédits.' : 'Le serveur ne répond pas pour le moment.', true);
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
  const st = GC.st; C.textContent = ''; GC.vue = null;
  if (GC.solde) { GC.solde.hidden = false; GC.solde.textContent = gcNb(st.solde) + ' 💎'; }
  if (GC.essai) GC.essai.hidden = !(st.admin && (gcTest() || st.pub.test));   // un seul petit badge, jamais pour un joueur
  GC.etat = gcEl('p', 'gc-etat'); GC.etat.setAttribute('role', 'status'); GC.etat.hidden = true; C.appendChild(GC.etat);
  GC.cartes = gcTuiles(st); C.appendChild(GC.cartes);
  C.appendChild(gcEl('p', 'gc-a-quoi', GC_A_QUOI));
  gcAdminPose(C);
}
const GC_A_QUOI = 'Tes crédits servent à créer tes propres jeux et images dans l’Atelier. Avec 300 💎, tu peux créer un jeu comme Pigeon Bombardier.';
function gcTuilesMaj() {
  if (!GC.st || !GC.st.actif || GC.vue || !GC.cartes || !GC.cartes.isConnected || GC.bulle || GC.cartes.contains(document.activeElement)) return;
  const c = gcTuiles(GC.st); GC.cartes.replaceWith(c); GC.cartes = c;
}
const gcTest = () => !!(GC.st && GC.st.actif && GC.st.ouvert === false);
const gcDeja = (k, r) => !!(r && r.deja) || GC.sim.has(k);   // gagné aujourd'hui : vrai, ou simulé en mode test
// la mise à jour toute seule : le récapitulatif et les records seulement, sans perdre ce qu'on est en train de taper ou de toucher
async function gcMajMenu() {
  if (!GC.corps || !document.getElementById('jdw-gc') || gcPasCompte() || GC.busy || GC.vue) return;
  try {
    const [st] = await Promise.all([rpc('gc_etat', { p_name: gcNom() }, { quiet: true }), gcCarte()]);
    if (!st || !st.actif || !GC.cartes || !GC.cartes.isConnected || GC.bulle || GC.cartes.contains(document.activeElement)) return;
    GC.st = st; if (GC.solde) GC.solde.textContent = gcNb(st.solde) + ' 💎';
    const c = gcTuiles(st); GC.cartes.replaceWith(c); GC.cartes = c;
  } catch (e) {}
}
// les tuiles : en gros le gain, le nom de l'action ; grisée, elle dit pourquoi en quelques mots
function gcTuile(o) {
  const b = gcBt('gc-tuile' + (o.non ? ' off' : '') + (o.large ? ' large' : ''), '', e => { GC.tuile = e.currentTarget.getBoundingClientRect(); o.action(); }); b.disabled = !!o.non;
  b.append(gcEl('span', 'gc-t-ic', o.ic), gcEl('span', 'gc-t-gain', '+' + o.gain + ' 💎'), gcEl('span', 'gc-t-nom', o.nom));
  if (o.non) b.appendChild(gcEl('span', 'gc-t-non', o.non));
  return b;
}
function gcTuiles(st) {
  const g = gcEl('div', 'gc-tuiles'), P = st.pub, Pa = st.parrain, R = st.records, ca = GC.carte || {};
  const ouvertes = P.dispo && !(gcAppli() && !P.test), pubNon = !ouvertes ? 'Bientôt' : P.faites >= P.max ? 'Reviens demain' : '';
  const rec = (l, cle) => { if (!GC.carte) return '…'; const k = Object.entries(l || {}); return !k.length ? 'Bientôt' : k.every(([i, r]) => gcDeja(cle(i), r)) ? 'Reviens demain' : ''; };
  g.append(gcTuile({ ic: '🎬', gain: P.courte.credits, nom: 'Pub courte', non: pubNon, action: () => gcRegarder('courte') }),
    gcTuile({ ic: '🎬', gain: P.longue.credits, nom: 'Pub longue', non: pubNon, action: () => gcRegarder('longue') }),
    gcTuile({ ic: '🤝', gain: Pa.gain, nom: 'Inviter un ami', large: true, non: Pa.recompenses >= Pa.max ? Pa.max + ' amis déjà invités' : '', action: () => gcPartager(Pa) }),
    gcTuile({ ic: '🏆', gain: R.gain_jeu, nom: 'Record', non: rec(ca.jeux, i => i), action: () => gcVueRecords('jeux') }),
    gcTuile({ ic: '🏁', gain: R.gain_course, nom: 'Course', non: rec(ca.courses, i => 'c:' + i), action: () => gcVueRecords('courses') }));
  return g;
}
async function gcPartager(Pa) {
  const lien = gcLien(Pa.code), texte = 'Viens jouer à la Borne d’arcade avec moi ! Inscris-toi avec ce lien : on gagne ' + Pa.gain_filleul + ' 💎 chacun.';
  if (navigator.share && TOUCH) { try { await navigator.share({ title: 'Borne d’arcade', text: texte, url: lien }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  const ok = await gcCopier(lien); gcDire(ok ? 'Lien copié : envoie-le à ton ami !' : lien, ok ? 'ok' : '');
}
function gcLigneRecord(ul, x) {
  const li = gcEl('li'), b = gcBt('gc-rec-b', '', () => { if (x.action) x.action(); else if (x.g) { gcFermer(); openGame(x.g); } });
  const t = gcEl('span', 'gc-rec-t'); t.append(gcEl('b', '', x.titre), gcEl('small', '', x.sous));
  b.append(t, gcEl('span', x.cl, x.droite)); li.appendChild(b); ul.appendChild(li);
}
function gcVueRecords(sorte) {
  const C = GC.corps, ca = GC.carte || {}; gcBulleFerme(); GC.vue = 'records'; C.textContent = '';
  const ul = gcEl('ul', 'gc-liste gc-rec'), ret = gcBt('gc-retour', '‹ Retour', () => gcRendu(C));
  C.append(ret, gcEl('h3', 'gc-l-titre', sorte === 'courses' ? '🏁 Turbo Chrono : record mondial de chaque course' : '🏆 Record mondial de chaque jeu'), ul);
  ret.focus({ preventScroll: true }); C.scrollTop = 0;
  if (sorte === 'courses') {
    gcCourses(ul, null);
    chronoBoards(true).then(d => { if (GC.vue === 'records' && ul.isConnected) gcCourses(ul, d); }).catch(() => {});
    return;
  }
  for (const [id, n] of Object.entries(ca.niveaux || {})) gcLigneRecord(ul, { titre: gcTitre(id) + ' · vitesse', sous: n.nb + ' niveaux : un record par niveau', droite: '+' + ca.gain_niveau + ' 💎', cl: 'gc-gain', action: () => gcVueNiveaux(id) });
  const L = Object.entries(ca.jeux || {}).map(([id, x]) => ({ id, x, titre: gcTitre(id) })).sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
  for (const { id, x, titre } of L) {
    const d = gcDeja(id, x), moi = x.nom === gcNom();
    gcLigneRecord(ul, { titre, sous: 'Record mondial : ' + gcNb(x.record) + ' · ' + dispName(x.nom), droite: d ? '✓ aujourd’hui' : moi ? '🏆 Ton record' : '+' + ca.gain_jeu + ' 💎', cl: d || moi ? 'gc-rec-d' : 'gc-gain', g: gcJeu(id) });
  }
}
function gcVueNiveaux(id) {
  const C = GC.corps, ca = GC.carte || {}, n = (ca.niveaux || {})[id]; if (!n) return; gcBulleFerme(); GC.vue = 'niveaux'; GC.vueJeu = id; C.textContent = '';
  const ul = gcEl('ul', 'gc-liste gc-rec'), ret = gcBt('gc-retour', '‹ Retour', () => gcVueRecords('jeux'));
  C.append(ret, gcEl('h3', 'gc-l-titre', '🏆 ' + gcTitre(id) + ' : record de vitesse de chaque niveau'), ul);
  ret.focus({ preventScroll: true }); C.scrollTop = 0;
  for (let i = 1; i <= n.nb; i++) {
    const r = n.lv['t' + i], moi = !!r && r.nom === gcNom(), fait = !!r && r.deja;
    gcLigneRecord(ul, { titre: 'Niveau ' + i, sous: r ? 'Record mondial : ' + chronoMs(r.record) + ' · ' + dispName(r.nom) : 'Personne n’a encore fini ce niveau', droite: fait ? '✓ gagné' : moi ? '🏆 Ton record' : '+' + ca.gain_niveau + ' 💎', cl: fait || moi ? 'gc-rec-d' : 'gc-gain', g: gcJeu(id) });
  }
}
// toutes les courses de Turbo Chrono, avec le record mondial lu dans le classement : celles qui n'ont pas encore assez de joueurs y sont aussi, sans gain annoncé
function gcCourses(ul, d) {
  const ca = GC.carte || {}, mini = ca.min || 5; ul.textContent = '';
  for (const [t, titre] of CHRONO_TRACKS) {
    const b = d && d[t], w = b && !b.err ? b.world : null, top = w && w[0], r = (ca.courses || {})[t];
    const moi = top ? top.me : !!r && r.nom === gcNom(), fait = !!r && gcDeja('c:' + t, r);
    const sous = top ? 'Record mondial : ' + chronoMs(top.ms) + ' · ' + top.name : r ? 'Record mondial : ' + chronoMs(r.record) + ' · ' + dispName(r.nom) : w ? 'Pas encore de record' : 'Chargement…';
    const droite = fait ? '✓ aujourd’hui' : moi ? '🏆 Ton record' : r ? '+' + ca.gain_course + ' 💎' : w ? w.length + ' / ' + mini + ' joueurs' : '';
    gcLigneRecord(ul, { titre, sous, droite, cl: fait || moi ? 'gc-rec-d' : r ? 'gc-gain' : 'gc-rec-n', g: gcJeu('chrono') });
  }
}
// la pastille du solde ouvre la fenêtre d'achat de la borne (la même que dans l'Atelier, donc le même paiement partout) ; en la fermant, on revient au menu
async function gcAchat() {
  if (GC.achat || GC.busy) return;
  const V = document.getElementById('jdw-gc'); if (!V) return;
  try {
    atlBuild();
    if (!ATL.data || !ATL.data.credits) { const r = await rpc('at_lire', { p_name: gcNom() }, { quiet: true }); if (r && !ATL.data) ATL.data = r; else if (r && ATL.data && !ATL.data.credits) ATL.data.credits = r.credits; }
  } catch (e) { gcDire('Le serveur ne répond pas.', 'non'); return; }
  const R = ATL.root, M = R.querySelector('.atl-mod'), etaitCache = R.hidden; if (!M) return;
  const fin = () => {
    if (!GC.achat) return; GC.achat = null; ob.disconnect();
    M.hidden = true; M.textContent = ''; R.classList.remove('gc-que-achat'); if (etaitCache) R.hidden = true;
    V.hidden = false; if (GC.solde) GC.solde.focus({ preventScroll: true }); gcRecharger();
  };
  const ob = new MutationObserver(() => { if (M.hidden) fin(); });
  GC.achat = fin; V.hidden = true; R.classList.add('gc-que-achat'); R.hidden = false;
  await atlRecharger();
  ob.observe(M, { attributes: true, attributeFilter: ['hidden'] });
  if (M.hidden) fin();
}
function gcDire(t, kind) { const e = GC.etat; if (!e) return; e.hidden = !t; e.textContent = t || ''; e.className = 'gc-etat' + (kind ? ' ' + kind : ''); if (t) e.scrollIntoView({ block: 'nearest' }); }

// ---------- 1. les pubs ----------
const gcAppli = () => !!window.BorneApp;   // l'appli Android : la régie du site n'y marche pas (AdMob à brancher dans une version de l'appli)
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
      if (GC.solde && GC.solde.isConnected && GC.tuile) { const g = f.test ? f.simule : f.credits, fin = f.test ? (+GC.st.solde || 0) + g : +f.solde; await gcVol(GC.tuile, GC.solde, g, fin - g, fin, x => gcNb(x) + ' 💎'); await new Promise(r => setTimeout(r, 350)); }
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
// ---------- 4. l'admin (le seul endroit avec des euros) ----------
function gcSectionAdmin() {
  const A = GC.adm, s = gcEl('section', 'gc-sec gc-admin');
  s.appendChild(gcEl('h3', '', '🛡️ Admin'));
  const M = A.par_motif || {}, nom = { gc_pub: 'Pubs', gc_parrain: 'Invitations', gc_filleul: 'Amis invités', gc_parrain_achat: 'Bonus packs', gc_record: 'Records', gc_course: 'Courses' };
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
    const go = g => { const de = (GC.st && +GC.st.solde) || 0; GC.file.push(Object.assign({ test: true, score: 12345, ancien: 12000, ancien_nom: 'SAMBA', de, vers: de + (+g.credits || 0) }, g)); gcFermer(); gcGrandSuivant(); };
    bs.append(gcBt('gc-bt gc-bt2', 'Record d’un jeu', () => { const k = Object.keys(ca.jeux || {}).find(i => !GC.sim.has(i)) || prem(ca.jeux); if (k) GC.sim.add(k); go({ sorte: 'jeu', jeu: k || 'neon', credits: (ca.gain_jeu || 20), etat: 'paye' }); }),
      gcBt('gc-bt gc-bt2', 'Record d’une course', () => { const k = Object.keys(ca.courses || {}).find(i => !GC.sim.has('c:' + i)) || prem(ca.courses) || 'stade'; GC.sim.add('c:' + k); go({ sorte: 'course', jeu: 'chrono', niveau: k, credits: (ca.gain_course || 10), etat: 'paye', score: 22000, ancien: 23000 }); }),
      gcBt('gc-bt gc-bt2', 'En attente de vérification', () => go({ sorte: 'jeu', jeu: prem(ca.jeux) || 'neon', credits: (ca.gain_jeu || 20), etat: 'attente' })),
      gcBt('gc-bt gc-bt2', 'Sans gain', () => go({ sorte: 'jeu', jeu: prem(ca.jeux) || 'neon', credits: (ca.gain_jeu || 20), etat: 'refuse', raison: 'soi_meme', ancien_nom: gcNom() })));
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
  try {
    const L = await rpc('gc_mes_gains', { p_name: gcNom() }, { quiet: true, quiet404: true });
    if (Array.isArray(L) && L.length) {
      // le compteur de chaque écran : on part du solde d'avant les gains annoncés ici
      let v = (+L[0].solde || 0) - L.reduce((t, g) => t + (g.etat === 'paye' ? (+g.credits || 0) : 0), 0);
      for (const g of L) if (g.etat === 'paye') { g.de = v; v += +g.credits || 0; g.vers = v; }
      GC.file.push(...L); gcGrandSuivant(); gcCarte();
    }
  } catch (e) {}
}
// pourquoi un record mondial ne rapporte rien, en quelques mots
function gcPourquoi(g) {
  const ici = g.sorte === 'course' ? 'cette course' : g.sorte === 'niveau' ? 'ce niveau' : 'ce jeu', non = 'Pas de +' + g.credits + ' 💎 : ';
  return { soi_meme: non + 'c’était déjà ton record.', joueurs: non + 'il faut au moins ' + ((GC.carte && GC.carte.min) || 5) + ' joueurs sur ' + ici + '.', deja: non + 'déjà gagné sur ' + ici + ' aujourd’hui.', deja_niveau: non + 'déjà gagné sur ce niveau.', createur: non + 'tu as créé ce jeu.', partie: non + 'partie trop courte.' }[g.raison] || 'Pas de gain cette fois.';
}
function gcGrandSuivant() {
  if (GC.grand) return; const g = GC.file.shift(); if (!g) return; GC.grand = true;
  const V = gcEl('div', 'gc-grand'), b = gcEl('div', 'gc-grand-b'), ami = g.sorte === 'ami', course = g.sorte === 'course', niveau = g.sorte === 'niveau', premier = g.raison === 'premier';
  const titre = ami ? { filleul: 'Cadeau de bienvenue !', parrain: dispName(g.nom) + ' s’est inscrit !', achat: dispName(g.nom) + ' a acheté un pack !' }[g.role] : premier ? 'Bravo, première mondiale !' : 'Record mondial battu !';
  V.setAttribute('role', 'alertdialog'); V.setAttribute('aria-modal', 'true'); V.setAttribute('aria-label', titre);
  const paye = g.etat === 'paye', compteur = gcEl('div', 'gc-g-compteur'), nb = gcEl('b', '', gcNb(g.de));
  if (paye) { compteur.append(gcEl('span', '', '💎'), nb); b.appendChild(compteur); }
  b.append(gcEl('div', 'gc-grand-ic', ami ? (g.role === 'filleul' ? '🎁' : g.role === 'achat' ? '🛍️' : '🤝') : '🏆'), gcEl('h2', '', titre));
  if (g.test) b.appendChild(gcEl('p', 'gc-test', '🧪 Test : aucun crédit versé'));
  const gain = gcEl('p', 'gc-grand-g', '+' + g.credits + ' 💎');
  if (paye) b.appendChild(gain);
  else if (g.etat === 'attente') b.appendChild(gcEl('p', 'gc-grand-a', 'Tes ' + g.credits + ' 💎 arrivent dès que l’équipe a vérifié ton score.'));
  else b.appendChild(gcEl('p', 'gc-grand-a', gcPourquoi(g)));
  if (premier) b.appendChild(gcEl('p', 'gc-p', 'Jamais personne n’avait réussi ce niveau.'));
  if (!ami) { const quoi = course ? 'Turbo Chrono · ' + gcCircuit(g.niveau) : niveau ? gcTitre(g.jeu) + ' · Niveau ' + String(g.niveau).replace(/^t/, '') : gcTitre(g.jeu), val = v => course || niveau ? chronoMs(v) : gcNb(v); b.appendChild(gcEl('p', 'gc-p', quoi + ' : ' + val(g.score) + (g.ancien_nom ? ' (ancien record : ' + val(g.ancien) + ' · ' + dispName(g.ancien_nom) + ')' : ''))); }
  else if (g.role === 'filleul') b.appendChild(gcEl('p', 'gc-p', 'De la part de ' + dispName(g.nom)));
  let pris = false;
  const prendre = () => { if (pris) return; pris = true; ok.disabled = true; gcVol(gain.getBoundingClientRect(), nb, +g.credits || 0, g.de, g.vers, x => gcNb(x)).then(() => { if (!g.test) gcMajSolde(g.vers); setTimeout(() => { if (V.isConnected) V._fin(); }, 500); }); };
  const ok = gcBt('gc-bt', premier ? 'Récupérer mes ' + g.credits + ' 💎' : g.etat === 'paye' ? 'Super !' : 'OK', () => { if (premier) prendre(); else V._fin(); }); b.appendChild(ok); V.appendChild(b); document.body.appendChild(V); ok.focus({ preventScroll: true });
  const t = setTimeout(() => V._fin(), premier ? 30000 : 9000);
  V._fin = () => { clearTimeout(t); V.remove(); GC.grand = false; gcGrandSuivant(); };
  if (paye && !premier) setTimeout(() => { if (!V.isConnected) return; gcVol(gain.getBoundingClientRect(), nb, +g.credits || 0, g.de, g.vers, x => gcNb(x)).then(() => { if (!g.test) gcMajSolde(g.vers); }); }, 450);
  gcCarte();
}
// les 💎 partent du gain, volent jusqu'au compteur, et le nombre monte
function gcVol(de, vers, credits, v0, v1, txt) {
  return new Promise(fin => {
    const nb = Math.max(4, Math.min(12, Math.round(credits / (credits >= 50 ? 10 : 2)))), doux = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doux || !vers.isConnected || !Element.prototype.animate) { vers.textContent = txt(v1); fin(); return; }
    const b = vers.getBoundingClientRect(), x1 = b.left + b.width / 2, y1 = b.top + b.height / 2, x0 = de.left + de.width / 2, y0 = de.top + de.height / 2;
    for (let i = 0; i < nb; i++) {
      const e = gcEl('span', 'gc-vol', '💎'); e.style.left = x0 + 'px'; e.style.top = y0 + 'px'; document.body.appendChild(e);
      const dx = (Math.random() - .5) * 90, dy = -30 - Math.random() * 70;
      e.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 }, { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(1.15)', opacity: 1, offset: .32 }, { transform: 'translate(calc(-50% + ' + (x1 - x0) + 'px),calc(-50% + ' + (y1 - y0) + 'px)) scale(.55)', opacity: .9 }], { duration: 760, delay: i * 62, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'both' }).finished.then(() => e.remove(), () => e.remove());
    }
    const t0 = performance.now() + 620, dur = Math.max(760, nb * 62 + 420);
    const pas = t => {
      if (!vers.isConnected) { fin(); return; }
      const k = Math.max(0, Math.min(1, (t - t0) / dur)); vers.textContent = txt(Math.round(v0 + (v1 - v0) * k));
      if (k < 1) { requestAnimationFrame(pas); return; }
      vers.classList.remove('gc-pop'); void vers.offsetWidth; vers.classList.add('gc-pop');
      try { Audio.tone(1175, 0.09, 'triangle', 0.04, 1568); } catch (e) {}
      fin();
    };
    requestAnimationFrame(pas);
  });
}

// donné aux jeux : api.levelBest.gains() dit ce que chaque niveau peut rapporter, pour que le jeu l'affiche sur sa carte (null : rien à afficher)
const gcLevelBestG0 = levelBestApi;
levelBestApi = function (g) {
  const a = gcLevelBestG0.apply(this, arguments);
  a.gains = async function () {
    try {
      if (gcPasCompte() || !ONLINE || netOff() || (typeof CREA !== 'undefined' && CREA)) return null;
      if (!GC.carteVue) await gcCarte();
      if (!GC.carte || GC.carte.test || !(GC.carte.niveaux || {})[g.id]) return null;
      const r = await rpc('gc_niveaux_jeu', { p_name: gcNom(), p_jeu: g.id }, { quiet: true, quiet404: true });
      if (!r || !r.niveaux) return null;
      for (const x of Object.values(r.niveaux)) if (x.nom) x.nom = dispName(x.nom);
      return r;
    } catch (e) { return null; }
  };
  return a;
};

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
    if (!c || typeof c !== 'object') throw new Error('carte vide');
    GC.carte = c.actif ? c : null; GC.carteVue = true; GC.carteRate = 0;
    gcBouton(); gcSigles(); gcJauge(); gcMonCode(); gcTuilesMaj(); return c;
  } catch (e) { gcCarteRelance(); return null; }   // un appel raté n'efface ni le bouton ni les 💎 déjà là
}
// le serveur n'a pas répondu : on réessaie tout seul, de plus en plus lentement (3 s, 6 s, 12 s… une fois par minute au plus)
function gcCarteRelance() {
  if (GC.carteT) return;
  GC.carteRate = (GC.carteRate || 0) + 1;
  GC.carteT = setTimeout(() => { GC.carteT = 0; gcCarte(); }, Math.min(60000, 3000 * 2 ** (GC.carteRate - 1)));
}
function gcBulleFerme() { if (GC.bulle) { GC.bulle.remove(); GC.bulle = null; } }
function gcBulle(a, x) {
  gcBulleFerme();
  const B = gcEl('div', 'gc-bulle'); B.setAttribute('role', 'tooltip');
  B.append(gcEl('b', '', '🏆 Record mondial : +' + x.gain + ' 💎'), gcEl('span', '', x.sans ? x.v : 'Record actuel : ' + x.v)); if (!x.sans) B.append(gcEl('span', '', 'Détenteur : ' + dispName(x.nom))); B.append(gcEl('small', '', x.deja ? '✓ Déjà gagné aujourd’hui' : x.course ? 'Une fois par jour et par course' : 'Une fois par jour'));
  gcBullePose(B, a);
}
function gcBullePose(B, a) {
  document.body.appendChild(B);
  const r = a.getBoundingClientRect(), w = B.offsetWidth, h = B.offsetHeight;
  B.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
  B.style.top = (r.bottom + 8 + h > innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8) + 'px';
  GC.bulle = B;
}
function gcSigleEl(x, cls) {
  const b = gcBt('gc-sigle ' + (cls || ''), x.jauge ? '🏆 ' + x.jauge : String(cls || '').includes('gc-sur-tuile') ? '💎' : '🏆', e => { e.stopPropagation(); e.preventDefault(); if (GC.bulle && GC.bulle._a === b) { if (TOUCH) gcBulleFerme(); } else { gcBulle(b, x); GC.bulle._a = b; } });   // à la souris, le survol l'a déjà ouverte : le clic ne la referme pas
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
    else if (g && (ca.niveaux || {})[g.id]) x = { gain: ca.gain_niveau, v: 'Un record de vitesse par niveau', nom: '', sans: true, deja: false };
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
  setInterval(() => { if (gcNom() !== GC.nomCarte) gcCarte().then(() => { gcLienEnvoyer(); gcApresScore(); }); if (GC.jeu) gcJauge(); }, 1500);   // changement de joueur ; la jauge suit le jeu ouvert
  setInterval(() => { if (GC.carte && !document.hidden) gcCarte(); }, 60000);                   // reste à jour tout seul
})();
