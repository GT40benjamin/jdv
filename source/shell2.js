(() => {
'use strict';
const $ = id => document.getElementById(id);
// hasard de la bibliothèque (musique, messages…) : séparé de celui des jeux, qui peut être fixé (mode Local : même partie pour tous)
const shellRand = Math.random.bind(Math);
const ORDER = ['ilo', 'magic', 'pleingaz', 'empilo', 'glouton', 'mouches', 'carreaux', 'rouleaux', 'canards'];
// Étiquettes des tuiles : « Nouveau » (jeu ou duel ajouté) ou « Mis à jour » (refonte) jusqu'à ce que le joueur l'ouvre.
// id du jeu ou du duel → { kind: 'new' | 'maj', at: 'AAAA-MM-JJ HH:MM' } ; une date plus récente fait revenir l'étiquette, qui s'efface
// seule au bout de NEWS_DAYS jours. Les boutons Classique / Duel disent « nouveau » / « mis à jour » tant qu'une de leurs tuiles en a une.
const TILE_NEWS = {
  magic: { kind: 'new', at: '2026-10-14 15:00' },
  ilo: { kind: 'new', at: '2026-10-12 00:27' },
  glouton: { kind: 'maj', at: '2026-10-13 00:55' },
  empilo: { kind: 'maj', at: '2026-10-14 12:10' },
  mouches: { kind: 'maj', at: '2026-10-14 12:43' },
  rouleaux: { kind: 'maj', at: '2026-10-14 13:32' },
  carreaux: { kind: 'maj', at: '2026-10-14 17:45' }
};
const NEWS_DAYS = 30;
const NEW_GAMES = new Set(Object.keys(TILE_NEWS).filter(id => TILE_NEWS[id].kind === 'new'));
// Porte « labo » : un jeu en essai n'apparaît que sur les appareils ouverts une fois avec …/jouer/?labo=<id> (retenu sur l'appareil,
// ?labo=aucun pour tout cacher). Dans l'appli Android (pas de barre d'adresse) : 7 touches rapides sur le titre « Borne d'arcade ».
const LABO = new Set(['magic']);
const LABO_ON = (() => {
  let on = []; try { on = JSON.parse(localStorage.getItem('jdw.labo') || '[]') || []; } catch (e) { on = []; }
  try {
    const q = new URLSearchParams(location.search).get('labo');
    if (q) { on = q === 'aucun' ? [] : [...new Set(on.concat(q.split(',').filter(x => /^[a-z0-9_-]{2,20}$/.test(x))))]; localStorage.setItem('jdw.labo', JSON.stringify(on)); }
  } catch (e) {}
  return new Set(on);
})();
const GAMES = ORDER.map(id => (window.JDW_GAMES || {})[id]).filter(g => g && (!LABO.has(g.id) || LABO_ON.has(g.id)));
(() => {
  const t = document.querySelector('.lib-title'); if (!t) return;
  let n = 0, t0 = 0;
  t.addEventListener('click', () => {
    const now = Date.now(); if (now - t0 > 4000) n = 0; t0 = now;
    if (++n < 7) return; n = 0;
    const on = new Set(LABO_ON), has = on.has('magic'); if (has) on.delete('magic'); else on.add('magic');
    try { localStorage.setItem('jdw.labo', JSON.stringify([...on])); } catch (e) {}
    try { toastCheer(has ? 'Labo : Magic Force caché' : 'Labo : Magic Force activé !', null, true); } catch (e) {}
    setTimeout(() => location.reload(), 1300);
  });
})();
const gameById = id => GAMES.find(g => g.id === id);
// jeux de duel (deux joueurs face à face) : modules source/duos/*.js, contrat DUO-CONTRACT.md
const DUO_ORDER = ['trouve', 'palet', 'briques', 'boum', 'souris', 'spatial', 'mots', 'guerre'];
const DUOS = DUO_ORDER.map(id => (window.JDW_DUOS || {})[id]).filter(Boolean);
const duoById = id => DUOS.find(d => d.id === id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
// lien d'invitation …/jouer/?salle=<jeton> : lu tout de suite au chargement, avant tout changement d'adresse (section « Inviter par un lien »)
const INV_URL = (() => { try { const s = new URLSearchParams(location.search); return s.has('salle') ? String(s.get('salle') || '') : null; } catch (e) { return null; } })();
const INV_RX = /^[A-Za-z0-9_-]{16,64}$/;
// vues par joueur de l'appareil (invité sans nom : '*') : jdw.tileseen = { JOUEUR: { id: date de la nouveauté vue } } ;
// jdw.seengames = l'ancienne liste des jeux « Nouveau » déjà ouverts (toujours lue). Appareil tout neuf (aucune donnée jdw.*) :
// les nouveautés déjà là ne s'affichent pas (jdw.tilebase), seulement celles qui arriveront ensuite.
let seenGames = store.get('jdw.seengames', {}) || {};
let tileSeen = store.get('jdw.tileseen', {}) || {};
const TILE_BASE = (() => {
  const b = store.get('jdw.tilebase', null); if (typeof b === 'string') return b;
  let fresh = true;
  try { for (let i = 0; i < localStorage.length; i++) if (/^jdw\./.test(localStorage.key(i) || '')) { fresh = false; break; } } catch (e) { fresh = false; }
  const v = fresh ? Object.values(TILE_NEWS).reduce((m, x) => x.at > m ? x.at : m, '') : '';
  store.set('jdw.tilebase', v); return v;
})();
const seenKey = () => cleanName(profile.name) || '*';
// l'étiquette de ce jeu / duel pour le joueur actuel : 'new', 'maj' ou ''
function tileNews(id) {
  const x = TILE_NEWS[id]; if (!x || x.at <= TILE_BASE) return '';
  if (!(Date.now() - Date.parse(x.at.replace(' ', 'T')) < NEWS_DAYS * 86400e3)) return '';
  const me = seenKey();
  if (((tileSeen[me] || {})[id] || '') >= x.at) return '';
  if (x.kind === 'new' && (seenGames[me] || []).includes(id)) return '';
  return x.kind;
}
const gameSeen = (id) => tileNews(id) !== 'new';
// clic sur la tuile (jeu ouvert, duel lancé) : l'étiquette s'en va pour ce joueur
function markGameSeen(id) {
  const x = TILE_NEWS[id]; if (!x || !tileNews(id)) return;
  const me = seenKey(); (tileSeen[me] = tileSeen[me] || {})[id] = x.at; store.set('jdw.tileseen', tileSeen);
  refreshNewBadges(); refreshBell();
}
function refreshNewBadges() {
  const put = (el, k) => {
    let nb = el.querySelector('.tile-new');
    if (!k) { if (nb) nb.hidden = true; return; }
    if (!nb) { nb = document.createElement('span'); nb.className = 'tile-new'; el.appendChild(nb); }
    nb.hidden = false; nb.classList.toggle('maj', k === 'maj'); nb.textContent = k === 'new' ? 'Nouveau' : 'Mis à jour';
  };
  const section = list => { let k = ''; for (const t of list) { const n = tileNews(t.g.id); put(t.el, n); if (n === 'new' || (n && !k)) k = n; } return k; };
  let a = '', b = '';
  try { a = section(tiles); } catch (e) {}
  try { b = section(duoTiles); } catch (e) {}
  for (const [id, k] of [['jdw-cls-badge', a], ['jdw-duo-badge', b]]) {
    const e = $(id); if (!e) continue;
    e.hidden = !k; e.textContent = k === 'new' ? 'nouveau' : 'mis à jour'; e.classList.toggle('maj', k === 'maj');
  }
}
const fmt = n => Math.floor(n).toLocaleString('fr-FR');
const unit = g => g && g.scoreLabel === 'm' ? ' m' : '';
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12).toUpperCase();
const COLORS = { night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3', muted: '#8aa0ae',
  amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff', spray: '#ff5fae', leaf: '#4cc36a' };
const FONTS = { display: "'Bungee', Impact, sans-serif", body: "'Chakra Petch', system-ui, sans-serif" };

/* ================= Audio commun ================= */
let muted = !!store.get('jdw.muted', false);          // effets sonores coupés
let criOn = store.get('jdw.cris', true) !== false;      // cris des copains
const Audio = {
  ctx: null, master: null, buf: null,
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = muted ? 0 : 0.6; this.master.connect(this.ctx.destination);
      this.buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = shellRand() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  tone(f, dur, type = 'square', vol = 0.08, f2) {
    const A = this.ctx; if (!A || muted) return;
    try {
      const t = A.currentTime, o = A.createOscillator(), g = A.createGain();
      o.type = type; o.frequency.setValueAtTime(Math.max(20, f), t);
      if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.03);
    } catch (e) {}
  },
  noise(dur, vol = 0.2, freq = 900) {
    const A = this.ctx; if (!A || muted) return;
    try {
      const t = A.currentTime, s = A.createBufferSource(), f = A.createBiquadFilter(), g = A.createGain();
      s.buffer = this.buf; f.type = 'lowpass';
      f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(60, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(this.master); s.start(t, shellRand() * 0.5); s.stop(t + dur + 0.05);
    } catch (e) {}
  }
};
const audioApi = { tone: (...a) => Audio.tone(...a), noise: (...a) => Audio.noise(...a) };

/* ================= Serveur (Supabase) ou mode local ================= */
const CFG = window.JDW_CONFIG || null;
const ONLINE = !!(CFG && CFG.url && CFG.key);
// Plus de mot de passe du site (site public depuis la 1.7) : les fonctions du serveur gardent leur paramètre p_code (vieux appareils),
// le site envoie ''. Ce qui protège les salles : le compte connecté (jeton), membre de la salle (source/public.sql).
const CODE = () => '';
try { localStorage.removeItem('jdw.code'); } catch (e) {}      // l'ancien mot de passe ne traîne plus sur les appareils
// dossier racine du site publié (la borne est dans jouer/ : '../') ; vide pour le site de test
const ROOT = window.JDW_ROOT || '';
let serverOk = false, netDown = false, roomDenied = false, remoteLoaded = false;
/* ---- Hors ligne : l'état RÉEL du réseau (section « Hors ligne » plus bas pour le bandeau et les fonctions grisées) ----
   navigator.onLine ne suffit pas (« en ligne » derrière un Wi-Fi sans internet, ou l'inverse dans certaines WebView) : un appel au
   serveur qui échoue → hors ligne ; une réponse du serveur (même un refus) → en ligne. Hors ligne, une petite sonde (no-cors, sans
   données) regarde si le serveur répond à nouveau (4 s, puis de plus en plus espacé, et tout de suite à l'événement « online »). */
const NETS = { off: ONLINE && navigator.onLine === false, t: 0, probing: false, wait: 4000 };
const netOff = () => ONLINE && NETS.off;
function netFail() {
  if (!ONLINE) return;
  netDown = true;
  if (NETS.off) { if (!NETS.t && !NETS.probing) netProbeSoon(); return; }
  NETS.off = true; NETS.wait = 4000; netProbeSoon();
  setTimeout(() => { try { netChanged(false); } catch (e) {} }, 0);
}
function netOk() {
  netDown = false;
  if (!NETS.off) return;
  NETS.off = false; clearTimeout(NETS.t); NETS.t = 0;
  setTimeout(() => { try { netChanged(true); } catch (e) {} }, 0);
}
function netProbeSoon(ms) { clearTimeout(NETS.t); NETS.t = setTimeout(() => { NETS.t = 0; netProbe(); }, ms != null ? ms : NETS.wait); }
async function netProbe() {
  if (!ONLINE || !NETS.off || NETS.probing) return;
  NETS.probing = true;
  let ok = false;
  if (navigator.onLine !== false) {
    const ac = window.AbortController ? new AbortController() : null, to = setTimeout(() => { if (ac) ac.abort(); }, 8000);
    try { await fetch(CFG.url.replace(/\/+$/, '') + '/rest/v1/', { mode: 'no-cors', cache: 'no-store', signal: ac ? ac.signal : undefined }); ok = true; } catch (e) {}
    clearTimeout(to);
  }
  NETS.probing = false;
  if (ok) netOk();
  else { NETS.wait = Math.min(30000, Math.round(NETS.wait * 1.6)); netProbeSoon(); }
}
addEventListener('offline', netFail);
addEventListener('online', () => { if (NETS.off) netProbeSoon(250); });
if (NETS.off) { netDown = true; netProbeSoon(); }
// appel au serveur avec délai maximal (réseau qui ne répond plus du tout) ; échec = hors ligne ; réponse = en ligne
async function netFetch(url, init, ms) {
  if (ONLINE && navigator.onLine === false) { netFail(); throw Object.assign(new Error('pas de réseau'), { offline: true }); }
  const ac = window.AbortController ? new AbortController() : null, to = ac ? setTimeout(() => ac.abort(), ms || 20000) : 0;
  try { const r = await fetch(url, Object.assign({}, init, ac ? { signal: ac.signal } : {})); netOk(); return r; }
  catch (e) { netFail(); throw Object.assign(new Error('pas de réseau'), { offline: true }); }
  finally { clearTimeout(to); }
}
let room = store.get('jdw.room', null);
let roomCodes = store.get('jdw.roomcodes', {}) || {};
const RP = () => ({ p_room: room ? room.id : null, p_room_code: room ? (roomCodes[room.id] || '') : '' });
// Comptes (source/accounts.sql, section « Comptes ») : état commun, déclaré tôt car rpc() s'en sert dès le démarrage.
// ready = le serveur connaît les comptes (sinon : tout comme avant, jamais de jeton envoyé).
const ACCT = { ready: !!store.get('jdw.acctok', false), probed: false, busy: {}, gateT: 0, netFail: false, s: store.get('jdw.accts', {}) || {} };
// Invité : le joueur actuel n'a pas de compte connecté sur l'appareil (visiteur, profil « sans compte »…). Il joue aux jeux solo et
// aux duels sur l'appareil (ou contre l'IA), sans score enregistré, sans salle, chat, direct, duel en ligne, compétition ni « regarder »,
// sans pseudo, tête ni cri (les jeux montrent des personnages neutres). Mode local (pas de serveur : tests) : jamais invité.
function isGuest() {      // = acctState(profile) !== 'on', sans dépendre de l'ordre de chargement
  if (!ONLINE) return false;
  if (!ACCT.ready) return true;
  const a = profile && profile.acct, se = a && a.uid ? ACCT.s[a.uid] : null;
  return !(profile && profile.name && se && se.rt);
}
// seules fonctions du serveur permises à un invité (toutes les autres sont refusées ici, sans appel réseau)
const GUEST_RPC = new Set(['check_name', 'login_name', 'recover_hint', 'log_error', 'get_world_scores', 'get_my_players', 'claim_name', 'invite_info']);
// le joueur au nom duquel une fonction agit (son jeton est envoyé s'il est connecté sur cet appareil)
function rpcActor(fn, args) {
  if (!args) return '';
  if (fn === 'remove_member') return args.p_by || '';
  if (fn === 'create_room') return args.p_owner || '';
  return args.p_name || '';
}
async function rpc(fn, args, opts) {
  opts = opts || {};
  if (!opts.token && !GUEST_RPC.has(fn) && isGuest()) { const er = new Error(fn + ' : invité (compte requis)'); er.guest = true; throw er; }
  const h = { 'Content-Type': 'application/json', apikey: CFG.key };
  if (!/^sb_/.test(CFG.key)) h.Authorization = 'Bearer ' + CFG.key;
  // joueur connecté : son jeton (Authorization) à la place de la clé publique ; apikey reste la clé publique
  let pr = null, tok = opts.token || '';
  if (!tok && ACCT.ready && !opts.anon) {
    pr = acctFor(rpcActor(fn, args));
    if (!pr && acctLive(profile)) pr = profile;          // lectures de la salle (sans p_name) : le compte du joueur actuel
    if (pr) tok = await acctToken(pr);
  }
  if (tok) h.Authorization = 'Bearer ' + tok;
  let r;
  try { r = await netFetch(CFG.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: h, body: JSON.stringify(args) }); }
  catch (e) { const er = new Error(fn + ' : pas de réseau'); er.offline = true; throw er; }   // netFetch : hors ligne noté (bandeau, sonde)
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    // jeton refusé (expiré, révoqué) : on le rafraîchit une fois ; sinon on repasse par la clé publique
    if (tok && !opts.token && (r.status === 401 || r.status === 403) && (opts.retry || 0) < 2) {
      if (!opts.retry && pr) await acctRefresh(pr.acct.uid, true).catch(() => {});
      return rpc(fn, args, Object.assign({}, opts, { retry: (opts.retry || 0) + 1, anon: !!opts.retry || !(pr && acctLive(pr)) }));
    }
    const er = new Error(fn + ' ' + r.status + ' ' + t.slice(0, 120)); er.status = r.status; er.denied = /acces refuse/.test(t);
    er.member = /membre requis|connexion requise/.test(t);   // salle dont aucun joueur du compte n'est membre (ou pas connecté)
    er.acct = /compte requis/.test(t);                    // pseudo protégé : il faut être connecté à son compte
    if (er.acct && !opts.token) { try { acctNeed(rpcActor(fn, args)); } catch (e) {} }
    // les refus du serveur me sont remontés (une fois par session), pour comprendre ce qui bloque chez chacun
    if (fn !== 'log_error' && !er.acct && !er.member && !opts.quiet && !/trop de messages/.test(t) && !(opts.quiet404 && r.status === 404)) { try { reportError('Serveur : ' + fn + ' ' + r.status, t.slice(0, 300), { quiet: true }); } catch (e) {} }
    throw er;
  }
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}
let clientId = store.get('jdw.client', '');
if (!clientId) { clientId = 'c' + shellRand().toString(36).slice(2, 12) + Date.now().toString(36); store.set('jdw.client', clientId); }

/* ================= Profils de l'appareil & têtes ================= */
// Plusieurs joueurs peuvent partager le même téléphone : chaque profil a un identifiant (pid).
const newPid = () => 'p' + shellRand().toString(36).slice(2, 10);
const blankProfile = () => ({ pid: newPid(), name: '', photo: null, consent: false, askedFor: '' });
let profile = Object.assign(blankProfile(), store.get('jdw.profile', {}));
if (!profile.pid) profile.pid = newPid();
let profiles = store.get('jdw.profiles', null);
if (!Array.isArray(profiles)) profiles = profile.name ? [profile] : [];
function saveProfile() {
  store.set('jdw.profile', profile);
  const i = profiles.findIndex(p => p.pid === profile.pid);
  if (profile.name) { if (i >= 0) profiles[i] = profile; else profiles.push(profile); }
  store.set('jdw.profiles', profiles);
}
const deviceNames = () => profiles.map(p => cleanName(p.name)).filter(Boolean);
const players = new Map();          // NOM -> { name, photo, img, sad }
let membersFor = null;               // salle dont on connaît la liste exacte des membres (get_players)
let memberNames = new Set();         // membres de cette salle (gardés à part : une entrée de players peut être recréée)
function setPlayer(name, photo, sound) {
  name = cleanName(name); if (!name) return;
  const cur = players.get(name);
  if (sound === undefined) sound = cur ? cur.sound : null;
  if (cur && cur.photo === (photo || null)) { cur.sound = sound || null; return; }
  const p = { name, photo: photo || null, img: null, sad: null, sadUrl: '', sound: sound || null, alias: cur ? cur.alias || null : null,
    member: cur ? cur.member : memberNames.has(name), seen: cur ? cur.seen : 0, game: cur ? cur.game : null, updated: cur ? cur.updated : 0 };
  if (photo) {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { try { p.box = photoBox(im); p.topFrac = p.box.y0; } catch (e) {} setTimeout(() => { try { refreshChamps(true); } catch (e) {} }, 0); };
    im.src = photo; p.img = im;
  }
  players.set(name, p);
}
// haut réel de la tête dans la photo détourée (0 = tout en haut de l'image), pour poser la couronne pile dessus
function photoTop(im) { return photoBox(im).y0; }
// contour réel de la tête dans la photo détourée (fractions de l'image) : sert à la cadrer pile dans les ronds
function photoBox(im) {
  const W = 64, H = 80, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) if (d[(y * W + i) * 4 + 3] > 80) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { x0: 0.1, y0: 0.08, x1: 0.9, y1: 0.95, ar: (im.naturalWidth || im.width) / (im.naturalHeight || im.height) || 0.8 };
  return { x0: x0 / W, y0: y0 / H, x1: (x1 + 1) / W, y1: (y1 + 1) / H, ar: (im.naturalWidth || im.width) / (im.naturalHeight || im.height) || 0.8 };
}
// place une photo de tête dans un rond : la tête entière, centrée, à 90 % du diamètre
function fitHead(img, box) {
  if (!box) return;
  const bw = box.x1 - box.x0, bh = (box.y1 - box.y0) / box.ar;       // en largeurs d'image
  const wPct = 90 / Math.max(bw, bh, 0.05);                            // largeur de l'image en % du rond
  const cx = (box.x0 + box.x1) / 2 * wPct, cy = (box.y0 + box.y1) / 2 / box.ar * wPct;
  img.style.width = wPct.toFixed(2) + '%'; img.style.height = 'auto';
  img.style.left = (50 - cx).toFixed(2) + '%'; img.style.top = (50 - cy).toFixed(2) + '%';
  img.classList.add('fit');
}
function fitHeadWhenReady(img, p) {
  if (p && p.box) { fitHead(img, p.box); return; }
  const go = () => { try { const b = photoBox(img); if (p) p.box = b; fitHead(img, b); } catch (e) {} };
  if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
}
function syncOwnPlayer() {
  // la tête et le cri ACTIFS : ceux de la salle actuelle s'il y en a, sinon ceux du profil principal
  if (isGuest()) { for (const pr of profiles) if (pr.name && !players.get(cleanName(pr.name))?.member) players.delete(cleanName(pr.name)); return; }   // invité : ni tête ni cri
  for (const pr of profiles) if (pr.name && pr.pid !== profile.pid) { const L = curLook(pr); setPlayer(pr.name, activePhoto(pr), (L && L.sound) || pr.sound || undefined); }
  if (profile.name) setPlayer(profile.name, activePhoto(profile), activeSound(profile));
}
/* ---- Tête et cri par salle : profile.rooms[idSalle] = { photo, photoBase, photoAcc, sound, at, sent } ----
   Rien pour la salle (ou null) = profil principal. « at » = dernier changement, « sent » = dernier envoi réussi (save_room_look). */
function lookOf(pr, rid) { const L = pr && pr.rooms && rid != null ? pr.rooms[rid] : null; return L && (L.photo || L.sound) ? L : null; }
function curLook(pr) { return lookOf(pr || profile, room ? room.id : null); }
function activePhoto(pr) { pr = pr || profile; const L = curLook(pr); return L && L.photo ? L.photo : (pr.consent ? pr.photo : null); }
function activeSound(pr) { pr = pr || profile; const L = curLook(pr); if (L && L.sound) return L.sound; return pr.sound === '' ? null : (pr.sound || undefined); }
function lookSlot(rid) {
  if (!profile.rooms || typeof profile.rooms !== 'object') profile.rooms = {};
  return profile.rooms[rid] || (profile.rooms[rid] = { photo: null, photoBase: null, photoAcc: null, sound: null, at: 0, sent: 0 });
}
function lookTouch(rid) { const L = lookSlot(rid); L.at = Date.now(); if (L.at <= (L.sent || 0)) L.at = (L.sent || 0) + 1; return L; }
let roomLookMissing = false;          // le serveur n'a pas encore save_room_look (room-look.sql pas lancé) : on n'insiste pas
async function pushRoomLook() {
  if (!ONLINE || !room || !profile.name || roomLookMissing) return true;
  if (knownNotMember(profile.name)) return true;          // pas dans la salle : rien à envoyer (renvoyé en la rejoignant)
  const rid = room.id, L = profile.rooms && profile.rooms[rid];
  if (!L || (L.sent || 0) >= (L.at || 0)) return true;
  const at = L.at, pid = profile.pid;
  // la salle entière (photo + cri) : '' = rien de spécial, on revient au profil principal
  const args = Object.assign({ p_code: CODE() }, RP(), { p_name: profile.name, p_photo: L.photo || '', p_sound: L.sound || '' });
  try {
    await rpc('save_room_look', args, { quiet404: true });
    const L2 = profile.pid === pid && profile.rooms && profile.rooms[rid];
    if (L2 && L2.at === at) { L2.sent = at; if (!L2.photo && !L2.sound) delete profile.rooms[rid]; saveProfile(); }
    poke('players'); return true;
  } catch (e) { if (e.status === 404) roomLookMissing = true; return false; }
}
// Tête triste : même taille que la photo, teinte bleue, larmes et petit nuage de pluie.
function makeSad(img) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), u = w / 160;
  x.drawImage(img, 0, 0, w, h);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(70,120,210,.38)'; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'source-over';
  for (const ex of [0.36, 0.64]) {                 // larmes sous les yeux
    const tx = w * ex, ty = h * 0.5;
    x.fillStyle = 'rgba(140,215,255,.75)';
    x.beginPath(); x.moveTo(tx - 3 * u, ty); x.lineTo(tx + 3 * u, ty); x.lineTo(tx + 2 * u, ty + h * 0.14); x.lineTo(tx - 2 * u, ty + h * 0.14); x.fill();
    x.fillStyle = '#9fe0ff'; x.strokeStyle = '#2d6fb5'; x.lineWidth = 2 * u;
    const dy = ty + h * 0.17;
    x.beginPath(); x.moveTo(tx, dy - 11 * u); x.quadraticCurveTo(tx + 8 * u, dy, tx, dy + 6 * u); x.quadraticCurveTo(tx - 8 * u, dy, tx, dy - 11 * u); x.fill(); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(tx - 2 * u, dy - 1 * u, 1.8 * u, 0, 7); x.fill();
  }
  const cx = w * 0.5, cy = h * 0.09;              // nuage de pluie au-dessus de la tête
  x.strokeStyle = 'rgba(120,190,255,.9)'; x.lineWidth = 2.5 * u; x.lineCap = 'round';
  for (let i = -2; i <= 2; i++) { const rx = cx + i * 13 * u; x.beginPath(); x.moveTo(rx, cy + 12 * u); x.lineTo(rx - 3 * u, cy + 24 * u); x.stroke(); }
  x.fillStyle = '#7d8ea0'; x.strokeStyle = '#4b5a6a'; x.lineWidth = 2 * u;
  x.beginPath();
  for (const [bx, by, br] of [[-24, 4, 11], [-10, -4, 14], [8, -6, 15], [24, 3, 11], [0, 6, 12]]) { x.moveTo(cx + (bx + br) * u, cy + by * u); x.arc(cx + bx * u, cy + by * u, br * u, 0, Math.PI * 2); }
  x.fill();
  return c;
}
function sadOf(p) {
  if (!p || !p.img || !p.img.complete || !p.img.naturalWidth) return null;
  if (!p.sad) { try { p.sad = makeSad(p.img); } catch (e) { p.sad = null; } }
  return p.sad;
}
function sadUrl(p) {
  const s = sadOf(p); if (!s) return p && p.photo || '';
  if (!p.sadUrl) { try { p.sadUrl = s.toDataURL('image/png'); } catch (e) { p.sadUrl = p.photo || ''; } }
  return p.sadUrl;
}
function headsList() {
  const out = [];
  if (isGuest()) return out;          // invité : personnages neutres, aucune tête de copain
  const me = cleanName(profile.name);
  // seulement les membres de la salle (et moi) : un compte de l'appareil retiré de la salle n'apparaît plus dans les jeux
  for (const p of players.values()) if (p.name !== 'IA' && (p.name === me || !knownNotMember(p.name)) && p.img && p.img.complete && p.img.naturalWidth) out.push({ name: p.name, img: p.img, sad: sadOf(p) || p.img });
  return out;
}
function playerObj() {
  if (isGuest()) return { name: 'INVITÉ', img: null };
  const p = players.get(cleanName(profile.name));
  return { name: profile.name ? dispName(profile.name) : 'JOUEUR', img: p && p.img && p.img.complete && p.img.naturalWidth ? p.img : null };
}
// Pseudo de salle (room_members.alias, source/accounts.sql) : le nom AFFICHÉ dans la salle actuelle ; le pseudo principal reste la clé
// partout (scores, membres, messages, présence). Classement mondial : pseudo principal (rowEl(…, world)).
function dispName(name) {
  const k = cleanName(name); if (!k || !room) return k || String(name || '');
  const p = players.get(k);
  return (p && p.alias) || k;
}
// têtes données aux jeux : même joueur, nom de la salle
const headsShown = () => headsList().map(h => Object.assign({}, h, { name: dispName(h.name) }));
function avatarInto(el, name) {
  el.textContent = ''; el.style.background = '';
  const p = players.get(cleanName(name));
  if (p && p.photo) { const im = document.createElement('img'); im.alt = ''; im.src = p.photo; el.appendChild(im); el.classList.add('has-photo'); fitHeadWhenReady(im, p); return; }
  const n = cleanName(name) || '?';
  let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
  el.style.background = 'hsl(' + h + ' 45% 32%)';
  el.textContent = n[0];
}
let playersAt = 0;
// vrai seulement quand on SAIT que ce nom n'est pas membre de la salle actuelle (liste chargée) ; inconnu = faux
function knownNotMember(name) { return !!room && membersFor === room.id && !memberNames.has(cleanName(name)); }
let selfLeave = '';                  // nom que cet appareil vient de retirer lui-même (pas de message « on t'a retiré »)
async function loadPlayers() {
  if (!ONLINE || !room) return;
  const rid = room.id;
  try {
    const rows = await rpc('get_players', Object.assign({ p_code: CODE() }, RP())) || [];
    if (!room || room.id !== rid) return;
    serverOk = true;
    const me = cleanName(profile.name), wasMe = membersFor === rid && !knownNotMember(me);
    for (const p of players.values()) { p.member = false; p.alias = null; }    // un joueur retiré de la salle n'en fait plus partie
    memberNames = new Set(rows.map(r => cleanName(r.r_name)));
    for (const r of rows) {
      setPlayer(r.r_name, r.r_photo, r.r_sound || null);
      const p = players.get(cleanName(r.r_name));
      if (p) { p.member = true; p.alias = r.r_alias ? cleanName(r.r_alias) : null; p.seen = Math.max(p.seen || 0, Date.parse(r.r_seen) || 0); p.dbGame = r.r_game || null; if (!PRES.ok) p.game = r.r_game || null; p.updated = Date.parse(r.r_updated) || 0; if (r.r_version) p.dbVer = r.r_version; }
    }
    playersAt = Date.now(); membersFor = rid;
    if (wasMe && me && knownNotMember(me) && selfLeave !== me) toastCheer(me + ' ne fait plus partie de « ' + room.name + ' ».', me, true);
    if (selfLeave === me && !knownNotMember(me)) selfLeave = '';
    syncOwnPlayer();
    if (PRES.ok) setTimeout(presChanged, 0);
    refreshAll();
    if (!$('jdw-members').hidden) renderMembers();
    if (PROG.room === rid) progBoot();
    if (MAP.open) mapUpdate();
  } catch (e) { serverOk = false; onRoomError(e); refreshAll(); }
}
async function pushProfile() {
  syncOwnPlayer();
  if (!ONLINE || !profile.name) return true;
  const args = { p_code: CODE(), p_name: profile.name, p_photo: profile.consent ? profile.photo : null, p_consent: !!profile.consent };
  if (profile.sound !== undefined && profile.sound !== null) args.p_sound = profile.sound;   // '' = retirer le cri
  let ok = true;
  try { await rpc('save_player', args); poke('players'); }
  catch (e) { ok = false; }
  if (ok) await pushRoomLook();
  return ok;
}

/* ================= Erreurs : remontées au serveur + sauvetage du score ================= */
const BUILD = window.JDW_BUILD || 'dev';
const errSeen = new Set(); let errCount = 0;
let errLog = store.get('jdw.errors', []); if (!Array.isArray(errLog)) errLog = [];
// numéro de l'appli Android : donné par l'appli elle-même (1.4 et suivantes), sinon d'après son numéro interne
function appVName() {
  const v = navigator.userAgent.match(/BorneArcadeV\/([0-9.]+)/); if (v) return v[1];
  const c = navigator.userAgent.match(/BorneArcade\/(\d+)/); return c ? ({ 2: '1.1', 3: '1.2', 4: '1.3' }[c[1]] || '?') : '';
}
function myVersionTag() {
  return (window.JDW_VERSION || '?') + (navigator.userAgent.match(/BorneArcade\//) ? '·a' + appVName() : '·web');
}
function versionLabel(tag) {
  if (!tag) return '';
  const [v, a] = String(tag).split('·');
  return 'v' + v + (a === 'web' ? ' · navigateur' : a && a[0] === 'a' ? ' · appli ' + a.slice(1) : '');
}
function appVersion() { const m = navigator.userAgent.match(/BorneArcade\/(\d+)/); return BUILD + (m ? ' appli ' + m[1] : ' web'); }
function reportError(message, detail, opts) {
  message = String(message || 'Erreur inconnue').slice(0, 500);
  if (/ResizeObserver loop|^Script error\.?$/.test(message)) return;          // bruit sans conséquence
  // réseau coupé : ce n'est pas un bug de la borne (ni journal, ni écran « Oups »)
  if ((netOff() || navigator.onLine === false) && /fetch|network|réseau|load failed|connexion|offline|timeout|abort/i.test(message + ' ' + (detail || '').slice(0, 300))) return;
  let game = 'démarrage';
  try { game = current ? current.game.id : where; } catch (e) {}   // erreur pendant le chargement de la page
  const key = game + '|' + message;
  if (errSeen.has(key) || errCount >= 20) return;
  errSeen.add(key); errCount++;
  let sc = null;
  try { if (current && current.inst && current.inst.currentScore) sc = current.inst.currentScore(); } catch (e) {}
  const d = String(detail || '').slice(0, 3500) + (sc !== null ? '\nscore en cours : ' + sc : '') + '\nécran : ' + innerWidth + 'x' + innerHeight;
  errLog.unshift({ at: Date.now(), game, message, detail: d }); errLog = errLog.slice(0, 20); store.set('jdw.errors', errLog);
  if (ONLINE && CFG && !netOff()) rpc('log_error', { p_code: CODE(), p_name: profile.name || '', p_room: room ? room.id : null, p_game: game, p_message: message,
    p_detail: d, p_ua: navigator.userAgent.slice(0, 300), p_version: appVersion() }).catch(() => {});
  try { if (!(opts && opts.quiet) && current && !current.over && !$('jdw-play').hidden) offerRescue(); } catch (e) {}
}
function offerRescue() {
  let sc = 0;
  try { sc = Math.floor(+current.inst.currentScore() || 0); } catch (e) {}
  $('jdw-rescue-txt').textContent = sc > 0 ? 'Ton score de ' + fmt(sc) + ' est gardé.' : 'Tu peux continuer ou relancer la partie.';
  $('jdw-rescue-ok').textContent = sc > 0 ? 'Terminer et garder mon score' : 'Recommencer';
  $('jdw-rescue').hidden = false;
}
$('jdw-rescue-ok').addEventListener('click', () => {
  $('jdw-rescue').hidden = true;
  if (!current) return;
  let sc = 0; try { sc = Math.floor(+current.inst.currentScore() || 0); } catch (e) {}
  if (sc > 0) quitGame(); else { const g = current.game; unmountGame(); mountGame(g); }
});
$('jdw-rescue-x').addEventListener('click', () => { $('jdw-rescue').hidden = true; });
// erreurs d'extensions du navigateur (ex. iGraal qui relance ses scripts quand la page s'ouvre) : pas la borne, on les ignore
const foreignError = e => /^(chrome|moz|safari(-web)?)-extension:|^webkit-masked-url:/.test(e.filename || '') || /duplicate variable|has already been declared/i.test(e.message || '');
addEventListener('error', e => { if (!foreignError(e)) reportError(e.message, (e.error && e.error.stack) || ((e.filename || '') + ':' + e.lineno + ':' + e.colno)); });
addEventListener('unhandledrejection', e => { const r = e.reason; reportError('Promesse : ' + ((r && r.message) || r), r && r.stack, { quiet: true }); });

/* ================= Musique (assets/music/<morceau>.mp3, ElevenLabs) ================= */
const MUS = { on: store.get('jdw.music', true) !== false, gain: null, buf: {}, order: [], cur: null, id: '', want: '', loopT: 0, seq: 0 };
const MUSIC_VOL = 0.42, XFADE = 1.6;
// niveau de la musique selon l'écran (accueil 1, en jeu 0.8, fin de partie 0.5) et baisse momentanée pendant un cri
let musBase = 1, duckLvl = 1, duckUntil = 0, duckTimer = 0;
function musicLevel() { return MUSIC_VOL * musBase * (Date.now() < duckUntil ? duckLvl : 1); }
function musicApplyLevel(ramp) {
  if (!MUS.gain || !Audio.ctx) return;
  const A = Audio.ctx, now = A.currentTime;
  try { MUS.gain.gain.cancelScheduledValues(now); MUS.gain.gain.setValueAtTime(MUS.gain.gain.value, now); MUS.gain.gain.linearRampToValueAtTime(musicLevel(), now + (ramp || 0.4)); } catch (e) {}
}
function musicBaseLevel(v) { musBase = v; musicApplyLevel(0.6); }
function duckMusic(level, ms) {
  duckLvl = level; duckUntil = Date.now() + ms; musicApplyLevel(0.12);
  clearTimeout(duckTimer); duckTimer = setTimeout(() => musicApplyLevel(0.8), ms + 30);
}
function unduckMusic() { duckUntil = 0; clearTimeout(duckTimer); musicApplyLevel(0.8); }
// variantes d'un morceau : « empilo » → empilo-1, empilo-2, empilo-3 (départ au hasard, puis à la suite)
// calmes au début, énergiques aux niveaux difficiles ; à l'accueil, un mélange des deux
function musicVariants(id, mode) {
  const v = (window.JDW_MUSIC || {})[id]; if (!v) return [id];
  const c = v.c || [], x = v.x || [];
  const list = id === 'accueil' ? [...c, ...x] : mode === 'intense' ? (x.length ? x : c) : (c.length ? c : x);
  return list.length ? list : [id];
}
// niveau à partir duquel la musique devient énergique, par jeu
const INTENSE_AT = { magic: 2, ilo: 4, pleingaz: 4, empilo: 6, glouton: 4, mouches: 7, carreaux: 7, rouleaux: 7, canards: 6 };
// morceaux emballés (assets/music/<nom>.bin, collection de l'Asset Store) : sel(16) + iv(12) + AES-GCM, clé tirée de la clé d'emballage
// intégrée au site (window.JDW_ASSET_KEY, source/asset-key.txt) : pas un secret, les fichiers ne sont simplement jamais lisibles directement
const MUSIC_ENC = new Set(window.JDW_MUSIC_ENC || []);
const binKeys = {};
async function decryptBin(u8) {
  const salt = u8.slice(0, 16), k = Array.prototype.join.call(salt, '.');
  if (!binKeys[k]) binKeys[k] = (async () => {
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(window.JDW_ASSET_KEY || ''), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  })();
  try { return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8.slice(16, 28) }, await binKeys[k], u8.slice(28)); }
  catch (e) { delete binKeys[k]; throw e; }
}
const musicPath = id => 'assets/music/' + id + (MUSIC_ENC.has(id) ? '.bin' : '.mp3');
// morceaux disponibles sans réseau : en mémoire, ou gardés par le service worker (jouer/sw.js)
async function musicAvail(list) {
  const out = [];
  for (const n of list) {
    if (MUS.buf[n]) { out.push(n); continue; }
    try { if (window.caches && await caches.match(new URL(ROOT + musicPath(n), location.href).href)) out.push(n); } catch (e) {}
  }
  return out;
}
async function musicBuffer(id) {
  if (MUS.buf[id]) return MUS.buf[id];
  const enc = MUSIC_ENC.has(id);
  const r = await fetch(ROOT + 'assets/music/' + id + (enc ? '.bin' : '.mp3')); if (!r.ok) throw new Error('musique ' + id + ' ' + r.status);
  let ab = await r.arrayBuffer();
  if (enc) ab = await decryptBin(new Uint8Array(ab));
  const b = await new Promise((res, rej) => Audio.ctx.decodeAudioData(ab, res, rej));
  MUS.buf[id] = b; MUS.order.push(id);
  while (MUS.order.length > 4) delete MUS.buf[MUS.order.shift()];   // on garde peu de morceaux en mémoire
  return b;
}
// petits jingles (victoire, point, GO…) : sting-<nom>.bin, joués avec les bruitages (coupés avec eux)
const STINGS = {};
function stingBuffer(id) {
  if (!STINGS[id]) STINGS[id] = (async () => {
    const r = await fetch(ROOT + 'assets/music/' + id + '.bin'); if (!r.ok) throw new Error('jingle ' + id + ' ' + r.status);
    const ab = await decryptBin(new Uint8Array(await r.arrayBuffer()));
    return new Promise((res, rej) => Audio.ctx.decodeAudioData(ab, res, rej));
  })().catch(e => { delete STINGS[id]; throw e; });
  return STINGS[id];
}
const hasSting = name => MUSIC_ENC.has('sting-' + name);
function sting(name, vol, duck) {
  const id = 'sting-' + name;
  if (muted || !Audio.ctx || !MUSIC_ENC.has(id)) return false;
  stingBuffer(id).then(b => {
    if (muted || !Audio.ctx) return;
    const A = Audio.ctx, src = A.createBufferSource(), g = A.createGain();
    g.gain.value = 0.9 * (vol == null ? 1 : vol); src.buffer = b; src.connect(g).connect(Audio.master); src.start();
    if (duck !== false) duckMusic(0.3, Math.min(7000, b.duration * 1000));
  }).catch(() => {});
  return true;
}
function preloadStings(names) { if (Audio.ctx) for (const n of names) if (hasSting(n)) stingBuffer('sting-' + n).catch(() => {}); }
function musicOut(t) {
  const c = MUS.cur; MUS.cur = null; MUS.id = ''; clearTimeout(MUS.loopT);
  if (!c || !Audio.ctx) return;
  const A = Audio.ctx, now = A.currentTime;
  try { c.g.gain.cancelScheduledValues(now); c.g.gain.setValueAtTime(Math.max(0.0001, c.g.gain.value), now); c.g.gain.exponentialRampToValueAtTime(0.0001, now + t); c.src.stop(now + t + 0.05); } catch (e) {}
}
function musicLoop(id, b, when, fadeIn, seq, list, idx) {
  const A = Audio.ctx;
  if (!MUS.gain) { MUS.gain = A.createGain(); MUS.gain.gain.value = musicLevel(); MUS.gain.connect(A.destination); }
  const src = A.createBufferSource(), g = A.createGain(); src.buffer = b; src.connect(g).connect(MUS.gain);
  const end = when + b.duration;
  g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(1, when + fadeIn);
  g.gain.setValueAtTime(1, end - XFADE); g.gain.exponentialRampToValueAtTime(0.0001, end);
  src.start(when); src.stop(end + 0.05);
  MUS.cur = { src, g }; MUS.id = id; MUS.track = list ? list[idx] : id;
  clearTimeout(MUS.loopT);
  // le morceau suivant de la liste se prépare pendant que celui-ci joue, puis prend le relais en fondu enchaîné
  const nextIdx = list && list.length > 1 ? (idx + 1) % list.length : idx, nextName = list ? list[nextIdx] : null;
  let nextBuf = null;
  if (nextName && nextName !== (list ? list[idx] : null)) musicBuffer(nextName).then(nb => { nextBuf = nb; }).catch(() => {});
  MUS.loopT = setTimeout(() => {
    if (MUS.seq !== seq || MUS.id !== id) return;
    musicLoop(id, nextBuf || b, end - XFADE, XFADE, seq, list, nextBuf ? nextIdx : idx);
  }, Math.max(0, (end - XFADE - A.currentTime - 0.4) * 1000));
}
async function setMusic(id, mode) {
  mode = mode || 'calm';
  MUS.want = id || ''; MUS.wantMode = mode;
  if (!MUS.on || !id || !Audio.ctx || document.hidden) { musicOut(0.6); return; }
  if (MUS.id === id && MUS.mode === mode && MUS.cur) return;
  MUS.mode = mode;
  const seq = ++MUS.seq;
  let list = musicVariants(id, mode);
  // hors ligne : seulement les morceaux gardés sur l'appareil (sinon ceux de l'accueil)
  if (netOff()) { let a = await musicAvail(list); if (!a.length && id !== 'accueil') a = await musicAvail(musicVariants('accueil')); if (a.length) list = a; }
  if (seq !== MUS.seq) return;
  // un morceau qui ne vient pas (réseau coupé) : on essaie les autres variantes
  let idx = Math.floor(shellRand() * list.length), b = null;
  for (let k = 0; k < list.length && !b; k++) { const j = (idx + k) % list.length; try { b = await musicBuffer(list[j]); idx = j; } catch (e) {} if (seq !== MUS.seq) return; }
  if (!b || seq !== MUS.seq || MUS.want !== id || !MUS.on) return;
  musicOut(0.9);
  musicLoop(id, b, Audio.ctx.currentTime + 0.05, 0.9, seq, list, idx);
}
function setMusicOn(on) {
  MUS.on = !!on; store.set('jdw.music', MUS.on);
  if (!MUS.on) musicOut(0.4); else { Audio.ensure(); setMusic(MUS.want || screenMusic(), MUS.wantMode); }
}
function screenMusic() { return !$('jdw-play').hidden && current ? current.game.id : 'accueil'; }
document.addEventListener('visibilitychange', () => { if (document.hidden) { const w = MUS.want; musicOut(0.3); MUS.want = w; } else if (MUS.want) setMusic(MUS.want, MUS.wantMode); });
// la musique démarre au premier geste (règle des navigateurs)
addEventListener('pointerdown', function firstTouch() { removeEventListener('pointerdown', firstTouch, true); Audio.ensure(); setMusic(screenMusic()); }, true);

/* ================= Cris des copains ================= */
let criAudio = null;
function hasCri(name) { const p = players.get(cleanName(name)); return !!(p && p.sound); }
function playCri(name, el) {
  const p = players.get(cleanName(name));
  return !!(p && p.sound) && playCriSrc(p.sound, el);
}
function playCriSrc(src, el) {
  if (!src || !criOn) return false;
  try { if (criAudio) { criAudio.pause(); criAudio = null; } } catch (e) {}
  try {
    criAudio = new window.Audio(src); criAudio.volume = 1;
    duckMusic(0.22, 3600);                                          // la musique s'efface derrière le cri
    criAudio.addEventListener('loadedmetadata', () => { if (isFinite(criAudio.duration)) duckMusic(0.22, criAudio.duration * 1000 + 250); });
    criAudio.addEventListener('ended', unduckMusic);
    const pr = criAudio.play(); if (pr && pr.catch) pr.catch(() => unduckMusic());
  } catch (e) { unduckMusic(); return false; }
  if (el) { el.classList.remove('crying'); void el.offsetWidth; el.classList.add('crying'); setTimeout(() => el.classList.remove('crying'), 1600); }
  return true;
}

/* ================= Scores ================= */
let remote = {};                                   // jeu -> [{name, score, at}]
let local = store.get('jdw.scores2', {}); if (!local || typeof local !== 'object') local = {};
// meilleurs scores par joueur de l'appareil : NOM -> { jeu: score }
let bests = store.get('jdw.bests2', null);
if (!bests || typeof bests !== 'object') {
  bests = {};
  const old = store.get('jdw.bests', null);
  if (old && typeof old === 'object' && profile.name) bests[cleanName(profile.name)] = old;
  store.set('jdw.bests2', bests);
}
const bestOf = (name, game) => ((bests[cleanName(name)] || {})[game]) || 0;
function bestPerName(rows) {
  const m = new Map();
  for (const r of rows) { const k = cleanName(r.name); const c = m.get(k); if (!c || r.score > c.score) m.set(k, { name: k, score: r.score, at: r.at || 0 }); }
  return [...m.values()].sort((a, b) => b.score - a.score || a.at - b.at);
}
let world = {}, worldLoaded = false, worldErr = false, boardScope = store.get('jdw.boardscope', 'room');
function top(game, scope) {
  if (scope === 'world') return bestPerName(world[game] || []).slice(0, 10);
  if (isGuest()) return [];
  return bestPerName(ONLINE && room && remoteLoaded ? (remote[game] || []) : (local[game] || [])).slice(0, 10);
}
async function loadWorld() {
  if (!ONLINE) return;
  try {
    const rows = await rpc('get_world_scores', { p_code: CODE() }) || [];
    const next = {};
    for (const r of rows) (next[r.r_game] = next[r.r_game] || []).push({ name: r.r_name, score: +r.r_score || 0, at: Date.parse(r.r_at) || 0 });
    world = next; worldLoaded = true; worldErr = false;
  } catch (e) { worldLoaded = false; worldErr = true; }
  if (!$('jdw-board').hidden) renderBoardTab();
}
function onRoomError(e) {
  // salle retenue sur l'appareil, mais aucun joueur de ce compte n'en est membre : on la choisit à nouveau
  if (e && e.member && room && !isGuest()) { const t = roomTopic(); room = null; store.set('jdw.room', null); if (t) rtLeave(t); refreshAll(); setTimeout(() => { if (!room && !invPending() && !INV.busy) openRooms(); }, 300); return; }   // un lien d'invitation en cours choisit la salle
  if (!e || !e.denied || !room || roomDenied) return;
  roomDenied = true; refreshAll();
  if (room.priv) setTimeout(() => {
    Promise.resolve(openRooms()).then(() => askCode({ r_id: room.id, r_name: room.name, r_private: true }, 'Le code de « ' + room.name + " » n'est pas enregistré sur cet appareil : retape-le pour retrouver ta salle."));
  }, 500);
}
async function loadScores() {
  if (!ONLINE || !room) return;
  try {
    const rows = await rpc('get_scores', Object.assign({ p_code: CODE() }, RP())) || [];
    const next = {};
    for (const r of rows) (next[r.r_game] = next[r.r_game] || []).push({ name: r.r_name, score: +r.r_score || 0, at: Date.parse(r.r_at) || 0 });
    remote = next; serverOk = true; remoteLoaded = true; roomDenied = false;
    if (unsent.length) setTimeout(flushUnsent, 500);
  } catch (e) { serverOk = false; onRoomError(e); }
  refreshAll();
  try { if (MAP.open) mapUpdate(); } catch (e) {}       // carte ouverte : les scores sous les têtes, en direct
  loadNotifs();
}
async function saveScore(game, score, forName) {
  if (isGuest()) return 'guest';       // invité : aucun score enregistré, ni en ligne ni sur l'appareil
  const name = cleanName(forName || profile.name) || 'JOUEUR';
  const entry = { name, score, at: Date.now() };
  if (!ONLINE) localNotify(game, name, score);
  (local[game] = local[game] || []).push(entry);
  local[game] = bestPerName(local[game]).slice(0, 20); store.set('jdw.scores2', local);
  const b = bests[name] = bests[name] || {};
  b[game] = Math.max(b[game] || 0, score); store.set('jdw.bests2', bests);
  if (ONLINE && room) {
    saving++;
    try {
      await rpc('add_score', Object.assign({ p_code: CODE() }, RP(), { p_game: game, p_name: name, p_score: score }));
      if (!knownNotMember(name)) (remote[game] = remote[game] || []).push(entry);
      serverOk = true;
      poke('scores'); poke('chat');
      loadScores();
      return 'shared';
    } catch (e) { queueScore(game, name, score); return 'local'; }
    finally { saving--; }
  }
  return 'local';
}
// scores pas encore partis (réseau coupé) : renvoyés dès que le serveur répond
let unsent = store.get('jdw.unsent', []); if (!Array.isArray(unsent)) unsent = [];
// Un seul envoi en attente par (salle, joueur, jeu) : le meilleur (le serveur ne garde que le meilleur score, add_score est sans doublon).
function queueScore(game, name, score) {
  if (!room) return;
  const same = unsent.find(u => u.room === room.id && u.name === name && u.game === game);
  if (same) { same.score = Math.max(+same.score || 0, score); same.code = roomCodes[room.id] || same.code || ''; }
  else unsent.push({ room: room.id, code: roomCodes[room.id] || '', game, name, score });
  unsent = unsent.slice(-30); store.set('jdw.unsent', unsent);
}
let flushing = false;
async function flushUnsent() {
  if (flushing || !ONLINE || !unsent.length || netOff()) return;
  flushing = true;
  let sent = 0;
  try {
    for (const u of unsent.slice()) {
      let drop = false; const sc = u.score;
      try { await rpc('add_score', { p_code: CODE(), p_room: u.room, p_room_code: u.code, p_game: u.game, p_name: u.name, p_score: sc }); drop = u.score === sc; sent++; }   // battu pendant l'envoi : le nouveau part au tour suivant
      catch (e) {
        if (e.offline) break;                                                    // réseau coupé en route : la suite attend le retour
        if (!e.acct && !e.guest && / 4\d\d /.test(String(e.message))) drop = true;   // refus définitif (4xx) : on abandonne ; « compte requis » : gardé jusqu'à la connexion
      }
      // retiré par identité : un score ajouté pendant l'envoi reste dans la file
      if (drop) { unsent = unsent.filter(x => x !== u); store.set('jdw.unsent', unsent); }
    }
  } finally { flushing = false; }
  if (sent) { poke('scores'); loadScores(); }
}

/* ================= Notifications « X a battu ton record » ================= */
let notifs = [], notifsOk = false;                 // [{ id, actor, game, score, prev, at }]
let localNotifs = store.get('jdw.localnotifs', []); if (!Array.isArray(localNotifs)) localNotifs = [];
let notifSeen = store.get('jdw.notifseen', {}) || {}, notifToasted = store.get('jdw.notiftoast', {}) || {};
const notifKey = () => (ONLINE ? (room ? room.id : '-') : 'local') + ':' + cleanName(profile.name);
function localNotify(game, actor, score) {          // mode local : prévient les autres profils de l'appareil
  const rows = bestPerName(local[game] || []), mine = rows.find(r => r.name === actor), prev = mine ? mine.score : -1;
  const devs = deviceNames();
  for (const r of rows) {
    if (r.name === actor || !devs.includes(r.name) || !(r.score < score && r.score >= prev)) continue;
    localNotifs.unshift({ id: Date.now() * 10 + localNotifs.length % 10, target: r.name, actor, game, score, prev: r.score, at: Date.now() });
  }
  localNotifs = localNotifs.slice(0, 60); store.set('jdw.localnotifs', localNotifs);
}
async function loadNotifs() {
  const me = cleanName(profile.name);
  if (!me || (ONLINE && !room)) { notifs = []; refreshBell(); return; }
  if (ONLINE) {
    try {
      const rows = await rpc('get_notifications', Object.assign({ p_code: CODE() }, RP(), { p_name: me })) || [];
      if (cleanName(profile.name) !== me) return;   // on a changé de joueur entre-temps
      notifs = rows.map(r => ({ id: +r.r_id, actor: r.r_actor, game: r.r_game, score: +r.r_score || 0, prev: +r.r_prev || 0, at: Date.parse(r.r_at) || 0 }));
      notifsOk = true;
    } catch (e) { notifsOk = false; }              // fonction absente côté serveur : pas de cloche
  } else { notifs = localNotifs.filter(n => n.target === me); notifsOk = true; }
  refreshBell();
  const key = notifKey(), last = notifToasted[key] || 0, fresh = notifs.filter(n => n.id > last);
  if (fresh.length && $('jdw-play').hidden && last) {
    const n = fresh[0], g = gameById(n.game);
    toastCheer(n.actor + ' a battu ton record' + (g ? ' à ' + g.title : '') + ' !', n.actor, true);
  }
  if (notifs.length) { notifToasted[key] = Math.max(last, ...notifs.map(n => n.id)); store.set('jdw.notiftoast', notifToasted); }
  else if (!last) { notifToasted[key] = 1; store.set('jdw.notiftoast', notifToasted); }
}
let gameNotifSeen = store.get('jdw.gamenotifseen', {}) || {};
// mises à jour annoncées en direct : nouvelle version du site (rechargement) et nouvelle appli Android (téléchargement)
const UPD = { site: '', app: '', seen: store.get('jdw.updseen', {}) || {} };
function updateNotifs() {
  const out = [];
  if (UPD.installed && UPD.seen.installed !== UPD.installed) out.push({ kind: 'installed', v: UPD.installed });
  if (UPD.site && UPD.seen.site !== UPD.site) out.push({ kind: 'site', v: UPD.site });
  if (UPD.app && UPD.seen.app !== UPD.app) out.push({ kind: 'app', v: UPD.app });
  return out;
}
function gameNotifs() {
  const me = cleanName(profile.name); if (!me) return [];
  return [...NEW_GAMES].filter(id => gameById(id) && tileNews(id) === 'new' && !(gameNotifSeen[me] || []).includes(id)).map(id => ({ kind: 'game', game: id }));
}
function unseenCount() { const s = notifSeen[notifKey()] || 0; return notifs.filter(n => n.id > s).length + gameNotifs().length + updateNotifs().length; }
function refreshBell() {
  $('jdw-bell').hidden = !profile.name || (!notifsOk && !gameNotifs().length && !updateNotifs().length);
  const n = unseenCount(), b = $('jdw-bell-n');
  b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n);
  $('jdw-bell').setAttribute('aria-label', n ? n + ' nouvelle' + (n > 1 ? 's' : '') + ' notification' + (n > 1 ? 's' : '') : 'Notifications');
}
function timeAgo(t) {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return "à l'instant";
  if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
  if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
  const d = Math.round(s / 86400); return d === 1 ? 'hier' : 'il y a ' + d + ' jours';
}
function notifRow(n, isNew) {
  const li = document.createElement('li'); if (isNew) li.className = 'new';
  const tx = document.createElement('span'); tx.className = 'nt';
  if (n.kind === 'installed') {
    const ic = document.createElement('span'); ic.className = 'avatar nt-game'; ic.textContent = '✨'; ic.style.background = 'var(--gold)';
    const b = document.createElement('b'); b.textContent = 'Version ' + n.v + ' installée';
    tx.append(b);
    const notes = window.JDW_NOTES || [];
    if (notes.length) { const ul = document.createElement('ul'); ul.className = 'nt-notes'; for (const t of notes) { const li2 = document.createElement('li'); li2.textContent = t; ul.appendChild(li2); } tx.append(ul); }
    li.append(ic, tx);
    return li;
  }
  if (n.kind === 'site' || n.kind === 'app') {
    const app = n.kind === 'app';
    const ic = document.createElement('span'); ic.className = 'avatar nt-game'; ic.textContent = app ? '📲' : '🔄'; ic.style.background = app ? 'var(--leaf)' : 'var(--volt)';
    const b = document.createElement('b'); b.textContent = app ? 'Nouvelle appli ' + n.v + ' à télécharger' : 'Mise à jour ' + n.v + ' disponible';
    const sm = document.createElement('small'); sm.textContent = app ? 'Touche ici pour télécharger la nouvelle appli' : 'Touche ici pour l\'installer maintenant';
    tx.append(b, sm); li.append(ic, tx); li.classList.add('click');
    li.addEventListener('click', () => { closeSheet('jdw-notifs'); if (app) location.href = ROOT + 'telecharger/'; else reloadNow(); });
    return li;
  }
  if (n.kind === 'game') {
    const g = gameById(n.game);
    const ic = document.createElement('span'); ic.className = 'avatar nt-game'; ic.textContent = '🎮'; if (g) ic.style.background = g.accent;
    const b = document.createElement('b'); b.textContent = 'Nouveau jeu disponible !';
    const sm = document.createElement('small'); sm.textContent = (g ? g.title + ' · ' : '') + 'touche pour y jouer';
    tx.append(b, sm); li.append(ic, tx); li.classList.add('click');
    li.addEventListener('click', () => { closeSheet('jdw-notifs'); if (g) openGame(g); });
    return li;
  }
  const g = gameById(n.game);
  const av = document.createElement('span'); av.className = 'avatar'; avatarInto(av, n.actor);
  const b = document.createElement('b'); b.textContent = dispName(n.actor);
  tx.append(b, ' a battu ton record' + (g ? ' à ' + g.title : ''));
  const sm = document.createElement('small'); sm.textContent = fmt(n.score) + unit(g) + ' contre ' + fmt(n.prev) + unit(g) + ' pour toi · ' + timeAgo(n.at);
  tx.append(sm); li.append(av, tx);
  return li;
}
function openNotifs(showOld) {
  const ol = $('jdw-notifs-list'); ol.textContent = '';
  const key = notifKey(), seen = notifSeen[key] || 0, me = cleanName(profile.name);
  const fresh = [...updateNotifs(), ...gameNotifs(), ...notifs.filter(n => n.id > seen)];
  const old = notifs.filter(n => n.id <= seen);
  // ce qui est vu disparaît : la prochaine fois, seulement les nouveautés (l'historique reste consultable)
  for (const n of fresh) ol.appendChild(notifRow(n, true));
  if (!fresh.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Rien de nouveau pour le moment.'; ol.appendChild(li); }
  if (showOld === true) for (const n of old) ol.appendChild(notifRow(n, false));
  $('jdw-notifs-old').hidden = showOld === true || !old.length;
  if (notifs.length) { notifSeen[key] = Math.max(seen, ...notifs.map(n => n.id)); store.set('jdw.notifseen', notifSeen); }
  for (const u of updateNotifs()) UPD.seen[u.kind] = u.v;
  store.set('jdw.updseen', UPD.seen);
  const gn = gameNotifs(); if (gn.length && me) { gameNotifSeen[me] = [...(gameNotifSeen[me] || []), ...gn.map(n => n.game)]; store.set('jdw.gamenotifseen', gameNotifSeen); }
  refreshBell();
  if ($('jdw-notifs').hidden) openSheet('jdw-notifs', 'jdw-notifs-close');
}
$('jdw-notifs-old').addEventListener('click', () => openNotifs(true));
$('jdw-bell').addEventListener('click', () => openNotifs(false));
$('jdw-notifs-close').addEventListener('click', () => closeSheet('jdw-notifs'));
$('jdw-notifs').addEventListener('click', e => { if (e.target === $('jdw-notifs')) closeSheet('jdw-notifs'); });

/* ================= Chat de la salle ================= */
const chat = { msgs: [], lastId: 0, ok: false, open: false, busy: false, pending: [], roomId: null, reacts: new Map(), polls: 0 };
let chatSeen = store.get('jdw.chatseen', {}) || {};
const chatKey = () => (room ? room.id : '-') + ':' + cleanName(profile.name);
const QUICK = ['👏', '😂', '🔥', '😭', '🏆', '🚽', 'GG !', 'Revanche ?'];
function chatReset() {
  chat.msgs = []; chat.lastId = 0; chat.pending = []; chat.roomId = room ? room.id : null; chat.reacts = new Map(); closePicker();
  $('jdw-chat-log').textContent = ''; refreshChatBtn();
}
async function loadChat() {
  if (!ONLINE || !room) return;
  if (chat.busy) { chat.again = true; return; }
  if (chat.roomId !== room.id) chatReset();
  chat.busy = true;
  const rid = room.id;
  try {
    const rows = await rpc('get_messages', Object.assign({ p_code: CODE() }, RP(), { p_after: chat.lastId })) || [];
    if (!room || room.id !== rid) return;
    chat.ok = true;
    const fresh = rows.map(r => ({ id: +r.r_id, name: r.r_name, body: r.r_body, kind: r.r_kind, game: r.r_game, score: +r.r_score || 0,
      beaten: r.r_beaten, beatenScore: +r.r_beaten_score || 0, at: Date.parse(r.r_at) || Date.now() })).filter(m => m.id > chat.lastId);
    if (fresh.length) {
      chat.newIds = new Set(fresh.map(m => m.id));
      chat.msgs.push(...fresh); chat.lastId = fresh[fresh.length - 1].id;
      if (chat.msgs.length > 300) chat.msgs = chat.msgs.slice(-200);
      // les messages envoyés depuis cet appareil remplacent leur brouillon
      const me = cleanName(profile.name);
      for (const m of fresh) { const i = chat.pending.findIndex(p => p.name === me && p.body === m.body); if (i >= 0) chat.pending.splice(i, 1); }
      renderChat(true);
      loadReactions();
    } else if (chat.open && ++chat.polls % 3 === 0) loadReactions();
  } catch (e) { if (!chat.msgs.length) chat.ok = false; }
  finally { chat.busy = false; refreshChatBtn(); if (chat.again) { chat.again = false; loadChat(); } }
}
function chatUnread() {
  const s = chatSeen[chatKey()] || 0, me = cleanName(profile.name);
  return chat.msgs.filter(m => m.id > s && m.name !== me).length;
}
function markChatSeen() { if (chat.lastId) { chatSeen[chatKey()] = chat.lastId; store.set('jdw.chatseen', chatSeen); } }
function refreshChatBtn() {
  const show = ONLINE && !!room && chat.ok && !!profile.name;
  $('jdw-chat-btn').hidden = !show;
  if (chat.open) markChatSeen();
  const n = chat.open ? 0 : chatUnread(), b = $('jdw-chat-n');
  b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n);
  $('jdw-chat-btn').setAttribute('aria-label', n ? 'Chat de la salle, ' + n + ' message' + (n > 1 ? 's' : '') + ' non lu' + (n > 1 ? 's' : '') : 'Chat de la salle');
  $('jdw-end-chat').hidden = !show;
}
const nameHue = n => { let h = 0; for (const c of cleanName(n)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
// tête détourée (photo du joueur) posée sur une pastille à sa couleur ; initiale si pas de photo
function chatHead(name, opts) {
  opts = opts || {};
  const el = document.createElement('span'); el.className = 'chead' + (opts.cls ? ' ' + opts.cls : '');
  el.style.setProperty('--h', nameHue(name));
  const p = players.get(cleanName(name));
  // la photo est découpée dans .chead-in (cheveux qui dépassent du rond) ; la pastille 🔊 reste sur .chead, jamais rognée
  const inner = document.createElement('span'); inner.className = 'chead-in'; el.appendChild(inner);
  if (p && p.photo) {
    const im = document.createElement('img'); im.alt = ''; im.decoding = 'async';
    im.src = opts.sad ? sadUrl(p) : p.photo; inner.appendChild(im); el.classList.add('photo');
    fitHeadWhenReady(im, p);   // la tête sad a le même contour que la normale
  } else { const i = document.createElement('i'); i.textContent = (cleanName(name) || '?')[0]; inner.appendChild(i); }
  if (opts.title) el.title = dispName(name);
  if (hasCri(name)) {
    el.classList.add('has-cri');
    if (!opts.passive) { el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', 'Écouter le cri de ' + cleanName(name));
      const go = e => { e.stopPropagation(); e.preventDefault(); playCri(name, el); };
      el.addEventListener('click', go); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(e); }); }
  }
  return el;
}
const hhmm = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
function dayLabel(t) {
  const d = new Date(t), today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (diff === 0) return "Aujourd'hui"; if (diff === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
const onlyEmoji = s => /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\s){1,12}$/u.test(s) && !/[0-9#*]/.test(s);
function chatAtBottom() { const l = $('jdw-chat-log'); return l.scrollHeight - l.scrollTop - l.clientHeight < 60; }
function recordCard(m) {
  const g = gameById(m.game), el = document.createElement('div'); el.className = 'chat-record';
  if (g) el.style.setProperty('--acc', g.accent);
  const heads = document.createElement('div'); heads.className = 'cr-heads';
  const a = chatHead(m.name, { cls: 'win' }); const crown = document.createElement('span'); crown.className = 'cr-crown'; crown.textContent = '👑'; a.appendChild(crown);
  const b = chatHead(m.beaten, { cls: 'lose', sad: true });
  heads.append(b, a);
  const tx = document.createElement('div'); tx.className = 'cr-txt';
  const eb = document.createElement('small'); eb.textContent = '🏆 Nouveau record' + (g ? ' · ' + g.title : '');
  const t = document.createElement('b'); t.textContent = dispName(m.name) + ' détrône ' + dispName(m.beaten) + ' !';
  const sc = document.createElement('span'); sc.textContent = fmt(m.score) + unit(g) + ' contre ' + fmt(m.beatenScore) + unit(g) + ' · ' + hhmm(m.at);
  tx.append(eb, t, sc);
  el.append(heads, tx);
  if (m.id) { el.dataset.mid = m.id; const rx = reactPill(m.id); if (rx) { el.appendChild(rx); el.classList.add('has-rx'); } }
  if (g) {
    const go = document.createElement('button'); go.type = 'button'; go.className = 'cr-go'; go.textContent = 'Revanche';
    go.setAttribute('aria-label', 'Jouer à ' + g.title + ' pour reprendre le record');
    go.addEventListener('click', () => { closeChat(); if (!$('jdw-play').hidden) backToLibrary(); openGame(g); });
    el.append(go);
  }
  return el;
}
function renderChat(fromPoll, quiet) {
  const log = $('jdw-chat-log'), stick = (!fromPoll && !quiet) || chatAtBottom() || !chat.open, keep = log.scrollTop;
  log.textContent = '';
  const me = cleanName(profile.name), all = chat.msgs.concat(chat.pending);
  if (!all.length) {
    const e = document.createElement('div'); e.className = 'chat-empty';
    e.innerHTML = '<b>Le chat de la salle est tout neuf.</b><span>Dis bonjour à la bande ! Les nouveaux records s\'afficheront ici automatiquement.</span>';
    log.appendChild(e);
  }
  let prevDay = '', prev = null;
  const others = chat.msgs.filter(m => m.kind !== 'record' && m.name !== me), lastOther = fromPoll && chat.newIds && others.length && chat.newIds.has(others[others.length - 1].id) ? others[others.length - 1] : null;
  for (const m of all) {
    const day = dayLabel(m.at);
    if (day !== prevDay) { const d = document.createElement('div'); d.className = 'chat-day'; d.textContent = day; log.appendChild(d); prevDay = day; prev = null; }
    if (m.kind === 'record') { log.appendChild(recordCard(m)); prev = null; continue; }
    const mine = m.name === me, grouped = prev && prev.name === m.name && m.at - prev.at < 5 * 60000;
    const row = document.createElement('div'); row.className = 'chat-msg' + (mine ? ' mine' : '') + (grouped ? ' grouped' : '') + (m.pending ? ' pending' : '') + (m.failed ? ' failed' : '');
    row.style.setProperty('--h', nameHue(m.name));
    const hd = chatHead(m.name); if (grouped) hd.classList.add('ghost');
    if (m === lastOther) hd.classList.add('talk');
    row.appendChild(hd);
    const col = document.createElement('div'); col.className = 'chat-col';
    if (!grouped) { const n = document.createElement('span'); n.className = 'chat-name'; n.textContent = mine ? 'Moi' : dispName(m.name); col.appendChild(n); }
    const bub = document.createElement('div'); bub.className = 'chat-bubble' + (onlyEmoji(m.body) ? ' big' : '') + (!mine && m.body.toUpperCase().includes('@' + me) ? ' ping' : '');
    bub.textContent = m.body;
    const tm = document.createElement('time'); tm.textContent = m.failed ? 'Non envoyé · toucher pour réessayer' : (m.pending ? 'Envoi…' : hhmm(m.at));
    bub.appendChild(tm);
    if (m.failed) { bub.tabIndex = 0; bub.addEventListener('click', () => { chat.pending = chat.pending.filter(p => p !== m); sendChat(m.body); }); }
    if (m.id) { bub.dataset.mid = m.id; const rx = reactPill(m.id); if (rx) { bub.appendChild(rx); row.classList.add('has-rx'); } }
    col.appendChild(bub); row.appendChild(col); log.appendChild(row);
    prev = m;
  }
  if (stick) { log.scrollTop = log.scrollHeight; $('jdw-chat-new').hidden = true; }
  else { log.scrollTop = keep; if (fromPoll && !quiet) $('jdw-chat-new').hidden = false; }
}
async function sendChat(text) {
  text = String(text || '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 300);
  if (!text || !room) return;
  if (knownNotMember(profile.name)) {
    if (!(await askJoin(profile.name, true)) || !(await joinHere())) { $('jdw-chat-status').textContent = 'Pour écrire ici, il faut faire partie de la salle.'; return; }
  }
  const m = { id: 0, name: cleanName(profile.name), body: text, kind: 'msg', at: Date.now(), pending: true };
  chat.pending.push(m); renderChat(false);
  Audio.ensure(); Audio.tone(880, 0.06, 'sine', 0.04, 1320);
  try {
    await rpc('post_message', Object.assign({ p_code: CODE() }, RP(), { p_name: profile.name, p_body: text }));
    $('jdw-chat-status').textContent = '';
    poke('chat');
    await loadChat();
  } catch (e) {
    m.pending = false; m.failed = true; renderChat(false);
    $('jdw-chat-status').textContent = /trop de messages/.test(String(e.message)) ? 'Doucement ! Attends quelques secondes avant de réécrire.' : "Message non envoyé : vérifie ta connexion.";
  }
}
function renderBand() {
  const band = $('jdw-chat-band'); band.textContent = '';
  const me = cleanName(profile.name);
  const inRoom = n => n === me || !room || membersFor !== room.id || memberNames.has(n);   // bande = membres de la salle (+ moi)
  const names = [...players.keys()].filter(inRoom).sort((x, y) => (x === me) - (y === me) || (!!(players.get(y) || {}).photo - !!(players.get(x) || {}).photo) || x.localeCompare(y));
  for (const n of names) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'band-p' + (n === me ? ' me' : '');
    b.setAttribute('aria-label', n === me ? 'Moi' : 'Parler à ' + n);
    const hd = chatHead(n, { passive: true }); b.append(hd); const t = document.createElement('span'); t.textContent = n === me ? 'Moi' : n; b.append(t);
    if (n === me && !hasCri(me)) { b.classList.add('add-cri'); b.setAttribute('aria-label', 'Enregistrer mon cri'); }
    else b.setAttribute('aria-label', hasCri(n) ? 'Écouter le cri de ' + (n === me ? 'moi' : n) : 'Parler à ' + n);
    b.addEventListener('click', () => {
      if (playCri(n, hd)) return;
      if (n === me) { openCri(); return; }
      const i = $('jdw-chat-input'); i.value = '@' + n + ' ' + i.value.replace(/^@\S+\s*/, ''); i.focus();
    });
    band.appendChild(b);
  }
  band.hidden = names.length < 2;
}
function openChat() {
  if (!room) return;
  if (netOff()) { netNeed('Le chat'); return; }
  chat.open = true; lastFocus = document.activeElement;
  $('jdw-chat-room').textContent = room.name;
  $('jdw-chat').hidden = false; document.body.classList.add('chat-open'); fitChat();
  renderBand(); renderChat(false); markChatSeen(); refreshChatBtn(); refreshChatOnline(); loadReactions();
  loadChat();
  if (matchMedia('(pointer: fine)').matches) setTimeout(() => $('jdw-chat-input').focus({ preventScroll: true }), 60);
}
function closeChat() {
  if (!chat.open) return;
  closePicker();
  chat.open = false; $('jdw-chat').hidden = true; document.body.classList.remove('chat-open');
  const cw = $('jdw-chat'); cw.style.top = ''; cw.style.height = ''; cw.style.bottom = '';
  if (siteNew) setTimeout(maybeReload, 300);
  refreshChatBtn();
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
function refreshChatOnline() {
  const live = ONLINE && serverOk;
  $('jdw-chat-online').textContent = live ? (total <= 1 ? 'Toi seul en ligne' : total + ' en ligne') : 'Hors ligne';
  $('jdw-chat-online').classList.toggle('live', live && total > 1);
}
(() => {
  const q = $('jdw-chat-quick');
  for (const t of QUICK) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
    b.setAttribute('aria-label', 'Envoyer ' + t);
    b.addEventListener('click', () => sendChat(t)); q.appendChild(b);
  }
})();
$('jdw-chat-btn').addEventListener('click', openChat);
$('jdw-chat-close').addEventListener('click', closeChat);
$('jdw-chat-form').addEventListener('submit', e => {
  e.preventDefault();
  const inp = $('jdw-chat-input'), t = inp.value; inp.value = ''; $('jdw-chat-count').textContent = '';
  sendChat(t); inp.focus({ preventScroll: true });
});
$('jdw-chat-input').addEventListener('input', () => {
  const n = $('jdw-chat-input').value.length;
  $('jdw-chat-count').textContent = n > 240 ? (300 - n) + '' : '';
});
$('jdw-chat-log').addEventListener('scroll', () => { if (chatAtBottom()) $('jdw-chat-new').hidden = true; });
$('jdw-chat-new').addEventListener('click', () => { const l = $('jdw-chat-log'); l.scrollTo({ top: l.scrollHeight, behavior: 'smooth' }); $('jdw-chat-new').hidden = true; });
$('jdw-chat').addEventListener('click', e => { if (e.target === $('jdw-chat')) closeChat(); });
$('jdw-end-chat').addEventListener('click', async () => {
  const p = pending, g = current && current.game;
  if (p && !p.done && p.record) await commitScore(profile.name);   // le record part d'abord : sa carte arrive dans le chat
  if (p && g && p.score > 0 && !p.shared) {
    p.shared = true;
    sendChat('🎮 ' + fmt(p.score) + (g.scoreLabel === 'm' ? ' m' : ' points') + ' à ' + g.title + ' ! Qui fait mieux ?');
  }
  openChat();
});
setInterval(() => { if (!document.hidden && chat.open) loadChat(); }, 3000);
setInterval(() => { if (!document.hidden && !chat.open) loadChat(); }, 12000);
// fenêtre de chat collée au-dessus du clavier (zone réellement visible de l'écran)
function fitChat() {
  const vv = window.visualViewport, w = $('jdw-chat');
  if (!vv || w.hidden) return;
  const stick = chatAtBottom();
  w.style.top = Math.max(0, vv.offsetTop) + 'px'; w.style.height = vv.height + 'px'; w.style.bottom = 'auto';
  w.classList.toggle('compact', vv.height < 520);              // clavier ouvert : on cache la bande des têtes
  if (stick) { const l = $('jdw-chat-log'); l.scrollTop = l.scrollHeight; }
}
if (window.visualViewport) { visualViewport.addEventListener('resize', fitChat); visualViewport.addEventListener('scroll', fitChat); }
$('jdw-chat-input').addEventListener('focus', () => setTimeout(fitChat, 60));

/* ================= Réactions (comme WhatsApp) ================= */
const REACTS = ['👍', '❤️', '😂', '😮', '😢', '😡', '💩', '🔥'];
const REACTS_MORE = ['🎉', '👏', '🙏', '💯', '😎', '🤣', '😭', '🥲', '😱', '🤯', '🥳', '😴', '🤮', '🤡', '👀', '💀', '🐐', '🏆',
  '🚽', '🧻', '😈', '🤬', '😤', '🙄', '😬', '🤗', '😘', '😍', '🤩', '👎', '✌️', '💪', '⚡', '🍕', '🍺', '🎯', '🦆', '🪰', '🐔', '🫡'];
async function loadReactions() {
  if (!ONLINE || !room || !chat.ok) return;
  const rid = room.id;
  try {
    const rows = await rpc('get_reactions', Object.assign({ p_code: CODE() }, RP())) || [];
    if (!room || room.id !== rid) return;
    const m = new Map();
    for (const r of rows) { const id = +r.r_message; if (!m.has(id)) m.set(id, new Map()); for (const n of (r.r_names || [])) m.get(id).set(n, r.r_emoji); }
    const before = JSON.stringify([...chat.reacts].map(([k, v]) => [k, [...v]])), after = JSON.stringify([...m].map(([k, v]) => [k, [...v]]));
    chat.reacts = m;
    if (before !== after && chat.open) renderChat(true, true);
  } catch (e) {}
}
function reactPill(id) {
  const rx = chat.reacts.get(id); if (!rx || !rx.size) return null;
  const me = cleanName(profile.name), byE = new Map();
  for (const [n, e] of rx) byE.set(e, (byE.get(e) || 0) + 1);
  const pill = document.createElement('button'); pill.type = 'button'; pill.className = 'react-pill' + (rx.has(me) ? ' mine' : '');
  const top3 = [...byE].sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]).join('');
  pill.textContent = top3 + (rx.size > 1 ? ' ' + rx.size : '');
  pill.setAttribute('aria-label', 'Réactions : ' + [...rx].map(([n, e]) => e + ' ' + n).join(', '));
  pill.addEventListener('click', e => { e.stopPropagation(); openPicker(id, pill.parentElement); });
  return pill;
}
async function setReaction(id, emoji) {
  const me = cleanName(profile.name); if (!me || !room) return;
  const rx = chat.reacts.get(id) || new Map(), old = rx.get(me) || '';
  const next = old === emoji ? '' : emoji;                       // même émoji = on retire
  if (next) rx.set(me, next); else rx.delete(me);
  chat.reacts.set(id, rx); closePicker(); renderChat(false, true);
  if (next) { Audio.ensure(); Audio.tone(1175, 0.05, 'sine', 0.035, 1568); }
  try { await rpc('react', Object.assign({ p_code: CODE() }, RP(), { p_message: id, p_name: me, p_emoji: next })); poke('react'); }
  catch (e) {
    if (old) rx.set(me, old); else rx.delete(me);
    renderChat(false, true); $('jdw-chat-status').textContent = 'Réaction non envoyée : vérifie ta connexion.';
  }
}
let pickerFor = 0;
function closePicker() { const p = $('jdw-react'); if (p) p.hidden = true; pickerFor = 0; }
function openPicker(id, anchor) {
  if (!id || !anchor) return;
  const pk = $('jdw-react'), me = cleanName(profile.name), rx = chat.reacts.get(id) || new Map(), mine = rx.get(me) || '';
  pickerFor = id;
  const row = $('jdw-react-row'); row.textContent = '';
  const btn = (e, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls || ''; b.textContent = e; if (e === mine) b.classList.add('on'); b.setAttribute('aria-label', 'Réagir ' + e); b.addEventListener('click', ev => { ev.stopPropagation(); setReaction(id, e); }); return b; };
  for (const e of REACTS) row.appendChild(btn(e));
  const plus = document.createElement('button'); plus.type = 'button'; plus.className = 'rp-plus'; plus.textContent = '+'; plus.setAttribute('aria-label', "Plus d'émojis");
  plus.addEventListener('click', ev => { ev.stopPropagation(); const mo = $('jdw-react-more'); mo.hidden = !mo.hidden; placePicker(anchor); });
  row.appendChild(plus);
  const more = $('jdw-react-more'); more.textContent = ''; more.hidden = !REACTS_MORE.includes(mine);
  for (const e of REACTS_MORE) more.appendChild(btn(e));
  const who = $('jdw-react-who'); who.textContent = '';
  if (rx.size) {
    const byE = new Map(); for (const [n, e] of rx) { if (!byE.has(e)) byE.set(e, []); byE.get(e).push(n === me ? 'Moi' : n); }
    for (const [e, ns] of byE) { const l = document.createElement('div'); l.className = 'rp-line'; const em = document.createElement('span'); em.textContent = e; const t = document.createElement('span'); t.textContent = ns.join(', '); l.append(em, t); who.appendChild(l); }
    who.hidden = false;
  } else who.hidden = true;
  pk.hidden = false; placePicker(anchor);
  if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
}
function placePicker(anchor) {
  const pk = $('jdw-react'), box = $('jdw-chat').querySelector('.chat').getBoundingClientRect(), a = anchor.getBoundingClientRect();
  const w = pk.offsetWidth, h = pk.offsetHeight;
  let top = a.top - box.top - h - 8; if (top < 60) top = Math.min(a.bottom - box.top + 8, box.height - h - 8);
  let left = a.left - box.left + a.width / 2 - w / 2; left = Math.max(8, Math.min(left, box.width - w - 8));
  pk.style.top = Math.max(8, top) + 'px'; pk.style.left = left + 'px';
}
(() => {   // appui long (téléphone), clic droit ou double-clic (ordinateur) sur un message
  const log = $('jdw-chat-log'); let t = 0, sx = 0, sy = 0, armed = null;
  const target = el => el && el.closest ? el.closest('[data-mid]') : null;
  log.addEventListener('pointerdown', e => {
    const el = target(e.target); if (!el || (e.target.closest && e.target.closest('button'))) return;
    armed = el; sx = e.clientX; sy = e.clientY; clearTimeout(t);
    t = setTimeout(() => { if (armed) { openPicker(+armed.dataset.mid, armed); armed = null; } }, 430);
  });
  log.addEventListener('pointermove', e => { if (armed && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) { clearTimeout(t); armed = null; } });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) log.addEventListener(ev, () => { clearTimeout(t); armed = null; });
  log.addEventListener('contextmenu', e => { const el = target(e.target); if (el) { e.preventDefault(); openPicker(+el.dataset.mid, el); } });
  log.addEventListener('dblclick', e => { const el = target(e.target); if (el && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); setReaction(+el.dataset.mid, '❤️'); } });
  log.addEventListener('scroll', () => { if (pickerFor) closePicker(); });
  document.addEventListener('pointerdown', e => { if (pickerFor && !$('jdw-react').contains(e.target)) closePicker(); }, true);
})();

/* ================= Joueurs connectés ================= */
let counts = {}, total = 0, where = 'menu';
let presenceBusy = false, hbVersion = true;   // hbVersion : le serveur accepte p_version (SQL 1.5)
async function refreshPresence() {
  if (!ONLINE || !room || presenceBusy) return;
  presenceBusy = true;
  try {
    const rows = await rpc('get_presence', Object.assign({ p_code: CODE() }, RP())) || [];
    let stale = false;
    for (const r of rows) {
      const p = players.get(cleanName(r.r_name)), up = Date.parse(r.r_updated) || 0;
      if (!p || !p.member || (p.updated || 0) !== up) { stale = true; continue; }
      p.seen = Math.max(p.seen || 0, Date.parse(r.r_seen) || 0); p.dbGame = r.r_game || null; if (!PRES.ok) p.game = r.r_game || null; if (r.r_version) p.dbVer = r.r_version;
      if (r.r_alias !== undefined && (r.r_alias ? cleanName(r.r_alias) : null) !== (p.alias || null)) stale = true;
    }
    if (stale) await loadPlayers(); else if (!$('jdw-members').hidden) renderMembers();
    if (PRES.ok) presChanged();
  } catch (e) { if (Date.now() - playersAt > 120000) loadPlayers(); }   // ancien serveur : rechargement complet de temps en temps
  finally { presenceBusy = false; }
}
async function heartbeat() {
  if (!ONLINE || !profile.name || !room) return;
  try {
    const hb = { p_code: CODE(), p_room: room.id, p_client: clientId, p_name: profile.name, p_game: where };
    let rows;
    if (hbVersion) { try { rows = await rpc('heartbeat', Object.assign({ p_version: myVersionTag() }, hb)) || []; } catch (e) { if (e.status === 404) { hbVersion = false; rows = await rpc('heartbeat', hb) || []; } else throw e; } }
    else rows = await rpc('heartbeat', hb) || [];
    if (!PRES.ok) { counts = {}; total = 0; for (const r of rows) { counts[r.r_game] = r.r_count; total += r.r_count; } }
    serverOk = true;
  } catch (e) { serverOk = false; }
  refreshOnline(); if (chat.open) refreshChatOnline();
  refreshPresence();
}
function setWhere(w) { where = w; rtTrack(); heartbeat().then(() => poke('presence')); }
setInterval(() => { if (!document.hidden) heartbeat(); }, 15000);
setInterval(() => { if (!document.hidden && !$('jdw-lib').hidden) loadScores(); }, 20000);
setInterval(() => { if (!document.hidden && $('jdw-lib').hidden) loadScores(); }, 30000);   // pendant une partie (le direct fait le reste)

/* ================= En direct : signaux instantanés entre appareils (Supabase Realtime) ================= */
// Les signaux ne contiennent aucune donnée : « recharge le chat / les scores / les joueurs ». Les données passent par les RPC protégées.
// Canaux PRIVÉS (Supabase Realtime Authorization, source/public.sql : rt_topic_ok) : chaque appareil s'y joint avec le jeton du compte
// du joueur actuel (access_token), le serveur n'accepte que les membres de la salle. Invité : pas de direct du tout.
const RT = { ws: null, ref: 0, topics: new Set(), hb: 0, retry: 0, ok: false, joinRefs: {}, tok: '', uid: '', opening: false };
function rtSend(topic, event, payload) {
  if (!RT.ws || RT.ws.readyState !== 1) return false;
  const ref = String(++RT.ref);
  try { RT.ws.send(JSON.stringify({ topic: 'realtime:' + topic, event, payload, ref })); return ref; } catch (e) { return false; }
}
function rtJoin(topic) { RT.topics.add(topic); const r = rtSend(topic, 'phx_join', { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, private: true }, access_token: RT.tok }); if (r) RT.joinRefs[topic] = r; }
// jeton du compte du joueur actuel ; rafraîchi : envoyé à tous les canaux ouverts (sinon le serveur coupe à l'expiration)
async function rtAuth() { const a = profile.acct; RT.uid = (a && a.uid) || ''; RT.tok = RT.uid ? await tokenFor(RT.uid) : ''; return RT.tok; }
function rtToken(uid, tok) { if (!uid || uid !== RT.uid || !tok || tok === RT.tok) return; RT.tok = tok; for (const t of RT.topics) rtSend(t, 'access_token', { access_token: tok }); }
// coupe le direct (invité, ou changement de compte : rtConnect le rouvre avec le bon jeton)
function rtClose() { const ws = RT.ws; RT.ws = null; RT.ok = false; presReset(); clearInterval(RT.hb); if (ws) { ws.onclose = null; try { ws.close(); } catch (e) {} } }
function rtLeave(topic) { RT.topics.delete(topic); rtSend(topic, 'phx_leave', {}); if (topic === roomTopic()) presReset(); }
const roomTopic = () => room ? 'jdw-room-' + room.id : null;

// Présence en direct : chaque appareil s'annonce dans le canal de la salle (nom + jeu en cours).
// Arrivées, changements de jeu et départs arrivent chez les autres en une seconde environ.
const PRES = { state: {}, ok: false, timer: 0 };
function presReset() { PRES.state = {}; PRES.ok = false; }
function rtBroadcast(data) { const t = roomTopic(); return t ? rtSend(t, 'broadcast', { type: 'broadcast', event: 'poke', payload: Object.assign({ from: clientId }, data) }) : false; }
function rtTrack() {
  const t = roomTopic(); if (!t || !profile.name || document.hidden || !RT.ws || RT.ws.readyState !== 1) return;
  rtSend(t, 'presence', { type: 'presence', event: 'track', payload: { name: cleanName(profile.name), game: where, cid: clientId, ver: myVersionTag(), cmp: cmpMeta() } });
}
function rtUntrack() { const t = roomTopic(); if (t) rtSend(t, 'presence', { type: 'presence', event: 'untrack' }); }
function presApply(d) {
  for (const [k, v] of Object.entries(d.leaves || {})) {
    const refs = new Set(((v && v.metas) || []).map(x => x.phx_ref));
    const cur = (PRES.state[k] || []).filter(x => !refs.has(x.phx_ref));
    if (cur.length) PRES.state[k] = cur; else delete PRES.state[k];
  }
  for (const [k, v] of Object.entries(d.joins || {})) {
    const cur = PRES.state[k] || [], have = new Set(cur.map(x => x.phx_ref));
    PRES.state[k] = cur.concat(((v && v.metas) || []).filter(x => !have.has(x.phx_ref)));
  }
  clearTimeout(PRES.timer); PRES.timer = setTimeout(presChanged, 80);
}
// présents dans le canal de la salle : seulement les membres de la salle (ceux qui l'ont rejointe), et moi
function roomMember(name) { const p = players.get(name); return name === cleanName(profile.name) || !!(p && p.member); }
function presList() {
  const out = [];
  for (const metas of Object.values(PRES.state)) {
    const m = metas[metas.length - 1]; if (!m || !m.name) continue;
    const name = cleanName(m.name);
    if (playersAt && !roomMember(name)) continue;   // un appareil branché sur la salle sans en être membre n'apparaît nulle part
    out.push({ name, game: m.game || 'menu', ver: m.ver || '', cmp: m.cmp || null, cid: m.cid || '' });
  }
  return out;
}
// les noms inconnus de la présence : on recharge les membres (un nouveau venu apparaît dès que le serveur le confirme)
function presUnknown() { for (const metas of Object.values(PRES.state)) { const m = metas[metas.length - 1]; if (m && m.name && !roomMember(cleanName(m.name))) return true; } return false; }
function presChanged() {
  if (!PRES.ok) return;
  const list = presList(), live = new Map(), liveVer = new Map();
  for (const x of list) { if (!live.has(x.name) || live.get(x.name) === 'menu') live.set(x.name, x.game); if (x.ver || !liveVer.has(x.name)) liveVer.set(x.name, x.ver); }
  counts = {}; total = list.length;
  for (const x of list) counts[x.game] = (counts[x.game] || 0) + 1;
  // joueurs d'une ancienne version (sans le direct) : vus en ligne par le serveur dans les 45 dernières secondes
  for (const p of players.values()) if (p.member && p.dbGame && !live.has(p.name)) { total++; counts[p.dbGame] = (counts[p.dbGame] || 0) + 1; }
  for (const p of players.values()) {
    if (live.has(p.name)) { p.live = true; p.game = live.get(p.name); p.liveVer = liveVer.get(p.name) || ''; }
    else { if (p.live) p.seen = Date.now(); p.live = false; if (p.member) p.game = null; }
  }
  if (presUnknown() && Date.now() - playersAt > 5000) loadPlayers();
  serverOk = true;
  refreshOnline(); if (chat.open) refreshChatOnline();
  if (!$('jdw-members').hidden) renderMembers();
  cmpOnPresence();
}
async function rtConnect() {
  if (!ONLINE || !window.WebSocket || (RT.ws && RT.ws.readyState <= 1) || RT.opening || isGuest() || netOff()) return;
  RT.opening = true;
  try { await rtAuth(); } finally { RT.opening = false; }
  if (!RT.tok || isGuest() || (RT.ws && RT.ws.readyState <= 1)) return;
  let ws;
  try { ws = new WebSocket(CFG.url.replace(/^http/, 'ws').replace(/\/+$/, '') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(CFG.key) + '&vsn=1.0.0'); }
  catch (e) { return; }
  RT.ws = ws;
  ws.onopen = () => {
    RT.retry = 0; RT.ok = true; netOk();
    for (const t of RT.topics) rtJoin(t);
    clearInterval(RT.hb); RT.hb = setInterval(() => rtSend('phoenix', 'heartbeat', {}), 25000);
    refreshEverything(true);                     // on a peut-être raté des choses pendant la coupure
  };
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    const topic = String(m.topic || '').replace(/^realtime:/, '');
    if (m.event === 'phx_reply') {
      if (RT.joinRefs[topic] === m.ref && topic === roomTopic() && m.payload && m.payload.status === 'ok') { PRES.ok = true; rtTrack(); }
      return;
    }
    if (topic === roomTopic() && m.event === 'presence_state') { PRES.state = {}; PRES.ok = true; presApply({ joins: m.payload || {}, leaves: {} }); return; }
    if (topic === roomTopic() && m.event === 'presence_diff') { presApply(m.payload || {}); return; }
    if (m.event === 'broadcast' && m.payload) onPoke(topic, m.payload.event, m.payload.payload || {});
  };
  ws.onclose = () => {
    RT.ok = false; presReset(); clearInterval(RT.hb); if (RT.ws === ws) RT.ws = null;
    const d = Math.min(30000, 1000 * Math.pow(2, RT.retry++));
    setTimeout(() => { if (!document.hidden && !isGuest() && !netOff()) rtConnect(); }, d);
  };
  ws.onerror = () => { try { ws.close(); } catch (e) {} };
}
function poke(kind, topic) {
  const t = topic || (room ? 'jdw-room-' + room.id : null);
  if (t) rtSend(t, 'broadcast', { type: 'broadcast', event: 'poke', payload: { t: kind, from: clientId } });
}
const pokeTimers = {};
function onPoke(topic, event, p) {
  if (p.from === clientId) return;
  if (p.t === 'cmp') { if (room && topic === 'jdw-room-' + room.id) cmpOnSignal(p); return; }
  if (p.t === 'rtc') { if (room && topic === 'jdw-room-' + room.id) rtcOnSignal(p); return; }
  if (p.t === 'net') { if (NET.topic && topic === NET.topic) netOnSignal(p); return; }
  if (p.t === 'netinv') { if (room && topic === 'jdw-room-' + room.id) netOnInvite(p); return; }
  if (p.t === 'rx') { if (room && topic === 'jdw-room-' + room.id) rxShow(cleanName(p.n), cleanName(p.to), String(p.e || '').slice(0, 40)); return; }
  if (p.t === 'version') { checkSiteVersion(); return; }
  if (p.t === 'rooms') { if (!$('jdw-rooms').hidden) listRooms(); return; }
  if (!room || topic !== 'jdw-room-' + room.id) return;
  const run = { chat: () => loadChat(), scores: () => { loadScores(); if (!$('jdw-board').hidden) loadWorld(); }, players: () => loadPlayers(), presence: () => heartbeat(), react: () => loadReactions(), progress: () => progOnPoke(),
    invite: () => { if (!$('jdw-invshare').hidden && INV.link && !INV.oldTxt) invMake(false); } }[p.t];   // heartbeat : compteurs des tuiles + liste des joueurs ; invite : lien de la salle renouvelé par un autre membre
  if (!run) return;
  clearTimeout(pokeTimers[p.t]); pokeTimers[p.t] = setTimeout(run, p.t === 'chat' ? 60 : 250);   // regroupe les rafales
}
let lastRefresh = 0;
function refreshEverything(force) {
  rtTrack();
  if (!force && Date.now() - lastRefresh < 2500) return;
  lastRefresh = Date.now();
  if (ONLINE && (!RT.ws || RT.ws.readyState > 1)) rtConnect();
  heartbeat(); loadScores(); loadChat(); flushUnsent(); checkSiteVersion(); progLoad();
}
window.JDW_RESUME = () => refreshEverything(true);      // appelé par l'appli Android quand on revient dedans
document.addEventListener('visibilitychange', () => { if (document.hidden) rtUntrack(); else refreshEverything(); });
addEventListener('pagehide', rtUntrack);
addEventListener('online', () => refreshEverything(true));
addEventListener('focus', () => refreshEverything());

/* ================= Nouvelle version du site : rechargement automatique ================= */
let siteNew = false;
async function checkSiteVersion() {
  if (BUILD === 'dev' || !/^https?:$/.test(location.protocol)) return;
  try {
    const r = await fetch(ROOT + 'site.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const v = await r.json();
    if (v && v.build && v.build !== BUILD) {
      const label = (v.version || '') + (v.build ? ' du ' + v.build.slice(6, 8) + '/' + v.build.slice(4, 6) + ' à ' + v.build.slice(8, 10) + 'h' + v.build.slice(10, 12) : '');
      const first = !siteNew; siteNew = true; UPD.siteBuild = v.build;
      if (UPD.site !== label) { UPD.site = label; refreshBell(); }
      if (first && !$('jdw-play').hidden) toastCheer('Une mise à jour arrive : elle s\'installera à la fin de ta partie.', profile.name, true);
      maybeReload();
    }
  } catch (e) {}
  checkAppVersion();
}
// nouvelle appli Android (dans l'appli seulement) : bandeau vert + notification, sans redémarrer
async function checkAppVersion() {
  const m = navigator.userAgent.match(/BorneArcade\/(\d+)/); if (!m) return;
  try {
    const r = await fetch(ROOT + 'telecharger/version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
    const v = await r.json();
    if (+v.versionCode > +m[1]) {
      $('jdw-update-txt').textContent = 'Version ' + v.versionName + ' disponible : touche ici pour la télécharger.'; $('jdw-update').hidden = false;
      if (UPD.app !== v.versionName) { UPD.app = v.versionName; refreshBell(); }
    }
  } catch (e) {}
}
let saving = 0;
function calmMoment() {
  if (!$('jdw-play').hidden || !$('jdw-duo').hidden || chat.open || saving > 0 || CMP.id || MAP.open) return false;
  for (const sh of document.querySelectorAll('.sheet')) if (!sh.hidden) return false;
  const a = document.activeElement; return !(a && /^(INPUT|TEXTAREA)$/.test(a.tagName));
}
// recharge vers une adresse propre à la nouvelle version : le cache de GitHub ne peut pas resservir l'ancienne page
function reloadNow() {
  if (saving > 0) { setTimeout(reloadNow, 400); return; }
  const target = UPD.siteBuild || String(Date.now());
  try { sessionStorage.setItem('jdw.reloadfor', target); } catch (e) {}
  location.replace(location.pathname + '?v=' + encodeURIComponent(target));
}
function maybeReload() {
  if (!siteNew) return;
  // anti-boucle : une seule tentative automatique par version (si la nouvelle page n'est pas encore partout, on attend le bouton)
  let tried = ''; try { tried = sessionStorage.getItem('jdw.reloadfor') || ''; } catch (e) {}
  if (tried && tried === UPD.siteBuild) { $('jdw-siteupd').hidden = false; return; }
  if (calmMoment()) { reloadNow(); return; }
  $('jdw-siteupd').hidden = false;
}
$('jdw-siteupd').addEventListener('click', reloadNow);
setInterval(() => { if (!document.hidden) checkSiteVersion(); }, 60000);

/* ================= Joueurs de la salle (en ligne / hors ligne) ================= */
function seenText(t) {
  if (!t) return 'jamais vu en ligne';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return "vu à l'instant";
  if (s < 3600) return 'vu il y a ' + Math.round(s / 60) + ' min';
  if (s < 86400) return 'vu il y a ' + Math.round(s / 3600) + ' h';
  const d = Math.round(s / 86400); return d === 1 ? 'vu hier' : 'vu il y a ' + d + ' jours';
}
function gameLabel(id) { if (!id || id === 'menu') return 'dans le menu'; if (/^duel-/.test(id)) { const d = duoById(id.slice(5)); return '⚔️ en duel' + (d ? ' · ' + d.title : ''); } const g = gameById(id); return g ? 'joue à ' + g.title : 'en ligne'; }
function renderMembers() {
  const me = cleanName(profile.name), list = [...players.values()].filter(p => p.member || p.name === me);
  const isOn = p => p.name === me || !!p.live || !!p.dbGame || (!PRES.ok && !!p.game);
  const on = list.filter(isOn).sort((a, b) => (b.name === me) - (a.name === me) || a.name.localeCompare(b.name));
  const off = list.filter(p => !isOn(p)).sort((a, b) => (b.seen || 0) - (a.seen || 0) || a.name.localeCompare(b.name));
  const wrap = $('jdw-members-list'); wrap.textContent = '';
  const owner = room && room.owner ? cleanName(room.owner) : '', mine = new Set(deviceNames());
  const section = (title, arr, online) => {
    if (!arr.length) return;
    const h = document.createElement('p'); h.className = 'eyebrow mem-h'; h.textContent = title + ' · ' + arr.length; wrap.appendChild(h);
    for (const p of arr) {
      const outside = p.name === me && knownNotMember(me);     // moi, sur cet appareil, sans être dans la salle
      const row = document.createElement('div'); row.className = 'mem-row' + (online ? ' on' : '') + (outside ? ' notmem' : '');
      const hd = chatHead(p.name); hd.classList.add('mem-head');
      const tx = document.createElement('div'); tx.className = 'mem-txt';
      const n = document.createElement('b'); n.textContent = dispName(p.name);
      if (owner && p.name === owner) { const cr = document.createElement('span'); cr.className = 'mem-owner'; cr.textContent = '👑'; cr.title = 'Créateur de la salle'; cr.setAttribute('aria-label', 'créateur de la salle'); n.append(cr); }
      if (p.name === me) n.append(' (moi)');
      const st = document.createElement('small');
      st.textContent = outside ? 'pas dans la salle' : online ? (p.name === me ? gameLabel(where) : gameLabel(p.live ? p.game : (p.dbGame || p.game))) : seenText(p.seen);
      const vt = p.name === me ? myVersionTag() : (online && p.live ? (p.liveVer || '') : (p.dbVer || ''));
      const vl = document.createElement('small'); vl.className = 'mem-ver';
      vl.textContent = vt ? versionLabel(vt) : (online && p.live ? 'ancienne version' : '');
      if (vt && String(vt).split('·')[0] !== String(window.JDW_VERSION || '')) vl.classList.add('old');
      if (!vt && online && p.live) vl.classList.add('old');
      tx.append(n, st); if (vl.textContent) tx.append(vl);
      const tags = document.createElement('div'); tags.className = 'mem-tags';
      const ph = document.createElement('span'); ph.className = 'mem-tag' + (p.photo ? ' yes' : ''); ph.textContent = p.photo ? '📸 tête' : 'pas de tête';
      const cr = document.createElement('button'); cr.type = 'button'; cr.className = 'mem-tag' + (p.sound ? ' yes' : '');
      cr.textContent = p.sound ? '🔊 cri' : 'pas de cri'; cr.disabled = !p.sound;
      if (p.sound) { cr.setAttribute('aria-label', 'Écouter le cri de ' + p.name); cr.addEventListener('click', () => playCri(p.name, hd)); }
      tags.append(ph, cr);
      const live = online && p.name !== me && p.live && watchable(p.game) && presCid(p.name, p.game);
      if (live) { const wb = document.createElement('button'); wb.type = 'button'; wb.className = 'mem-tag watch-btn'; wb.textContent = '👁 Regarder'; wb.setAttribute('aria-label', 'Regarder ' + p.name + ' jouer en direct'); wb.addEventListener('click', () => { closeSheet('jdw-members'); watchStart(p.name, p.game); }); tags.prepend(wb); }
      if (outside) { const jb = document.createElement('button'); jb.type = 'button'; jb.className = 'mem-tag join-btn'; jb.textContent = '+ Rejoindre'; jb.setAttribute('aria-label', 'Ajouter ' + p.name + ' à la salle ' + room.name); jb.addEventListener('click', async () => { if (await askJoin(p.name)) joinHere(); }); tags.prepend(jb); }
      row.append(hd, tx, tags);
      // ✕ : le créateur peut retirer tout le monde ; chacun peut se retirer lui-même (et les profils de son appareil)
      const self = p.name === me || mine.has(p.name);
      if (p.member && (self || (owner && owner === me))) {
        const x = document.createElement('button'); x.type = 'button'; x.className = 'mem-x';
        x.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
        const lab = p.name === me ? 'Quitter la salle ' + room.name : 'Retirer ' + p.name + ' de la salle';
        x.setAttribute('aria-label', lab); x.title = p.name === me ? 'Quitter cette salle' : 'Retirer de la salle';
        x.addEventListener('click', () => openKick(p.name, self ? p.name : me));
        row.append(x);
      }
      wrap.appendChild(row);
    }
  };
  section('En ligne', on, true); section('Hors ligne', off, false);
  if (!list.length) { const e = document.createElement('p'); e.className = 'small'; e.textContent = room ? 'Personne dans cette salle pour le moment.' : 'Choisis une salle pour voir ses joueurs.'; wrap.appendChild(e); }
  $('jdw-members-sub').textContent = room ? room.name + ' · ' + list.length + ' joueur' + (list.length > 1 ? 's' : '') : '';
}
async function openMembers() {
  if (!ONLINE) return;
  if (!room) { openRooms(); return; }
  renderMembers(); openSheet('jdw-members', 'jdw-members-close');
  if (!room.owner) refreshOwner();
  await loadPlayers(); if (!$('jdw-members').hidden) renderMembers();
}
// créateur de la salle (rooms.owner, donné par list_rooms) : seul lui voit le ✕ sur les autres joueurs
async function refreshOwner() {
  const rid = room && room.id; if (!rid) return;
  try {
    const rows = await rpc('list_rooms', { p_code: CODE(), p_name: profile.name || '' }) || [];
    const r = rows.find(x => x.r_id === rid);
    if (r && r.r_owner && room && room.id === rid) { room.owner = r.r_owner; store.set('jdw.room', room); if (!$('jdw-members').hidden) renderMembers(); }
  } catch (e) {}
}
/* ---- Retirer un joueur de la salle (créateur) / quitter la salle (soi-même ou un profil de cet appareil) ---- */
const KICK = { name: '', by: '', busy: false };
function openKick(name, by) {
  if (!room) return;
  KICK.name = cleanName(name); KICK.by = cleanName(by); KICK.busy = false;
  const self = KICK.name === cleanName(profile.name), dev = KICK.name === KICK.by;
  const hd = $('jdw-kick-head'); hd.textContent = ''; hd.append(chatHead(KICK.name, { passive: true }));
  const h = $('jdw-kick-h'); h.textContent = '';
  const em = document.createElement('em'); em.textContent = room.name;
  h.append(self ? 'Quitter la salle ' : 'Retirer ' + KICK.name + ' de la salle ', em, ' ?');
  $('jdw-kick-txt').textContent = self
    ? 'Tes scores, messages et ta tête dans cette salle seront effacés. Tu restes au classement mondial. Pour revenir, il faudra rejoindre la salle.'
    : 'Ses scores, messages et sa tête dans cette salle seront effacés. Il reste au classement mondial.' + (dev ? ' Il pourra jouer sur cet appareil sans être dans la salle.' : " Il ne reviendra que s'il rejoint la salle lui-même.");
  $('jdw-kick-ok').textContent = self ? 'Quitter' : 'Retirer'; $('jdw-kick-ok').disabled = false;
  $('jdw-kick-status').textContent = '';
  openSheet('jdw-kick', 'jdw-kick-no');
}
async function doKick() {
  if (KICK.busy || !room || !KICK.name) return;
  const name = KICK.name, rid = room.id, rname = room.name, self = name === cleanName(profile.name);
  KICK.busy = true; $('jdw-kick-ok').disabled = true; $('jdw-kick-status').textContent = self ? 'On quitte la salle…' : 'On retire ' + name + '…';
  try {
    await rpc('remove_member', Object.assign({ p_code: CODE() }, RP(), { p_name: name, p_by: KICK.by }), { quiet404: true });
  } catch (e) {
    KICK.busy = false; $('jdw-kick-ok').disabled = false;
    $('jdw-kick-status').textContent = e.status === 404 ? "Pas encore possible : le serveur de la borne doit d'abord être mis à jour."
      : /createur/.test(String(e.message)) ? 'Seul le créateur de la salle peut retirer un joueur.'
      : e.offline ? 'Pas de réseau : réessaie dans un instant.' : "Impossible pour l'instant, réessaie plus tard.";
    return;
  }
  KICK.busy = false; closeSheet('jdw-kick');
  if (!room || room.id !== rid) return;
  if (self) selfLeave = name;
  const p = players.get(name); if (p) p.member = false; memberNames.delete(name);
  for (const g in remote) remote[g] = (remote[g] || []).filter(x => x.name !== name);   // ses scores de la salle sont effacés
  refreshAll(); if (!$('jdw-members').hidden) renderMembers();
  poke('players'); poke('scores'); poke('chat');
  loadPlayers(); loadScores(); if (chat.open) loadChat();
  toastCheer(self ? 'Tu as quitté « ' + rname + ' ».' : name + ' ne fait plus partie de « ' + rname + ' ».', self ? name : cleanName(profile.name), true);
}
$('jdw-kick-ok').addEventListener('click', doKick);
$('jdw-kick-no').addEventListener('click', () => closeSheet('jdw-kick'));
$('jdw-kick').addEventListener('click', e => { if (e.target === $('jdw-kick')) closeSheet('jdw-kick'); });
/* ---- « Ajouter X à la salle ? » : un profil de l'appareil n'entre dans une salle que si on le veut ---- */
let askJoinDone = null;
function askJoin(name, forChat) {
  if (!room) return Promise.resolve(false);
  if (askJoinDone) askJoinDone(false);
  name = cleanName(name);
  const hd = $('jdw-askjoin-head'); hd.textContent = ''; hd.append(chatHead(name, { passive: true }));
  const h = $('jdw-askjoin-h'); h.textContent = '';
  const em = document.createElement('em'); em.textContent = room.name;
  h.append('Ajouter ' + name + ' à la salle ', em, ' ?');
  $('jdw-askjoin-txt').textContent = (forChat ? 'Pour écrire dans le chat, il faut faire partie de la salle. ' : '')
    + 'Dans la salle, ' + name + ' apparaît dans les joueurs, le classement et le chat. Sinon, ' + name + ' joue quand même sur cet appareil.';
  $('jdw-askjoin-status').textContent = '';
  openSheet('jdw-askjoin', 'jdw-askjoin-yes');
  return new Promise(res => { askJoinDone = v => { askJoinDone = null; closeSheet('jdw-askjoin'); res(v); }; });
}
$('jdw-askjoin-yes').addEventListener('click', () => { if (askJoinDone) askJoinDone(true); });
$('jdw-askjoin-no').addEventListener('click', () => { if (askJoinDone) askJoinDone(false); });
$('jdw-askjoin').addEventListener('click', e => { if (e.target === $('jdw-askjoin') && askJoinDone) askJoinDone(false); });
// rejoindre la salle actuelle avec le joueur actuel (volontaire : seul chemin, avec doJoin, pour devenir membre)
async function joinHere() {
  if (!ONLINE || !room || !profile.name) return false;
  const rid = room.id, name = cleanName(profile.name);
  try {
    const ok = await rpc('join_room', { p_code: CODE(), p_room: rid, p_room_code: roomCodes[rid] || '', p_name: name });
    if (!ok) { toastCheer('Le code de la salle a changé : choisis-la de nouveau dans Salles.', name, true); return false; }
  } catch (e) { toastCheer("Impossible d'entrer dans la salle pour l'instant.", name, true); return false; }
  if (!room || room.id !== rid) return false;
  if (selfLeave === name) selfLeave = '';
  const p = players.get(name); if (p) p.member = true; memberNames.add(name);
  await loadPlayers(); poke('players'); rtTrack();
  if (profile.rooms && profile.rooms[rid]) await pushRoomLook();
  toastCheer('Bienvenue ' + name + ' dans « ' + room.name + ' » !', name, true);
  return true;
}
// après un changement de joueur : s'il n'est pas dans la salle, on lui demande (jamais d'ajout automatique)
async function maybeAskJoin() {
  if (!ONLINE || !room || !profile.name || invPending()) return;      // un lien d'invitation attend : c'est lui qui choisit la salle
  const pid = profile.pid, rid = room.id;
  if (membersFor !== rid) await loadPlayers();
  if (profile.pid !== pid || !room || room.id !== rid || membersFor !== rid || !knownNotMember(profile.name)) return;
  const name = cleanName(profile.name);
  if (await askJoin(name)) { if (profile.pid === pid) await joinHere(); }
  else if (profile.pid === pid) toastCheer(name + ' joue sur cet appareil, sans être dans « ' + room.name + ' ».', name, true);
}
$('jdw-online').addEventListener('click', () => { if (isGuest()) guestAsk('Les salles'); else if (netOff()) netNeed('Les joueurs de la salle'); else openMembers(); });
setInterval(() => { if (!$('jdw-members').hidden) { renderMembers(); refreshPresence(); } }, 15000);   // « vu il y a… » et en ligne, à jour tout seuls
$('jdw-members-close').addEventListener('click', () => closeSheet('jdw-members'));
$('jdw-members').addEventListener('click', e => { if (e.target === $('jdw-members')) closeSheet('jdw-members'); });

/* ================= Images des jeux (paquets emballés : assets/<jeu>.bin) ================= */
// Les images de l'Asset Store ne sont jamais publiées en fichiers lisibles : le paquet est déballé ici (clé intégrée au site).
const ASSET_GAMES = new Set(['ilo', 'rouleaux']);
window.JDW_ASSETS = { cache: {}, pending: {} };
window.JDW_ASSETS.load = function (id) {
  if (this.cache[id]) return Promise.resolve(this.cache[id]);
  if (this.pending[id]) return this.pending[id];
  const p = (async () => {
    const r = await fetch(ROOT + 'assets/' + id + '.bin');
    if (!r.ok) throw new Error('images ' + id + ' : ' + r.status);
    const buf = new Uint8Array(await r.arrayBuffer());
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(window.JDW_ASSET_KEY || ''), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: buf.slice(0, 16), iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(16, 28) }, key, buf.slice(28)));
    const hl = new DataView(plain.buffer, plain.byteOffset, plain.byteLength).getUint32(0, true);
    const header = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + hl))), base = 4 + hl;
    const mk = e => new Promise((res, rej) => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => res(im); im.onerror = () => rej(new Error('image illisible'));
      im.src = URL.createObjectURL(new Blob([plain.subarray(base + e.off, base + e.off + e.len)], { type: 'image/webp' }));
    });
    const out = {};
    for (const k of Object.keys(header)) out[k] = await Promise.all(header[k].map(mk));
    this.cache[id] = out;
    return out;
  })();
  this.pending[id] = p;
  p.catch(e => { delete this.pending[id]; reportError('Images ' + id + ' : ' + e.message, e.stack, { quiet: true }); });
  return p;
};

/* ================= Accueil ================= */
const tiles = [];
function buildLibrary() {
  const grid = $('jdw-grid');
  for (const g of GAMES) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.style.setProperty('--acc', g.accent || COLORS.amber);
    b.setAttribute('aria-label', 'Jouer à ' + g.title);
    b.innerHTML = '<div class="tile-img"><canvas aria-hidden="true"></canvas></div><div class="tile-meta"><div class="tile-name"></div><div class="tile-online"><i></i><span></span></div></div>';
    b.querySelector('.tile-name').textContent = g.title;
    b.addEventListener('click', () => { markGameSeen(g.id); openGame(g); });   // clic sur la tuile : l'étiquette « Nouveau » / « Mis à jour » s'en va
    // la tuile est enveloppée : la bulle du champion est un bouton à part (elle ouvre le classement de la salle, pas le jeu)
    const wrap = document.createElement('div'); wrap.className = 'tile-wrap'; wrap.style.setProperty('--acc', g.accent || COLORS.amber);
    const ch = document.createElement('button'); ch.type = 'button'; ch.className = 'tile-champ'; ch.hidden = true;
    ch.addEventListener('click', e => { e.stopPropagation(); openBoardFor(g.id); });
    // « 👁 Voir » : regarder celui qui joue à ce jeu en ce moment (plusieurs : la liste des joueurs, chacun avec son 👁)
    const wb = document.createElement('button'); wb.type = 'button'; wb.className = 'tile-watch'; wb.hidden = true; wb.textContent = '👁 Voir';
    wb.addEventListener('click', e => { e.stopPropagation(); const ps = tilePlayers(g.id); if (ps.length === 1) watchStart(ps[0].name, g.id); else openMembers(); });
    wrap.append(b, ch, wb);
    // carte d'avancement (seulement les jeux qui en ont une : MAP_DEFS)
    if (MAP_DEFS[g.id]) {
      const mb = document.createElement('button'); mb.type = 'button'; mb.className = 'tile-map';
      mb.setAttribute('aria-label', 'Carte d’avancement de ' + g.title); mb.title = 'Carte d’avancement';
      mb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="tm-fold" d="M3 6.5 8.5 4l7 2.5L21 4v13.5L15.5 20l-7-2.5L3 20z"/><path class="tm-route" d="M6 16.5c2.5-.5 2.2-4 5-4.2s3.4-2.6 4.6-5.3"/><path class="tm-flag" d="M15.6 7V2.6l3.2 1.3-3.2 1.3"/></svg><span class="tm-t">Carte</span>';
      mb.addEventListener('click', e => { e.stopPropagation(); openMap(g.id, mb); });
      wrap.appendChild(mb); wrap.classList.add('has-map');
      mapWarmSoon(g.id);
    }
    grid.appendChild(wrap);
    tiles.push({ g, el: b, champ: ch, watch: wb, canvas: b.querySelector('canvas'), on: b.querySelector('.tile-online'), visible: true });
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { const t = tiles.find(x => x.el === e.target); if (t) t.visible = e.isIntersecting; }), { root: $('jdw-lib') });
    tiles.forEach(t => io.observe(t.el));
  }
}
function openBoardFor(gameId) {
  boardScope = 'room'; store.set('jdw.boardscope', boardScope); boardTab = gameId;
  loadScores(); renderBoardTab(); openSheet('jdw-board', 'jdw-board-close');
}
function refreshChamps(force) {
  const show = ONLINE && !!room && remoteLoaded;
  for (const t of tiles) {
    const lead = show ? top(t.g.id)[0] : null, ch = t.champ; if (!ch) continue;
    const lp = lead ? players.get(lead.name) || {} : {};
    const key = lead ? lead.name + ':' + lead.score + ':' + (lp.photo || '').length + ':' + (lp.topFrac || '') : '';
    if (ch.dataset.k === key && !force) continue;
    ch.dataset.k = key; ch.textContent = ''; ch.hidden = !lead;
    if (!lead) continue;
    const hd = chatHead(lead.name, { passive: true }); hd.classList.add('champ-head');
    const cr = document.createElement('span'); cr.className = 'champ-crown'; cr.textContent = '👑';
    // la photo dépasse du rond (cheveux) : la couronne se pose sur le vrai haut de la tête
    // image affichée : largeur 118 % du rond, proportion 160×200, posée en bas ; le haut visible est coupé à 40 % au-dessus du rond
    const crownTop = -13;
    cr.style.top = crownTop + 'px';
    ch.style.top = Math.max(6, 4 - crownTop) + 'px';     // la bulle descend juste assez pour que la couronne reste dans la tuile
    ch.append(hd, cr);
    ch.setAttribute('aria-label', 'Champion de la salle à ' + t.g.title + ' : ' + dispName(lead.name) + ', ' + fmt(lead.score) + unit(t.g) + '. Voir le classement de la salle');
    ch.title = dispName(lead.name) + ' · ' + fmt(lead.score) + unit(t.g);
  }
}
function refreshOnline() {
  refreshChamps();
  const live = ONLINE && serverOk;
  $('jdw-online').classList.toggle('off', !live);
  // court sur téléphone : « 1 » + icône ; « 1 en ligne » quand il y a la place
  const ot = $('jdw-online-txt'); ot.textContent = '';
  if (live) { const nb = document.createElement('b'); nb.textContent = String(total); const w = document.createElement('span'); w.className = 'ol-word'; w.textContent = ' en ligne'; ot.append(nb, w); }
  else ot.textContent = !ONLINE ? 'Mode local' : netOff() ? 'Hors ligne' : 'Connexion…';
  $('jdw-online').setAttribute('aria-label', live ? (total <= 1 ? (total === 1 ? '1 joueur en ligne' : 'Personne en ligne') : total + ' joueurs en ligne') + ' : voir les joueurs' : 'Voir les joueurs de la salle');
  for (const t of tiles) {
    const n = counts[t.g.id] || 0, span = t.on.querySelector('span'), ps = live ? tilePlayers(t.g.id) : [];
    t.on.classList.toggle('live', live && n > 0);
    if (live) span.textContent = ps.length ? (ps.length === 1 && ps[0].name === cleanName(profile.name) ? 'Toi, sur un autre appareil' : tileName(ps[0].name) + (ps.length > 1 ? ' + ' + (ps.length - 1) : '') + ' joue') : n ? (n === 1 ? '1 joueur' : n + ' joueurs') : 'Personne';
    if (live && / joue$/.test(span.textContent)) { const v = document.createElement('em'); v.className = 'tile-verb'; v.textContent = ' joue'; span.textContent = span.textContent.slice(0, -5); span.appendChild(v); }   // « joue » s'efface sur téléphone à côté de 👁 + carte
    else { const b = top(t.g.id)[0]; span.textContent = b ? 'Record ' + fmt(b.score) + unit(t.g) + ' · ' + dispName(b.name) : 'Pas encore de record'; }
    if (t.watch) { t.watch.hidden = !ps.length; t.watch.setAttribute('aria-label', ps.length === 1 ? 'Regarder ' + ps[0].name + ' jouer à ' + t.g.title : 'Voir qui joue à ' + t.g.title); t.el.parentNode.classList.toggle('can-watch', !!ps.length); }
  }
}
// joueurs de la salle (pas moi) qui jouent à ce jeu en ce moment et qu'on peut regarder
// (moi-même sur un autre appareil compris : pratique pour se regarder ; jamais cet appareil-ci)
function tilePlayers(gid) { try { return presList().filter(m => m.game === gid && m.cid && m.cid !== clientId && watchable(m.game)); } catch (e) { return []; } }
const tileName = n => n === cleanName(profile.name) ? 'Toi (autre appareil)' : dispName(n);
function refreshMe() {
  $('jdw-me-name').textContent = isGuest() && !profile.name ? 'Invité' : profile.name ? dispName(profile.name) : 'Joueur';
  if (isGuest() && !profile.name) { const av = $('jdw-me-av'); av.textContent = ''; av.style.background = ''; av.classList.add('guest-av'); av.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></svg>'; return; }
  $('jdw-me-av').classList.remove('guest-av');
  avatarInto($('jdw-me-av'), profile.name);
}
function refreshAll() {
  refreshOnline(); refreshMe(); refreshNewBadges();
  $('jdw-roomrow').hidden = !ONLINE || isGuest();
  $('jdw-invite').hidden = !room;
  $('jdw-roomname').textContent = room ? room.name : 'Choisis une salle';
  { const L = room ? room.name.length : 0; $('jdw-roomname').style.fontSize = L > 30 ? '13px' : L > 22 ? '14.5px' : L > 14 ? '16px' : ''; }   // nom toujours en entier
  $('jdw-note').textContent = !ONLINE ? 'Mode local : le classement est gardé sur cet appareil.'
    : isGuest() ? 'En invité, les scores ne sont pas enregistrés : crée ton compte pour entrer au classement.'
    : roomDenied ? 'Le code de ta salle manque sur cet appareil : touche « Changer » pour le retaper.'
    : netOff() || netDown ? 'Pas de connexion : records gardés sur cet appareil ; tes scores partiront dès que le réseau revient.'
    : 'Classement de la salle et classement mondial, mis à jour en direct.';
  if (!$('jdw-board').hidden) renderBoardTab();
}
let prevT = 0;
function previewLoop(ts) {
  requestAnimationFrame(previewLoop);
  if ($('jdw-lib').hidden || ts - prevT < 32) return;
  prevT = ts;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), t = ts / 1000;
  for (const tl of tiles.concat(duoTiles, cmpTiles)) {
    if (!tl.visible) continue;
    const c = tl.canvas, w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) continue;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d');
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    try { tl.g.preview(ctx, w, h, t); } catch (e) { ctx.fillStyle = COLORS.night; ctx.fillRect(0, 0, w, h); reportError('Aperçu ' + tl.g.id + ' : ' + e.message, e.stack, { quiet: true }); }
    ctx.restore();
  }
}

/* ================= Feuilles (ouverture / fermeture) ================= */
let lastFocus = null;
function openSheet(id, focusId) { lastFocus = document.activeElement; $(id).hidden = false; const f = focusId && $(focusId); if (f) setTimeout(() => f.focus({ preventScroll: true }), 30); }
function closeSheet(id) { helpClose(); menuClose(); $(id).hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
/* ---- aide « ? » : une seule bulle pour toute la borne, remplie avec l'explication cachée (data-help = id de la source) ---- */
const POP = { help: null, menu: null };
// place une bulle (position fixe) sous son bouton, ou au-dessus quand il n'y a pas la place ; --ax = position de la flèche
function popPlace(el, anchor, align) {
  const r = anchor.getBoundingClientRect(), vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight, m = 12;
  el.style.left = '0px'; el.style.top = '0px'; el.style.maxWidth = Math.min(align === 'center' ? 340 : 300, vw - 2 * m) + 'px';
  const w = el.offsetWidth, h = el.offsetHeight;
  let x = align === 'start' ? r.left : align === 'end' ? r.right - w : r.left + r.width / 2 - w / 2;
  x = Math.max(m, Math.min(vw - m - w, x));
  let y = r.bottom + 10, up = false;
  if (y + h > vh - m && r.top - 10 - h > m) { y = r.top - 10 - h; up = true; }
  el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(Math.max(m, y)) + 'px';
  el.style.setProperty('--ax', Math.round(Math.max(16, Math.min(w - 16, r.left + r.width / 2 - x))) + 'px');
  el.classList.toggle('up', up);
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
}
function helpOpen(btn) {
  const src = $(btn.dataset.help), inn = $('jdw-help-in'), pop = $('jdw-help');
  if (!src) return;
  helpClose(); menuClose();
  inn.textContent = '';
  for (const n of src.childNodes) {
    const c = n.cloneNode(true);
    if (c.nodeType === 1) { if (c.hidden || !c.textContent.trim()) continue; c.removeAttribute('id'); for (const e of c.querySelectorAll('[id]')) e.removeAttribute('id'); }
    inn.appendChild(c);
  }
  if (!inn.textContent.trim()) return;
  pop.hidden = false; POP.help = btn; btn.setAttribute('aria-expanded', 'true');
  popPlace(pop, btn, 'center');
  try { pop.focus({ preventScroll: true }); } catch (e) {}
}
function helpClose(refocus) {
  const b = POP.help; if (!b) return false;
  POP.help = null; $('jdw-help').hidden = true; b.setAttribute('aria-expanded', 'false');
  if (refocus) try { b.focus({ preventScroll: true }); } catch (e) {}
  return true;
}
/* ---- petits menus (Ma tête, Mon cri) : sous leur bouton, fermés au toucher ailleurs, par Échap ou le retour Android ---- */
function menuOpen(btn, menu) {
  if (POP.menu && POP.menu.el === menu) { menuClose(); return; }
  helpClose(); menuClose();
  menu.hidden = false; menu.style.minWidth = Math.round(btn.getBoundingClientRect().width) + 'px';
  POP.menu = { el: menu, btn }; btn.setAttribute('aria-expanded', 'true');
  popPlace(menu, btn, btn.dataset.align || 'start');
  const first = [...menu.querySelectorAll('[role=menuitem]')].find(x => !x.hidden);
  if (first) try { first.focus({ preventScroll: true }); } catch (e) {}
}
function menuClose(refocus) {
  const m = POP.menu; if (!m) return false;
  POP.menu = null; m.el.hidden = true; m.btn.setAttribute('aria-expanded', 'false');
  if (refocus) try { m.btn.focus({ preventScroll: true }); } catch (e) {}
  return true;
}
const popCloseAll = refocus => helpClose(refocus) || menuClose(refocus);
document.addEventListener('click', e => {
  const q = e.target.closest && e.target.closest('.help-q'); if (!q) return;
  e.preventDefault(); if (POP.help === q) helpClose(); else helpOpen(q);
});
// un toucher n'importe où ferme la bulle (sauf sur son « ? », qui la referme lui-même) et le menu (sauf dedans)
document.addEventListener('pointerdown', e => {
  if (POP.help && !POP.help.contains(e.target)) helpClose();
  if (POP.menu && !POP.menu.el.contains(e.target) && !POP.menu.btn.contains(e.target)) menuClose();
}, true);
document.addEventListener('scroll', e => { if (POP.menu && POP.menu.el.contains(e.target)) return; helpClose(); menuClose(); }, true);
addEventListener('resize', () => { helpClose(); menuClose(); });
for (const m of document.querySelectorAll('.act-menu')) {
  m.addEventListener('click', e => { if (e.target.closest('[role=menuitem]')) menuClose(); });
  m.addEventListener('keydown', e => {
    const I = [...m.querySelectorAll('[role=menuitem]')].filter(x => !x.hidden), i = I.indexOf(document.activeElement);
    const k = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (k && I.length) { e.preventDefault(); I[(i + k + I.length) % I.length].focus(); }
    else if (e.key === 'Tab') menuClose();
  });
}
/* ---- onglets (role=tab) : un seul panneau, ses blocs [data-in="me room"] s'affichent selon l'onglet ---- */
function tabsInit(listId, onPick) {
  const list = $(listId);
  list.addEventListener('click', e => { const b = e.target.closest('[role=tab]'); if (b && !b.hidden) onPick(b.dataset.tab, true); });
  list.addEventListener('keydown', e => {
    const T = [...list.querySelectorAll('[role=tab]')].filter(b => !b.hidden), i = T.indexOf(document.activeElement);
    const k = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 }[e.key]; if (i < 0 || !k) return;
    e.preventDefault();
    const n = T[k === -99 ? 0 : k === 99 ? T.length - 1 : (i + k + T.length) % T.length];
    onPick(n.dataset.tab, true); n.focus();
  });
}
function tabsShow(listId, paneId, t, avail) {
  const list = $(listId), pane = $(paneId);
  for (const b of list.querySelectorAll('[role=tab]')) {
    const on = b.dataset.tab === t; if (avail) b.hidden = !avail.includes(b.dataset.tab);
    b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on) pane.setAttribute('aria-labelledby', b.id);
  }
  list.style.setProperty('--n', [...list.querySelectorAll('[role=tab]')].filter(b => !b.hidden).length);
  pane.dataset.tab = t;
  for (const el of pane.querySelectorAll('[data-in]')) el.classList.toggle('tab-off', !el.dataset.in.split(' ').includes(t));
}
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (popCloseAll(true)) { e.preventDefault(); return; }   // d'abord la bulle « ? » ou le petit menu, la feuille reste ouverte
  if (MAP.open) { closeMap(); return; }
  if (chat.open) { closeChat(); return; }
  if (!$('jdw-cri').hidden) { closeCri(); return; }
  if (!$('jdw-acct').hidden) { if (!AS.locked) closeSheet('jdw-acct'); return; }
  if (!$('jdw-duo').hidden) { duoBack(); return; }
  if (!$('jdw-seatpick').hidden) { closeSheet('jdw-seatpick'); return; }
  if (!$('jdw-inv').hidden) { invDismiss(); return; }
  for (const id of ['jdw-invshare', 'jdw-photo', 'jdw-settings', 'jdw-board', 'jdw-rooms', 'jdw-notifs', 'jdw-profiles', 'jdw-members']) if (!$(id).hidden) { if (id === 'jdw-photo') closePhoto(); else closeSheet(id); break; }
});

/* ================= Classement ================= */
let boardTab = 'general';
function buildTabs() {
  const wrap = $('jdw-tabs');
  const all = [{ id: 'general', title: 'Général', accent: COLORS.gold }, ...GAMES];
  for (const g of all) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.setAttribute('role', 'tab'); b.dataset.id = g.id;
    b.style.setProperty('--acc', g.accent || COLORS.amber); b.textContent = g.title;
    b.addEventListener('click', () => { boardTab = g.id; renderBoardTab(); });
    wrap.appendChild(b);
  }
}
function rowEl(name, right, me, world) {
  const li = document.createElement('li'); if (me) li.className = 'me';
  const av = document.createElement('span'); av.className = 'avatar'; avatarInto(av, name);
  const n = document.createElement('span'); n.className = 'n'; n.textContent = world ? name : dispName(name);
  li.append(av, n, right); return li;
}
function generalRanking() {
  const m = new Map();
  for (const g of GAMES) top(g.id, boardScope).slice(0, 3).forEach((r, i) => {
    const e = m.get(r.name) || { name: r.name, m: [0, 0, 0] }; e.m[i]++; m.set(r.name, e);
  });
  return [...m.values()].sort((a, b) => b.m[0] - a.m[0] || b.m[1] - a.m[1] || b.m[2] - a.m[2] || a.name.localeCompare(b.name));
}
function renderBoardTab() {
  for (const b of $('jdw-tabs').children) b.setAttribute('aria-selected', String(b.dataset.id === boardTab));
  const sel = [...$('jdw-tabs').children].find(b => b.dataset.id === boardTab);
  if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const ol = $('jdw-board-list'); ol.textContent = '';
  const me = cleanName(profile.name), W = boardScope === 'world';
  for (const b of document.querySelectorAll('#jdw-scope button')) b.setAttribute('aria-pressed', String(b.dataset.scope === boardScope));
  const offDev = !W && netOff() && !remoteLoaded;           // hors ligne : records gardés sur cet appareil
  $('jdw-board-h').textContent = W ? 'Classement mondial' : offDev ? 'Classement · cet appareil' : 'Classement · ' + (room ? room.name : 'cet appareil');
  $('jdw-board').classList.toggle('net-off', netOff());
  if (W && !worldLoaded) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = netOff() ? '📡 Il faut du réseau pour le classement mondial. Tes records sont gardés sur cet appareil : touche « Ma salle ».' : worldErr ? "Le classement mondial arrive bientôt (mise à jour du serveur en cours)." : 'Chargement du classement mondial…'; ol.appendChild(li); return; }
  if (boardTab === 'general') {
    $('jdw-board-hint').textContent = (offDev ? 'Hors ligne : records gardés sur cet appareil. ' : netOff() && !W ? 'Hors ligne : dernier classement connu. ' : W ? 'Toutes les salles réunies. ' : '') + 'Le nombre de jeux où chacun est premier, puis deuxième, puis troisième.';
    const rows = generalRanking();
    if (!rows.length) return emptyRow(ol);
    for (const r of rows) {
      const s = document.createElement('span'); s.className = 'medals';
      r.m.forEach((v, i) => { if (!v) return; const md = document.createElement('span'); md.className = 'medal m' + (i + 1); md.innerHTML = '<i></i>'; md.append('×' + v); s.appendChild(md); });
      ol.appendChild(rowEl(r.name, s, r.name === me, W));
    }
  } else {
    const g = gameById(boardTab);
    $('jdw-board-hint').textContent = g ? (offDev ? 'Hors ligne · records de cet appareil · ' : netOff() && !W ? 'Hors ligne · dernier classement connu · ' : W ? 'Top 10 mondial · ' : 'Top 10 de la salle · ') + g.tagline : '';
    const rows = top(boardTab, boardScope);
    if (!rows.length) return emptyRow(ol);
    for (const r of rows) { const s = document.createElement('span'); s.className = 's'; s.textContent = fmt(r.score) + unit(g); ol.appendChild(rowEl(r.name, s, r.name === me, W)); }
  }
}
function emptyRow(ol) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = "Personne n'a encore de score ici. La place est libre !"; ol.appendChild(li); }
$('jdw-open-board').addEventListener('click', () => { if (isGuest()) boardScope = 'world'; loadScores(); loadWorld(); renderBoardTab(); openSheet('jdw-board', 'jdw-board-close'); });   // invité : le classement mondial (public)
for (const b of document.querySelectorAll('#jdw-scope button')) b.addEventListener('click', () => {
  boardScope = b.dataset.scope; store.set('jdw.boardscope', boardScope); if (boardScope === 'world') loadWorld(); renderBoardTab();
});
$('jdw-board-close').addEventListener('click', () => closeSheet('jdw-board'));
$('jdw-board').addEventListener('click', e => { if (e.target === $('jdw-board')) closeSheet('jdw-board'); });

/* ================= Paramètres ================= */
let lookScope = 'all';                 // réglages : « Partout » (profil principal) ou « room » (seulement dans la salle actuelle)
let lookEdit = null;                   // salle visée par la photo / le cri en cours (null = profil principal)
const lookHere = () => lookScope === 'room' && room ? room.id : null;
// onglets : 👤 Moi (tête, cri, pseudo) · 🏠 Salle (tête, cri et pseudo propres à la salle) · 🔐 Compte · 🔊 Son ; le dernier ouvert est retenu
function setTabsAvail() {
  if (isGuest()) return ['snd'];                                   // invité : seulement le son (ni pseudo, ni tête, ni cri)
  const A = [];
  if (profile.name) A.push('me');
  if (room && profile.name && ONLINE) A.push('room');
  if (acctState(profile) !== 'off') A.push('acct');
  A.push('snd'); return A;
}
function showSetTab(t, user) {
  const A = setTabsAvail(); if (!A.includes(t)) t = A.includes('me') ? 'me' : A[0];
  if (user) { store.set('jdw.settab', t); $('jdw-set-status').textContent = ''; }
  $('jdw-set-tabs').hidden = A.length < 2;
  tabsShow('jdw-set-tabs', 'jdw-set-pane', t, A);
  $('jdw-set-help').dataset.help = 'jdw-help-set-' + t;
  helpClose(); menuClose();
  const want = t === 'room' ? 'room' : 'all';
  if (lookScope !== want || user) { lookScope = want; renderLook(); }
}
tabsInit('jdw-set-tabs', showSetTab);
function openSettings() {
  $('jdw-settings').classList.toggle('is-guest', isGuest());
  $('jdw-set-guest').hidden = !isGuest();
  $('jdw-set-name').value = profile.name;
  $('jdw-set-sfx').checked = !muted; $('jdw-set-music').checked = MUS.on; $('jdw-set-cris').checked = criOn; syncSoundMenu();
  $('jdw-set-status').textContent = !ONLINE ? 'Mode local (pas de serveur).' : isGuest() ? '' : netDown ? 'Pas de connexion pour le moment.' : '';
  $('jdw-set-version').textContent = versionText();
  renderAcctSet();
  lookScope = '';                                                  // renderLook au premier affichage de l'onglet
  showSetTab(store.get('jdw.settab', 'me'));
  const sel = $('jdw-set-tabs').hidden ? 'jdw-set-close' : $('jdw-set-tabs').querySelector('[aria-selected="true"]').id;
  openSheet('jdw-settings', sel);
}
// « Enregistrer » n'apparaît que si le pseudo a changé (un pseudo lié à un compte ne change plus)
function nameDirty() { $('jdw-set-save').hidden = isGuest() || $('jdw-set-name').readOnly || cleanName($('jdw-set-name').value) === cleanName(profile.name); }
$('jdw-set-name').addEventListener('input', nameDirty);
// tête dans le rond des réglages : celle du choix affiché (profil principal ou salle), sinon l'initiale
function photoInto(el, photo, name) {
  el.textContent = ''; el.style.background = ''; el.classList.remove('has-photo');
  if (!photo) {
    const n = cleanName(name) || '?'; let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
    el.style.background = 'hsl(' + h + ' 45% 32%)'; el.textContent = n[0]; return;
  }
  const im = document.createElement('img'); im.alt = ''; im.src = photo; el.appendChild(im); el.classList.add('has-photo'); fitHeadWhenReady(im, null);
}
const lbl = (id, t) => { $(id).querySelector('span').textContent = t; };
function renderLook() {
  const rid = lookHere(), L = rid != null ? lookOf(profile, rid) : null, inRoom = !!(room && profile.name);
  if (inRoom) $('jdw-look-room').textContent = room.name;
  const mainPhoto = profile.consent ? profile.photo : null, mainCri = !!(profile.sound && profile.sound !== '');
  photoInto($('jdw-set-av'), L && L.photo ? L.photo : mainPhoto, profile.name);
  $('jdw-look-tag').hidden = !(rid != null && L);
  const h = $('jdw-look-hint'); h.textContent = '';
  const B = t => { const b = document.createElement('b'); b.textContent = t; return b; };
  if (rid != null) {
    if (!L) h.append('Rien de spécial ici pour l’instant : dans ', B(room.name), ', c’est ton profil principal. Prends une photo ou un cri : ils ne serviront que dans cette salle.');
    else {
      const both = L.photo && L.sound;
      h.append('Dans ', B(room.name), ', ' + (both ? 'ta tête et ton cri sont' : L.photo ? 'ta tête est' : 'ton cri est') + ' à part.' + (both ? '' : ' Le reste vient de ton profil principal.'));
    }
    if (roomLookMissing) h.append(' (Le serveur ne connaît pas encore cette option : visible seulement sur cet appareil.)');
  } else if (inRoom) {
    const here = curLook();
    h.append('Ton profil principal, pour toutes les salles' + (here ? ' sauf ' : '.'));
    if (here) h.append(B(room.name), ' (tête ou cri à part).');
  }
  const hasPhoto = rid != null ? !!(L && L.photo) : !!profile.photo;
  const hasCri = rid != null ? !!(L && L.sound) : mainCri;
  $('jdw-set-edit').hidden = !hasPhoto;
  $('jdw-set-delphoto').hidden = !hasPhoto;
  lbl('jdw-set-delphoto', rid != null ? 'Retirer la photo d’ici' : 'Retirer ma tête');
  lbl('jdw-set-photo', rid != null ? (hasPhoto ? 'Changer ma photo d’ici' : 'Une photo pour cette salle') : (profile.photo ? 'Changer ma photo' : 'Prendre une photo'));
  lbl('jdw-set-cri', rid != null ? (hasCri ? 'Changer mon cri d’ici' : 'Un cri pour cette salle') : (hasCri ? 'Changer mon cri' : 'Enregistrer mon cri'));
  $('jdw-set-cri-play').hidden = !(hasCri || (rid != null && mainCri));
  $('jdw-set-cridel').hidden = !hasCri;
  lbl('jdw-set-cridel', rid != null ? 'Retirer le cri d’ici' : 'Retirer mon cri');
  $('jdw-set-lookreset').hidden = !(rid != null && L);
  // sous les deux gros boutons : où on en est, en deux mots
  $('jdw-set-head-s').textContent = rid != null ? (L && L.photo ? 'Spéciale ici' : 'Comme partout') : hasPhoto ? 'Prête ✓' : 'À ajouter';
  $('jdw-set-crib-s').textContent = rid != null ? (L && L.sound ? 'Spécial ici' : 'Comme partout') : hasCri ? 'Prêt ✓' : 'À ajouter';
  $('jdw-set-head').classList.toggle('on', rid != null ? !!(L && L.photo) : hasPhoto);
  $('jdw-set-crib').classList.toggle('on', rid != null ? !!(L && L.sound) : hasCri);
  renderAlias(rid);
}
// pseudo de salle (réglages, choix « Seulement dans <salle> ») : save_room_alias, unique dans la salle
let aliasMissing = false;
function renderAlias(rid) {
  const me = players.get(cleanName(profile.name)), box = $('jdw-alias');
  box.hidden = !(ONLINE && rid != null && room && profile.name && !aliasMissing && !knownNotMember(profile.name));
  if (box.hidden) return;
  $('jdw-alias-room').textContent = room.name;
  const i = $('jdw-alias-in'); i.placeholder = cleanName(profile.name);
  if (document.activeElement !== i) i.value = (me && me.alias) || '';
  const s = $('jdw-alias-s'); s.className = 'alias-s'; s.textContent = '';
}
async function saveAlias() {
  if (!room || !profile.name) return;
  const want = cleanName($('jdw-alias-in').value), s = $('jdw-alias-s'), rid = room.id, nm = room.name;
  if (want && want.length < 2) { s.className = 'alias-s err'; s.textContent = '2 lettres minimum.'; return; }
  s.className = 'alias-s'; s.textContent = 'Enregistrement…';
  try {
    const got = await rpc('save_room_alias', Object.assign({ p_code: CODE() }, RP(), { p_name: profile.name, p_alias: want }), { quiet404: true });
    if (!room || room.id !== rid) return;
    const me = players.get(cleanName(profile.name)); if (me) me.alias = got ? cleanName(got) : null;
    s.className = 'alias-s ok'; s.textContent = got ? 'Dans « ' + nm + ' », tu t’appelles ' + cleanName(got) + '.' : 'Dans « ' + nm + ' », tu reprends ton pseudo principal.';
    $('jdw-alias-in').value = got ? cleanName(got) : '';
    refreshAll(); if (chat.open) renderChat(false); poke('players');
  } catch (e) {
    const m = String(e.message || '');
    if (e.status === 404) { aliasMissing = true; s.className = 'alias-s err'; s.textContent = 'Le serveur ne connaît pas encore les pseudos de salle.'; return; }
    s.className = 'alias-s err';
    s.textContent = /deja pris/.test(m) ? 'Ce pseudo est déjà pris dans la salle (par un autre membre).' : /trop court/.test(m) ? '2 lettres minimum.' : /pas membre/.test(m) ? 'Rejoins d’abord la salle.'
      : e.acct ? 'Connecte-toi à ton compte pour changer ce pseudo.' : e.offline ? 'Pas de connexion internet : réessaie.' : 'Le serveur a refusé ce pseudo : réessaie.';
  }
}
$('jdw-alias-ok').addEventListener('click', saveAlias);
$('jdw-alias-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveAlias(); } });
// la salle n'a plus rien de spécial (photo, cri ou les deux) : on revient au profil principal, ici et sur le serveur
async function lookReset(rid, what) {
  const L = profile.rooms && profile.rooms[rid]; if (!L) return;
  if (!what || what === 'photo') { L.photo = null; L.photoBase = null; L.photoAcc = null; try { localStorage.removeItem(photoSrcKey(rid)); } catch (e) {} }
  if (!what || what === 'sound') L.sound = null;
  lookTouch(rid); saveProfile();
  players.delete(cleanName(profile.name)); syncOwnPlayer(); refreshAll();
  if (!$('jdw-settings').hidden) renderLook();
  if (room && room.id === rid) await pushRoomLook();
}
// « Version du 11/10/2026 à 23:12 · appli Android v4 »
function versionText() {
  const b = String(window.JDW_BUILD || ''), m = b.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
  const V = window.JDW_VERSION ? 'Version ' + window.JDW_VERSION + ' · ' : 'Version ';
  const site = m ? V + 'du ' + m[3] + '/' + m[2] + '/' + m[1] + ' à ' + m[4] + 'h' + m[5] : 'Version de test';
  const app = navigator.userAgent.match(/BorneArcade\/(\d+)/);
  if (!app) return site;
  const appV = appVName();
  // l'appli Android a son propre numéro (telecharger/version.json) : elle ne change que quand l'appli elle-même change
  return site + ' · appli ' + appV + (UPD.app && UPD.app !== appV ? ' (appli ' + UPD.app + ' disponible)' : ' à jour');
}
$('jdw-open-settings').addEventListener('click', openSettings);
$('jdw-me').addEventListener('click', openProfiles);
$('jdw-set-close').addEventListener('click', () => closeSheet('jdw-settings'));
$('jdw-set-sfx').addEventListener('change', () => { muted = !$('jdw-set-sfx').checked; store.set('jdw.muted', muted); Audio.ensure(); syncMute(); if (!muted) Audio.tone(660, 0.08, 'square', 0.05); });
$('jdw-set-music').addEventListener('change', () => { setMusicOn($('jdw-set-music').checked); syncMute(); });
$('jdw-set-cris').addEventListener('change', () => { criOn = $('jdw-set-cris').checked; syncMute(); store.set('jdw.cris', criOn); if (!criOn && criAudio) { try { criAudio.pause(); } catch (e) {} } else playCri(profile.name); });
$('jdw-set-head').addEventListener('click', () => menuOpen($('jdw-set-head'), $('jdw-set-headmenu')));
$('jdw-set-crib').addEventListener('click', () => menuOpen($('jdw-set-crib'), $('jdw-set-crimenu')));
$('jdw-set-photo').addEventListener('click', () => { lookEdit = lookHere(); startPhoto(); });
$('jdw-set-cri').addEventListener('click', () => { lookEdit = lookHere(); openCri(); });
$('jdw-set-edit').addEventListener('click', () => { lookEdit = lookHere(); editHead(); });
$('jdw-set-cri-play').addEventListener('click', () => {
  const rid = lookHere(), L = rid != null ? lookOf(profile, rid) : null;
  const src = (L && L.sound) || profile.sound || '';
  if (!(src ? playCriSrc(src) : !(curLook() || {}).sound && playCri(profile.name))) $('jdw-set-status').textContent = muted || !criOn ? 'Le son est coupé.' : '';
});
$('jdw-set-lookreset').addEventListener('click', async () => {
  const rid = lookHere(); if (rid == null) return;
  const nm = room.name;
  await lookReset(rid);
  $('jdw-set-status').textContent = 'Dans cette salle, tu reprends ton profil principal.';
  toastCheer('Profil principal dans « ' + nm + ' »', profile.name, true);
});
$('jdw-set-delphoto').addEventListener('click', async () => {
  const rid = lookHere();
  if (rid != null) { await lookReset(rid, 'photo'); $('jdw-set-status').textContent = 'Ici, tu reprends la tête de ton profil principal.'; return; }
  profile.photo = null; profile.photoBase = null; profile.photoAcc = null; profile.consent = false; saveProfile(); try { localStorage.removeItem(photoSrcKey()); } catch (e) {}
  players.delete(cleanName(profile.name)); syncOwnPlayer();
  $('jdw-set-status').textContent = 'Ta tête est retirée des jeux.'; renderLook();
  refreshAll(); await pushProfile();
});
$('jdw-set-cridel').addEventListener('click', () => criRemove(lookHere()));
$('jdw-set-guest-new').addEventListener('click', () => { closeSheet('jdw-settings'); guestCreate(); });
$('jdw-set-guest-login').addEventListener('click', () => { closeSheet('jdw-settings'); guestLogin(); });
$('jdw-set-save').addEventListener('click', async () => {
  if (isGuest()) { closeSheet('jdw-settings'); return; }
  if (profile.acct && profile.acct.uid) $('jdw-set-name').value = profile.name;   // pseudo lié à un compte : il ne change plus
  const n = cleanName($('jdw-set-name').value);
  if (!n) { $('jdw-set-status').textContent = 'Il faut un nom.'; return; }
  const changed = n !== profile.name;
  if (changed && deviceNames().includes(n)) { $('jdw-set-status').textContent = 'Ce nom est déjà un profil de cet appareil : change de joueur avec ta tête en haut.'; return; }
  if (changed && profile.acct && !profile.acct.uid) delete profile.acct;   // « ce n'est pas moi » : nouveau pseudo, plus d'attente de compte
  closeSheet('jdw-settings');
  await renameProfile(n);
  if (changed) { acctUi(); acctCheckMine(); }
});
// changer de nom, c'est le même joueur : records, tête et cri de salle suivent ; s'il était dans la salle, il y reste sous son nouveau nom
async function renameProfile(n) {
  const changed = n !== profile.name, old = cleanName(profile.name);
  if (changed && old && bests[old] && !bests[n]) { bests[n] = bests[old]; delete bests[old]; store.set('jdw.bests2', bests); }
  if (changed && profile.rooms) for (const k in profile.rooms) if (profile.rooms[k]) profile.rooms[k].sent = 0;   // à renvoyer sous le nouveau nom
  const keepIn = changed && ONLINE && room && membersFor === room.id && memberNames.has(old) ? room.id : null;
  profile.name = n; profile.askedFor = n; saveProfile(); syncOwnPlayer(); refreshAll();
  if (keepIn != null) {
    try { if (await rpc('join_room', { p_code: CODE(), p_room: keepIn, p_room_code: roomCodes[keepIn] || '', p_name: n }) && room && room.id === keepIn) { memberNames.add(n); const pl = players.get(n); if (pl) pl.member = true; poke('players'); } } catch (e) {}
  }
  await pushProfile();
}
$('jdw-set-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('jdw-set-save').click(); } });

/* ================= Qui joue ? (plusieurs joueurs sur le même appareil) ================= */
function openProfiles() {
  if (!profile.name && !profiles.some(p => p.name)) { if (isGuest()) guestAsk('Ton joueur'); else startWelcome(); return; }
  const wrap = $('jdw-prof-list'); wrap.textContent = '';
  for (const pr of profiles) {
    if (!pr.name) continue;
    const cur = pr.pid === profile.pid;
    const row = document.createElement('div'); row.className = 'prof-item' + (cur ? ' cur' : '');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'prof-pick';
    b.setAttribute('aria-label', cur ? pr.name + ', joueur actuel' : 'Jouer en tant que ' + pr.name);
    const av = document.createElement('span'); av.className = 'avatar'; avatarInto(av, pr.name);
    if (pr.photo && !av.firstChild) { const im = document.createElement('img'); im.alt = ''; im.src = pr.photo; av.textContent = ''; av.style.background = ''; av.appendChild(im); }
    const nm = document.createElement('span'); nm.className = 'n'; nm.textContent = pr.name;
    b.append(av, nm);
    if (cur) { const t = document.createElement('span'); t.className = 'prof-tag'; t.textContent = 'Joue en ce moment'; b.append(t); }
    if (acctLive(pr)) { const t = document.createElement('span'); t.className = 'prof-lock'; t.title = 'Protégé par un compte'; t.textContent = '🔒'; nm.append(' ', t); }
    b.addEventListener('click', () => { if (cur) closeSheet('jdw-profiles'); else switchProfile(pr.pid); });
    row.append(b);
    if (!cur) {
      const del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-ghost btn-sm prof-del'; del.textContent = 'Retirer';
      del.setAttribute('aria-label', 'Retirer ' + pr.name + ' de cet appareil');
      del.addEventListener('click', () => {
        if (!del.classList.contains('sure')) { del.classList.add('sure'); del.textContent = 'Sûr ?'; return; }
        profiles = profiles.filter(x => x.pid !== pr.pid); store.set('jdw.profiles', profiles); openProfiles();
      });
      row.append(del);
    }
    wrap.appendChild(row);
  }
  acctProfList();
  if (!$('jdw-profiles').hidden) return;
  openSheet('jdw-profiles', 'jdw-prof-close');
}
function afterSwitch() {
  bests[cleanName(profile.name)] = bests[cleanName(profile.name)] || {};
  syncOwnPlayer(); refreshAll(); refreshBell();
  pushProfile();
  maybeAskJoin();          // un profil n'entre dans la salle que si on le veut (« Ajouter X à la salle ? »)
  heartbeat(); loadNotifs(); refreshChatBtn(); if (chat.open) renderChat(false);
  rtTrack();
  acctUi(); acctCheckMine();
}
function switchProfile(pid) {
  const pr = profiles.find(p => p.pid === pid); if (!pr) return;
  profile = pr; store.set('jdw.profile', profile);
  closeSheet('jdw-profiles');
  toastCheer('Salut ' + profile.name + ' ! À toi de jouer.', profile.name, true);
  afterSwitch();          // une notification éventuelle remplace le bonjour
}
$('jdw-prof-close').addEventListener('click', () => closeSheet('jdw-profiles'));
$('jdw-profiles').addEventListener('click', e => { if (e.target === $('jdw-profiles')) closeSheet('jdw-profiles'); });
$('jdw-prof-add').addEventListener('click', () => {
  closeSheet('jdw-profiles');
  adding = profile; profile = blankProfile();
  startWelcome();
});
$('jdw-prof-edit').addEventListener('click', () => { closeSheet('jdw-profiles'); openSettings(); });

/* ================= Mon cri (3 s au micro ou un fichier son) ================= */
const CRI_MAX = 3;
const CR = { stream: null, rec: null, chunks: [], data: '', t0: 0, raf: 0, levels: [], analyser: null, src: null, stopT: 0, busy: false, mime: '' };
function criMime() {
  if (!window.MediaRecorder) return null;
  for (const t of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) {} }
  return '';
}
function criHint(t) { $('jdw-cri-hint').textContent = t; }
function criState(st) {
  const sheet = $('jdw-cri'); sheet.dataset.state = st;
  $('jdw-cri-rec').setAttribute('aria-label', st === 'rec' ? 'Arrêter' : 'Enregistrer');
  $('jdw-cri-play').disabled = !CR.data; $('jdw-cri-ok').disabled = !CR.data || st === 'rec';
}
function openCri() {
  Audio.ensure();
  CR.data = ''; CR.levels = []; drawWave();
  if (lookEdit != null && !(room && room.id === lookEdit)) lookEdit = null;
  const L = lookEdit != null ? lookOf(profile, lookEdit) : null;
  const has = lookEdit != null ? !!(L && L.sound) : profile.sound && profile.sound !== '';
  $('jdw-cri-del').hidden = !has;
  $('jdw-cri-del').textContent = lookEdit != null ? 'Retirer le cri de cette salle' : 'Retirer mon cri';
  $('jdw-cri-h').textContent = lookEdit != null ? 'Ton cri dans « ' + room.name + ' »' : 'Ton cri';
  criHint(criMime() === null ? "Ton navigateur n'enregistre pas le son : choisis plutôt un fichier." : 'Touche le micro et crie, ris ou chante (3 secondes) !');
  criState('idle');
  if (!$('jdw-settings').hidden) $('jdw-settings').hidden = true;
  if (!$('jdw-chat').hidden) closeChat();
  openSheet('jdw-cri', 'jdw-cri-rec');
}
function closeCri() { criStop(true); closeSheet('jdw-cri'); lookEdit = null; if (welReturn) reopenWelcome(); }
function drawWave(live) {
  const cv = $('jdw-cri-wave'), dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth || 300, h = cv.clientHeight || 64;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  const n = 48, bw = w / n;
  for (let i = 0; i < n; i++) {
    const v = CR.levels[Math.floor(i * CR.levels.length / n)] || 0, bh = Math.max(3, Math.min(1, v * 3.2) * (h - 6));
    x.fillStyle = i / n <= (live || 0) || !live ? (CR.levels.length ? COLORS.amber : COLORS.steel2) : COLORS.steel2;
    x.beginPath(); x.roundRect ? x.roundRect(i * bw + 1.5, (h - bh) / 2, bw - 3, bh, 2) : x.rect(i * bw + 1.5, (h - bh) / 2, bw - 3, bh); x.fill();
  }
}
function criMeter() {
  const a = CR.analyser; if (!a) return;
  const buf = new Float32Array(a.fftSize); a.getFloatTimeDomainData(buf);
  let sum = 0; for (const v of buf) sum += v * v;
  CR.levels.push(Math.sqrt(sum / buf.length));
  const p = Math.min(1, (performance.now() - CR.t0) / (CRI_MAX * 1000));
  $('jdw-cri-rec').style.setProperty('--p', p);
  drawWave(p);
  if (p >= 1) { criStop(); return; }
  CR.raf = requestAnimationFrame(criMeter);
}
function criRecordStream(stream, onDone) {
  const mime = criMime();
  let rec;
  try { rec = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 48000 }) : new MediaRecorder(stream); }
  catch (e) { try { rec = new MediaRecorder(stream); } catch (e2) { criHint("Impossible d'enregistrer ici. Choisis un fichier son."); return false; } }
  CR.rec = rec; CR.chunks = []; CR.mime = rec.mimeType || mime || 'audio/webm';
  rec.ondataavailable = e => { if (e.data && e.data.size) CR.chunks.push(e.data); };
  rec.onstop = () => {
    const blob = new Blob(CR.chunks, { type: CR.mime.split(';')[0] });
    const fr = new FileReader();
    fr.onload = () => {
      let d = String(fr.result || '');
      if (!d.startsWith('data:audio/')) d = d.replace(/^data:[^;,]*/, 'data:' + CR.mime.split(';')[0]);
      if (d.length > 290000) { criHint('Trop lourd : recommence plus court.'); CR.data = ''; }
      else { CR.data = d; criHint('Écoute ton cri. Il te plaît ? Garde-le !'); }
      criState('done'); if (onDone) onDone();
      if (CR.data) criPreview();
    };
    fr.readAsDataURL(blob);
  };
  rec.start(100);
  return true;
}
async function criStart() {
  if (CR.busy) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || criMime() === null) { criHint('Micro indisponible ici : choisis un fichier son.'); return; }
  CR.busy = true;
  try {
    CR.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
  } catch (e) { CR.busy = false; criHint("Le micro est refusé. Autorise-le, ou choisis un fichier son."); return; }
  Audio.ensure();
  try { const A = Audio.ctx; CR.src = A.createMediaStreamSource(CR.stream); CR.analyser = A.createAnalyser(); CR.analyser.fftSize = 1024; CR.src.connect(CR.analyser); } catch (e) { CR.analyser = null; }
  CR.data = ''; CR.levels = [];
  if (!criRecordStream(CR.stream)) { criStop(true); CR.busy = false; return; }
  CR.t0 = performance.now(); criState('rec'); criHint('Vas-y, crie !');
  if (CR.analyser) CR.raf = requestAnimationFrame(criMeter); else CR.stopT = setTimeout(criStop, CRI_MAX * 1000);
  CR.busy = false;
}
function criStop(cancel) {
  cancelAnimationFrame(CR.raf); clearTimeout(CR.stopT);
  if (CR.rec && CR.rec.state !== 'inactive') { if (cancel) CR.rec.onstop = null; try { CR.rec.stop(); } catch (e) {} }
  CR.rec = null;
  if (CR.stream) { CR.stream.getTracks().forEach(t => t.stop()); CR.stream = null; }
  try { CR.src && CR.src.disconnect(); } catch (e) {} CR.src = null; CR.analyser = null;
  $('jdw-cri-rec').style.setProperty('--p', 0);
  if (!cancel) criState('wait');
}
let criPrev = null;
function criPreview() {
  if (!CR.data) return;
  try { if (criPrev) criPrev.pause(); criPrev = new window.Audio(CR.data); const pr = criPrev.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
}
// fichier son : on garde les 3 premières secondes utiles, volume normalisé, réenregistré en léger
async function criFromFile(file) {
  if (!file) return;
  if (!window.MediaRecorder || criMime() === null) { criHint("Ton navigateur ne sait pas préparer ce son."); return; }
  criHint('Préparation du son…'); criState('wait');
  Audio.ensure();
  const A = Audio.ctx;
  let buf;
  try { buf = await new Promise((res, rej) => { file.arrayBuffer().then(ab => A.decodeAudioData(ab, res, rej)).catch(rej); }); }
  catch (e) { criHint("Ce fichier n'est pas un son lisible."); criState('idle'); return; }
  const ch = buf.getChannelData(0); let start = 0, peak = 0;
  while (start < ch.length && Math.abs(ch[start]) < 0.02) start++;
  const startS = Math.max(0, start / buf.sampleRate - 0.05), dur = Math.min(CRI_MAX, buf.duration - startS);
  for (let i = Math.floor(startS * buf.sampleRate); i < Math.min(ch.length, (startS + dur) * buf.sampleRate); i++) peak = Math.max(peak, Math.abs(ch[i]));
  CR.levels = []; const step = Math.max(1, Math.floor(dur * buf.sampleRate / 96));
  for (let i = Math.floor(startS * buf.sampleRate); i < Math.min(ch.length, (startS + dur) * buf.sampleRate); i += step) {
    let s2 = 0, k = 0; for (let j = i; j < i + step && j < ch.length; j++) { s2 += ch[j] * ch[j]; k++; } CR.levels.push(Math.sqrt(s2 / Math.max(1, k)) / Math.max(peak, 0.05) * 0.3);
  }
  drawWave();
  const dest = A.createMediaStreamDestination(), src = A.createBufferSource(), g = A.createGain();
  src.buffer = buf; g.gain.value = peak > 0.01 ? Math.min(4, 0.9 / peak) : 1;
  src.connect(g).connect(dest);
  if (!criRecordStream(dest.stream)) return;
  src.start(0, startS, dur);
  CR.stopT = setTimeout(() => { if (CR.rec && CR.rec.state !== 'inactive') CR.rec.stop(); CR.rec = null; }, dur * 1000 + 120);
}
$('jdw-cri-rec').addEventListener('click', () => { if (CR.rec) criStop(); else criStart(); });
$('jdw-cri-play').addEventListener('click', criPreview);
$('jdw-cri-file').addEventListener('click', () => { const f = $('jdw-cri-input'); f.value = ''; f.click(); });
$('jdw-cri-input').addEventListener('change', () => { const f = $('jdw-cri-input').files; if (f && f[0]) criFromFile(f[0]); });
$('jdw-cri-close').addEventListener('click', closeCri);
$('jdw-cri-ok').addEventListener('click', async () => {
  if (!CR.data) return;
  const rid = welReturn ? null : lookEdit;
  if (rid != null) {                       // cri seulement pour cette salle
    const nm = room ? room.name : '';
    lookTouch(rid).sound = CR.data; saveProfile(); syncOwnPlayer();
    closeCri(); refreshAll();
    const ok = await pushRoomLook() && !roomLookMissing;
    toastCheer(ok ? 'Ton cri pour « ' + nm + ' » est prêt !' : 'Cri de « ' + nm + ' » gardé sur cet appareil.', profile.name, true);
    setTimeout(() => playCri(profile.name), 300);
    return;
  }
  profile.sound = CR.data;
  if (welReturn) { closeCri(); return; }
  saveProfile(); syncOwnPlayer();
  closeCri(); refreshAll();
  const ok = await pushProfile();
  toastCheer(ok ? 'Ton cri est prêt : les copains vont l’entendre !' : 'Cri gardé sur cet appareil.', profile.name, true);
  setTimeout(() => playCri(profile.name), 300);
});
$('jdw-cri-del').addEventListener('click', () => criRemove(welReturn ? null : lookEdit, true));
// retirer le cri (fenêtre du cri, ou menu « Mon cri » des paramètres) : dans une salle, on reprend le cri principal
async function criRemove(rid, fromCri) {
  if (rid != null) { if (fromCri) closeCri(); await lookReset(rid, 'sound'); toastCheer('Ici, tu reprends le cri de ton profil principal.', profile.name, true); return; }
  profile.sound = ''; saveProfile(); syncOwnPlayer(); if (fromCri) closeCri(); refreshAll();
  if (!$('jdw-settings').hidden) renderLook();
  await pushProfile(); toastCheer('Ton cri est retiré.', profile.name, true);
}

/* ================= Nouveau joueur (pseudo + tête + cri) ================= */
let adding = null;                                // profil précédent pendant l'ajout d'un joueur
let welReturn = false;                            // la photo / le cri reviennent à cette fenêtre
const NAMECK = { n: '', state: '', photo: null, sound: null, claimed: '', seq: 0, timer: 0 };
function renderWelcome() {
  const face = $('jdw-wel-face'); face.textContent = '';
  if (profile.photo) { const im = document.createElement('img'); im.alt = ''; im.src = profile.photo; face.appendChild(im); $('jdw-wel-face-tag').textContent = '📸 Changer'; }
  else { face.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="24" r="12"/><path d="M10 58a22 22 0 0 1 44 0"/></svg>'; $('jdw-wel-face-tag').textContent = '📸 Ma tête'; }
  $('jdw-wel-photo').classList.toggle('done', !!profile.photo);
  const cri = !!(profile.sound && profile.sound !== '');
  $('jdw-wel-cri').classList.toggle('done', cri);
  $('jdw-wel-cri-t').textContent = cri ? 'Cri enregistré ✓' : 'Ajouter mon cri';
  $('jdw-wel-cri-s').textContent = cri ? 'Touche pour le refaire' : '3 secondes pour faire rire les copains';
}
// fenêtre « Nouveau joueur » : onglets Nouveau joueur | J'ai déjà un compte (seulement si le serveur connaît les comptes)
// WEL.uid : compte de l'appareil auquel rattacher le nouveau joueur ('' = nouveau compte) ; WEL.noAcct : joueur sans compte (enfant)
const WEL = { tab: 'new', noAcct: false, uid: '', busy: false, pick: null };
function startWelcome() {
  $('jdw-wel-cancel').hidden = !adding && !isGuest();
  $('jdw-wel-cancel').textContent = adding ? 'Annuler' : 'Plus tard';
  $('jdw-wel-h').textContent = adding ? 'Nouveau joueur' : 'Crée ton joueur';
  $('jdw-wel-eyebrow').textContent = adding ? 'Un copain de plus sur cet appareil' : "Bienvenue à la Borne d'arcade";
  $('jdw-wel-name').value = profile.name || '';
  Object.assign(NAMECK, { n: '', state: '', photo: null, sound: null, claimed: '' });
  const uids = acctUids();
  Object.assign(WEL, { tab: 'new', noAcct: false, busy: false, pick: null, uid: adding && acctLive(adding) ? adding.acct.uid : uids[0] || '' });
  for (const id of ['jdw-wel-email', 'jdw-wel-pass', 'jdw-wel-lemail', 'jdw-wel-lpass']) $(id).value = '';
  $('jdw-wel-check').textContent = ''; $('jdw-wel-check').className = 'wel-check'; $('jdw-wel-claim').hidden = true;
  welTab('new');
  renderWelcome();
  openSheet('jdw-welcome', 'jdw-wel-name');
}
function reopenWelcome() { welReturn = false; renderWelcome(); $('jdw-welcome').hidden = false; }
function nameMsg(t, cls) { const el = $('jdw-wel-check'); el.textContent = t; el.className = 'wel-check' + (cls ? ' ' + cls : ''); }
function welMsg(t, cls) { const el = $('jdw-wel-msg'); el.textContent = t || ''; el.className = 'acct-msg' + (cls ? ' ' + cls : ''); el.hidden = !t; }
const welAcctOn = () => ONLINE && ACCT.ready;
function welTab(t) {
  WEL.tab = welAcctOn() && t === 'login' ? 'login' : 'new';
  if (WEL.tab === 'new') WEL.pick = null;
  for (const b of document.querySelectorAll('#jdw-wel-tabs button')) b.setAttribute('aria-pressed', String(b.dataset.tab === WEL.tab));
  $('jdw-wel-new').hidden = WEL.tab !== 'new'; $('jdw-wel-login').hidden = WEL.tab !== 'login';
  welMsg('');
  welAcctUi();
}
// petites puces « Compte de PATOU, LOUIS » | « ✉️ Nouveau compte » (choix du compte d'un nouveau joueur)
function acctChips(box, cur, onPick, withNew) {
  const uids = acctUids(); box.textContent = '';
  box.hidden = !uids.length; if (!uids.length) return;
  const chip = (uid, label) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'acct-chip'; b.textContent = label;
    b.setAttribute('aria-pressed', String(cur === uid)); b.addEventListener('click', () => onPick(uid)); box.appendChild(b);
  };
  for (const u of uids) chip(u, '🔒 ' + acctLabel(u));
  if (withNew) chip('', '✉️ Nouveau compte');
}
function welAcctUi() {
  const on = welAcctOn();
  if (!on && WEL.tab === 'login') { welTab('new'); return; }
  if (WEL.uid && !liveUid(WEL.uid)) WEL.uid = '';
  $('jdw-wel-tabs').hidden = !on;
  $('jdw-wel-acct').hidden = !on || WEL.noAcct;
  $('jdw-wel-noacct').hidden = true;     // plus de joueur « sans compte » : un enfant va sur le compte de l'appareil (un compte = plusieurs joueurs)
  if (WEL.noAcct) WEL.noAcct = false;
  $('jdw-wel-noacct').textContent = WEL.noAcct ? '↩ Finalement, je le mets sur un compte' : "Pas d'e-mail (un enfant) ? Jouer sans compte, sur cet appareil";
  acctChips($('jdw-wel-acctpick'), WEL.uid, u => { WEL.uid = u; welMsg(''); welAcctUi(); }, true);
  $('jdw-wel-acct-in').hidden = !!WEL.uid;
  const se = $('jdw-wel-sess'); se.hidden = !WEL.uid;
  if (WEL.uid) se.textContent = '✓ Ce joueur sera ajouté au compte de ' + acctLabel(WEL.uid) + '.';
  // connexion : liste des joueurs du compte quand il en a plusieurs
  const pk = $('jdw-wel-pick'), picking = !!WEL.pick;
  pk.hidden = !picking; $('jdw-wel-lfields').hidden = picking; $('jdw-wel-lpassbox').hidden = picking; $('jdw-wel-forgot').hidden = picking;
  $('jdw-wel-login-txt').hidden = !picking; $('jdw-wel-login-txt').textContent = 'Ce compte a plusieurs joueurs : qui joue sur cet appareil ?';
  $('jdw-wel-ok').hidden = picking;
  $('jdw-wel-ok').textContent = WEL.tab === 'login' ? 'Me connecter' : on && !WEL.uid ? 'Créer mon compte' : "C'est parti !";
  $('jdw-wel-help').dataset.help = WEL.tab === 'login' ? 'jdw-help-wel-login' : 'jdw-help-wel-new';   // explications derrière « ? »
}
function welBusy(on, t) {
  WEL.busy = on; $('jdw-wel-ok').disabled = on;
  if (on) { $('jdw-wel-ok').textContent = t || '…'; welMsg(''); } else welAcctUi();
}
// plusieurs joueurs sur le compte : on choisit lequel arrive sur l'appareil
function welPick(s, rows) {
  if ($('jdw-welcome').hidden) { if (profile.name) { adding = profile; profile = blankProfile(); } startWelcome(); }
  WEL.pick = { s, rows }; welTab('login'); WEL.pick = { s, rows };
  const pk = $('jdw-wel-pick'); pk.textContent = '';
  for (const r of rows) {
    const n = cleanName(r.r_name), b = document.createElement('button'); b.type = 'button'; b.className = 'acct-player';
    const av = document.createElement('span'); av.className = 'avatar'; photoInto(av, r.r_photo, n);
    const t = document.createElement('b'); t.textContent = n;
    const on = profiles.some(p => cleanName(p.name) === n); const sm = document.createElement('small'); sm.textContent = on ? 'déjà sur cet appareil' : 'jouer avec ' + n;
    const tx = document.createElement('span'); tx.className = 'acct-player-tx'; tx.append(t, sm);
    b.append(av, tx); b.addEventListener('click', () => { const pr = acctUse({ name: n, me: r }, s); toastCheer('Re-bonjour ' + pr.name + ' !', pr.name, true); setTimeout(() => playCri(pr.name), 400); });
    pk.appendChild(b);
  }
  welAcctUi();
}
function showClaim() {
  const f = $('jdw-wel-claim-face'); f.textContent = ''; f.style.background = '';
  if (NAMECK.photo) { const im = document.createElement('img'); im.alt = ''; im.src = NAMECK.photo; f.appendChild(im); }
  else { f.textContent = NAMECK.n[0] || '?'; f.style.background = 'hsl(' + nameHue(NAMECK.n) + ' 45% 32%)'; }
  const prot = NAMECK.state === 'protected';
  $('jdw-wel-claim').classList.toggle('prot', prot);
  $('jdw-wel-claim-t').textContent = prot ? '🔒 ' + NAMECK.n + ' a un compte' : NAMECK.n + ' existe déjà';
  $('jdw-wel-claim-s').textContent = prot ? "Ce pseudo est protégé. C'est toi ? Connecte-toi pour le retrouver ici." : "C'est bien toi, sur un autre téléphone ?";
  $('jdw-wel-claim-yes').textContent = prot ? '🔑 Me connecter' : "Oui, c'est moi";
  $('jdw-wel-claim').hidden = false;
}
async function checkName() {
  const n = cleanName($('jdw-wel-name').value), seq = ++NAMECK.seq;
  $('jdw-wel-claim').hidden = true;
  Object.assign(NAMECK, { n, state: '', photo: null, sound: null });
  if (!n) { nameMsg(''); return; }
  if (n.length < 2) { nameMsg('2 lettres minimum.', 'warn'); NAMECK.state = 'short'; return; }
  if (profiles.some(p => cleanName(p.name) === n && p.pid !== profile.pid)) { nameMsg('Ce joueur est déjà sur cet appareil : on passera sur son profil.', 'info'); NAMECK.state = 'device'; return; }
  if (NAMECK.claimed === n) { nameMsg("C'est toi : on récupère ta tête et ton cri.", 'ok'); NAMECK.state = 'mine'; return; }
  const known = players.get(n);
  if (!ONLINE) { if (known) { NAMECK.state = 'taken'; NAMECK.photo = known.photo; NAMECK.sound = known.sound; nameMsg('Pseudo déjà utilisé.', 'warn'); showClaim(); } else { NAMECK.state = 'free'; nameMsg('✓ Pseudo libre', 'ok'); } return; }
  nameMsg('Vérification…', '');
  let r = null;
  try { const rows = await rpc('check_name', { p_code: CODE(), p_name: n }); r = rows && rows[0]; }
  catch (e) { r = known ? { r_exists: true, r_photo: known.photo, r_sound: known.sound } : undefined; }
  if (seq !== NAMECK.seq) return;
  if (r === undefined) { NAMECK.state = 'unknown'; nameMsg(''); return; }   // serveur indisponible : on ne bloque pas
  if (r && r.r_protected) { NAMECK.state = 'protected'; NAMECK.photo = r.r_photo || null; NAMECK.sound = r.r_sound || null; nameMsg('🔒 Pseudo protégé par un compte.', 'warn'); showClaim(); }
  else if (r && r.r_exists) { NAMECK.state = 'taken'; NAMECK.photo = r.r_photo || null; NAMECK.sound = r.r_sound || null; nameMsg('Pseudo déjà utilisé.', 'warn'); showClaim(); }
  else { NAMECK.state = 'free'; nameMsg('✓ Pseudo libre', 'ok'); }
}
$('jdw-wel-name').addEventListener('input', () => { clearTimeout(NAMECK.timer); NAMECK.timer = setTimeout(checkName, 380); });
$('jdw-wel-claim-yes').addEventListener('click', () => {
  if (NAMECK.state === 'protected') {          // pseudo protégé : on se connecte à son compte, on ne le « réclame » pas
    $('jdw-wel-claim').hidden = true;
    const n = NAMECK.n;
    welTab('login'); $('jdw-wel-lemail').value = n;
    welMsg('Tape le mot de passe du compte de ' + n + '.', 'info');
    setTimeout(() => $('jdw-wel-lpass').focus(), 30);
    return;
  }
  NAMECK.claimed = NAMECK.n; $('jdw-wel-claim').hidden = true;
  if (!profile.photo && NAMECK.photo) { profile.photo = NAMECK.photo; profile.consent = true; }
  if (profile.sound === undefined && NAMECK.sound) profile.sound = undefined;   // le cri reste sur le serveur
  NAMECK.state = 'mine'; nameMsg("C'est toi : on récupère ta tête et ton cri.", 'ok');
  if (NAMECK.sound) setPlayer(NAMECK.n, NAMECK.photo, NAMECK.sound);
  renderWelcome();
});
$('jdw-wel-claim-no').addEventListener('click', () => {
  $('jdw-wel-claim').hidden = true; const i = $('jdw-wel-name'); i.select(); i.focus(); nameMsg('Choisis un autre pseudo.', 'warn');
});
// compte du nouveau joueur : compte de l'appareil, ou nouveau compte ; renvoie profile.acct, ou null (message déjà affiché)
async function welSignup(n) {
  if (WEL.uid) {
    welBusy(true, 'Un instant…');
    const tok = await tokenFor(WEL.uid);
    if (!tok) { welBusy(false); welMsg('La connexion de ce compte a expiré : reconnecte-toi (« J’ai déjà un compte »).', 'err'); return null; }
    try { await rpc('claim_name', { p_code: CODE(), p_name: n }, { token: tok }); }
    catch (e) { welBusy(false); welMsg(claimMsg(e, n), 'err'); return null; }
    welBusy(false);
    return { uid: WEL.uid };
  }
  const email = $('jdw-wel-email').value.trim(), pass = $('jdw-wel-pass').value;
  if (!validEmail(email)) { welMsg(email ? "Cette adresse e-mail n'est pas valide." : 'Il faut ton e-mail (ou « Jouer sans compte » pour un enfant).', 'err'); $('jdw-wel-email').focus(); return null; }
  if (pass.length < 6) { welMsg('Le mot de passe doit faire au moins 6 caractères.', 'err'); $('jdw-wel-pass').focus(); return null; }
  welBusy(true, 'Création du compte…');
  let r;
  try { r = await authSignup(email, pass, n); }
  catch (e) {
    welBusy(false);
    if (authExists(e)) { welTab('login'); $('jdw-wel-lemail').value = email; welMsg('Cet e-mail a déjà un compte : connecte-toi.', 'info'); $('jdw-wel-lpass').focus(); }
    else welMsg(authMsg(e), 'err');
    return null;
  }
  if (!r.access_token) {                                  // confirmation de l'e-mail demandée par le serveur
    welBusy(false);
    const ids = r.identities || (r.user && r.user.identities);
    if (Array.isArray(ids) && !ids.length) { welTab('login'); $('jdw-wel-lemail').value = email; welMsg('Cet e-mail a déjà un compte : connecte-toi.', 'info'); return null; }
    return { email, pending: true };
  }
  const uid = acctSetSess(r);
  try { await rpc('claim_name', { p_code: CODE(), p_name: n }, { token: r.access_token }); }
  catch (e) { welBusy(false); WEL.uid = uid; welAcctUi(); welMsg(claimMsg(e, n), 'err'); return null; }   // compte gardé : un autre pseudo suffira
  welBusy(false);
  return { uid };
}
async function welLogin() {
  const idf = $('jdw-wel-lemail').value.trim(), pass = $('jdw-wel-lpass').value;
  if (!idf) { welMsg('Tape ton e-mail ou ton pseudo.', 'err'); $('jdw-wel-lemail').focus(); return; }
  if (!pass) { welMsg('Il faut le mot de passe du compte.', 'err'); $('jdw-wel-lpass').focus(); return; }
  welBusy(true, 'Connexion…');
  let L;
  try { L = await acctLogin(idf, pass); } catch (e) { welBusy(false); welMsg(e.ui ? e.message : authMsg(e, 'login'), 'err'); return; }
  const res = await acctAdopt(L.s, { name: L.name });
  welBusy(false);
  if (res.pick) { welPick(L.s, res.pick); return; }
  if (res.nopseudo) {                                     // compte sans joueur (inscription jamais terminée) : on choisit le pseudo
    WEL.uid = acctSetSess(L.s); welTab('new'); welMsg(res.err || 'Ton compte n’a pas encore de joueur : choisis ton pseudo.', res.err ? 'err' : 'info');
    $('jdw-wel-name').focus(); return;
  }
  if (res.err) { welMsg(res.err, 'err'); return; }
  const pr = acctUse(res, L.s);
  toastCheer('Re-bonjour ' + pr.name + ' !', pr.name, true);
  setTimeout(() => playCri(pr.name), 400);
}
async function welcomeOk() {
  if (WEL.busy) return;
  if (WEL.tab === 'login') { welLogin(); return; }
  clearTimeout(NAMECK.timer);
  const n = cleanName($('jdw-wel-name').value);
  if (!n || n.length < 2) { nameMsg(n ? '2 lettres minimum.' : 'Il faut un pseudo.', 'warn'); $('jdw-wel-name').focus(); return; }
  if (NAMECK.n !== n) await checkName();
  if (NAMECK.state === 'protected') { showClaim(); return; }
  if (NAMECK.state === 'taken' && NAMECK.claimed !== n) { showClaim(); return; }
  Audio.ensure();
  const existing = profiles.find(p => cleanName(p.name) === n && p.pid !== profile.pid);
  if (existing) { adding = null; closeSheet('jdw-welcome'); switchProfile(existing.pid); return; }
  let acct = null;
  if (welAcctOn() && !WEL.noAcct) { acct = await welSignup(n); if (!acct) return; }
  const wasAdding = !!adding; adding = null;
  profile.name = n; profile.askedFor = n;
  if (acct) { profile.acct = acct; delete profile.acctNever; } else if (welAcctOn() && WEL.noAcct) profile.acctNever = true;
  saveProfile(); syncOwnPlayer();
  if (NAMECK.claimed === n && NAMECK.sound && !profile.sound) setPlayer(n, profile.consent ? profile.photo : null, NAMECK.sound);
  closeSheet('jdw-welcome'); refreshAll();
  if (wasAdding) afterSwitch(); else pushProfile();
  toastCheer((NAMECK.claimed === n ? 'Re-bonjour ' : 'Bienvenue ') + n + (acct && acct.uid ? ' 🔒' : '') + ' !', n, true);
  setTimeout(() => playCri(n), 400);
  acctUi();
  if (acct && acct.pending) setTimeout(() => openAcct('confirm'), 900); else afterOnboarding();
}
$('jdw-wel-cancel').addEventListener('click', () => {
  if (!adding) { closeSheet('jdw-welcome'); guestSync(); return; }      // invité : il continue à jouer en invité
  profile = adding; adding = null; store.set('jdw.profile', profile);
  closeSheet('jdw-welcome'); refreshAll();
});
function afterOnboarding() {
  if (ONLINE && invPending()) { setTimeout(invRun, 250); return; }   // arrivé par un lien d'invitation : on entre dans sa salle
  if (ONLINE && !room && profile.name) setTimeout(openRooms, 250);
}
$('jdw-wel-ok').addEventListener('click', welcomeOk);
$('jdw-wel-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); welcomeOk(); } });
$('jdw-wel-lpass').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); welcomeOk(); } });
$('jdw-wel-lemail').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('jdw-wel-lpass').focus(); } });
$('jdw-wel-pass').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); welcomeOk(); } });
for (const b of document.querySelectorAll('#jdw-wel-tabs button')) b.addEventListener('click', () => { if (!WEL.busy) welTab(b.dataset.tab); });
$('jdw-wel-noacct').addEventListener('click', () => { WEL.noAcct = !WEL.noAcct; welMsg(WEL.noAcct ? 'Sans compte, ce joueur ne vit que sur cet appareil et son pseudo n’est pas protégé. Tu pourras le mettre sur un compte plus tard dans ⚙.' : '', 'info'); welAcctUi(); });
$('jdw-wel-forgot').addEventListener('click', () => openAcct('forgot', { email: $('jdw-wel-lemail').value.trim() }));
$('jdw-wel-photo').addEventListener('click', () => { welReturn = true; startPhoto(); });
$('jdw-wel-cri').addEventListener('click', () => { welReturn = true; $('jdw-welcome').hidden = true; openCri(); });

/* ================= Comptes (Supabase Auth : e-mail + mot de passe) =================
   API REST de Supabase Auth, sans SDK : /auth/v1/signup, token?grant_type=password|refresh_token, recover, resend, user, logout.
   UN compte peut avoir PLUSIEURS joueurs. Sessions par compte : ACCT.s[uid] = { email, at (jeton), rt (rafraîchissement), exp (ms) }
   (jdw.accts) ; un profil lié porte profile.acct = { uid }. Autres états du profil : { email, pending } (inscription à confirmer par
   e-mail), { need } (pseudo protégé sur le serveur, appareil pas connecté). profile.acctNever = joueur gardé sans compte (enfant).
   rpc() envoie le jeton du compte du joueur au nom duquel il agit (p_name, p_by, p_owner) ; le serveur (accounts.sql) vérifie auth.uid().
   Connexion avec l'e-mail OU un pseudo (login_email : e-mail du compte, jamais affiché). Serveur sans accounts.sql : ACCT.ready = false. */
const ACCT_LATER = 12 * 3600e3;            // « Plus tard » sur la bannière « Confirme ton e-mail » : elle revient 12 h après
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || ''));
const SITE_URL = () => location.origin + location.pathname.replace(/index\.html$/, '');
const maskEmail = e => { const m = String(e || '').match(/^(.{1,2})[^@]*(@.+)$/); return m ? m[1] + '•••' + m[2] : ''; };
const uiErr = m => Object.assign(new Error(m), { ui: true });
async function authReq(path, body, token, method) {
  const h = { 'Content-Type': 'application/json', apikey: CFG.key };
  if (token) h.Authorization = 'Bearer ' + token; else if (!/^sb_/.test(CFG.key)) h.Authorization = 'Bearer ' + CFG.key;
  let r;
  try { r = await netFetch(CFG.url.replace(/\/+$/, '') + '/auth/v1/' + path, { method: method || 'POST', headers: h, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { const er = new Error('pas de réseau'); er.offline = true; throw er; }
  const txt = await r.text().catch(() => '');
  let j = {}; try { j = txt ? JSON.parse(txt) : {}; } catch (e) {}
  if (!r.ok) {
    const er = new Error(String(j.msg || j.error_description || j.message || ('auth ' + r.status)));
    er.status = r.status; er.code = String(j.error_code || j.code || j.error || ''); throw er;
  }
  return j;
}
const redirectQ = () => '?redirect_to=' + encodeURIComponent(SITE_URL());
const authSignup = (email, password, pseudo) => authReq('signup' + redirectQ(), { email, password, data: { pseudo } });
const authPassword = (email, password) => authReq('token?grant_type=password', { email, password });
const authRecover = email => authReq('recover' + redirectQ(), { email });
const authResend = email => authReq('resend' + redirectQ(), { type: 'signup', email });
const authUser = token => authReq('user', null, token, 'GET');
const authSetPassword = (token, password) => authReq('user', { password }, token, 'PUT');
const authExists = e => /user_already_exists|email_exists/.test(e.code) || /already (been )?registered|already exists/i.test(e.message);
// messages clairs en français pour chaque refus du serveur d'authentification
function authMsg(e, ctx) {
  const c = e.code || '', m = e.message || '';
  if (e.offline) return 'Pas de connexion internet : réessaie dans un instant.';
  if (/over_email_send_rate_limit/.test(c) || (e.status === 429 && /email/i.test(m))) return 'Trop d’e-mails envoyés : attends quelques minutes avant d’en redemander un.';
  if (e.status === 429 || /over_request_rate_limit|rate.?limit/i.test(c + m)) return 'Trop d’essais : attends quelques minutes avant de réessayer.';
  if (/email_not_confirmed/.test(c) || /not confirmed/i.test(m)) return 'Ton e-mail n’est pas encore confirmé : clique sur le lien reçu (regarde aussi les spams).';
  if (/invalid_credentials/.test(c) || /invalid login credentials/i.test(m) || (/^login/.test(ctx || '') && /invalid_grant/.test(c))) return ctx === 'login-pseudo' ? 'Mot de passe incorrect.' : 'E-mail ou mot de passe incorrect.';
  if (authExists(e)) return 'Cet e-mail a déjà un compte : choisis « J’ai déjà un compte ».';
  if (/same_password/.test(c) || /different from the old/i.test(m)) return 'C’est déjà ton mot de passe : choisis-en un nouveau.';
  if (/weak_password/.test(c) || /password should be/i.test(m)) return 'Mot de passe trop faible : au moins 6 caractères, et évite les trop simples (123456…).';
  if (/email_address_invalid|email_address_not_authorized/.test(c) || /invalid.*email|email.*invalid/i.test(m)) return 'Cette adresse e-mail n’est pas acceptée : vérifie-la.';
  if (/signup_disabled|email_provider_disabled/.test(c) || /signups not allowed|disabled/i.test(m)) return 'Les comptes ne sont pas encore ouverts sur le serveur. Réessaie plus tard.';
  if (/session_not_found|session_expired|bad_jwt|otp_expired|refresh_token/.test(c) || e.status === 401 || e.status === 403) return 'La connexion a expiré : recommence.';
  if (e.status >= 500) return 'Le serveur des comptes ne répond pas (' + e.status + ') : réessaie dans un moment.';
  return 'Ça n’a pas marché (' + (c || e.status || '?') + ') : réessaie.';
}
// refus de claim_name (rattacher le pseudo au compte)
function claimMsg(e, n) {
  const m = String(e && e.message || '');
  if (e && e.offline) return 'Pas de connexion internet : réessaie dans un instant.';
  if (/pseudo deja protege/.test(m)) return n + ' est déjà protégé par un autre compte : choisis un autre pseudo.';
  if (/trop de joueurs/.test(m)) return 'Ce compte a déjà 20 joueurs : c’est le maximum.';
  if (/nom trop court/.test(m)) return 'Le pseudo doit faire au moins 2 lettres.';
  return 'Le serveur n’a pas pu protéger ' + n + ' : réessaie.';
}
// e-mail tapé, ou e-mail du compte d'un pseudo : le serveur ne le donne qu'avec le BON mot de passe du compte (login_name, jamais affiché)
async function acctEmailOf(idf, pass) {
  idf = String(idf || '').trim();
  if (idf.includes('@')) { if (!validEmail(idf)) throw uiErr("Cette adresse e-mail n'est pas valide."); return { email: idf, name: '' }; }
  const n = cleanName(idf); if (n.length < 2) throw uiErr('Tape ton e-mail ou ton pseudo.');
  let e;
  try { e = await rpc('login_name', { p_code: CODE(), p_name: n, p_password: String(pass || '') }, { anon: true, quiet: true }); }
  catch (x) { throw uiErr(/trop d essais/.test(x.message) ? 'Trop d’essais avec ce pseudo : attends quelques minutes.' : x.offline ? 'Pas de connexion internet : réessaie dans un instant.' : 'Le serveur ne répond pas comme prévu : réessaie.'); }
  if (!e) throw Object.assign(uiErr('Pseudo ou mot de passe incorrect (ou ' + n + ' n’a pas de compte). Tu peux aussi te connecter avec ton e-mail.'), { nouser: true, name: n });
  return { email: e, name: n };
}
async function acctLogin(idf, pass) {
  const who = await acctEmailOf(idf, pass);
  try { return { s: await authPassword(who.email, pass), name: who.name }; }
  catch (e) { throw uiErr(authMsg(e, who.name ? 'login-pseudo' : 'login')); }
}
const sessOf = uid => (uid && ACCT.s[uid]) || null;
const liveUid = uid => !!(sessOf(uid) && sessOf(uid).rt);
const acctObjs = () => [profile, adding, ...profiles].filter(Boolean);
const acctLive = pr => !!(pr && pr.acct && liveUid(pr.acct.uid));
function acctFor(name) {
  const n = cleanName(name); if (!n) return null;
  return acctObjs().find(p => p.name && cleanName(p.name) === n && acctLive(p)) || null;
}
// comptes connectés sur l'appareil, et leur nom affiché (« PATOU, LOUIS » : jamais l'e-mail en entier)
function acctUids() { const u = []; for (const p of acctObjs()) if (p.name && acctLive(p) && !u.includes(p.acct.uid)) u.push(p.acct.uid); for (const k in ACCT.s) if (liveUid(k) && !u.includes(k) && ACCT.s[k].bare) u.push(k); return u; }
function acctLabel(uid) {
  const names = [...new Set(acctObjs().filter(p => p.name && p.acct && p.acct.uid === uid).map(p => cleanName(p.name)))];
  return names.length ? names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : '') : 'ton compte (' + maskEmail((sessOf(uid) || {}).email) + ')';
}
function acctStoreProfiles() { if (profile.name) store.set('jdw.profile', profile); store.set('jdw.profiles', profiles); }
// range l'état du compte d'un profil partout où il est gardé (profil actuel, liste des profils)
function acctPut(pid, acct) {
  for (const p of acctObjs()) if (p.pid === pid) { if (acct) p.acct = acct; else delete p.acct; if (acct && acct.uid) delete p.acctNever; }
  acctStoreProfiles();
}
function acctSetSess(s) {
  const u = s.user || {}, uid = u.id, old = ACCT.s[uid] || {};
  ACCT.s[uid] = { email: u.email || old.email || '', at: s.access_token, rt: s.refresh_token, exp: Date.now() + (+s.expires_in || 3600) * 1000 };
  store.set('jdw.accts', ACCT.s);
  rtToken(uid, s.access_token);
  return uid;
}
function acctState(pr) {
  if (!ONLINE || !ACCT.ready || !pr || !pr.name) return 'off';
  const a = pr.acct;
  if (a && a.uid) return liveUid(a.uid) ? 'on' : 'need';
  if (a && a.need) return 'need';
  if (a && a.pending) return 'pending';
  return pr.acctNever ? 'local' : 'none';
}
async function tokenFor(uid) {
  let s = sessOf(uid); if (!s || !s.rt) return '';
  if (!s.at || s.exp - Date.now() < 60e3) { await acctRefresh(uid).catch(() => {}); s = sessOf(uid) || {}; }
  return s.at || '';
}
const acctToken = pr => pr && pr.acct && pr.acct.uid ? tokenFor(pr.acct.uid) : Promise.resolve('');
// nouveau jeton avant expiration (une seule demande à la fois par compte) ; refus = session perdue, il faudra se reconnecter
function acctRefresh(uid, force) {
  const a = sessOf(uid);
  if (!a || !a.rt) return Promise.resolve(false);
  if (ACCT.busy[uid]) return ACCT.busy[uid];
  if (!force && a.at && a.exp - Date.now() > 5 * 60e3) return Promise.resolve(true);
  return (ACCT.busy[uid] = (async () => {
    try { const s = await authReq('token?grant_type=refresh_token', { refresh_token: a.rt }); if (!s.user) s.user = { id: uid, email: a.email }; acctSetSess(s); return true; }
    catch (e) {
      if (!e.offline && e.status >= 400 && e.status < 500 && e.status !== 429) {
        ACCT.s[uid] = { email: a.email, lost: true }; store.set('jdw.accts', ACCT.s); acctUi();
        if (profile.acct && profile.acct.uid === uid) setTimeout(acctGate, 300);
      }
      return false;
    } finally { delete ACCT.busy[uid]; }
  })());
}
function acctTick() { if (ACCT.netFail) acctProbe().then(acctCheckMine); for (const k in ACCT.s) { const a = ACCT.s[k]; if (a && a.rt && a.exp - Date.now() < 5 * 60e3) acctRefresh(k); } }
// le serveur a répondu « compte requis » pour ce pseudo : il faut se connecter (passage obligatoire)
function acctNeed(name) {
  const n = cleanName(name); if (!n || !ACCT.ready) return;
  let hit = false;
  for (const p of acctObjs()) if (p.name && cleanName(p.name) === n && !acctLive(p)) { if (!(p.acct && p.acct.uid)) p.acct = { need: true }; hit = true; }
  if (!hit) return;
  acctStoreProfiles(); acctUi();
  if (cleanName(profile.name) === n) setTimeout(acctGate, 300);
}
// passage obligatoire : un joueur sans compte (ou dont le pseudo est protégé ailleurs) doit protéger / confirmer son pseudo ou se
// connecter avant de continuer. Exception : profil gardé « sur cet appareil » (acctNever). En pleine partie : ce sera au retour.
function acctGate() {
  clearTimeout(ACCT.gateT); ACCT.gateT = 0;
  const st = acctState(profile);
  if (st !== 'none' && st !== 'need') { if (AS.locked && !$('jdw-acct').hidden) { AS.locked = false; closeSheet('jdw-acct'); } return; }
  if (!$('jdw-acct').hidden || !$('jdw-welcome').hidden) return;
  if (!ACCT.probed || ACCT.netFail || netDown) return;      // pas de réseau : on ne bloque personne, on redemandera
  const busy = ['jdw-play', 'jdw-duo', 'jdw-net', 'jdw-watch', 'jdw-profiles', 'jdw-photo', 'jdw-cri', 'jdw-settings', 'jdw-podium'].some(id => $(id) && !$(id).hidden);
  if (busy) { ACCT.gateT = setTimeout(acctGate, 3000); return; }
  openAcct(st === 'need' ? 'connect' : 'protect', { locked: true });
}
// au démarrage et à chaque changement de joueur : ce pseudo est-il protégé sans que l'appareil soit connecté ?
async function acctCheckMine() {
  if (!ACCT.ready || !profile.name) return;
  const st = acctState(profile);
  if (st === 'on') { acctRefresh(profile.acct.uid); return; }
  if (st === 'none' || st === 'need' && !(profile.acct && profile.acct.uid)) {
    try {
      const r = (await rpc('check_name', { p_code: CODE(), p_name: profile.name }, { anon: true, quiet: true }) || [])[0];
      if (r && r.r_protected) acctNeed(profile.name);
      else if (r && profile.acct && profile.acct.need) { acctPut(profile.pid, null); acctUi(); }   // plus protégé (libéré) : on repart de zéro
    } catch (e) {}
  }
  acctGate();
}
// le serveur connaît-il les comptes ? (get_my_players sans connexion : liste vide ; 404 = accounts.sql pas encore lancé)
async function acctProbe() {
  if (!ONLINE) return;
  ACCT.netFail = false;
  try { await rpc('get_my_players', { p_code: CODE() }, { anon: true, quiet404: true, quiet: true }); ACCT.ready = true; }
  catch (e) { if (e.status === 404) ACCT.ready = false; else if (e.offline) ACCT.netFail = true; }
  ACCT.probed = true; store.set('jdw.acctok', ACCT.ready);
  acctUi();
}
// après une connexion : le joueur du compte qui arrive sur l'appareil (pseudo, tête, cri ; rien n'est écrasé sur le serveur)
// ctx.name : le joueur voulu ; ctx.claim : le rattacher au compte s'il n'y est pas encore. Renvoie { name, me } | { pick } | { nopseudo } | { err }
async function acctAdopt(s, ctx) {
  ctx = ctx || {};
  const tok = s.access_token;
  if (!s.user) { try { s.user = await authUser(tok); } catch (e) { return { err: authMsg(e) }; } }
  let rows;
  try { rows = await rpc('get_my_players', { p_code: CODE() }, { token: tok }) || []; }
  catch (e) { return { err: e.offline ? 'Pas de connexion internet : réessaie dans un instant.' : 'Le serveur ne répond pas comme prévu : réessaie.' }; }
  const want = cleanName(ctx.name || '');
  let me = want ? rows.find(r => cleanName(r.r_name) === want) || null : null;
  if (want && !me) {
    if (!ctx.claim) return { err: want + ' n’est pas sur ce compte.' };
    try { await rpc('claim_name', { p_code: CODE(), p_name: want }, { token: tok }); }
    catch (e) { return { err: claimMsg(e, want) }; }
    me = { r_name: want, r_photo: null, r_consent: false, r_sound: null }; rows.push(me);
  }
  if (!me) {
    if (rows.length === 1) me = rows[0];
    else if (rows.length > 1) return { pick: rows };
    else {
      const meta = cleanName(s.user.user_metadata && s.user.user_metadata.pseudo || '');
      if (!meta) return { nopseudo: true };
      try { await rpc('claim_name', { p_code: CODE(), p_name: meta }, { token: tok }); }
      catch (e) { return { nopseudo: true, err: claimMsg(e, meta) }; }
      me = { r_name: meta, r_photo: null, r_consent: false, r_sound: null };
    }
  }
  return { name: cleanName(me.r_name), me };
}
// le joueur connecté devient le joueur de l'appareil (profil existant complété, ou nouveau profil rempli depuis le serveur)
function acctUse(res, s, uidIn) {
  const uid = s ? acctSetSess(s) : uidIn, me = res.me, n = res.name;
  let pr = acctObjs().find(p => p.name && cleanName(p.name) === n) || null;
  if (pr && pr.pid !== profile.pid) pr = profiles.find(p => p.pid === pr.pid) || pr;
  let push = false;
  if (pr) {
    if (me && me.r_photo) { if (pr.photo !== me.r_photo) { pr.photo = me.r_photo; pr.photoBase = null; pr.photoAcc = null; } pr.consent = true; }
    else if (pr.photo && pr.consent) push = true;                // la tête de l'appareil part sur le serveur (il n'en avait pas)
    if (me && me.r_sound) pr.sound = me.r_sound; else if (pr.sound) push = true;
  } else {
    pr = Object.assign(blankProfile(), { name: n, askedFor: n, photo: (me && me.r_photo) || null, consent: !!(me && me.r_photo) });
    if (me && me.r_sound) pr.sound = me.r_sound;
  }
  pr.acct = { uid }; delete pr.acctNever;
  WEL.pick = null;
  if (!$('jdw-welcome').hidden) { adding = null; closeSheet('jdw-welcome'); }
  if (!$('jdw-profiles').hidden) closeSheet('jdw-profiles');
  profile = pr; saveProfile(); acctPut(pr.pid, { uid });
  players.delete(n); bests[n] = bests[n] || {};
  syncOwnPlayer(); refreshAll(); refreshBell();
  maybeAskJoin(); heartbeat(); loadNotifs(); refreshChatBtn(); if (chat.open) renderChat(false); rtTrack();
  if (push) pushProfile(); else poke('players');
  flushUnsent(); acctUi(); afterOnboarding();
  return pr;
}
// d'autres joueurs de l'appareil (sans compte) rejoignent le compte (« ajouter aussi LOUIS et LÉONIE à mon compte ? »)
async function acctClaimOthers(pids, tok, uid) {
  const bad = [];
  for (const pid of pids) {
    const p = profiles.find(x => x.pid === pid); if (!p || !p.name) continue;
    try { await rpc('claim_name', { p_code: CODE(), p_name: p.name }, { token: tok }); acctPut(pid, { uid }); }
    catch (e) { bad.push(cleanName(p.name)); }
  }
  if (bad.length) setTimeout(() => toastCheer(bad.join(', ') + ' : déjà protégé ailleurs, à régler en passant sur ce joueur.', profile.name, true), 2900);
}
// lien reçu par e-mail : #access_token=…&refresh_token=…&type=recovery|signup… (ou #error=…)
async function acctArrive(h) {
  if (h.err) { openAcct('connect-any', { msg: /expired|invalid/i.test(h.errCode + h.err) ? 'Ce lien a expiré ou a déjà servi : redemande un e-mail.' : 'Le lien n’a pas marché : ' + h.err, cls: 'err' }); return; }
  const s = { access_token: h.at, refresh_token: h.rt, expires_in: h.exp || 3600 };
  try { s.user = await authUser(h.at); } catch (e) { openAcct('forgot', { msg: 'Ce lien a expiré ou a déjà servi : redemande un e-mail.', cls: 'err' }); return; }
  if (h.type === 'recovery') { AS.sess = s; openAcct('newpass'); return; }
  const res = await acctAdopt(s, {});
  acctAfterAdopt(res, s, 'E-mail confirmé ! Choisis ton pseudo.', p => toastCheer('✓ E-mail confirmé : bienvenue ' + p.name + ' 🔒', p.name, true));
}
// suite commune après une connexion sans joueur précis (lien reçu, nouveau mot de passe)
function acctAfterAdopt(res, s, nopseudoMsg, done) {
  if (res.pick) { welPick(s, res.pick); return; }
  if (res.nopseudo) {
    const uid = acctSetSess(s); ACCT.s[uid].bare = true; store.set('jdw.accts', ACCT.s);
    if (profile.name) { adding = profile; profile = blankProfile(); }
    startWelcome(); WEL.uid = uid; welAcctUi(); welMsg(res.err || nopseudoMsg, res.err ? 'err' : 'ok'); return;
  }
  if (res.err) { openAcct('connect-any', { msg: res.err, cls: 'err' }); return; }
  done(acctUse(res, s));
}
const ACCT_HASH = (() => {                 // lu tout de suite au chargement, puis retiré de l'adresse
  const hs = String(location.hash || '');
  if (!/access_token=|error_description=|error_code=/.test(hs)) return null;
  const P = new URLSearchParams(hs.slice(1));
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  return { at: P.get('access_token') || '', rt: P.get('refresh_token') || '', exp: +P.get('expires_in') || 3600, type: P.get('type') || '',
    err: P.get('error_description') || (P.get('error') && !P.get('access_token') ? P.get('error') : ''), errCode: P.get('error_code') || '' };
})();
async function acctStart() {
  if (!ONLINE) return;
  await acctProbe();
  if (ACCT_HASH && ACCT.ready) await acctArrive(ACCT_HASH);
  else acctCheckMine();
  setInterval(acctTick, 60e3); setInterval(() => { if (!ACCT.gateT) acctGate(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) acctTick(); });
}

/* ---- bannière d'accueil + réglages + « Joueurs de mon compte » ---- */
function acctUi() {
  acctBar(); guestSync();
  if (!$('jdw-welcome').hidden) welAcctUi();
  if (!$('jdw-settings').hidden) renderAcctSet();
}
function acctBar() {
  const bar = $('jdw-acctbar'), st = acctState(profile);
  const later = (store.get('jdw.acctlater', {}) || {})[profile.pid] || 0;
  const show = st === 'pending' && Date.now() - later > ACCT_LATER;
  bar.hidden = !show; if (!show) return;
  bar.dataset.state = st;
  const a = profile.acct || {};
  $('jdw-acctbar-ic').textContent = '📧'; $('jdw-acctbar-t').textContent = 'Confirme ton e-mail';
  $('jdw-acctbar-s').textContent = 'Clique sur le lien reçu' + (a.email ? ' à ' + maskEmail(a.email) : '') + ', puis touche ici'; $('jdw-acctbar-cta').textContent = "J'ai confirmé";
}
$('jdw-acctbar-go').addEventListener('click', () => { const st = acctState(profile); openAcct(st === 'need' ? 'connect' : st === 'pending' ? 'confirm' : 'protect', { locked: st !== 'pending' }); });
$('jdw-acctbar-x').addEventListener('click', () => {
  const l = store.get('jdw.acctlater', {}) || {}; l[profile.pid] = Date.now(); store.set('jdw.acctlater', l); acctBar();
  toastCheer('D’accord : pense à cliquer sur le lien reçu par e-mail.', profile.name, true);
});
function renderAcctSet() {
  const st = acctState(profile), a = profile.acct || {}, box = $('jdw-set-acct'), se = sessOf(a.uid) || {};
  const linked = !!(a.uid && st !== 'off');
  $('jdw-set-name').readOnly = linked; $('jdw-set-name-hint').hidden = !linked; nameDirty();
  $('jdw-set-name-help').textContent = linked ? '🔒 Ton pseudo est lié à ton compte : il ne change plus.' : 'Ton pseudo se change ici, puis « Enregistrer ».';
  box.hidden = st === 'off'; if (st === 'off') return;
  const others = a.uid ? acctObjs().filter(p => p.name && p.acct && p.acct.uid === a.uid && p.pid !== profile.pid).map(p => cleanName(p.name)) : [];
  const T = { on: ['🔒', 'Compte protégé', maskEmail(se.email) + (others.length ? ' · aussi ' + [...new Set(others)].join(', ') : '')],
    pending: ['📧', 'E-mail à confirmer', a.email ? 'Lien envoyé à ' + maskEmail(a.email) : ''],
    need: ['🔑', se.lost ? 'Reconnecte-toi' : 'Ce pseudo a un compte', se.lost ? 'La connexion a expiré sur cet appareil.' : 'Connecte-toi pour jouer sous ce nom.'],
    local: ['🧒', 'Sans compte', 'Joueur de cet appareil seulement : son pseudo n’est pas protégé.'],
    none: ['🔓', 'Pseudo pas encore protégé', "N'importe qui peut jouer sous ce nom."] }[st];
  box.dataset.state = st;
  $('jdw-set-acct-ic').textContent = T[0]; $('jdw-set-acct-t').textContent = T[1];
  // visible : l'e-mail (masqué) ; les explications vont derrière « ? »
  $('jdw-set-acct-s').textContent = st === 'on' || st === 'pending' ? T[2] || '' : '';
  $('jdw-set-acct-help').textContent = st === 'on' ? 'Ton compte protège ton pseudo : personne d’autre ne peut jouer sous ce nom, et tu le retrouves sur n’importe quel appareil.'
    : st === 'pending' ? 'Clique sur le lien reçu par e-mail (regarde aussi les spams), puis « J’ai confirmé ».' : T[2] || '';
  const btns = $('jdw-set-acct-btns'); btns.textContent = '';
  const B = (t, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm ' + (cls || 'btn-ghost'); b.textContent = t; b.addEventListener('click', () => fn(b)); btns.appendChild(b); return b; };
  if (st === 'on') {
    B('🔑 Changer mon mot de passe', () => openAcct('change'));
    B('🚪 Se déconnecter de cet appareil', b => {
      const names = [...new Set(acctObjs().filter(p => p.name && p.acct && p.acct.uid === a.uid).map(p => cleanName(p.name)))];
      if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'Sûr ? ' + names.join(', ') + (names.length > 1 ? ' quitteront' : ' quittera') + ' cet appareil'; return; }
      acctLogout();
    }, 'btn-ghost acct-out');
  } else if (st === 'pending') { B("J'ai confirmé : me connecter", () => openAcct('confirm'), 'btn-play'); B("Renvoyer l'e-mail", () => openAcct('confirm', { resend: true })); }
  else if (st === 'need') B('🔑 Me connecter', () => openAcct('connect'), 'btn-play');
  else B('🔒 Protéger mon pseudo', () => openAcct('protect'), 'btn-play');
}
// se déconnecter : le compte et tous ses joueurs quittent l'appareil
async function acctLogout() {
  const uid = profile.acct && profile.acct.uid; if (!uid) return;
  const se = sessOf(uid) || {};
  if (se.at) authReq('logout?scope=local', null, se.at).catch(() => {});
  const gone = [...new Set(profiles.filter(p => p.acct && p.acct.uid === uid).map(p => cleanName(p.name)))];
  delete ACCT.s[uid]; store.set('jdw.accts', ACCT.s);
  profiles = profiles.filter(p => !(p.acct && p.acct.uid === uid)); store.set('jdw.profiles', profiles);
  closeSheet('jdw-settings');
  if (profiles.length) switchProfile(profiles[0].pid);
  else { profile = blankProfile(); store.set('jdw.profile', profile); syncOwnPlayer(); refreshAll(); }
  setTimeout(() => toastCheer(gone.join(', ') + (gone.length > 1 ? ' sont déconnectés' : ' est déconnecté') + ' de cet appareil.', profile.name || gone[0], true), 50);
  acctUi();
}
// « Qui joue ? » : les autres joueurs des comptes connectés, à ajouter sur l'appareil
async function acctProfList() {
  const box = $('jdw-prof-acct'); box.textContent = ''; box.hidden = true;
  const uids = ONLINE && ACCT.ready ? acctUids() : [];
  for (const uid of uids) {
    let rows = [];
    try { rows = await rpc('get_my_players', { p_code: CODE() }, { token: await tokenFor(uid), quiet: true }) || []; } catch (e) { continue; }
    rows = rows.filter(r => !profiles.some(p => cleanName(p.name) === cleanName(r.r_name)));
    if (!rows.length) continue;
    const h = document.createElement('p'); h.className = 'eyebrow'; h.textContent = uids.length > 1 ? 'Compte de ' + acctLabel(uid) : 'Joueurs de mon compte';
    box.appendChild(h);
    for (const r of rows) {
      const n = cleanName(r.r_name), b = document.createElement('button'); b.type = 'button'; b.className = 'acct-player';
      const av = document.createElement('span'); av.className = 'avatar'; photoInto(av, r.r_photo, n);
      const tx = document.createElement('span'); tx.className = 'acct-player-tx'; const t = document.createElement('b'); t.textContent = n; const sm = document.createElement('small'); sm.textContent = 'Ajouter sur cet appareil';
      tx.append(t, sm); b.append(av, tx);
      b.addEventListener('click', () => { const pr = acctUse({ name: n, me: r }, null, uid); toastCheer('Salut ' + pr.name + ' ! À toi de jouer.', pr.name, true); });
      box.appendChild(b);
    }
    box.hidden = false;
  }
}

/* ---- fenêtre du compte : protéger, se connecter, confirmer, mot de passe oublié / nouveau / changer ---- */
const AS = { mode: '', pid: '', name: '', sess: null, busy: false, locked: false, signed: null, uid: '', others: [] };
function acctMsg(t, cls) { const el = $('jdw-acct-msg'); el.textContent = t || ''; el.className = 'acct-msg' + (cls ? ' ' + cls : ''); el.hidden = !t; }
function openAcct(mode, o) {
  o = o || {};
  const N = profile.name, a = profile.acct || {};
  if (AS.pid !== profile.pid) AS.signed = null;            // compte créé dans cette fenêtre (pseudo pas encore lié) : gardé pour réessayer
  Object.assign(AS, { mode, pid: profile.pid, name: N, busy: false, locked: !!o.locked });
  const lead = $('jdw-acct-lead'); lead.textContent = '';
  const Bo = t => { const b = document.createElement('b'); b.textContent = t; return b; };
  // [icône, sur-titre, titre, phrase essentielle (visible), champ e-mail, mot de passe, bouton, fermer, explication (derrière « ? »)]
  const C = {
    protect: ['🔒', 'Nouveau : les comptes', 'Protège ton pseudo', ['Personne d’autre ne pourra jouer sous ton pseudo.'], 'email', 'new', 'Protéger mon pseudo', 'Plus tard', 'Pour continuer à jouer, mets ton joueur sur un compte (e-mail + mot de passe) : personne d’autre ne pourra jouer sous ton pseudo, et tu le retrouveras sur n’importe quel appareil. Un compte peut avoir plusieurs joueurs.'],
    'connect-mine': ['🔑', N, 'Connecte-toi', [Bo(N), ' sera ajouté à ton compte.'], 'idf', 'cur', 'Me connecter', 'Plus tard', 'Connecte-toi à ton compte avec ton e-mail ou un de tes pseudos : ' + N + ' y sera ajouté et protégé.'],
    connect: ['🔑', N, 'Connecte-toi', [Bo(N), ' est protégé par un compte. C’est toi ?'], 'idf', 'cur', 'Me connecter', 'Plus tard', 'Tape le mot de passe du compte. Si ce n’est pas toi, choisis un autre pseudo.'],
    'connect-any': ['🔑', 'Mon compte', 'Connecte-toi', [], 'idf', 'cur', 'Me connecter', 'Fermer', 'Connecte-toi avec ton e-mail ou ton pseudo, et le mot de passe du compte.'],
    confirm: ['📧', 'Presque fini', 'Confirme ton e-mail', ['Lien envoyé à ', Bo(maskEmail(a.email) || 'ton adresse'), '.'], '', 'cur', "J'ai confirmé : me connecter", 'Plus tard', 'Ouvre le lien reçu par e-mail (regarde aussi les spams) pour activer ton compte, puis reviens ici et tape ton mot de passe.'],
    forgot: ['✉️', 'Mot de passe oublié', 'Pas de panique', ['On t’envoie un lien par e-mail.'], 'idf', null, 'Envoyer le lien', 'Fermer', 'Tape ton e-mail ou ton pseudo : on envoie un lien à l’adresse du compte pour choisir un nouveau mot de passe.'],
    newpass: ['🔑', AS.sess && AS.sess.user ? maskEmail(AS.sess.user.email) : 'Mon compte', 'Choisis ton nouveau mot de passe', [], '', 'new', 'Enregistrer', 'Annuler', 'Au moins 6 caractères. Il sert pour tous les joueurs du compte, sur tous tes appareils.'],
    change: ['🔑', maskEmail((sessOf(a.uid) || {}).email) || 'Mon compte', 'Changer mon mot de passe', [], '', 'new', 'Changer', 'Annuler', 'Au moins 6 caractères. Le mot de passe sert pour tous les joueurs du compte.']
  }[mode];
  if (!C) return;
  $('jdw-acct-ic').textContent = C[0]; $('jdw-acct-eyebrow').textContent = C[1]; $('jdw-acct-h').textContent = C[2];
  lead.append(...C[3]); lead.hidden = !C[3].length;
  $('jdw-acct-help-t').textContent = C[8] || ''; $('jdw-acct-help').hidden = !C[8];
  // choix du compte (protéger avec un compte déjà connecté sur l'appareil)
  AS.uid = mode === 'protect' ? (o.uid !== undefined ? o.uid : acctUids()[0] || '') : '';
  const em = $('jdw-acct-email'), pw = $('jdw-acct-pass');
  em.dataset.kind = C[4];
  em.type = C[4] === 'email' ? 'email' : 'text';
  em.placeholder = C[4] === 'idf' ? 'ton@email.fr ou TON PSEUDO' : 'ton@email.fr';
  em.setAttribute('aria-label', C[4] === 'idf' ? 'E-mail ou pseudo' : 'E-mail');
  em.value = o.email !== undefined ? o.email : C[4] === 'idf' && N && mode !== 'connect-any' ? N : '';
  $('jdw-acct-pw').dataset.kind = C[5] || '';
  pw.value = '';
  pw.autocomplete = C[5] === 'new' ? 'new-password' : 'current-password';
  pw.placeholder = C[5] === 'new' ? (mode === 'protect' ? 'Mot de passe (6 caractères min.)' : 'Nouveau mot de passe (6 car. min.)') : 'Mot de passe du compte';
  $('jdw-acct-ok').textContent = C[6]; $('jdw-acct-ok').disabled = false; $('jdw-acct-close').textContent = C[7];
  $('jdw-acct-close').hidden = AS.locked; $('jdw-acct').classList.toggle('locked', AS.locked);
  $('jdw-acct-namebox').hidden = mode !== 'protect';
  $('jdw-acct-name').value = o.name !== undefined ? o.name : N;
  $('jdw-acct-name-s').textContent = o.name === '' ? 'Choisis un autre pseudo.' : 'C’est bien ton pseudo ? Tu peux encore le changer.';
  // les autres joueurs de l'appareil sans compte : à ajouter au même compte
  AS.others = mode === 'protect' || mode === 'connect-mine' ? profiles.filter(p => p.name && p.pid !== profile.pid && ['none', 'local'].includes(acctState(p))).map(p => p.pid) : [];
  acctSheetUi();
  const L = $('jdw-acct-links'); L.textContent = '';
  const link = (t, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'link-btn'; b.textContent = t; b.addEventListener('click', () => fn(b)); L.appendChild(b); };
  if (mode === 'protect') {
    link('J’ai déjà un compte : me connecter', () => openAcct('connect-mine', { locked: AS.locked }));
    link('Plus tard : jouer en invité (sans salle ni score enregistré)', b => {
      if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'Sûr ? ' + N + ' jouera en invité : pas de salle, scores non enregistrés (touche encore pour confirmer)'; return; }
      for (const p of acctObjs()) if (p.pid === AS.pid) p.acctNever = true; saveProfile(); AS.locked = false; closeSheet('jdw-acct'); acctUi(); toastCheer(N + ' joue en invité sur cet appareil.', N, true);
    });
  }
  if (mode === 'connect') link('Ce n’est pas moi : choisir un autre pseudo', () => openAcct('protect', { locked: AS.locked, name: '' }));
  if (/^connect|confirm/.test(mode)) link('Mot de passe oublié ?', () => openAcct('forgot', { email: mode === 'confirm' ? '' : em.value.trim() }));
  if (mode === 'confirm') { link('Renvoyer l’e-mail', acctResend); link('Changer d’adresse e-mail', () => openAcct('protect', { uid: '' })); }
  if (AS.locked) link('Changer de joueur', () => { AS.locked = false; closeSheet('jdw-acct'); openProfiles(); });
  acctMsg(o.msg || '', o.cls || 'info');
  $('jdw-acct').hidden = false;
  if (!$('jdw-settings').hidden && mode !== 'change') closeSheet('jdw-settings');
  setTimeout(() => { const f = mode === 'protect' && o.name === '' ? $('jdw-acct-name') : !em.hidden && !em.value ? em : !$('jdw-acct-pw').hidden ? pw : $('jdw-acct-ok'); try { f.focus({ preventScroll: true }); } catch (e) {} }, 40);
  if (o.resend) acctResend();
}
// parties de la fenêtre qui dépendent du choix du compte et des autres joueurs
function acctSheetUi() {
  const mode = AS.mode, useUid = mode === 'protect' && !!AS.uid;
  acctChips($('jdw-acct-pick'), AS.uid, u => { AS.uid = u; acctMsg(''); acctSheetUi(); }, true);
  if (mode !== 'protect') $('jdw-acct-pick').hidden = true;
  $('jdw-acct-email').hidden = !$('jdw-acct-email').dataset.kind || useUid;
  $('jdw-acct-pw').hidden = !$('jdw-acct-pw').dataset.kind || useUid;
  const ob = $('jdw-acct-others'); ob.textContent = '';
  const list = AS.others.map(pid => profiles.find(p => p.pid === pid)).filter(Boolean);
  ob.hidden = !list.length; if (!list.length) return;
  const h = document.createElement('p'); h.className = 'acct-others-h'; h.textContent = 'Ajouter aussi à ce compte (même mot de passe) :'; ob.appendChild(h);
  const row = document.createElement('div'); row.className = 'acct-others-row'; ob.appendChild(row);
  for (const p of list) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'acct-other'; b.dataset.pid = p.pid;
    const av = document.createElement('span'); av.className = 'avatar'; photoInto(av, p.consent ? p.photo : null, p.name);
    const t = document.createElement('b'); t.textContent = cleanName(p.name);
    b.append(av, t); b.setAttribute('aria-pressed', 'true');
    b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')));
    row.appendChild(b);
  }
}
const acctOthersPicked = () => [...document.querySelectorAll('#jdw-acct-others .acct-other[aria-pressed="true"]')].map(b => b.dataset.pid);
async function acctResend() {
  const a = profile.acct || {}; if (!a.email) return;
  acctMsg('Envoi…', 'info');
  try { await authResend(a.email); acctMsg('C’est renvoyé à ' + maskEmail(a.email) + ' : regarde aussi les spams.', 'ok'); }
  catch (e) { acctMsg(authMsg(e), 'err'); }
}
function acctSetBusy(on, t) { AS.busy = on; const b = $('jdw-acct-ok'); b.disabled = on; if (on) { AS.label = b.textContent; b.textContent = t || '…'; } else if (AS.label) b.textContent = AS.label; }
// le profil visé par la fenêtre (celui qui l'a ouverte), même si on a changé de joueur entre-temps
const acctTarget = () => acctObjs().find(p => p.pid === AS.pid) || profile;
// le joueur visé est rattaché au compte (tête / cri du serveur repris s'il en a, sinon ceux de l'appareil partent sur le serveur)
function acctAttach(pr, uid, me) {
  acctPut(pr.pid, { uid });
  if (pr.pid !== profile.pid) return;
  if (me && me.r_photo && profile.photo !== me.r_photo) { profile.photo = me.r_photo; profile.consent = true; profile.photoBase = null; profile.photoAcc = null; saveProfile(); players.delete(cleanName(profile.name)); syncOwnPlayer(); refreshAll(); }
  if (me && me.r_sound && !profile.sound) { profile.sound = me.r_sound; saveProfile(); syncOwnPlayer(); }
  if ((!me || !me.r_photo) && profile.photo && profile.consent) pushProfile(); else poke('players');
  acctUi(); flushUnsent(); heartbeat();
}
async function acctOk() {
  if (AS.busy) return;
  const mode = AS.mode, idf = $('jdw-acct-email').value.trim(), pass = $('jdw-acct-pass').value, pr = acctTarget(), N = pr.name;
  const needEmail = !$('jdw-acct-email').hidden, needPass = !$('jdw-acct-pw').hidden, kind = $('jdw-acct-email').dataset.kind;
  if (needEmail && kind === 'email' && !validEmail(idf)) { acctMsg(idf ? "Cette adresse e-mail n'est pas valide." : 'Il faut ton e-mail.', 'err'); $('jdw-acct-email').focus(); return; }
  if (needEmail && kind === 'idf' && !idf) { acctMsg('Tape ton e-mail ou ton pseudo.', 'err'); $('jdw-acct-email').focus(); return; }
  if (needPass && $('jdw-acct-pw').dataset.kind === 'new' && pass.length < 6) { acctMsg('Le mot de passe doit faire au moins 6 caractères.', 'err'); $('jdw-acct-pass').focus(); return; }
  if (needPass && !pass) { acctMsg('Il faut le mot de passe du compte.', 'err'); $('jdw-acct-pass').focus(); return; }
  if (mode === 'forgot') {
    acctSetBusy(true, 'Envoi…');
    try {
      if (!idf.includes('@')) {        // pseudo : le serveur ne donne que l'adresse masquée, on demande de la taper en entier
        const n = cleanName(idf); let hint = null;
        try { hint = await rpc('recover_hint', { p_code: CODE(), p_name: n }, { anon: true, quiet: true }); }
        catch (x) { throw uiErr(/trop d essais/.test(x.message) ? 'Trop d’essais avec ce pseudo : attends quelques minutes.' : 'Le serveur ne répond pas comme prévu : réessaie.'); }
        if (!hint) throw uiErr(n + ' n’a pas de compte. Vérifie le pseudo, ou tape ton e-mail.');
        const em = $('jdw-acct-email'); em.value = ''; em.placeholder = hint;
        acctMsg('Le compte de ' + n + ' utilise l’adresse ' + hint + ' : tape-la en entier pour recevoir le lien.', 'info');
        acctSetBusy(false); em.focus(); return;
      }
      const who = await acctEmailOf(idf);
      await authRecover(who.email);
      acctMsg(who.name ? 'C’est envoyé ! Un e-mail part à l’adresse du compte de ' + who.name + ' (regarde aussi les spams).' : 'C’est envoyé ! Si un compte existe pour ' + idf + ', l’e-mail arrive dans une minute (regarde aussi les spams).', 'ok');
    } catch (e) { acctMsg(e.ui ? e.message : authMsg(e), 'err'); }
    acctSetBusy(false); return;
  }
  if (mode === 'change') {
    acctSetBusy(true, 'Un instant…');
    try {
      const tok = await acctToken(pr); if (!tok) throw Object.assign(new Error('session'), { status: 401 });
      await authSetPassword(tok, pass);
      acctSetBusy(false); closeSheet('jdw-acct'); toastCheer('🔑 Mot de passe changé !', N, true);
    } catch (e) { acctSetBusy(false); acctMsg(authMsg(e), 'err'); }
    return;
  }
  if (mode === 'newpass') {
    acctSetBusy(true, 'Enregistrement…');
    const s = AS.sess;
    try { await authSetPassword(s.access_token, pass); } catch (e) { acctSetBusy(false); acctMsg(authMsg(e), 'err'); return; }
    const res = await acctAdopt(s, {});
    acctSetBusy(false); closeSheet('jdw-acct'); AS.sess = null;
    acctAfterAdopt(res, s, 'Mot de passe changé ! Choisis ton pseudo.', p => toastCheer('🔑 Nouveau mot de passe enregistré !', p.name, true));
    return;
  }
  if (mode === 'protect') {
    const N2 = cleanName($('jdw-acct-name').value);
    if (N2.length < 2) { acctMsg(N2 ? 'Le pseudo doit faire au moins 2 lettres.' : 'Il faut un pseudo.', 'err'); $('jdw-acct-name').focus(); return; }
    if (N2 !== cleanName(N) && profiles.some(p => p.pid !== pr.pid && cleanName(p.name) === N2)) { acctMsg(N2 + ' est déjà un autre joueur de cet appareil.', 'err'); $('jdw-acct-name').focus(); return; }
    const others = acctOthersPicked();
    let tok = '', uid = AS.uid;
    if (uid) { acctSetBusy(true, 'Un instant…'); tok = await tokenFor(uid); if (!tok) { acctSetBusy(false); acctMsg('La connexion de ce compte a expiré : choisis « J’ai déjà un compte ».', 'err'); return; } }
    else if (AS.signed && AS.signed.email === idf) { acctSetBusy(true, 'Un instant…'); uid = AS.signed.uid; tok = await tokenFor(uid); }
    else {
      acctSetBusy(true, 'Vérification…');
      try { const ck = (await rpc('check_name', { p_code: CODE(), p_name: N2 }, { anon: true, quiet: true }) || [])[0]; if (ck && ck.r_protected) { acctSetBusy(false); acctMsg(N2 + ' est déjà protégé par un compte. C’est toi ? « J’ai déjà un compte ». Sinon, choisis un autre pseudo.', 'err'); $('jdw-acct-name').focus(); return; } } catch (e) {}
      acctSetBusy(false); acctSetBusy(true, 'Création du compte…');
      let r;
      try { r = await authSignup(idf, pass, N2); }
      catch (e) { acctSetBusy(false); if (authExists(e)) openAcct('connect-mine', { email: idf, locked: AS.locked, msg: 'Cet e-mail a déjà un compte : connecte-toi avec son mot de passe.' }); else acctMsg(authMsg(e), 'err'); return; }
      if (!r.access_token) {
        acctSetBusy(false);
        const ids = r.identities || (r.user && r.user.identities);
        if (Array.isArray(ids) && !ids.length) { openAcct('connect-mine', { email: idf, locked: AS.locked, msg: 'Cet e-mail a déjà un compte : connecte-toi avec son mot de passe.' }); return; }
        acctPut(pr.pid, { email: idf, pending: true });
        if (N2 !== cleanName(N) && pr.pid === profile.pid) await renameProfile(N2);
        AS.locked = false; acctUi(); openAcct('confirm');
        return;
      }
      uid = acctSetSess(r); tok = r.access_token; AS.signed = { email: idf, uid };
    }
    try { await rpc('claim_name', { p_code: CODE(), p_name: N2 }, { token: tok }); }
    catch (e) {
      acctSetBusy(false);
      acctMsg(/pseudo deja protege/.test(e.message) ? N2 + ' est déjà protégé par un autre compte. C’est toi ? « J’ai déjà un compte ». Sinon, choisis un autre pseudo ci-dessus.' : claimMsg(e, N2), 'err');
      $('jdw-acct-name').focus(); return;
    }
    acctSetBusy(false); AS.signed = null;
    acctPut(pr.pid, { uid });
    AS.locked = false; closeSheet('jdw-acct');
    if (N2 !== cleanName(N) && pr.pid === profile.pid) await renameProfile(N2); else pushProfile();
    await acctClaimOthers(others, tok, uid);
    acctUi(); flushUnsent();
    toastCheer('🔒 ' + N2 + ' est protégé !', N2, true);
    return;
  }
  // connect / connect-mine / connect-any / confirm : connexion (e-mail ou pseudo) + mot de passe
  acctSetBusy(true, 'Connexion…');
  let L;
  try { L = needEmail ? await acctLogin(idf, pass) : { s: await authPassword((pr.acct && pr.acct.email) || '', pass), name: '' }; }
  catch (e) { acctSetBusy(false); acctMsg(e.ui ? e.message : authMsg(e, 'login'), 'err'); return; }
  const s = L.s, others = acctOthersPicked();
  const res = mode === 'connect-any' ? await acctAdopt(s, { name: L.name }) : await acctAdopt(s, { name: N, claim: mode !== 'connect' });
  acctSetBusy(false);
  if (mode === 'connect-any') { closeSheet('jdw-acct'); acctAfterAdopt(res, s, 'Ton compte n’a pas encore de joueur : choisis ton pseudo.', p => toastCheer('Re-bonjour ' + p.name + ' !', p.name, true)); return; }
  if (res.err) { acctMsg(res.err, 'err'); return; }
  const uid = acctSetSess(s);
  AS.locked = false; closeSheet('jdw-acct');
  acctAttach(pr, uid, res.me);
  if (others.length) await acctClaimOthers(others, s.access_token, uid);
  toastCheer('✓ Connecté : ' + N + ' 🔒', N, true);
}
$('jdw-acct-ok').addEventListener('click', acctOk);
$('jdw-acct-pass').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); acctOk(); } });
$('jdw-acct-email').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if ($('jdw-acct-pw').hidden) acctOk(); else $('jdw-acct-pass').focus(); } });
$('jdw-acct-close').addEventListener('click', () => { if (AS.locked) return; closeSheet('jdw-acct'); AS.sess = null; setTimeout(acctGate, 300); });
$('jdw-acct-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('jdw-acct-email').focus(); } });
// œil : afficher / cacher le mot de passe
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.pw-eye'); if (!b) return;
  const i = $(b.dataset.for); if (!i) return;
  const show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.classList.toggle('on', show);
  b.setAttribute('aria-label', show ? 'Cacher le mot de passe' : 'Afficher le mot de passe');
});

/* ================= Photo : cadrage + détourage ================= */
const PH = { img: null, rot: 0, zoom: 1.4, ox: 0, oy: 0, mask: null, seg: undefined, busy: false, timer: 0 };
const CW = 600, CH = 750;                               // toile de cadrage (px internes)
const CROP = { w: 432, h: 540 }; CROP.x = (CW - CROP.w) / 2; CROP.y = 300 - CROP.h / 2 + 45;
const OUT_W = 160, OUT_H = 200;
function startPhoto() { const f = $('jdw-file'); f.value = ''; f.click(); }
$('jdw-file').addEventListener('change', async () => {
  const file = $('jdw-file').files && $('jdw-file').files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const im = new Image();
  im.onload = () => {
    PH.img = im; PH.rot = 0; PH.zoom = 1.4; PH.ox = 0; PH.oy = 0; PH.mask = null; PH.base = null; PH.geo = null; resetAcc();
    PH.srcData = shrinkPhoto(im); PH.accOnly = false; $('jdw-photo').classList.remove('acc-only');
    $('jdw-ph-zoom').value = '1.4'; $('jdw-ph-consent').checked = !!profile.consent; $('jdw-ph-ok').disabled = !profile.consent;
    if (!$('jdw-settings').hidden) $('jdw-settings').hidden = true;
    if (!$('jdw-welcome').hidden) { $('jdw-welcome').hidden = true; welReturn = true; }
    if (welReturn || (lookEdit != null && !(room && room.id === lookEdit))) lookEdit = null;
    photoTitle();
    openSheet('jdw-photo', 'jdw-ph-zoom');
    drawCrop(); scheduleOut();
  };
  im.onerror = () => { URL.revokeObjectURL(url); };
  im.src = url;
});
// photo d'origine réduite (gardée sur l'appareil seulement) : permet de recadrer et de changer d'accessoires sans reprendre de photo
function shrinkPhoto(im) {
  try {
    const M = 1000, k = Math.min(1, M / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.85);
  } catch (e) { return ''; }
}
const photoSrcKey = rid => 'jdw.photosrc.' + profile.pid + (rid != null ? '.r' + rid : '');
// « Modifier ma tête » : recadrer + accessoires (photo d'origine gardée) ; sinon accessoires seuls sur la tête actuelle
function editHead() {
  if (lookEdit != null && !(room && room.id === lookEdit)) lookEdit = null;
  const LK = lookEdit != null ? lookSlot(lookEdit) : profile;   // la tête de la salle, ou celle du profil principal
  const saved = store.get(photoSrcKey(lookEdit), null);
  photoTitle();
  $('jdw-ph-consent').checked = true; $('jdw-ph-ok').disabled = false;
  if (!$('jdw-settings').hidden) $('jdw-settings').hidden = true;
  Object.assign(ACC, ACCS.clean(LK.photoAcc), { tab: 'hat' });
  if (saved && saved.src) {
    const im = new Image();
    im.onload = () => {
      PH.img = im; PH.srcData = saved.src; PH.accOnly = false; $('jdw-photo').classList.remove('acc-only');
      const c = saved.crop || {}; PH.rot = c.rot || 0; PH.zoom = c.zoom || 1.4; PH.ox = c.ox || 0; PH.oy = c.oy || 0;
      PH.mask = null; PH.base = null; PH.geo = null; $('jdw-ph-zoom').value = String(PH.zoom);
      openSheet('jdw-photo', 'jdw-ph-zoom'); renderAcc(); drawCrop(); scheduleOut();
    };
    im.src = saved.src; return;
  }
  // photo prise avant cette version : on garde la tête telle quelle, on change seulement les accessoires
  const base = new Image();
  base.onload = () => {
    const c = document.createElement('canvas'); c.width = OUT_W * 2; c.height = OUT_H * 2;
    c.getContext('2d').drawImage(base, 0, 0, c.width, c.height);
    PH.img = null; PH.accOnly = true; PH.base = c; PH.geo = headGeo(c, null); $('jdw-photo').classList.add('acc-only');
    $('jdw-ph-info').textContent = 'Ta tête actuelle : choisis tes accessoires (pour recadrer, prends une nouvelle photo).';
    openSheet('jdw-photo', 'jdw-ph-ok'); renderAcc(); composeOut();
    detectFace(c).then(f => { if (f && PH.base === c) { PH.geo = headGeo(c, f); composeOut(); renderAcc(); } }).catch(() => {});
  };
  base.src = LK.photoBase || LK.photo;
}
function photoTitle() { $('jdw-ph-h').textContent = lookEdit != null && room ? 'Ta tête dans « ' + room.name + ' »' : 'Cadre ta tête'; }
function closePhoto() { lookEdit = null; $('jdw-photo').hidden = true; if (PH.img && PH.img.src.startsWith('blob:')) URL.revokeObjectURL(PH.img.src); PH.img = null; }
$('jdw-ph-cancel').addEventListener('click', () => { closePhoto(); if (welReturn) reopenWelcome(); else afterOnboarding(); });
$('jdw-ph-redo').addEventListener('click', startPhoto);
$('jdw-ph-rot').addEventListener('click', () => { PH.rot = (PH.rot + 90) % 360; drawCrop(); scheduleOut(); });
$('jdw-ph-zoom').addEventListener('input', () => { PH.zoom = +$('jdw-ph-zoom').value; drawCrop(); scheduleOut(); });
$('jdw-ph-consent').addEventListener('change', () => { $('jdw-ph-ok').disabled = !$('jdw-ph-consent').checked; });
function imgDims() { const r = PH.rot % 180 !== 0; return { w: r ? PH.img.naturalHeight : PH.img.naturalWidth, h: r ? PH.img.naturalWidth : PH.img.naturalHeight }; }
function placeImage(ctx, scaleTo) {
  // dessine la photo transformée dans un repère où la zone de cadrage fait CROP (multiplié par scaleTo)
  const d = imgDims(), base = Math.max(CROP.w / d.w, CROP.h / d.h), s = base * PH.zoom;
  ctx.save();
  ctx.translate((CW / 2 + PH.ox) * scaleTo.k + scaleTo.dx, (CROP.y + CROP.h / 2 + PH.oy) * scaleTo.k + scaleTo.dy);
  ctx.rotate(PH.rot * Math.PI / 180);
  ctx.scale(s * scaleTo.k, s * scaleTo.k);
  ctx.drawImage(PH.img, -PH.img.naturalWidth / 2, -PH.img.naturalHeight / 2);
  ctx.restore();
}
function drawCrop() {
  const cv = $('jdw-crop-cv'); if (cv.width !== CW) { cv.width = CW; cv.height = CH; }
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, CH);
  if (!PH.img) return;
  placeImage(ctx, { k: 1, dx: 0, dy: 0 });
  // assombrit hors de l'ovale
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.rect(0, 0, CW, CH);
  ctx.ellipse(CW / 2, CROP.y + CROP.h / 2, CROP.w * 0.46, CROP.h * 0.47, 0, 0, Math.PI * 2, true); ctx.fill('evenodd');
  ctx.strokeStyle = '#fff'; ctx.setLineDash([14, 10]); ctx.lineWidth = 3; ctx.beginPath();
  ctx.ellipse(CW / 2, CROP.y + CROP.h / 2, CROP.w * 0.46, CROP.h * 0.47, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
(() => {   // glisser / pincer / molette
  const el = $('jdw-cropper'), pts = new Map(); let last = null, pinch = 0;
  const toCanvas = (dx) => dx * CW / el.clientWidth;
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = null; pinch = 0; });
  el.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !PH.img) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) { PH.zoom = Math.min(4, Math.max(1, PH.zoom * d / pinch)); $('jdw-ph-zoom').value = String(PH.zoom); }
      pinch = d;
    } else { PH.ox += toCanvas(e.clientX - prev.x); PH.oy += toCanvas(e.clientY - prev.y); }
    drawCrop();
  });
  const up = e => { pts.delete(e.pointerId); pinch = 0; scheduleOut(); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { if (!PH.img) return; e.preventDefault(); PH.zoom = Math.min(4, Math.max(1, PH.zoom * (e.deltaY < 0 ? 1.06 : 0.94))); $('jdw-ph-zoom').value = String(PH.zoom); drawCrop(); scheduleOut(); }, { passive: false });
})();
function scheduleOut() { clearTimeout(PH.timer); PH.timer = setTimeout(makeOut, 220); }
let segPromise = null;
function loadSeg() {
  if (segPromise) return segPromise;
  segPromise = new Promise(res => {
    const base = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/';
    const done = v => { clearTimeout(to); res(v); };
    const to = setTimeout(() => res(null), 15000);
    const s = document.createElement('script'); s.src = base + 'selfie_segmentation.js'; s.crossOrigin = 'anonymous';
    s.onerror = () => done(null);
    s.onload = async () => {
      try {
        const seg = new window.SelfieSegmentation({ locateFile: f => base + f });
        seg.setOptions({ modelSelection: 0, selfieMode: false });
        let pending = null;
        seg.onResults(r => { if (pending) { const p = pending; pending = null; p(r.segmentationMask); } });
        await seg.initialize();
        done({ run: cv => new Promise(r2 => { pending = r2; seg.send({ image: cv }).catch(() => { pending = null; r2(null); }); setTimeout(() => { if (pending === r2) { pending = null; r2(null); } }, 8000); }) });
      } catch (e) { done(null); }
    };
    document.head.appendChild(s);
  });
  return segPromise;
}
async function makeOut() {
  if (!PH.img) return;
  const S = 2, W2 = OUT_W * S, H2 = OUT_H * S, k = W2 / CROP.w;
  const src = document.createElement('canvas'); src.width = W2; src.height = H2;
  const sc = src.getContext('2d');
  placeImage(sc, { k, dx: -CROP.x * k, dy: -CROP.y * k });
  $('jdw-ph-info').textContent = 'Détourage en cours…';
  const seg = await loadSeg();
  let mask = null;
  if (seg) { try { mask = await seg.run(src); } catch (e) { mask = null; } }
  if (mask) {   // détourage qui n'a trouvé personne (photo sombre, floue…) : on garde l'ovale plutôt qu'une tête vide
    try {
      const t = document.createElement('canvas'); t.width = 40; t.height = 50; const tc = t.getContext('2d'); tc.drawImage(mask, 0, 0, 40, 50);
      const md = tc.getImageData(0, 0, 40, 50).data; let on = 0; for (let i = 3; i < md.length; i += 4) if (md[i] > 128) on++;
      if (on / 2000 < 0.08) mask = null;
    } catch (e) {}
  }
  const out = document.createElement('canvas'); out.width = W2; out.height = H2;
  const oc = out.getContext('2d');
  if (mask) {
    oc.drawImage(mask, 0, 0, W2, H2);
    oc.globalCompositeOperation = 'source-in'; oc.drawImage(src, 0, 0);
    oc.globalCompositeOperation = 'destination-in';
    softEllipse(oc, W2, H2, 0.5, 0.52, 0.12);       // coupe épaules et cou, garde les cheveux
  } else {
    oc.drawImage(src, 0, 0);
    oc.globalCompositeOperation = 'destination-in';
    softEllipse(oc, W2, H2, 0.46, 0.47, 0.08);
  }
  oc.globalCompositeOperation = 'source-over';
  PH.base = out; PH.geo = headGeo(out, null);
  composeOut();
  // les yeux sont cherchés en parallèle : dès qu'ils sont trouvés, les lunettes se recalent dessus
  const mine = PH.img;
  detectFace(src).then(f => { if (f && PH.img === mine && PH.base === out) { PH.geo = headGeo(out, f); composeOut(); renderAcc(); } }).catch(() => {});
  $('jdw-ph-info').textContent = mask ? 'Tête détourée automatiquement. Ajuste le cadrage si besoin.'
    : seg ? "Visage pas trouvé : cadrage en ovale. Essaie une photo plus nette, bien éclairée, de face." : 'Cadrage en ovale (le détourage automatique ne marche que sur le site en ligne).';
}
/* ================= Accessoires sur la tête : catalogue, dessins, onglets et miniatures dans accessoires.js (window.JDW_ACC) ================= */
// (accessoires.js absent ou en panne : l'éditeur marche quand même, tête sans accessoires)
const ACCS = window.JDW_ACC || { blank: () => ({ hat: '', glasses: '', face: '', outfit: '', back: '' }), clean() { return this.blank(); }, pick() { return this.blank(); }, panel() {},
  render(o, b) { const x = o.getContext('2d'); x.clearRect(0, 0, o.width, o.height); x.drawImage(b, 0, 0, o.width, o.height); } };
const ACC = Object.assign(ACCS.blank(), { tab: 'hat' });
let facePromise = null;
function loadFaceDet() {
  if (facePromise) return facePromise;
  facePromise = new Promise(res => {
    const base = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/';
    const done = v => { clearTimeout(to); res(v); };
    const to = setTimeout(() => res(null), 15000);
    const s = document.createElement('script'); s.src = base + 'face_detection.js'; s.crossOrigin = 'anonymous';
    s.onerror = () => done(null);
    s.onload = async () => {
      try {
        const fd = new window.FaceDetection({ locateFile: f => base + f });
        fd.setOptions({ model: 'short', minDetectionConfidence: 0.4 });
        let pending = null;
        fd.onResults(r => { if (pending) { const p = pending; pending = null; p(r); } });
        await fd.initialize();
        done({ run: cv => new Promise(r2 => { pending = r2; fd.send({ image: cv }).catch(() => { pending = null; r2(null); }); setTimeout(() => { if (pending === r2) { pending = null; r2(null); } }, 6000); }) });
      } catch (e) { done(null); }
    };
    document.head.appendChild(s);
  });
  return facePromise;
}
async function detectFace(src) {
  const fd = await loadFaceDet(); if (!fd) return null;
  let r = null; try { r = await fd.run(src); } catch (e) { return null; }
  const d = r && r.detections && r.detections[0]; const L = d && (d.landmarks || d.keypoints);
  if (!L || L.length < 4) return null;
  const P = i => ({ x: L[i].x * src.width, y: L[i].y * src.height });
  return { eyes: [P(0), P(1)], nose: P(2), mouth: P(3), ears: L.length >= 6 ? [P(4), P(5)] : null };
}
// géométrie de la tête dans l'image détourée : haut, largeur, yeux (détectés ou estimés)
function headGeo(base, face) {
  const W = base.width, H = base.height, d = base.getContext('2d').getImageData(0, 0, W, H).data;
  let top = -1, bottom = -1;
  for (let y = 0; y < H && top < 0; y += 2) for (let x = 0; x < W; x += 3) if (d[(y * W + x) * 4 + 3] > 60) { top = y; break; }
  for (let y = H - 1; y >= 0 && bottom < 0; y -= 2) for (let x = 0; x < W; x += 3) if (d[(y * W + x) * 4 + 3] > 60) { bottom = y; break; }
  if (top < 0) { top = H * 0.1; bottom = H * 0.95; }
  const rowSpan = y => { let l = -1, r = -1; const yy = Math.round(y); for (let x = 0; x < W; x += 2) if (d[(yy * W + x) * 4 + 3] > 60) { if (l < 0) l = x; r = x; } return l < 0 ? [W * 0.2, W * 0.8] : [l, r]; };
  const hh = bottom - top, [l, r] = rowSpan(top + hh * 0.42), cx = (l + r) / 2, w = r - l;
  let eyes, nose, mouth;
  if (face) { eyes = face.eyes[0].x < face.eyes[1].x ? face.eyes : [face.eyes[1], face.eyes[0]]; nose = face.nose; mouth = face.mouth; }
  else { const ey = top + hh * 0.47; eyes = [{ x: cx - w * 0.19, y: ey }, { x: cx + w * 0.19, y: ey }]; nose = { x: cx, y: top + hh * 0.61 }; mouth = { x: cx, y: top + hh * 0.74 }; }
  const ed = Math.hypot(eyes[1].x - eyes[0].x, eyes[1].y - eyes[0].y), ang = Math.atan2(eyes[1].y - eyes[0].y, eyes[1].x - eyes[0].x);
  return { top, bottom, cx, w, eyes, nose, mouth, ed, ang, detected: !!face };
}
// image finale (#jdw-ph-out) et panneau des accessoires : accessoires.js
function composeOut() {
  const base = PH.base; if (!base) return;
  ACCS.render($('jdw-ph-out'), base, PH.geo || (PH.geo = headGeo(base, null)), ACC);
}
function renderAcc() { ACCS.panel({ acc: ACC, base: PH.base, geo: PH.base ? PH.geo || (PH.geo = headGeo(PH.base, null)) : null, changed: composeOut }); }
function resetAcc() { Object.assign(ACC, ACCS.blank(), { tab: 'hat' }); renderAcc(); }

function softEllipse(ctx, w, h, rx, ry, feather) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1 - feather, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(w * rx, h * ry); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
$('jdw-ph-ok').addEventListener('click', async () => {
  if (!$('jdw-ph-consent').checked) return;
  const fin = $('jdw-ph-out');
  let data = '';
  try { data = fin.toDataURL('image/webp', 0.85); } catch (e) {}
  if (!data.startsWith('data:image/webp')) data = fin.toDataURL('image/png');
  const rid = welReturn ? null : lookEdit;
  if (rid != null) {                       // tête seulement pour cette salle : le profil principal ne bouge pas
    const L = lookTouch(rid), nm = room ? room.name : '';
    try { if (PH.base) { const b = document.createElement('canvas'); b.width = OUT_W; b.height = OUT_H; b.getContext('2d').drawImage(PH.base, 0, 0, OUT_W, OUT_H); L.photoBase = b.toDataURL('image/webp', 0.85); } } catch (e) {}
    L.photoAcc = ACCS.pick(ACC);
    if (PH.img && PH.srcData) store.set(photoSrcKey(rid), { src: PH.srcData, crop: { rot: PH.rot, zoom: PH.zoom, ox: PH.ox, oy: PH.oy } });
    L.photo = data; saveProfile();
    players.delete(cleanName(profile.name)); syncOwnPlayer();
    closePhoto(); refreshAll();
    const ok = await pushRoomLook() && !roomLookMissing;
    toastCheer(ok ? 'Ta tête pour « ' + nm + ' » est dans les jeux !' : 'Tête de « ' + nm + ' » gardée sur cet appareil.', profile.name, true);
    return;
  }
  // la tête sans accessoires et les accessoires choisis sont gardés pour pouvoir les changer plus tard
  try { if (PH.base) { const b = document.createElement('canvas'); b.width = OUT_W; b.height = OUT_H; b.getContext('2d').drawImage(PH.base, 0, 0, OUT_W, OUT_H); profile.photoBase = b.toDataURL('image/webp', 0.85); } } catch (e) {}
  profile.photoAcc = ACCS.pick(ACC);
  if (PH.img && PH.srcData) store.set(photoSrcKey(), { src: PH.srcData, crop: { rot: PH.rot, zoom: PH.zoom, ox: PH.ox, oy: PH.oy } });
  profile.photo = data; profile.consent = true; if (profile.name) { profile.askedFor = cleanName(profile.name); saveProfile(); }
  if (profile.name) { players.delete(cleanName(profile.name)); syncOwnPlayer(); }
  closePhoto(); refreshAll();
  if (welReturn) { reopenWelcome(); return; }
  const ok = await pushProfile();
  toastCheer(ok ? 'Ta tête est dans les jeux !' : 'Tête enregistrée sur cet appareil.', profile.name, true);
  afterOnboarding();
});

/* ================= Bravo (tête qui surgit) ================= */
let cheerTimer = 0;
function toastCheer(text, name, force) {
  const heads = headsList();
  let h = name ? heads.find(x => x.name === cleanName(name)) : null;
  if (!h && heads.length) h = heads[Math.floor(shellRand() * heads.length)];
  const p = h ? players.get(h.name) : (force ? players.get(cleanName(name)) : null);
  if ((!p || !p.photo) && !force) return;
  const el = $('jdw-cheer');
  if (el.parentNode !== document.body) document.body.appendChild(el);   // toujours au-dessus de tout, en bas à droite
  if (p && p.photo) { $('jdw-cheer-img').src = p.photo; $('jdw-cheer-img').hidden = false; } else $('jdw-cheer-img').hidden = true;
  $('jdw-cheer-name').textContent = p ? dispName(p.name) : (cleanName(name) || ''); $('jdw-cheer-txt').textContent = String(text || '').slice(0, 60);
  el.hidden = true; void el.offsetWidth; el.hidden = false;
  clearTimeout(cheerTimer); cheerTimer = setTimeout(() => { el.hidden = true; }, 2700);
}

/* ================= Salles ================= */
let roomsCache = [], pendingRoom = null;
function roomsStatus(t) { $('jdw-rooms-status').textContent = t || ''; }
async function listRooms() {
  try {
    roomsCache = await rpc('list_rooms', { p_code: CODE(), p_name: profile.name || '' }) || [];   // seulement les salles de mon compte (source/public.sql)
    serverOk = true; roomsStatus('');
    const cr = room && roomsCache.find(x => x.r_id === room.id);
    if (cr && cr.r_owner && room.owner !== cr.r_owner) { room.owner = cr.r_owner; store.set('jdw.room', room); }
  }
  catch (e) { roomsStatus('Impossible de charger les salles. Vérifie ta connexion et réessaie.'); }
  renderRooms();
}
function roomHue(name) { let h = 7; for (const c of String(name).toUpperCase()) h = (h * 31 + c.charCodeAt(0)) % 9973; return Math.round((h * 137.508) % 360); }
const ICON_USERS = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/></svg>';
const ICON_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
// onglets des salles : Mes salles | Rejoindre | Créer (explications derrière « ? »)
function showRoomsTab(t, user) {
  if (!['mine', 'join', 'new'].includes(t)) t = 'mine';
  tabsShow('jdw-rooms-tabs', 'jdw-rooms-pane', t);
  $('jdw-rooms-help').dataset.help = 'jdw-help-rooms-' + t;
  helpClose();
  if (user) { roomsStatus(''); $('jdw-joinbox').hidden = true; pendingRoom = null; const f = { join: 'jdw-find-name', new: 'jdw-new-name' }[t]; if (f && !TOUCH) setTimeout(() => $(f).focus({ preventScroll: true }), 30); }
}
tabsInit('jdw-rooms-tabs', showRoomsTab);
function renderRooms() {
  const wrap = $('jdw-roomlist'); wrap.textContent = '';
  if (!roomsCache.length) {
    // aucune salle : deux gros boutons vers Rejoindre / Créer
    const e = document.createElement('div'); e.className = 'rooms-empty';
    const t = document.createElement('p'); t.textContent = 'Aucune salle pour l’instant'; e.appendChild(t);
    for (const [k, ic, tx] of [['join', '🔑', 'Rejoindre la salle des copains'], ['new', '✨', 'Créer ma salle']]) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (k === 'join' ? 'btn-play' : 'btn-ghost'); b.textContent = ic + ' ' + tx;
      b.addEventListener('click', () => showRoomsTab(k, true)); e.appendChild(b);
    }
    wrap.appendChild(e); return;
  }
  const list = [...roomsCache].sort((a, b) => (room && b.r_id === room.id) - (room && a.r_id === room.id) || !!b.r_member - !!a.r_member || b.r_online - a.r_online || b.r_members - a.r_members);
  for (const r of list) {
    const cur = room && room.id === r.r_id;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'room-tile' + (cur ? ' cur' : '');
    b.style.setProperty('--h', roomHue(r.r_name));
    b.setAttribute('aria-label', (cur ? 'Ta salle : ' : 'Rejoindre la salle ') + r.r_name + (r.r_private ? ' (privée)' : '') + ', ' + r.r_members + ' membres');
    const sign = document.createElement('span'); sign.className = 'rt-sign';
    const nm = document.createElement('span'); nm.className = 'rt-name'; nm.textContent = r.r_name;
    const inner = document.createElement('span'); inner.append(nm); const u = document.createElement('span'); u.className = 'rt-under'; inner.append(u);
    sign.append(inner);
    const meta = document.createElement('span'); meta.className = 'rt-meta';
    const mem = document.createElement('span'); mem.innerHTML = ICON_USERS; mem.append(r.r_members + (r.r_members > 1 ? ' membres' : ' membre'));
    const on = document.createElement('span'); on.className = r.r_online ? 'on' : ''; on.innerHTML = '<i></i>'; on.append(r.r_online ? r.r_online + ' en ligne' : 'calme');
    meta.append(mem, on);
    b.append(sign, meta);
    if (cur) { const bd = document.createElement('span'); bd.className = 'rt-badge'; bd.textContent = knownNotMember(profile.name) ? 'Pas encore membre' : 'Ta salle'; b.append(bd); }
    else if (r.r_member) { const bd = document.createElement('span'); bd.className = 'rt-badge member'; bd.textContent = 'Tu en fais partie'; b.append(bd); }
    if (r.r_private) { const lk = document.createElement('span'); lk.className = 'rt-lock'; lk.innerHTML = ICON_LOCK; lk.title = 'Salle privée'; b.append(lk); }
    b.addEventListener('click', () => chooseRoom(r));
    wrap.appendChild(b);
  }
}
function openRooms() {
  if (!ONLINE) return;
  if (isGuest()) { guestAsk('Les salles'); return; }
  if (netOff()) { netNeed('Les salles'); return; }
  if (!profile.name) { startWelcome(); return; }
  roomsStatus('Chargement des salles…'); $('jdw-joinbox').hidden = true; pendingRoom = null;
  showRoomsTab('mine');
  openSheet('jdw-rooms'); return listRooms();
}
async function chooseRoom(r) {
  if (room && room.id === r.r_id) {
    closeSheet('jdw-rooms');
    if (knownNotMember(profile.name) && await askJoin(profile.name)) await joinHere();   // sa salle, mais pas (plus) membre : on la rejoint
    return;
  }
  // « mes salles » : un pseudo du compte en fait déjà partie (entré par un lien d'invitation, famille…) → le code n'est pas demandé ;
  // s'il le faut quand même, doJoin le demande
  await doJoin(r, roomCodes[r.r_id] || '');
}
function askCode(r, msg) {
  pendingRoom = r; $('jdw-join-title').textContent = 'Code de la salle « ' + r.r_name + ' »';
  $('jdw-joinbox').hidden = false; $('jdw-join-code').value = ''; roomsStatus(msg || '');
  setTimeout(() => $('jdw-join-code').focus(), 30);
}
async function doJoin(r, code) {
  roomsStatus('Entrée dans la salle…');
  try {
    const ok = await rpc('join_room', { p_code: CODE(), p_room: r.r_id, p_room_code: code, p_name: profile.name });
    if (!ok && !code) { askCode(r, r.r_private ? 'Cette salle a un code : demande-le au chef de la salle.' : ''); return; }
    if (!ok) { delete roomCodes[r.r_id]; store.set('jdw.roomcodes', roomCodes); askCode(r, 'Ce code ne marche pas. Demande-le au chef de la salle.'); return; }
    if (code) { roomCodes[r.r_id] = code; store.set('jdw.roomcodes', roomCodes); }
    enterRoom({ id: r.r_id, name: r.r_name, priv: !!r.r_private, owner: r.r_owner || null });
  } catch (e) { roomsStatus("Impossible de rejoindre cette salle pour l'instant."); }
}
function enterRoom(rm) {
  const prevId = room ? room.id : null;
  room = rm; store.set('jdw.room', room); remoteLoaded = false; roomDenied = false; membersFor = null; memberNames = new Set();
  if (prevId && prevId !== room.id) { rtLeave('jdw-room-' + prevId); presReset(); }
  rtJoin('jdw-room-' + room.id);
  players.clear(); syncOwnPlayer(); if (typeof ensureAiPlayer === 'function') ensureAiPlayer(); remote = {}; counts = {}; total = 0;
  $('jdw-joinbox').hidden = true; closeSheet('jdw-rooms');
  chatReset(); closeChat();
  refreshAll(); pushProfile(); loadPlayers(); loadScores(); heartbeat(); loadChat(); progLoad();
  setTimeout(() => poke('players'), 600);
}
$('jdw-roombar').addEventListener('click', openRooms);
// rejoindre une salle par son nom (et son code si elle en a un) : la liste ne montre que les salles du compte
async function findRoom() {
  const name = $('jdw-find-name').value.trim().slice(0, 24), code = $('jdw-find-code').value.trim().slice(0, 24).toUpperCase();
  if (name.length < 2) { roomsStatus('Tape le nom de la salle (demande-le aux copains).'); $('jdw-find-name').focus(); return; }
  roomsStatus('Recherche de la salle…'); $('jdw-find-ok').disabled = true;
  try {
    const r = ((await rpc('find_room', { p_code: CODE(), p_room_name: name })) || [])[0];
    if (!r) { roomsStatus('Aucune salle ne s’appelle « ' + name + ' ». Vérifie le nom exact avec les copains.'); return; }
    if (r.r_private && !code && !r.r_member) { askCode(r, 'Cette salle a un code : demande-le au chef de la salle.'); return; }
    $('jdw-find-name').value = ''; $('jdw-find-code').value = '';
    await doJoin(r, code || roomCodes[r.r_id] || '');
  } catch (e) { roomsStatus(/trop d essais/.test(String(e.message)) ? 'Trop d’essais : attends quelques minutes.' : 'Impossible de chercher la salle pour l’instant.'); }
  finally { $('jdw-find-ok').disabled = false; }
}
$('jdw-find-ok').addEventListener('click', findRoom);
$('jdw-find-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('jdw-find-code').focus(); } });
$('jdw-find-code').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); findRoom(); } });
$('jdw-rooms-close').addEventListener('click', () => closeSheet('jdw-rooms'));
$('jdw-join-ok').addEventListener('click', () => { const c = $('jdw-join-code').value.trim().toUpperCase(); if (pendingRoom && c) doJoin(pendingRoom, c); });
$('jdw-join-code').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('jdw-join-ok').click(); } });
$('jdw-new-ok').addEventListener('click', async () => {
  const name = $('jdw-new-name').value.trim().slice(0, 24), code = $('jdw-new-code').value.trim().slice(0, 24).toUpperCase();
  if (name.length < 2) { roomsStatus('Donne un nom à ta salle (2 lettres minimum).'); $('jdw-new-name').focus(); return; }
  roomsStatus('Création de la salle…'); $('jdw-new-ok').disabled = true;
  try {
    const id = await rpc('create_room', { p_code: CODE(), p_name: name, p_room_code: code, p_owner: profile.name });
    if (code) { roomCodes[id] = code; store.set('jdw.roomcodes', roomCodes); }
    $('jdw-new-name').value = ''; $('jdw-new-code').value = '';
    enterRoom({ id, name, priv: !!code, owner: cleanName(profile.name) });
    poke('rooms', 'jdw-all');
    toastCheer('Bienvenue dans « ' + name + ' » ! Donne le nom' + (code ? ' et le code' : '') + ' aux copains.', profile.name);
  } catch (e) {
    roomsStatus(/existe/.test(String(e.message)) ? 'Ce nom de salle est déjà pris, choisis-en un autre.' : 'Impossible de créer la salle pour le moment.');
  }
  $('jdw-new-ok').disabled = false;
});

/* ================= Onglets : Classique / Local / Duel / Compétition ================= */
// le mode « Classique » est la page normale ; les autres modes ont chacun leur page (barre des modes en bas)
const MODES = {
  classique: null,
  duel: { ic: '⚔️', t: 'Duel', sub: 'Toi contre un copain ou l\'IA.' },
  compet: { ic: '🏆', t: 'Compétition', sub: 'Toute la salle sur le même jeu, en mode difficile : têtes et scores en direct, et que le meilleur gagne !' },
};
let MODE = 'classique';
try { const m = sessionStorage.getItem('jdw.mode'); if (m && m in MODES) MODE = m; } catch (e) {}
function setMode(m, user) {
  if (!(m in MODES)) m = 'classique';
  const changed = m !== MODE; MODE = m;
  try { sessionStorage.setItem('jdw.mode', m); } catch (e) {}
  $('jdw-lib').dataset.mode = m;
  for (const b of document.querySelectorAll('#jdw-modes button')) { if (b.dataset.mode === m) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  const md = MODES[m];
  if (md) { $('jdw-mh-ic').textContent = md.ic; $('jdw-mh-title').textContent = md.t; $('jdw-mh-sub').textContent = md.sub; }
  if (m === 'duel') renderSeats();
  if (m === 'compet') renderCompet();
  if (user && changed) {
    const w = document.querySelector('.lib-wrap'); w.classList.remove('page-in'); void w.offsetWidth; w.classList.add('page-in');
    $('jdw-lib').scrollTo({ top: 0 });
    Audio.ensure(); Audio.tone(660, 0.05, 'sine', 0.03, 990);
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
  }
}
for (const b of document.querySelectorAll('#jdw-modes button')) b.addEventListener('click', () => setMode(b.dataset.mode, true));

/* ================= Duel : deux joueurs face à face sur le même téléphone ================= */
// P0 = en bas (écran à l'endroit), P1 = en haut (écran à l'envers). Les jeux : source/duos/*.js (DUO-CONTRACT.md).
const DUO_COLORS = ['#ffa630', '#5ef0ff'];
// duel en ligne (bêta) : voir la section « Duel en ligne » plus bas
const NET = { code: '', role: '', d: null, topic: '', pc: null, ctl: null, inp: null, peer: '', peerCid: '', seats: null, turn: -1, blocked: new Set(),
  pend: [], remote: false, helloT: 0, waitT: 0, guestInfo: null, stream: null, dest: null, vSender: null, aSender: null, start: null, ids: new Map(),
  data: false, g: null, handlers: [], queue: [], off: 0, rttv: 0, pings: [], pingT: 0 };
// musique de chaque duel : morceaux des jeux solo qui vont bien
const DUO_MUSIC = { trouve: ['accueil', 'calm'], palet: ['carreaux', 'intense'], briques: ['carreaux', 'calm'], boum: ['glouton', 'intense'],
  souris: ['glouton', 'calm'], spatial: ['ilo', 'intense'], mots: ['accueil', 'calm'], guerre: ['canards', 'calm'] };
const GUEST = 'INVITÉ';
const AI_NAME = 'IA';
const AI_LEVELS = { facile: ['Facile', 0.25], moyen: ['Moyen', 0.5], difficile: ['Difficile', 0.75], extreme: ['Extrême', 1] };
let aiLevel = store.get('jdw.ailevel', 'moyen'); if (!(aiLevel in AI_LEVELS)) aiLevel = 'moyen';
// tête de robot de l'IA (dessinée une fois, enregistrée comme la photo d'un joueur : la version triste se fait toute seule)
var AI_PHOTO = '';   // var : lisible sans erreur même avant cette ligne (changement de salle au démarrage)
(() => {
  const c = document.createElement('canvas'); c.width = 160; c.height = 200; const g = c.getContext('2d');
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.strokeStyle = '#8aa0ae'; g.lineWidth = 6; g.beginPath(); g.moveTo(80, 44); g.lineTo(80, 18); g.stroke();
  const ball = g.createRadialGradient(76, 12, 2, 80, 16, 14); ball.addColorStop(0, '#fff'); ball.addColorStop(0.4, '#ff5fae'); ball.addColorStop(1, '#a01a5c');
  g.fillStyle = ball; g.beginPath(); g.arc(80, 16, 12, 0, 7); g.fill();
  const body = g.createLinearGradient(0, 44, 0, 190); body.addColorStop(0, '#e9f0f3'); body.addColorStop(0.5, '#9fb2bf'); body.addColorStop(1, '#5d7484');
  g.fillStyle = body; rr(14, 44, 132, 146, 34); g.fill();
  g.fillStyle = '#5d7484'; rr(2, 96, 16, 44, 8); g.fill(); rr(142, 96, 16, 44, 8); g.fill();
  g.fillStyle = '#0b141c'; rr(28, 70, 104, 64, 24); g.fill();
  for (const x of [58, 102]) { const e = g.createRadialGradient(x, 100, 1, x, 102, 17); e.addColorStop(0, '#ffffff'); e.addColorStop(0.35, '#5ef0ff'); e.addColorStop(1, 'rgba(94,240,255,0)'); g.fillStyle = e; g.beginPath(); g.arc(x, 102, 17, 0, 7); g.fill(); }
  g.fillStyle = '#22394a'; rr(50, 148, 60, 22, 8); g.fill();
  g.fillStyle = '#5ef0ff'; for (let k = 0; k < 5; k++) { rr(56 + k * 10, 154, 6, 10, 2); g.fill(); }
  AI_PHOTO = c.toDataURL('image/png'); setPlayer(AI_NAME, AI_PHOTO, null);
})();
function ensureAiPlayer() { if (AI_PHOTO && !players.has(AI_NAME)) setPlayer(AI_NAME, AI_PHOTO, null); }   // après un changement de salle (players vidé)
let seats = store.get('jdw.seats', null);
function defaultSeats() {
  const me = cleanName(profile.name) || 'JOUEUR';
  const other = profiles.map(p => cleanName(p.name)).find(n => n && n !== me);
  return [me, other || GUEST];
}
if (!Array.isArray(seats) || seats.length !== 2 || !seats[0]) seats = defaultSeats();
// invité : seulement « invité » (deux fois) ou l'IA en haut, jamais les joueurs de l'appareil ou de la salle (ni tête, ni pseudo)
const seatName = i => (NET.seats ? NET.seats[i] : isGuest() ? (i === 1 && seats[1] === AI_NAME ? AI_NAME : GUEST) : seats[i]) || GUEST;
// appareil tactile ? (téléphone, tablette, appli Android, PC à écran tactile) : sinon pas de duel « sur ce téléphone » (à deux sur le même écran)
// (maxTouchPoints seul ne suffit pas : certains navigateurs d'ordinateur en annoncent sans écran tactile ; on le croit si la souris n'est pas le pointeur principal)
const TOUCH = (() => { try { return /BorneArcade/.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches || matchMedia('(any-pointer: coarse)').matches || ((navigator.maxTouchPoints || 0) > 0 && !matchMedia('(pointer: fine)').matches); } catch (e) { return true; } })();
const sameSeats = () => seatName(0) === seatName(1);
function seatPlayer(i) {
  if (seatName(i) === AI_NAME) ensureAiPlayer();
  const name = seatName(i), rec = name === GUEST ? null : players.get(name);
  if (name === AI_NAME) { const ok = !!(rec && rec.img && rec.img.complete && rec.img.naturalWidth); return { name: AI_NAME, img: ok ? rec.img : null, sad: ok ? (sadOf(rec) || rec.img) : null, color: DUO_COLORS[i], ai: true }; }
  const ok = !!(rec && rec.img && rec.img.complete && rec.img.naturalWidth);
  if (name === GUEST && isGuest()) return { name: i === 0 ? 'TOI' : 'COPAIN', img: null, sad: null, color: DUO_COLORS[i] };   // invité : noms courts, pas de tête
  return { name: name === GUEST && sameSeats() ? GUEST + ' ' + (i + 1) : name, img: ok ? rec.img : null, sad: ok ? (sadOf(rec) || rec.img) : null, color: DUO_COLORS[i] };
}
// victoires par paire de joueurs et par duel (sur cet appareil)
let duoStats = store.get('jdw.duostats', {}) || {};
const pairKey = () => [seatName(0), seatName(1)].sort().join('|');
function pairWins(id) { const s = (duoStats[pairKey()] || {})[id] || {}; return [s[seatName(0)] || 0, s[seatName(1)] || 0]; }
function addWin(id, w) {
  if (sameSeats()) return;
  const k = pairKey(), n = seatName(w), s = duoStats[k] = duoStats[k] || {}, g = s[id] = s[id] || {};
  g[n] = (g[n] || 0) + 1; store.set('jdw.duostats', duoStats);
}
function renderSeats() {
  const me = cleanName(profile.name);
  if (me && seats.includes('JOUEUR') && !seats.includes(me)) { seats[seats.indexOf('JOUEUR')] = me; store.set('jdw.seats', seats); }   // nom choisi après le chargement
  for (const i of [0, 1]) {
    const b = $('jdw-seat-' + i), pl = seatPlayer(i), hd = b.querySelector('.seat-head');
    hd.textContent = ''; hd.appendChild(chatHead(pl.name, { passive: true }));
    b.querySelector('.seat-name').textContent = dispName(pl.name);
    b.querySelector('.seat-tx small').textContent = (i === 0 ? 'En bas' : 'En haut') + (pl.ai ? ' · ' + AI_LEVELS[aiLevel][0] : '');
  }
  // niveau de l'IA quand elle joue en haut
  const ai = seatName(1) === AI_NAME;
  $('jdw-ai-level').hidden = !ai;
  for (const bt of document.querySelectorAll('#jdw-ai-level button')) bt.setAttribute('aria-checked', String(bt.dataset.lv === aiLevel));
  refreshDuoTiles();
}
for (const bt of document.querySelectorAll('#jdw-ai-level button')) bt.addEventListener('click', () => { aiLevel = bt.dataset.lv; store.set('jdw.ailevel', aiLevel); renderSeats(); });
let pickSeat = 0;
function openSeatPick(i) {
  pickSeat = i;
  $('jdw-seatpick-h').textContent = i === 0 ? 'Qui joue en bas ?' : 'Qui joue en haut ?';
  const list = $('jdw-seatpick-list'); list.textContent = '';
  const seen = new Set(), rows = [];
  const add = (n, tag) => { n = cleanName(n); if (!n || n === GUEST || seen.has(n)) return; seen.add(n); rows.push([n, tag]); };
  if (i === 1) { ensureAiPlayer(); rows.push([AI_NAME, 'l\'ordinateur joue contre toi · facile à extrême']); }   // l'IA joue en haut
  if (!isGuest()) {
    for (const p of profiles) add(p.name, 'sur ce téléphone');
    for (const p of [...players.values()].filter(p => p.member).sort((a, b) => a.name.localeCompare(b.name))) add(p.name, room ? 'de la salle' : '');
  }
  rows.push([GUEST, isGuest() ? (i === 0 ? 'toi' : 'un copain à côté de toi') : 'un copain sans compte']);
  for (const [n, tag] of rows) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pick-row' + (seatName(i) === n ? ' on' : '');
    const t = document.createElement('span'); t.className = 'pr-t';
    const bb = document.createElement('b'); bb.textContent = n === AI_NAME ? '🤖 IA' : n; const sm = document.createElement('small'); sm.textContent = tag; t.append(bb, sm);
    if (n === AI_NAME) b.classList.add('ai-row');
    b.append(chatHead(n, { passive: true }), t);
    b.addEventListener('click', () => {
      const o = 1 - i;
      if (n !== GUEST && seats[o] === n) seats[o] = seats[i];   // déjà assis en face : on échange
      seats[i] = n; store.set('jdw.seats', seats);
      closeSheet('jdw-seatpick'); renderSeats();
    });
    list.appendChild(b);
  }
  openSheet('jdw-seatpick', 'jdw-seatpick-close');
}
$('jdw-seat-0').addEventListener('click', () => openSeatPick(0));
$('jdw-seat-1').addEventListener('click', () => openSeatPick(1));
$('jdw-seat-swap').addEventListener('click', () => { if (seats[1] === AI_NAME || seats[0] === AI_NAME) return; seats = [seats[1], seats[0]]; store.set('jdw.seats', seats); renderSeats(); });   // l'IA reste en haut
$('jdw-seatpick-close').addEventListener('click', () => closeSheet('jdw-seatpick'));
$('jdw-seatpick').addEventListener('click', e => { if (e.target === $('jdw-seatpick')) closeSheet('jdw-seatpick'); });
let DUEL_WHERE = TOUCH ? 'local' : 'online';
function setDuelWhere(w) {
  if (!TOUCH) w = 'online';            // ordinateur : on ne joue pas à deux sur le même écran
  DUEL_WHERE = w;
  const pc = $('jdw-duel-pc'); if (pc) {
    pc.hidden = TOUCH && !(w === 'online' && isGuest());
    $('jdw-duel-pc-t').textContent = !TOUCH ? 'Sur ordinateur : défie un copain en ligne' : 'Le duel en ligne demande un compte';
    $('jdw-duel-pc-s').textContent = isGuest() ? 'Chacun sur son appareil : crée ton compte (gratuit) pour défier tes copains.' : 'Les duels à deux sur le même écran se jouent sur un téléphone ou une tablette, posés à plat.';
    $('jdw-duel-pc-go').hidden = !isGuest();
  }
  $('jdw-page-duel').classList.toggle('no-touch', !TOUCH);
  $('jdw-page-duel').classList.toggle('guest-online', w === 'online' && isGuest());
  for (const b of document.querySelectorAll('#jdw-duel-switch button')) b.setAttribute('aria-selected', String(b.dataset.where === w));
  $('jdw-duel-local').hidden = w !== 'local'; $('jdw-duel-online').hidden = w !== 'online';
  if (duoTiles.length) refreshDuoTiles();
}
for (const b of document.querySelectorAll('#jdw-duel-switch button')) b.addEventListener('click', () => { if (!TOUCH && b.dataset.where === 'local') { toastCheer('Sur ordinateur, les duels se jouent en ligne : à deux sur le même écran, prends un téléphone ou une tablette.', profile.name, true); return; } setDuelWhere(b.dataset.where); });
$('jdw-duel-pc-go').addEventListener('click', () => guestAsk('Duel en ligne'));
for (const b of document.querySelectorAll('#jdw-duel-switch button')) if (!TOUCH && b.dataset.where === 'local') { b.setAttribute('aria-disabled', 'true'); b.classList.add('off'); b.title = 'Sur ordinateur : défie un copain en ligne'; }
setTimeout(() => setDuelWhere(DUEL_WHERE), 0);
// tuiles des duels (vignette animée + score de la paire)
const duoTiles = [];
function buildDuoLibrary() {
  const grid = $('jdw-duo-grid');
  for (const d of DUOS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile duo-tile'; b.style.setProperty('--acc', d.accent || COLORS.amber);
    b.setAttribute('aria-label', 'Duel : ' + d.title);
    b.innerHTML = '<div class="tile-img"><canvas aria-hidden="true"></canvas><span class="duo-emoji" aria-hidden="true"></span></div><div class="tile-meta"><div class="tile-name"></div><div class="duo-tag"></div></div>';
    b.querySelector('.tile-name').textContent = d.title;
    b.querySelector('.duo-emoji').textContent = d.emoji || '⚔️';
    b.addEventListener('click', () => {
      markGameSeen(d.id);   // clic sur la tuile : l'étiquette « Nouveau » / « Mis à jour » s'en va (même si le duel demande d'abord un compte)
      if (DUEL_WHERE === 'online') { if (guestBlocks()) { guestAsk('Duel en ligne'); return; } if (netOff()) { netNeed('Le duel en ligne'); return; } if (netBlocks(d)) { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); return; } netCreate(d); return; }
      if (aiBlocks(d)) { ensureAiPlayer(); toastCheer('Je ne sais pas encore jouer à ce jeu !', AI_NAME, true); return; }
      openDuo(d);
    });
    const wrap = document.createElement('div'); wrap.className = 'tile-wrap'; wrap.style.setProperty('--acc', d.accent || COLORS.amber);
    wrap.appendChild(b); grid.appendChild(wrap);
    duoTiles.push({ g: d, el: b, canvas: b.querySelector('canvas'), tag: b.querySelector('.duo-tag'), visible: false });
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { const t = duoTiles.find(x => x.el === e.target); if (t) t.visible = e.isIntersecting; }), { root: $('jdw-lib') });
    duoTiles.forEach(t => io.observe(t.el));
  } else duoTiles.forEach(t => { t.visible = true; });
  refreshDuoTiles();
}
// contre l'IA : seuls les jeux qui savent la faire jouer (ai: true dans le module) ; les autres restent grisés
const aiBlocks = d => DUEL_WHERE !== 'online' && seatName(1) === AI_NAME && !d.ai;
const guestBlocks = () => DUEL_WHERE === 'online' && isGuest();      // duel en ligne : compte requis
// en ligne : seuls les jeux qui ont leur vrai jeu en ligne (net: true, chacun fait tourner la partie) ; pas de vidéo
const netBlocks = d => DUEL_WHERE === 'online' && !d.net;
function refreshDuoTiles() {
  for (const t of duoTiles) {
    const w = pairWins(t.g.id), noNet = netBlocks(t.g), gb = guestBlocks(), nr = DUEL_WHERE === 'online' && netOff(), off = noNet || gb || nr || aiBlocks(t.g);
    t.tag.textContent = noNet ? 'Bientôt en ligne' : gb ? 'En ligne avec un compte' : nr ? 'Il faut du réseau' : off ? 'Bientôt contre l\'IA' : w[0] + w[1] && !sameSeats() ? seatName(0) + ' ' + w[0] + ' – ' + w[1] + ' ' + seatName(1) : (t.g.tagline || '');
    t.tag.classList.toggle('tally', !off && !!(w[0] + w[1]) && !sameSeats());
    t.el.classList.toggle('no-ai', off); t.el.setAttribute('aria-disabled', String(off));
  }
}
// ---------- la partie ----------
const DUO = { d: null, inst: null, root: null, seq: 0, scores: [0, 0], over: false, winner: null, paused: false, waitRot: false, sayT: [0, 0], shared: false };
// musique propre au duel (collection) si elle est là : d<id>-<n>.bin
function duoMusicId(d) { const v = (window.JDW_MUSIC || {})['d' + d.id]; return v && (v.c.length || v.x.length) ? 'd' + d.id : ''; }
function duoBtn(text, cls, fn) { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = text; b.addEventListener('click', fn); return b; }
function duoSay(text, o) {
  o = o || {};
  const land = DUO.d && DUO.d.layout === 'landscape';
  let ps = land ? [0] : (o.p === 0 || o.p === 1) ? [o.p] : [0, 1];
  // en ligne, chacun ne regarde que son écran : la bannière n'apparaît que de son côté (l'invité voit l'écran tourné : sa moitié = 1)
  if (NET.role && NET.data && !land) { const me = NET.role === 'host' ? 0 : 1; ps = ps.filter(p => p === me); }
  else if (!NET.role && seatName(1) === AI_NAME && !land) ps = ps.filter(p => p === 0);   // contre l'IA : seul le joueur du bas lit
  for (const p of ps) {
    const el = $('jdw-duo-say' + p); el.textContent = '';
    const dv = document.createElement('div'); dv.className = 'duo-say-t' + (o.small ? ' small' : '');
    dv.style.color = o.color || COLORS.ink; dv.textContent = String(text || '');
    el.appendChild(dv); clearTimeout(DUO.sayT[p]);
    DUO.sayT[p] = setTimeout(() => { el.textContent = ''; }, Math.max(300, Math.min(6000, +o.ms || 1000)));
  }
  if (NET.role === 'host') netCtl({ h: 'say', text: String(text || ''), o: { ms: o.ms, p: o.p, color: o.color, small: o.small } });
}
function duoPills(scored) {
  const t = DUO.d ? DUO.d.target || 5 : 5;
  for (const i of [0, 1]) {
    const pl = $('jdw-duo-pill' + i); pl.querySelector('b').textContent = DUO.scores[i];
    pl.classList.toggle('mp', !DUO.over && DUO.scores[i] === t - 1);
    if (scored === i) { pl.classList.remove('bump'); void pl.offsetWidth; pl.classList.add('bump'); }
  }
  if (NET.role === 'host') netCtl({ h: 'pills', s: DUO.scores, p: scored });
}
function duoApi(d, seq) {
  const P = [seatPlayer(0), seatPlayer(1)];
  const mine = () => DUO.seq === seq;
  return {
    players: P,
    heads: () => headsShown(),
    audio: audioApi, colors: COLORS, fonts: FONTS,
    assets: (name) => window.JDW_ASSETS.load(name || 'ilo'),
    point(p, why) {
      if (!mine() || (p !== 0 && p !== 1) || NET.role === 'guest') return { scores: DUO.scores.slice(), over: DUO.over, winner: DUO.winner };
      if (DUO.over) return { scores: DUO.scores.slice(), over: true, winner: DUO.winner };
      DUO.scores[p]++;
      const over = DUO.scores[p] >= (d.target || 5);
      if (over) { DUO.over = true; DUO.winner = p; }
      duoPills(p);
      duoSay((why ? why + ' ' : '') + (over ? P[p].name + ' gagne le match !' : 'Point pour ' + P[p].name + ' !'), { ms: 1300, color: P[p].color, small: true });
      if (!sting('point', 0.55, false)) Audio.tone(over ? 784 : 660, 0.12, 'square', 0.05, over ? 1175 : 880);
      if (!over && DUO.scores[p] === (d.target || 5) - 1 && !DUO.mp) {   // balle de match : la musique s'emballe
        DUO.mp = true; setTimeout(() => { if (mine()) { sting('match', 0.6); if (duoMusicId(d)) setMusic(duoMusicId(d), 'intense'); } }, 700);
      }
      if (over) setTimeout(() => { if (mine()) duoResults(); }, 1500);
      return { scores: DUO.scores.slice(), over, winner: over ? p : null };
    },
    round: () => DUO.scores[0] + DUO.scores[1] + 1,
    scores: () => DUO.scores.slice(),
    say: (text, o) => { if (mine() && NET.role !== 'guest') duoSay(text, o); },
    turn: (p) => { if (mine()) NET.turn = p === 0 || p === 1 ? p : -1; },   // jeux au tour par tour : qui a la main (duel en ligne)
    hasMusic: !!duoMusicId(d),   // la bibliothèque joue une musique pour ce duel : le jeu ne joue pas la sienne
    vibrate: (ms) => { try { if (navigator.vibrate) navigator.vibrate(Math.max(10, Math.min(400, +ms || 30))); } catch (e) {} },
    online: !!(NET.role && NET.data),
    // l'IA pilote le joueur du haut (DUO-CONTRACT.md, « Ajout : jouer contre l'IA »)
    ai: !NET.role && seatName(1) === AI_NAME ? { p: 1, level: aiLevel, k: AI_LEVELS[aiLevel][1] } : undefined,
    net: NET.role && NET.data ? netApi(seq) : undefined
  };
}
function openDuo(d) {
  if (!d) return;
  Audio.ensure();
  fsEnter(d.layout === 'landscape');   // plein écran (téléphone dans le navigateur ; en ligne : déjà fait au défi)
  DUO.d = d; DUO.shared = false;
  $('jdw-lib').hidden = true; $('jdw-duo').hidden = false;
  $('jdw-duo').classList.toggle('land', d.layout === 'landscape');
  for (const i of [0, 1]) { const av = $('jdw-duo-pill' + i).querySelector('.dp-av'); av.textContent = ''; av.appendChild(chatHead(seatPlayer(i).name, { passive: true })); }
  if (d.layout === 'landscape' && innerHeight > innerWidth) { DUO.waitRot = true; $('jdw-duo-rotate').hidden = false; setWhere('duel-' + d.id); return; }
  mountDuo();
}
function mountDuo() {
  const d = DUO.d; if (!d) return;
  unmountDuo();
  DUO.waitRot = false; $('jdw-duo-rotate').hidden = true; $('jdw-duo-res').hidden = true; $('jdw-duo-pause').hidden = true; $('jdw-duo-hud').hidden = false;
  $('jdw-duo').classList.remove('net-single', 'ai-single');
  $('jdw-duo').classList.toggle('ai-solo', !NET.role && seatName(1) === AI_NAME);   // contre l'IA : tout à l'endroit pour le joueur du bas
  const seq = DUO.seq;
  DUO.scores = [0, 0]; DUO.over = false; DUO.winner = null; DUO.paused = false; DUO.shared = false; duoPills();
  const root = document.createElement('div'); root.className = 'duo-root'; $('jdw-duo-host').appendChild(root); DUO.root = root;
  DUO.mp = false;
  const mid = duoMusicId(d), m = mid ? [mid, 'calm'] : DUO_MUSIC[d.id] || ['accueil', 'calm']; musicBaseLevel(0.7); MUS.override = false; setMusic(m[0], m[1]);
  preloadStings(['point', 'match', 'win']);
  NET.turn = -1; NET.handlers = [];
  if (NET.role === 'host' && NET.data) netCtl({ h: 'start', mode: 'data', g: d.id, layout: d.layout, names: NET.seats, photo: netMyPhoto() });
  DUO.api = duoApi(d, seq);
  try { DUO.inst = d.mount(root, DUO.api) || {}; }
  catch (e) { DUO.inst = {}; reportError('Duel ' + d.id + ' : ' + e.message, e.stack); toastCheer('Oups, ce duel a eu un souci.', profile.name, true); }
  if (NET.role && NET.data) { const q = NET.queue.splice(0); for (const m of q) netDeliver(m); }   // messages arrivés pendant le montage
  else if (NET.role === 'host') setTimeout(netAttach, 60);   // mode vidéo : l'image du nouveau plateau part chez l'adversaire
  setWhere('duel-' + d.id);
  if (d.layout === 'landscape') { fsLand(); fsTip(); }   // invité en ligne : verrou à l'horizontale ; iPhone : astuce (une fois)
}
function unmountDuo() {
  DUO.seq++;   // les rappels de l'ancienne partie deviennent sans effet
  if (DUO.inst) { try { if (DUO.inst.destroy) DUO.inst.destroy(); } catch (e) { reportError('Duel ' + (DUO.d && DUO.d.id) + ' (fin) : ' + e.message, e.stack, { quiet: true }); } }
  DUO.inst = null;
  if (DUO.root) { DUO.root.remove(); DUO.root = null; }
  for (const p of [0, 1]) { clearTimeout(DUO.sayT[p]); $('jdw-duo-say' + p).textContent = ''; }
}
function resHalf(i, land) {
  const el = $('jdw-duo-r' + i); el.textContent = '';
  const d = DUO.d, w = DUO.winner, win = i === w, me = seatPlayer(i), oth = seatPlayer(1 - i), pw = pairWins(d.id);
  el.className = 'dr-half ' + (win || land ? 'win' : 'lose');
  el.style.setProperty('--pc', DUO_COLORS[land ? w : i]);
  // décor : rayons et confettis pour le gagnant, petite pluie pour le perdant
  const deco = document.createElement('div'); deco.className = 'dr-deco'; deco.setAttribute('aria-hidden', 'true');
  if (win || land) {
    const rays = document.createElement('div'); rays.className = 'dr-rays'; deco.appendChild(rays);
    const cols = ['#ffd34d', '#ffa630', '#5ef0ff', '#ff5fae', '#4cc36a', '#ffffff'];
    for (let k = 0; k < 26; k++) { const c = document.createElement('i'); c.className = 'dr-conf'; c.style.left = (shellRand() * 100).toFixed(1) + '%'; c.style.setProperty('--c', cols[k % cols.length]); c.style.setProperty('--d', (shellRand() * 1.2).toFixed(2) + 's'); c.style.setProperty('--r', (shellRand() * 720 - 360).toFixed(0) + 'deg'); c.style.setProperty('--x', (shellRand() * 80 - 40).toFixed(0) + 'px'); deco.appendChild(c); }
  } else {
    for (let k = 0; k < 22; k++) { const r = document.createElement('i'); r.className = 'dr-rain'; r.style.left = (shellRand() * 100).toFixed(1) + '%'; r.style.setProperty('--d', (shellRand() * 1.2).toFixed(2) + 's'); r.style.setProperty('--s', (0.7 + shellRand() * 0.5).toFixed(2) + 's'); deco.appendChild(r); }
  }
  el.appendChild(deco);
  const heads = document.createElement('div'); heads.className = 'dr-heads';
  const hd = (pl, isWin) => {
    const b = document.createElement('div'); b.className = 'dr-head' + (isWin ? ' w' : '');
    b.appendChild(chatHead(pl.name, { passive: true, sad: !isWin }));
    if (isWin) { const cr = document.createElement('span'); cr.className = 'dr-crown'; cr.textContent = '👑'; b.appendChild(cr); }
    return b;
  };
  if (land) heads.append(hd(seatPlayer(w), true), hd(seatPlayer(1 - w), false)); else heads.append(hd(me, win));
  const h = document.createElement('h2'); h.textContent = land ? '🏆 ' + dispName(seatPlayer(w).name) + ' gagne !' : win ? 'Gagné !' : 'Perdu…';
  const sc = document.createElement('p'); sc.className = 'dr-score';
  const a = land ? w : i, b2 = 1 - a, s1 = document.createElement('b'), s2 = document.createElement('b');
  s1.textContent = DUO.scores[a]; s1.style.color = DUO_COLORS[a]; s2.textContent = DUO.scores[b2]; s2.style.color = DUO_COLORS[b2];
  sc.append(s1, ' – ', s2);
  const sub = document.createElement('p'); sub.className = 'dr-sub';
  sub.textContent = sameSeats() ? (win ? 'Bravo !' : 'Revanche ?')
    : land ? d.title + ' · victoires : ' + seatName(0) + ' ' + pw[0] + ' – ' + pw[1] + ' ' + seatName(1)
    : d.title + ' · tes victoires : ' + pw[i] + ' – ' + pw[1 - i] + ' contre ' + oth.name;
  const row = document.createElement('div'); row.className = 'dr-btns';
  row.append(duoBtn('Revanche !', 'btn btn-play', duoRematch), duoBtn('Autre duel', 'btn btn-ghost', duoLeave));
  el.append(heads, h, sc, sub, row);
  // le gagnant peut l'annoncer dans le chat de la salle
  if ((win || land) && ONLINE && room && !sameSeats()) {
    const sh = duoBtn('📣 Annoncer dans le chat', 'btn btn-ghost btn-sm dr-share', async () => {
      if (DUO.shared) return; DUO.shared = true; sh.disabled = true; sh.textContent = 'Envoi…';
      const W = seatPlayer(w).name, L = seatPlayer(1 - w).name;
      try {
        await rpc('post_message', Object.assign({ p_code: CODE() }, RP(), { p_name: profile.name, p_body: '⚔️ ' + W + ' a battu ' + L + ' ' + DUO.scores[w] + ' à ' + DUO.scores[1 - w] + ' en duel · ' + d.title + ' !' }));
        poke('chat'); sh.textContent = '✓ Annoncé';
      } catch (e) { DUO.shared = false; sh.disabled = false; sh.textContent = '📣 Annoncer dans le chat'; }
    });
    el.appendChild(sh);
  }
}
function duoResults() {
  const d = DUO.d; if (!d) return;
  const w = DUO.winner, land = d.layout === 'landscape';
  if (NET.role === 'host') netCtl({ h: 'res', w, s: DUO.scores });
  unmountDuo();
  addWin(d.id, w);
  const aiSolo = !NET.role && seatName(1) === AI_NAME && !land;   // contre l'IA : un seul résultat, à l'endroit
  const single = (NET.role && NET.data && !land) || aiSolo;   // en ligne : chacun ne voit que son propre résultat
  $('jdw-duo').classList.toggle('net-single', !!(single && !aiSolo)); $('jdw-duo').classList.toggle('ai-single', aiSolo);
  resHalf(0, land); if (!land && !single) resHalf(1, false);
  $('jdw-duo-res').hidden = false; $('jdw-duo-hud').hidden = true;
  musicBaseLevel(0.5);
  if (!sting('win', 0.9)) { Audio.tone(523, 0.12, 'square', 0.06); setTimeout(() => Audio.tone(659, 0.12, 'square', 0.06), 130); setTimeout(() => Audio.tone(784, 0.3, 'square', 0.06), 260); }
  if ((window.JDW_MUSIC || {}).dscores) setMusic('dscores', 'calm');
  const wn = seatName(w);
  if (wn !== GUEST) setTimeout(() => playCri(wn), 1800);
  setWhere('menu');
}
function duoRematch() {
  if (NET.role === 'guest') { netCtl({ h: 'rematch' }); $('jdw-duo-res').hidden = true; $('jdw-duo-hud').hidden = false; duoSay('Revanche demandée…', { small: true, ms: 2500 }); return; }
  mountDuo();
}
function duoLeave() { if (NET.role) netEnd(true); else closeDuo(); }
function closeDuo() {
  if (NET.role) { netEnd(true); return; }
  unmountDuo();
  DUO.d = null; DUO.waitRot = false; DUO.paused = false;
  $('jdw-duo').hidden = true; $('jdw-duo-res').hidden = true; $('jdw-duo-pause').hidden = true; $('jdw-duo-rotate').hidden = true;
  $('jdw-lib').hidden = false;
  setWhere('menu'); refreshDuoTiles(); musicBaseLevel(1); MUS.override = false; setMusic('accueil');
  fsLeave();
  if (siteNew) setTimeout(maybeReload, 800);
}
function duoPause() {
  if (NET.role === 'guest') { if (!DUO.over) netCtl({ h: 'pausereq' }); return; }
  if (!DUO.inst || DUO.over) return;
  if (NET.role === 'host') netCtl({ h: 'pause' });
  if (!DUO.paused) { DUO.paused = true; try { if (DUO.inst.pause) DUO.inst.pause(); } catch (e) {} musicBaseLevel(0.35); }
  // les deux joueurs, leur tête et le score à leurs couleurs
  const sub = $('jdw-duo-pause-sub'); sub.textContent = '';
  const side = i => { const b = document.createElement('span'); b.className = 'dp-side'; b.style.setProperty('--pc', DUO_COLORS[i]);
    const n = document.createElement('b'); n.textContent = dispName(seatPlayer(i).name); b.append(chatHead(seatPlayer(i).name, { passive: true }), n); return b; };
  const sc = document.createElement('span'); sc.className = 'dp-score';
  const s0 = document.createElement('b'), s1 = document.createElement('b'); s0.textContent = DUO.scores[0]; s0.style.color = DUO_COLORS[0]; s1.textContent = DUO.scores[1]; s1.style.color = DUO_COLORS[1];
  sc.append(s0, ' – ', s1);
  const g = document.createElement('small'); g.className = 'dp-game'; g.textContent = DUO.d.title + ' · en ' + (DUO.d.target || 5) + ' points';
  sub.append(side(0), sc, side(1), g);
  $('jdw-duo-pause').style.setProperty('--acc', DUO.d.accent || COLORS.amber);
  $('jdw-duo-pause').hidden = false;
  setTimeout(() => { const b = $('jdw-duo-resume'); if (b && !$('jdw-duo-pause').hidden) b.focus({ preventScroll: true }); }, 30);
}
function duoResume() {
  $('jdw-duo-pause').hidden = true;
  if (NET.role === 'guest') { netCtl({ h: 'resumereq' }); return; }
  if (NET.role === 'host') netCtl({ h: 'resume' });
  if (!DUO.paused) return;
  DUO.paused = false; musicBaseLevel(0.7);
  try { if (DUO.inst && DUO.inst.resume) DUO.inst.resume(); } catch (e) {}
}
function duoBack() {
  if (!$('jdw-duo-res').hidden || DUO.waitRot) { duoLeave(); return; }
  if (!$('jdw-duo-pause').hidden) { duoResume(); return; }
  duoPause();
}
$('jdw-duo-menu').addEventListener('click', duoPause);
$('jdw-duo-resume').addEventListener('click', duoResume);
$('jdw-duo-restart').addEventListener('click', () => { if (NET.role === 'guest') { netCtl({ h: 'rematch' }); $('jdw-duo-pause').hidden = true; } else mountDuo(); });
$('jdw-duo-quit').addEventListener('click', duoLeave);
$('jdw-duo-rotate-skip').addEventListener('click', () => mountDuo());
$('jdw-duo-rotate-back').addEventListener('click', closeDuo);
addEventListener('resize', () => { if (DUO.waitRot && innerWidth > innerHeight) mountDuo(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !$('jdw-duo').hidden && DUO.inst && !DUO.over) duoPause(); });

/* ================= Compétition : toute la salle sur le même jeu, en mode difficile ================= */
// Rien de plus sur le serveur : la présence de la salle dit qui participe (rôle, état, score) et des signaux « cmp »
// portent le GO, les scores en direct, les sorties et les réactions. L'hôte (le premier inscrit encore là) donne le GO
// dès que 2 joueurs sont prêts ; chacun joue sur son téléphone, au même niveau difficile et avec la même graine.
const COMPET_START = { magic: 2, ilo: 4, pleingaz: 4, empilo: 5, glouton: 4, mouches: 4, carreaux: 7, rouleaux: 7 };
const COMPET_GO_MS = 10000;
const REACTIONS = ['😂', '🔥', '💩', '😱', '👏', '😈'];
const CMP = { id: null, g: null, role: null, st: null, t: 0, seed: 0, score: 0, goAt: 0, goFor: '', goSent: 0, goN: 0,
  playing: false, practice: false, roster: new Map(), rid: null, seen: new Set(), ended: '', lastSc: 0, lastTrack: 0, rxLast: 0, pickFor: '' };
const cmpGame = id => gameById(id);
function cmpMeta() { return CMP.id ? { id: CMP.id, g: CMP.g, r: CMP.role, st: CMP.st, s: CMP.score, t: CMP.t, seed: CMP.seed } : null; }
function cmpReset() {
  Object.assign(CMP, { id: null, g: null, role: null, st: null, t: 0, seed: 0, score: 0, goAt: 0, goFor: '', goSent: 0, goN: 0, playing: false, practice: false, ended: '' });
}
// compétitions annoncées dans la salle (normalement une seule : la plus ancienne gagne)
function cmpAll() {
  const by = new Map();
  for (const x of presList()) {
    const c = x.cmp; if (!c || !c.id || !cmpGame(c.g)) continue;
    const e = by.get(c.id) || { id: c.id, g: c.g, t: Infinity, members: new Map() };
    e.t = Math.min(e.t, +c.t || 0); e.members.set(x.name, { name: x.name, r: c.r, st: c.st, s: +c.s || 0, t: +c.t || 0, seed: +c.seed || 0 });
    by.set(c.id, e);
  }
  return [...by.values()].sort((a, b) => a.t - b.t);
}
const cmpFinished = c => { const ps = [...c.members.values()].filter(m => m.r === 'p'); return ps.length > 0 && ps.every(m => m.st === 'out'); };
function cmpView() {   // la compétition affichée : la mienne, sinon celle en cours dans la salle, sinon la dernière terminée
  const all = cmpAll();
  if (CMP.id) return all.find(c => c.id === CMP.id) || { id: CMP.id, g: CMP.g, t: CMP.t, members: new Map() };
  return all.find(c => !cmpFinished(c)) || all[all.length - 1] || null;
}
// liste des concurrents de la compétition affichée, gardée même si quelqu'un s'en va (son dernier score compte)
function cmpSync() {
  const v = cmpView();
  if (!v) { CMP.rid = null; CMP.roster = new Map(); return null; }
  if (CMP.rid !== v.id) { CMP.rid = v.id; CMP.roster = new Map(); }
  for (const m of v.members.values()) {
    const o = CMP.roster.get(m.name) || {};
    CMP.roster.set(m.name, Object.assign({}, o, m, { s: Math.max(m.s, o.s || 0), gone: false }));
  }
  for (const [n, o] of CMP.roster) if (!v.members.has(n) && !o.gone) { o.gone = true; if (o.st === 'play') o.st = 'out'; if (o.st !== 'out') CMP.roster.delete(n); }
  if (CMP.id) {   // moi, sans attendre l'écho de la présence
    const me = cleanName(profile.name), o = CMP.roster.get(me) || {};
    CMP.roster.set(me, Object.assign({}, o, { name: me, r: CMP.role, st: CMP.st, s: Math.max(CMP.score, CMP.st === 'out' ? 0 : o.s || 0), t: CMP.t, gone: false }));
    if (CMP.st === 'out') CMP.roster.get(me).s = CMP.score;
  }
  return v;
}
const cmpPlayers = () => [...CMP.roster.values()].filter(m => m.r === 'p');
function cmpHost() {
  const ps = cmpPlayers().filter(m => !m.gone).sort((a, b) => a.t - b.t || a.name.localeCompare(b.name));
  return ps.length ? ps[0].name : '';
}
function cmpPhase() {
  const ps = cmpPlayers();
  if (ps.some(m => m.st === 'play')) return 'play';
  if (ps.some(m => m.st === 'out') && !ps.some(m => m.st === 'lobby' && !m.gone)) return 'end';
  if (CMP.goAt && CMP.goFor === CMP.rid) return 'countdown';
  return 'lobby';
}
function cmpRanking() {
  return cmpPlayers().filter(m => m.st === 'play' || m.st === 'out').sort((a, b) => b.s - a.s || a.name.localeCompare(b.name));
}
// ---------- actions ----------
function cmpCreate(g) {
  if (!room) { openRooms(); return; }
  const v = cmpView(); if (v && !CMP.id && !cmpFinished(v)) { cmpJoin('p'); return; }
  Audio.ensure();
  cmpReset(); CMP.id = 'c' + Date.now().toString(36) + shellRand().toString(36).slice(2, 6);
  CMP.g = g.id; CMP.role = 'p'; CMP.st = 'lobby'; CMP.t = Date.now(); preloadStings(['go', 'podium']);
  rtTrack(); rtBroadcast({ t: 'cmp', k: 'open', id: CMP.id, g: g.id, n: cleanName(profile.name) });
  cmpSync(); renderCompet();
}
function cmpJoin(role) {
  const v = cmpView(); if (!v) return;
  Audio.ensure();
  const was = CMP.id === v.id ? CMP.t : 0;
  CMP.id = v.id; CMP.g = v.g; CMP.role = role; CMP.st = role === 'p' ? 'lobby' : 'watch'; CMP.t = was || Date.now(); preloadStings(['go', 'podium']);
  CMP.seed = [...v.members.values()].map(m => m.seed).find(Boolean) || CMP.seed;   // arrivée en cours de partie : même graine que les autres
  if (role === 'p') CMP.score = 0;
  rtTrack(); cmpSync();
  if (role === 'p' && cmpPhase() === 'play') { cmpStartGame(); return; }   // on rejoint une partie en cours : départ immédiat
  renderCompet();
}
function cmpLeave() {
  if (CMP.playing) return;
  cmpReset(); rtTrack(); cmpSync(); renderCompet();
}
function cmpStartGame() {
  const g = cmpGame(CMP.g); if (!g) return;
  if (current) { CMP.practice = false; unmountGame(); }
  CMP.practice = false; CMP.playing = true; CMP.st = 'play'; CMP.score = 0; CMP.lastSc = 0; CMP.goAt = 0;
  rtTrack(); rtBroadcast({ t: 'cmp', k: 'sc', id: CMP.id, n: cleanName(profile.name), s: 0 });
  cmpOpenGame(g);
}
function cmpOpenGame(g) {
  $('jdw-play').classList.add('cmp'); $('jdw-cmp-side').hidden = false; renderCmpSide();
  openGame(g);
  setTimeout(() => dispatchEvent(new Event('resize')), 80);   // Plein Gaz se mesure au redimensionnement
}
function cmpPractice() {
  const g = cmpGame(CMP.g); if (!g || CMP.playing) return;
  CMP.practice = true; cmpOpenGame(g);
  toastCheer('Entraînement : ça ne compte pas. Dès qu\'un copain est prêt : GO !', profile.name, true);
}
function cmpPracticeOver() {
  CMP.practice = false; backToLibrary(); setMode('compet');
}
function cmpOut(score) {
  CMP.playing = false; CMP.st = 'out'; CMP.score = Math.max(0, Math.floor(+score || 0));
  rtTrack(); rtBroadcast({ t: 'cmp', k: 'out', id: CMP.id, n: cleanName(profile.name), s: CMP.score });
  backToLibrary(); setMode('compet');
  cmpSync();
  renderCompet(); cmpCheckEnd();
  if ($('jdw-podium').hidden) {   // les autres jouent encore : où j'en suis
    const rk = cmpRanking().findIndex(m => m.name === cleanName(profile.name)) + 1;
    toastCheer('Terminé : ' + fmt(CMP.score) + ' points' + (rk ? ', ' + (rk === 1 ? '1er' : rk + 'e') + ' pour l\'instant' : '') + ' !', profile.name, true);
  }
}
// ---------- signaux en direct ----------
function cmpOnSignal(p) {
  if (p.k === 'open') { cmpOnPresence(); return; }
  if (p.id !== CMP.rid && p.id !== CMP.id) return;
  if (p.k === 'go') {
    CMP.goAt = Date.now() + Math.max(0, Math.min(15000, +p.in || 0)); CMP.goFor = p.id; CMP.seed = +p.seed || CMP.seed;
    if (CMP.id === p.id) rtTrack();
    renderCompet(); return;
  }
  const n = cleanName(p.n); if (!n) return;
  const o = CMP.roster.get(n) || { name: n, r: 'p', t: Date.now() };
  if (p.k === 'sc') { o.s = Math.max(0, +p.s || 0); if (o.st !== 'out') o.st = 'play'; CMP.roster.set(n, o); }
  else if (p.k === 'out') { o.s = Math.max(0, +p.s || 0); o.st = 'out'; CMP.roster.set(n, o); cmpCheckEnd(); }
  else if (p.k === 're') { cmpShowReact(n, cleanName(p.to), String(p.e || '').slice(0, 4)); return; }
  renderCompetSoon();
}
let cmpRenderT = 0;
function renderCompetSoon() { if (cmpRenderT) return; cmpRenderT = setTimeout(() => { cmpRenderT = 0; renderCompet(); renderCmpSide(); }, 120); }
function cmpOnPresence() {
  const before = CMP.rid;
  const v = cmpSync();
  // une nouvelle compétition dans la salle : on prévient (sauf si c'est moi qui l'ai lancée)
  for (const c of cmpAll()) if (!CMP.seen.has(c.id)) {
    CMP.seen.add(c.id);
    const first = [...c.members.values()].sort((a, b) => a.t - b.t)[0];
    const g = cmpGame(c.g);
    if (first && g && c.id !== CMP.id && first.name !== cleanName(profile.name) && PRES.ok && Date.now() - c.t < 120000)
      toastCheer('🏆 ' + first.name + ' lance une compétition : ' + g.title + ' ! Viens jouer (onglet Compétition).', first.name, true);
  }
  $('jdw-cmp-badge').hidden = !cmpAll().some(c => !cmpFinished(c));
  if (CMP.id && !v) { /* ma compétition n'est plus annoncée (coupure) : on garde l'état local */ }
  if (v && before !== v.id) renderCompet();
  renderCompetSoon();
  cmpCheckEnd();
}
// ---------- l'hôte donne le GO ; tout le monde démarre à l'heure ----------
function cmpTick() {
  if (!CMP.rid) return;
  const ph = cmpPhase(), me = cleanName(profile.name);
  const ready = cmpPlayers().filter(m => m.st === 'lobby' && !m.gone);
  if (CMP.id && cmpHost() === me && ph === 'lobby' && ready.length >= 2 && !CMP.goAt) {
    CMP.seed = (Date.now() ^ (shellRand() * 0x7fffffff)) & 0x7fffffff;
    CMP.goAt = Date.now() + COMPET_GO_MS; CMP.goFor = CMP.rid; CMP.goN = ready.length; CMP.goSent = Date.now();
    rtBroadcast({ t: 'cmp', k: 'go', id: CMP.rid, in: COMPET_GO_MS, seed: CMP.seed }); rtTrack();
  } else if (CMP.id && cmpHost() === me && CMP.goAt && (ready.length !== CMP.goN || Date.now() - CMP.goSent > 3000) && CMP.goAt - Date.now() > 800) {
    // quelqu'un vient d'arriver pendant le compte à rebours : on lui redonne l'heure du GO
    CMP.goN = ready.length; CMP.goSent = Date.now();
    rtBroadcast({ t: 'cmp', k: 'go', id: CMP.rid, in: CMP.goAt - Date.now(), seed: CMP.seed });
  }
  if (CMP.goAt && Date.now() >= CMP.goAt) {
    CMP.goAt = 0;
    if (CMP.id && CMP.role === 'p' && CMP.st === 'lobby' && cmpPlayers().filter(m => m.st === 'lobby' || m.st === 'play').length >= 2) {
      // occupé ailleurs (autre partie, duel, vidéo) : on ne coupe rien, on passe spectateur (on peut rejoindre ensuite)
      if ((current && !CMP.practice) || !$('jdw-duo').hidden || WATCH.sid || document.hidden) {
        CMP.role = 'w'; CMP.st = 'watch'; rtTrack();
        const g = cmpGame(CMP.g); toastCheer('La compétition ' + (g ? g.title + ' ' : '') + 'a commencé : rejoins-la quand tu veux (onglet Compétition).', me, true);
        renderCompet(); return;
      }
      toastCheer('GO ! Que le meilleur gagne !', me, true); sting('go', 0.9); cmpStartGame(); return;
    }
  }
  // scores en direct pendant ma partie
  if (CMP.playing && current && current.inst && current.inst.currentScore) {
    let sc = 0; try { sc = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (e) {}
    if (sc !== CMP.score) { CMP.score = sc; rtBroadcast({ t: 'cmp', k: 'sc', id: CMP.id, n: me, s: sc }); }
    if (Date.now() - CMP.lastTrack > 5000) { CMP.lastTrack = Date.now(); rtTrack(); }
  }
  if (!$('jdw-lib').hidden && MODE === 'compet') renderCompetTimer();
  if (CMP.playing || CMP.practice) renderCmpSide();
}
setInterval(cmpTick, 500);
function cmpCheckEnd() {
  if (!CMP.rid || CMP.ended === CMP.rid || cmpPhase() !== 'end') return;
  const rank = cmpRanking(); if (!rank.length) return;
  if (CMP.id !== CMP.rid) return;   // le podium s'affiche chez les participants (joueurs et spectateurs)
  CMP.ended = CMP.rid;
  cmpPodium(rank);
}
function cmpPodium(rank) {
  const g = cmpGame(CMP.g), me = cleanName(profile.name);
  $('jdw-podium-game').textContent = (g ? g.title : '') + ' · compétition';
  const solo = rank.length < 2;
  $('jdw-podium-h').textContent = solo ? 'Tout seul…' : '🏆 ' + dispName(rank[0].name) + ' gagne !';
  const st = $('jdw-podium-steps'); st.textContent = '';
  const order = [1, 0, 2];
  for (const i of order) {
    const r = rank[i]; if (!r) continue;
    const col = document.createElement('div'); col.className = 'pod pod' + (i + 1) + (r.name === me ? ' me' : '');
    const hd = chatHead(r.name, { passive: true, sad: i > 0 });
    if (i === 0) { const cr = document.createElement('span'); cr.className = 'champ-crown'; cr.textContent = '👑'; hd.appendChild(cr); }
    const nm = document.createElement('b'); nm.textContent = dispName(r.name);
    const sc = document.createElement('span'); sc.className = 'pod-s'; sc.textContent = fmt(r.s);
    const blk = document.createElement('div'); blk.className = 'pod-blk'; blk.textContent = String(i + 1);
    col.append(hd, nm, sc, blk); st.appendChild(col);
  }
  const ol = $('jdw-podium-rest'); ol.textContent = '';
  rank.slice(3).forEach((r, k) => { const sp = document.createElement('span'); sp.className = 's'; sp.textContent = (k + 4) + 'e · ' + fmt(r.s); ol.appendChild(rowEl(r.name, sp, r.name === me)); });
  if (solo) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Personne d\'autre n\'a joué : cette compétition ne compte pas.'; ol.appendChild(li); }
  openSheet('jdw-podium', 'jdw-podium-again');
  if (!solo) {
    if (!sting('podium', 0.9)) { Audio.tone(523, 0.12, 'square', 0.06); setTimeout(() => Audio.tone(659, 0.12, 'square', 0.06), 130); setTimeout(() => Audio.tone(784, 0.3, 'square', 0.06), 260); }
    setTimeout(() => playCri(rank[0].name), 2200);
    // l'hôte annonce le podium dans le chat de la salle (un seul message)
    if (cmpHost() === me || (rank[0].name === me && !CMP.roster.has(cmpHost()))) {
      const body = '🏆 Compétition ' + (g ? g.title : '') + ' : ' + rank.slice(0, 5).map((r, k) => (k + 1) + '. ' + r.name + ' ' + fmt(r.s)).join(' · ');
      rpc('post_message', Object.assign({ p_code: CODE() }, RP(), { p_name: profile.name, p_body: body })).then(() => poke('chat')).catch(() => {});
    }
  }
}
function cmpClosePodium() { closeSheet('jdw-podium'); cmpReset(); rtTrack(); cmpSync(); renderCompet(); }
$('jdw-podium-close').addEventListener('click', cmpClosePodium);
$('jdw-podium-again').addEventListener('click', () => { const g = cmpGame(CMP.g); cmpClosePodium(); if (g) cmpCreate(g); });
// ---------- réactions ----------
function cmpOpenPick(name, anchor) {
  const pk = $('jdw-cmp-pick'); pk.textContent = ''; CMP.pickFor = name;
  for (const e of REACTIONS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = e; b.setAttribute('role', 'menuitem'); b.setAttribute('aria-label', 'Envoyer ' + e + ' à ' + name);
    b.addEventListener('click', ev => { ev.stopPropagation(); cmpReact(name, e); cmpClosePick(); });
    pk.appendChild(b);
  }
  const lab = document.createElement('span'); lab.className = 'pk-to'; lab.textContent = '→ ' + dispName(name); pk.appendChild(lab);
  pk.hidden = false;
  const r = anchor.getBoundingClientRect(), w = pk.offsetWidth, hh = pk.offsetHeight;
  let x = r.left + r.width / 2 - w / 2, y = r.top - hh - 8;
  if (y < 8) y = r.bottom + 8;
  x = Math.max(8, Math.min(innerWidth - w - 8, x));
  pk.style.left = x + 'px'; pk.style.top = y + 'px';
}
function cmpClosePick() { $('jdw-cmp-pick').hidden = true; CMP.pickFor = ''; }
document.addEventListener('pointerdown', e => { if (!$('jdw-cmp-pick').hidden && !$('jdw-cmp-pick').contains(e.target) && !(e.target.closest && e.target.closest('[data-rx]'))) cmpClosePick(); }, true);
function cmpReact(to, e) {
  if (Date.now() - CMP.rxLast < 1200) return;
  CMP.rxLast = Date.now();
  const me = cleanName(profile.name);
  rtBroadcast({ t: 'cmp', k: 're', id: CMP.rid, n: me, to, e });
  cmpShowReact(me, to, e);
}
const rxIn = {};
function cmpShowReact(from, to, e) { rxShow(from, to, e); }
function rxShow(from, to, e) {
  const k = from, now = Date.now(); rxIn[k] = (rxIn[k] || []).filter(t => now - t < 1000); if (rxIn[k].length >= 3) return; rxIn[k].push(now);
  for (const el of document.querySelectorAll('[data-rx="' + CSS.escape(to) + '"]')) {
    if (!el.offsetParent) continue;
    const r = el.getBoundingClientRect(), fl = document.createElement('span');
    fl.className = 'rx-fly'; fl.textContent = e; fl.style.left = (r.left + r.width / 2) + 'px'; fl.style.top = (r.top + r.height / 2) + 'px';
    fl.style.setProperty('--dx', (shellRand() * 40 - 20).toFixed(0) + 'px');
    document.body.appendChild(fl); setTimeout(() => fl.remove(), 1500);
  }
  // je regarde celui qui reçoit ça : je le vois aussi, comme lui
  if (WATCH.sid && to === WATCH.name && from !== cleanName(profile.name)) watchBubble(from, e);
  // pour moi en pleine partie : la tête de celui qui m'envoie ça, en grand
  if (to === cleanName(profile.name) && from !== to && !$('jdw-play').hidden) {
    const box = document.createElement('div'); box.className = 'rx-me' + (e.length > 4 ? ' txt' : '');
    const hd = chatHead(from, { passive: true }); const em = document.createElement('span'); em.className = 'rx-me-e'; em.textContent = e;
    const nm = document.createElement('b'); nm.textContent = dispName(from); box.append(hd, em, nm);
    $('jdw-play').appendChild(box); setTimeout(() => box.remove(), e.length > 14 ? 3400 : 1900);
    Audio.tone(880, 0.06, 'sine', 0.05, 1320);
  }
}
// ---------- affichage : page Compétition ----------
function cmpRowStatus(m) {
  if (m.r === 'w') return { t: '👁 regarde', c: 'w' };
  if (m.st === 'play') return { t: '● en jeu', c: 'p' };
  if (m.st === 'out') return { t: m.gone ? 'parti' : 'terminé', c: 'o' };
  return { t: 'prêt', c: 'l' };
}
function renderCompet() {
  if (MODE !== 'compet') return;
  const off = netOff() && !CMP.id && !isGuest(), v = off ? null : cmpSync(), noRoom = !ONLINE || !room || off, gst = isGuest();
  $('jdw-cmp-none').hidden = !noRoom;
  $('jdw-cmp-none').classList.toggle('net-need', off);
  $('jdw-cmp-none').querySelector('p').textContent = gst ? 'La compétition se joue en direct avec les copains de ta salle : crée ton compte pour y participer.'
    : off ? 'Il faut du réseau : la compétition se joue en direct avec les copains de ta salle. En attendant, les jeux solo et les duels sur ce téléphone marchent hors ligne.'
    : 'La compétition se joue en direct avec les copains de ta salle.';
  $('jdw-cmp-room').textContent = gst ? 'Créer mon compte' : off ? '↻ Réessayer' : 'Choisir une salle';
  const ph = v ? cmpPhase() : 'lobby', ended = !!v && CMP.id !== v.id && cmpFinished(v);
  $('jdw-cmp-idle').hidden = noRoom || (!!v && !ended);
  $('jdw-cmp-card').hidden = noRoom || !v;
  if (noRoom) return;
  if (!v || ended) renderCmpGames();
  if (!v) return;
  const g = cmpGame(v.g), me = cleanName(profile.name);
  $('jdw-cmp-card').style.setProperty('--acc', g ? g.accent : COLORS.amber);
  $('jdw-cmp-game').textContent = g ? g.title : v.g;
  $('jdw-cmp-hint').textContent = g ? (g.tagline || '') + ' Départ au niveau ' + (COMPET_START[g.id] || 1) + ', une seule vie.' : '';
  const ps = cmpPlayers(), watchers = [...CMP.roster.values()].filter(m => m.r === 'w' && !m.gone);
  $('jdw-cmp-count').textContent = ps.filter(m => !m.gone).length + ' 🎮' + (watchers.length ? ' · ' + watchers.length + ' 👁' : '');
  // concurrents, triés par score
  const ol = $('jdw-cmp-list'); ol.textContent = '';
  const rows = [...CMP.roster.values()].filter(m => !(m.gone && m.st !== 'out')).sort((a, b) => (b.r === 'p') - (a.r === 'p') || b.s - a.s || a.t - b.t);
  rows.forEach(m => {
    const li = document.createElement('li'); li.className = 'cmp-row' + (m.name === me ? ' me' : '') + (m.st === 'out' ? ' out' : '');
    const hb = document.createElement('button'); hb.type = 'button'; hb.className = 'cmp-head'; hb.dataset.rx = m.name; hb.setAttribute('aria-label', 'Réagir à ' + m.name);
    hb.appendChild(chatHead(m.name, { passive: true, sad: m.st === 'out' && ph === 'end' && rows[0] !== m }));
    hb.addEventListener('click', () => { if (m.name !== me) cmpOpenPick(m.name, hb); });
    const tx = document.createElement('span'); tx.className = 'cmp-tx';
    const nb = document.createElement('b'); nb.textContent = dispName(m.name); const stt = cmpRowStatus(m); const sm = document.createElement('small'); sm.className = 'st-' + stt.c; sm.textContent = stt.t;
    tx.append(nb, sm);
    const sc = document.createElement('span'); sc.className = 'cmp-sc'; sc.textContent = m.r === 'p' && (m.st === 'play' || m.st === 'out') ? fmt(m.s) : '';
    li.append(hb, tx, sc);
    if (m.st === 'play' && m.name !== me && presCid(m.name, v.g)) { const wb = document.createElement('button'); wb.type = 'button'; wb.className = 'cmp-watch'; wb.textContent = '👁'; wb.setAttribute('aria-label', 'Regarder ' + m.name + ' jouer'); wb.addEventListener('click', () => watchStart(m.name, v.g)); li.appendChild(wb); }
    ol.appendChild(li);
  });
  // boutons selon mon état
  const bt = $('jdw-cmp-btns'); bt.textContent = '';
  const mk = (t, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = t; b.addEventListener('click', fn); bt.appendChild(b); return b; };
  if (CMP.id !== v.id && ended) {
    mk('🏆 Nouvelle compétition', 'btn btn-play', () => { if (g) cmpCreate(g); });
  } else if (CMP.id !== v.id) {
    mk(ph === 'play' ? '🎮 Rejoindre la partie' : '🎮 Je joue', 'btn btn-play', () => cmpJoin('p'));
    mk('👁 Je regarde', 'btn btn-ghost', () => cmpJoin('w'));
  } else if (CMP.role === 'w') {
    if (ph !== 'end') mk('🎮 Je joue aussi', 'btn btn-play', () => cmpJoin('p'));
    mk('Quitter', 'btn btn-ghost', cmpLeave);
  } else if (CMP.st === 'lobby') {
    if (ph === 'lobby') mk('S\'entraîner en attendant', 'btn btn-ghost', cmpPractice);
    mk('Quitter', 'btn btn-ghost', cmpLeave);
  } else if (CMP.st === 'out') {
    mk('Quitter', 'btn btn-ghost', cmpLeave);
  }
  renderCompetTimer();
  cmpDemoRun();
}
function renderCompetTimer() {
  if (MODE !== 'compet' || $('jdw-cmp-card').hidden) return;
  const ph = cmpPhase(), go = $('jdw-cmp-go'), ps = cmpPlayers().filter(m => !m.gone);
  let txt;
  if (ph === 'countdown') {
    const left = Math.max(0, Math.ceil((CMP.goAt - Date.now()) / 1000));
    txt = 'GO dans ' + left + ' s !'; go.hidden = false; if (go.textContent !== String(left)) { go.textContent = String(left); go.classList.remove('tick'); void go.offsetWidth; go.classList.add('tick'); }
  } else {
    go.hidden = true;
    txt = ph === 'play' ? 'En cours · ' + ps.filter(m => m.st === 'play').length + ' en piste'
      : ph === 'end' ? 'Terminé'
      : ps.filter(m => m.st === 'lobby').length < 2 ? 'En attente d\'un 2e joueur : dès qu\'il arrive, GO !' : 'Prêts…';
  }
  if ($('jdw-cmp-phase').textContent !== txt) $('jdw-cmp-phase').textContent = txt;
}
// démo rapide : la vignette animée du jeu en grand
let cmpDemoOn = false;
function cmpDemoRun() { if (!cmpDemoOn) { cmpDemoOn = true; requestAnimationFrame(cmpDemoFrame); } }
function cmpDemoFrame(ts) {
  const card = $('jdw-cmp-card');
  if (MODE !== 'compet' || card.hidden || $('jdw-lib').hidden || document.hidden) { cmpDemoOn = false; return; }
  requestAnimationFrame(cmpDemoFrame);
  const v = cmpView(), g = v && cmpGame(v.g); if (!g) return;
  const c = $('jdw-cmp-canvas'), w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const ctx = c.getContext('2d'); ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  try { g.preview(ctx, w, h, ts / 1000); } catch (e) { ctx.fillStyle = COLORS.night; ctx.fillRect(0, 0, w, h); }
  ctx.restore();
}
function renderCmpGames() {
  const wrap = $('jdw-cmp-games'); if (wrap.childElementCount) return;
  for (const g of GAMES) {
    if (!(g.id in COMPET_START)) continue;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cmp-game'; b.style.setProperty('--acc', g.accent || COLORS.amber);
    const t = document.createElement('span'); t.className = 'cg-t';
    const nb = document.createElement('b'); nb.textContent = g.title; const sm = document.createElement('small'); sm.textContent = 'Départ au niveau ' + COMPET_START[g.id];
    t.append(nb, sm);
    const go = document.createElement('span'); go.className = 'cg-go'; go.textContent = 'Lancer';
    const cv = document.createElement('canvas'); cv.className = 'cg-img'; cv.setAttribute('aria-hidden', 'true');
    b.append(cv, t, go); b.addEventListener('click', () => cmpCreate(g)); wrap.appendChild(b);
    cmpTiles.push({ g, el: b, canvas: cv, visible: false });
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { const t = cmpTiles.find(x => x.el === e.target); if (t) t.visible = e.isIntersecting; }), { root: $('jdw-lib') });
    cmpTiles.forEach(t => io.observe(t.el));
  } else cmpTiles.forEach(t => { t.visible = true; });
}
const cmpTiles = [];   // vignettes animées des jeux à lancer en compétition
$('jdw-cmp-room').addEventListener('click', () => { if (isGuest()) guestAsk('Compétition'); else if (netOff()) { netProbeSoon(0); netNeed('La compétition'); } else openRooms(); });
// ---------- pendant la partie : la colonne des concurrents ----------
function renderCmpSide() {
  const side = $('jdw-cmp-side'); if (side.hidden) return;
  const me = cleanName(profile.name);
  const rows = cmpPlayers().filter(m => m.st === 'play' || m.st === 'out' || m.name === me).sort((a, b) => b.s - a.s || a.name.localeCompare(b.name));
  if (CMP.practice) { const mine = rows.find(m => m.name === me); if (mine) mine.s = 0; }
  const key = rows.map(m => m.name + ':' + m.s + ':' + m.st).join('|') + (CMP.practice ? 'P' : '');
  if (side.dataset.k === key) return; side.dataset.k = key; side.textContent = '';
  if (CMP.practice) { const p = document.createElement('div'); p.className = 'cs-practice'; p.textContent = 'Entraînement'; side.appendChild(p); }
  rows.forEach((m, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cs-item' + (m.name === me ? ' me' : '') + (m.st === 'out' ? ' out' : '');
    b.dataset.rx = m.name; b.setAttribute('aria-label', (k + 1) + 'e ' + m.name + ' ' + fmt(m.s) + (m.name === me ? '' : ', réagir'));
    const rk = document.createElement('span'); rk.className = 'cs-rk'; rk.textContent = String(k + 1);
    const sc = document.createElement('span'); sc.className = 'cs-sc'; sc.textContent = m.s >= 100000 ? Math.round(m.s / 1000) + 'k' : fmt(m.s);
    b.append(chatHead(m.name, { passive: true, sad: m.st === 'out' }), rk, sc);
    b.addEventListener('click', () => { if (m.name !== me) cmpOpenPick(m.name, b); });
    side.appendChild(b);
  });
  const w = [...CMP.roster.values()].filter(m => m.r === 'w' && !m.gone).length;
  if (w) { const e = document.createElement('div'); e.className = 'cs-watch'; e.textContent = '👁 ' + w; side.appendChild(e); }
}
function cmpLine(el) {
  const me = cleanName(profile.name);
  let cur = 0; try { if (current && !current.over && current.inst && current.inst.currentScore) cur = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (e) {}
  // mon score en direct (les autres : dernier score reçu)
  const rank = cmpPlayers().filter(m => m.st === 'play' || m.st === 'out').map(m => m.name === me ? Object.assign({}, m, { s: Math.max(m.s, cur) }) : m).sort((a, b) => b.s - a.s);
  let txt;
  if (CMP.practice) txt = CMP.goAt && CMP.goFor === CMP.rid ? '⏱ GO dans ' + Math.max(0, Math.ceil((CMP.goAt - Date.now()) / 1000)) + ' s !' : '🏋️ Entraînement · en attente d\'un 2e joueur';
  else {
    const pos = rank.findIndex(m => m.name === me) + 1, lead = rank[0];
    txt = '🏆 ' + (pos ? (pos === 1 ? '1er' : pos + 'e') + ' sur ' + rank.length : 'Compétition') + (lead && lead.name !== me ? ' · ' + dispName(lead.name) + ' ' + fmt(lead.s) : '') + ' · toi ' + fmt(cur);
  }
  txt = watchersTxt() + txt;
  el.hidden = false;
  if (!MUS.override && MUS.wantMode !== 'intense' && current && !current.over) setMusic(current.game.id, 'intense');   // départ à un niveau difficile
  const cls = 'recline cmp' + (CMP.practice ? '' : ' me');
  if (el.className !== cls) el.className = cls;
  if (el.textContent !== txt) el.textContent = txt;
}

/* ================= Regarder un copain jouer en direct (vidéo de téléphone à téléphone, WebRTC) ================= */
// Le direct de la salle sert seulement à présenter les deux appareils (signaux « rtc ») ; l'image va ensuite directement
// du téléphone du joueur à celui du spectateur. Rien n'est filmé tant que personne ne regarde ; 3 spectateurs au plus.
const RTC_STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const RTC_CFG = { iceServers: RTC_STUN };   // complété en place par le relais TURN dès qu'il est connu
// Relais TURN (Cloudflare) : quand la liaison directe entre deux téléphones est impossible (4G, box stricte), tout passe par lui.
// Identifiants temporaires donnés par le serveur (get_turn, clé gardée côté serveur) ; sans eux : liaison directe seule.
const TURN = { ice: null, until: 0, t: 0 };
async function loadTurn() {
  if (!ONLINE || !CODE() || Date.now() - TURN.t < 60000) return;
  if (TURN.ice && Date.now() < TURN.until - 3600000) return;
  TURN.t = Date.now();
  try {
    const r = await rpc('get_turn', { p_code: CODE() });
    const ice = r && Array.isArray(r.iceServers) ? r.iceServers : null;
    if (!ice || !ice.length) return;
    // le port 53 est bloqué par les navigateurs : on l'enlève pour ne pas attendre pour rien
    TURN.ice = ice.map(x => Object.assign({}, x, { urls: [].concat(x.urls || []).filter(u => !/:53(\?|$)/.test(u)) })).filter(x => x.urls.length);
    TURN.until = +r.until || Date.now() + 6 * 3600000;
    RTC_CFG.iceServers = RTC_STUN.concat(TURN.ice);
    if (store.get('jdw.relay', false)) RTC_CFG.iceTransportPolicy = 'relay';   // essai : tout passe par le relais (localStorage jdw.relay = true)
  } catch (e) {}
}
setInterval(loadTurn, 30 * 60000);
// types de liaison essayés (host = même réseau, srflx = directe par internet, relay = relais) : pour comprendre un échec
function iceSeen(pc, e) { if (e.candidate && e.candidate.type) (pc.__kinds = pc.__kinds || new Set()).add(e.candidate.type); }
function iceReport(what, pc, stage) {
  const net = navigator.connection && navigator.connection.type ? navigator.connection.type + '/' + (navigator.connection.effectiveType || '') : '?';
  reportError(what + ' : liaison impossible (' + stage + ')', 'candidats : ' + (pc && pc.__kinds ? [...pc.__kinds].join('+') : 'aucun') + ' · relais : ' + (TURN.ice ? 'oui' : 'non') + ' · réseau : ' + net, { quiet: true });
}
const TAUNTS = ['Tu vas perdre !', 'Attention !', 'Derrière toi !', 'Raté !', 'Trop fort 😮', 'Allez !'];
const CAST = new Map();   // moi qui joue : sid → { pc, name, cid, stream, dc, pend }
const WATCH = { sid: '', pc: null, cid: '', name: '', game: '', live: false, timer: 0, pend: [], rxLast: 0, hudT: 0 };
const watchable = g => !!g && g !== 'menu' && !/^duel-/.test(g) && !!gameById(g);
function presCid(name, game) { const x = presList().find(m => m.name === name && m.game === game && m.cid && m.cid !== clientId); return x ? x.cid : ''; }
function rtcSignal(o) { return rtBroadcast(Object.assign({ t: 'rtc', fromCid: clientId, fromName: cleanName(profile.name) }, o)); }
// ---------- côté joueur : quelqu'un veut me regarder ----------
function gameCanvas() {
  if (!current || !current.root) return null;
  let best = null, area = 0;
  for (const c of current.root.querySelectorAll('canvas')) {
    if (c.offsetParent === null) continue;
    const r = c.getBoundingClientRect(), a = r.width * r.height;
    if (a > area) { best = c; area = a; }
  }
  return best;
}
async function castWant(p) {
  const cv = gameCanvas();
  if (!cv || !cv.captureStream || !window.RTCPeerConnection || current.over) { rtcSignal({ k: 'no', to: p.fromCid, sid: p.sid, why: 'pas en jeu' }); return; }
  if (CAST.size >= 3 && !CAST.has(p.sid)) { rtcSignal({ k: 'no', to: p.fromCid, sid: p.sid, why: 'complet' }); return; }
  try {
    const pc = new RTCPeerConnection(RTC_CFG), sess = { pc, name: cleanName(p.fromName), cid: p.fromCid, pend: [], remote: false };
    CAST.set(p.sid, sess);
    pc.onicecandidate = e => { iceSeen(pc, e); if (e.candidate) rtcSignal({ k: 'ice', to: p.fromCid, sid: p.sid, c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') iceReport('Diffusion vers ' + sess.name, pc, 'échec'); if (pc.connectionState === 'failed' || pc.connectionState === 'closed') castEnd(p.sid); };
    const stream = cv.captureStream(CASTQ.fps); sess.stream = stream; sess.cv = cv;
    sess.senders = stream.getVideoTracks().map(tr => { if (CASTQ.hint) try { tr.contentHint = CASTQ.hint; } catch (e) {} return pc.addTrack(tr, stream); });
    // encodeur vidéo matériel du téléphone (H.264) en priorité s'il existe : image plus nette pour le même débit, moins de chauffe
    if (CASTQ.h264 !== false) try { const caps = RTCRtpSender.getCapabilities('video'), h = caps.codecs.filter(c => /h264/i.test(c.mimeType)); for (const tv of pc.getTransceivers()) if (h.length && tv.setCodecPreferences) tv.setCodecPreferences(h.concat(caps.codecs.filter(c => !/h264/i.test(c.mimeType)))); } catch (e) {}
    sess.dc = pc.createDataChannel('hud');
    await pc.setLocalDescription(await pc.createOffer());
    castTune();
    rtcSignal({ k: 'offer', to: p.fromCid, sid: p.sid, sdp: pc.localDescription.sdp, g: current.game.id });
    renderWatchers();
  } catch (e) { castEnd(p.sid); rtcSignal({ k: 'no', to: p.fromCid, sid: p.sid, why: 'erreur' }); reportError('Diffusion : ' + e.message, e.stack, { quiet: true }); }
}
// qualité de l'image envoyée : nette (côté le plus long jusqu'à 1280 px, 30 images/s) ; le débit se partage entre les spectateurs
// (chacun reçoit sa propre image : 2,5 Mbit/s pour un seul, moins quand ils sont plusieurs, pour que le jeu reste fluide)
const CASTQ = Object.assign({ fps: 30, side: 1280, deg: 'balanced', rates: [2500000, 1500000, 1100000] }, store.get('jdw.castq', {}) || {});   // réglages (essais : localStorage jdw.castq)
function castTune() {
  const n = CAST.size, rate = CASTQ.rates[Math.min(2, Math.max(0, n - 1))];
  for (const s of CAST.values()) for (const sd of s.senders || []) {
    try {
      const prm = sd.getParameters(), cv = s.cv;
      if (!prm.encodings || !prm.encodings[0]) continue;
      Object.assign(prm.encodings[0], { maxBitrate: rate, maxFramerate: CASTQ.fps, scaleResolutionDownBy: cv ? Math.max(1, Math.max(cv.width, cv.height) / CASTQ.side) : 1 });
      prm.degradationPreference = CASTQ.deg;
      sd.setParameters(prm).catch(() => {});
    } catch (e) {}
  }
}
function castEnd(sid, quiet) {
  const s = CAST.get(sid); if (!s) return;
  CAST.delete(sid); castTune();
  try { s.stream && s.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
  try { s.pc.close(); } catch (e) {}
  if (!quiet) rtcSignal({ k: 'bye', to: s.cid, sid });
  renderWatchers();
}
function castEndAll(score) {
  if (!CAST.size) return;
  let sc = score || 0; try { if (!sc && current && current.inst && current.inst.currentScore) sc = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (e) {}
  for (const [sid, s] of [...CAST]) { rtcSignal({ k: 'bye', to: s.cid, sid, s: sc }); castEnd(sid, true); }
}
const castSeen = new Set();
function renderWatchers() {
  const names = [...new Set([...CAST.values()].map(s => s.name))];
  for (const n of names) if (!castSeen.has(n)) { castSeen.add(n); toastCheer('👁 ' + n + ' te regarde jouer !', n); }
  for (const n of [...castSeen]) if (!names.includes(n)) castSeen.delete(n);
  recLine();
}
const watchersTxt = () => CAST.size ? '👁 ' + new Set([...CAST.values()].map(s => s.name)).size + '  ·  ' : '';
// score et niveau envoyés aux spectateurs, deux fois par seconde
setInterval(() => {
  if (!CAST.size || !current || !current.inst) return;
  let sc = 0, lv = 0; try { sc = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); lv = current.inst.currentLevel ? +current.inst.currentLevel() || 0 : 0; } catch (e) {}
  const msg = JSON.stringify({ s: sc, l: lv });
  for (const s of CAST.values()) if (s.dc && s.dc.readyState === 'open') try { s.dc.send(msg); } catch (e) {}
}, 500);
// ---------- signaux ----------
function rtcOnSignal(p) {
  if (p.to !== clientId) return;
  const s = CAST.get(p.sid), mineW = WATCH.sid === p.sid;
  if (p.k === 'want') castWant(p);
  else if (p.k === 'answer' && s) s.pc.setRemoteDescription({ type: 'answer', sdp: p.sdp }).then(() => { s.remote = true; for (const c of s.pend.splice(0)) s.pc.addIceCandidate(c).catch(() => {}); }).catch(() => {});
  else if (p.k === 'ice') {
    if (s) { if (s.remote) s.pc.addIceCandidate(p.c).catch(() => {}); else s.pend.push(p.c); }
    else if (mineW) { if (WATCH.pc && WATCH.pc.remoteDescription) WATCH.pc.addIceCandidate(p.c).catch(() => {}); else WATCH.pend.push(p.c); }
  }
  else if (p.k === 'offer' && mineW) watchOffer(p);
  else if (p.k === 'quit' && s) castEnd(p.sid, true);
  else if ((p.k === 'no' || p.k === 'bye') && mineW) {
    watchStatus(p.k === 'bye' ? 'Partie terminée' + (p.s ? ' : ' + fmt(p.s) + ' points !' : ' !') : p.why === 'complet' ? 'Déjà 3 spectateurs : réessaie dans un moment.' : WATCH.name + ' ne joue plus.', true);
    watchClosePc();
  }
}
// ---------- côté spectateur ----------
function watchStart(name, game) {
  if (isGuest()) return;
  if (netOff()) { netNeed('Regarder un copain'); return; }
  const cid = presCid(name, game); if (!cid || !window.RTCPeerConnection) { toastCheer('Impossible de regarder ' + name + ' pour le moment.', name, true); return; }
  watchStop(true);
  Audio.ensure();
  const sid = 'w' + Date.now().toString(36) + shellRand().toString(36).slice(2, 6), g = gameById(game);
  Object.assign(WATCH, { sid, cid, name, game, live: false, pend: [] });
  const hd = $('jdw-watch-head'); hd.textContent = ''; hd.appendChild(chatHead(name, { passive: true }));
  $('jdw-watch-name').textContent = dispName(name); $('jdw-watch-game').textContent = g ? g.title : '';
  $('jdw-watch-live').classList.remove('on');
  const v = $('jdw-watch-video'); v.srcObject = null;
  buildWatchBar();
  $('jdw-watch').hidden = false; watchStatus('Connexion à ' + name + '…');
  musicBaseLevel(0.4);
  loadTurn();
  rtcSignal({ k: 'want', to: cid, sid });
  clearTimeout(WATCH.timer);
  WATCH.timer = setTimeout(() => {
    if (WATCH.sid !== sid || WATCH.live) return;
    // pas de réponse du tout = son téléphone ne répond pas ; réponse mais pas d'image = le réseau entre vous bloque
    if (!WATCH.pc) { watchStatus(name + ' ne répond pas (écran éteint ou réseau coupé ?).', true); iceReport('Regarder ' + name, null, 'pas de réponse'); }
    else { watchStatus('Impossible de recevoir l\'image de ' + name + ' (réseau).', true); iceReport('Regarder ' + name, WATCH.pc, WATCH.pc.connectionState); }
    watchClosePc();
  }, 15000);
}
async function watchOffer(p) {
  const sid = p.sid;
  try {
    const pc = new RTCPeerConnection(RTC_CFG); WATCH.pc = pc;
    pc.ontrack = e => { const v = $('jdw-watch-video'); if (v.srcObject !== e.streams[0]) { v.srcObject = e.streams[0]; v.play().catch(() => {}); } };
    pc.ondatachannel = e => { e.channel.onmessage = m => { try { const d = JSON.parse(m.data); watchHud(d); } catch (x) {} }; };
    pc.onicecandidate = e => { iceSeen(pc, e); if (e.candidate && WATCH.sid === sid) rtcSignal({ k: 'ice', to: WATCH.cid, sid, c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      if (WATCH.sid !== sid) return;
      if (pc.connectionState === 'connected') { WATCH.live = true; watchStatus(''); $('jdw-watch-live').classList.add('on'); }
      else if (pc.connectionState === 'failed') { watchStatus('Impossible de recevoir l\'image de ' + WATCH.name + ' (réseau).', true); iceReport('Regarder ' + WATCH.name, pc, 'échec'); watchClosePc(); }
    };
    await pc.setRemoteDescription({ type: 'offer', sdp: p.sdp });
    for (const c of WATCH.pend.splice(0)) pc.addIceCandidate(c).catch(() => {});
    await pc.setLocalDescription(await pc.createAnswer());
    rtcSignal({ k: 'answer', to: WATCH.cid, sid, sdp: pc.localDescription.sdp });
  } catch (e) { watchStatus('Impossible de recevoir la vidéo.', true); reportError('Regarder : ' + e.message, e.stack, { quiet: true }); }
}
function watchHud(d) {
  const g = gameById(WATCH.game);
  $('jdw-watch-game').textContent = (g ? g.title + ' · ' : '') + fmt(+d.s || 0) + (g ? unit(g) : '') + (d.l ? ' · niveau ' + d.l : '');
}
function watchStatus(t, end) {
  const m = $('jdw-watch-msg'); m.textContent = t; m.hidden = !t; m.classList.toggle('end', !!end);
}
function watchClosePc() { if (WATCH.pc) { try { WATCH.pc.close(); } catch (e) {} WATCH.pc = null; } clearTimeout(WATCH.timer); $('jdw-watch-live').classList.remove('on'); }
function watchStop(silent) {
  if (WATCH.sid && !silent) rtcSignal({ k: 'quit', to: WATCH.cid, sid: WATCH.sid });
  watchClosePc(); WATCH.sid = ''; WATCH.live = false; watchPanel(false); $('jdw-watch').classList.remove('zoom'); $('jdw-watch-zoom').hidden = true;
  const v = $('jdw-watch-video'); try { v.pause(); } catch (e) {} v.srcObject = null;
  if (!$('jdw-watch').hidden) { $('jdw-watch').hidden = true; musicBaseLevel(1); }
}
function buildWatchBar() {
  const rx = $('jdw-watch-rx'), say = $('jdw-watch-say');
  if (!rx.childElementCount) {
    for (const e of REACTIONS) { const b = document.createElement('button'); b.type = 'button'; b.textContent = e; b.setAttribute('aria-label', 'Envoyer ' + e); b.addEventListener('click', () => watchSend(e, b)); rx.appendChild(b); }
    for (const t of TAUNTS) { const b = document.createElement('button'); b.type = 'button'; b.className = 'say-btn'; b.textContent = t; b.addEventListener('click', () => watchSend(t, b)); say.appendChild(b); }
  }
}
function watchBubble(from, e) {
  const box = document.createElement('div'); box.className = 'rx-me in-watch' + (e.length > 4 ? ' txt' : '');
  const hd = chatHead(from, { passive: true }), em = document.createElement('span'); em.className = 'rx-me-e'; em.textContent = e;
  const nm = document.createElement('b'); nm.textContent = dispName(from); box.append(hd, em, nm);
  for (const old of $('jdw-watch').querySelectorAll('.rx-me')) old.remove();
  $('jdw-watch').appendChild(box); setTimeout(() => box.remove(), e.length > 14 ? 3400 : 1900);
}
function watchPanel(open) {
  $('jdw-watch-panel').hidden = !open; $('jdw-watch-more').setAttribute('aria-expanded', String(!!open)); $('jdw-watch-more').classList.toggle('on', !!open);
}
$('jdw-watch-more').addEventListener('click', () => watchPanel($('jdw-watch-panel').hidden));
// zoom : quand l'image ne remplit pas l'écran (joueur sur ordinateur, regardé sur téléphone), elle peut remplir l'écran en recadrant au centre
function watchZoomCheck() {
  const v = $('jdw-watch-video'), z = $('jdw-watch-zoom');
  if (!v.videoWidth || !v.clientWidth) { z.hidden = true; return; }
  const fill = Math.min(1, (v.videoWidth / v.videoHeight) / (v.clientWidth / v.clientHeight), (v.clientWidth / v.clientHeight) / (v.videoWidth / v.videoHeight));
  z.hidden = fill > 0.8;   // l'image remplit déjà plus de 80 % de la place
  if (z.hidden) $('jdw-watch').classList.remove('zoom');
  z.textContent = $('jdw-watch').classList.contains('zoom') ? '🔍 Image entière' : '🔍 Zoom';
}
$('jdw-watch-zoom').addEventListener('click', () => { $('jdw-watch').classList.toggle('zoom'); watchZoomCheck(); });
$('jdw-watch-video').addEventListener('resize', watchZoomCheck);
$('jdw-watch-video').addEventListener('loadedmetadata', watchZoomCheck);
window.addEventListener('resize', () => { if (!$('jdw-watch').hidden) watchZoomCheck(); });
function watchSend(e, btn) {
  if (!WATCH.sid || Date.now() - WATCH.rxLast < 1200) return;
  if (e.length > 4) setTimeout(() => watchPanel(false), 350);   // message envoyé : on referme, le jeu redevient entièrement visible
  WATCH.rxLast = Date.now();
  rtBroadcast({ t: 'rx', n: cleanName(profile.name), to: WATCH.name, e });
  watchBubble(cleanName(profile.name), e);
  if (btn) { btn.classList.remove('sent'); void btn.offsetWidth; btn.classList.add('sent'); }
  const r = btn ? btn.getBoundingClientRect() : null, fl = document.createElement('span');
  fl.className = 'rx-fly'; fl.textContent = e.length > 4 ? '💬' : e;
  fl.style.left = (r ? r.left + r.width / 2 : innerWidth / 2) + 'px'; fl.style.top = (r ? r.top : innerHeight / 2) + 'px'; fl.style.setProperty('--dx', '0px');
  document.body.appendChild(fl); setTimeout(() => fl.remove(), 1500);
}
$('jdw-watch-own').addEventListener('submit', e => {
  e.preventDefault();
  const inp = $('jdw-watch-in'), t = inp.value.replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!t || !WATCH.sid) return;
  watchSend(t, $('jdw-watch-send')); inp.value = ''; inp.blur();
});
$('jdw-watch-back').addEventListener('click', () => watchStop());
document.addEventListener('visibilitychange', () => { if (document.hidden && WATCH.sid) watchStop(); });

/* ================= Duel en ligne (bêta) : chacun sur son téléphone ================= */
// La partie tourne chez celui qui lance le défi (l'hôte, joueur du bas). Son image et son son partent en direct chez l'adversaire
// (WebRTC, de téléphone à téléphone) ; les touches de l'adversaire reviennent par un canal de données et sont rejouées dans le jeu
// comme des doigts posés sur la moitié du haut. Bannières, scores, pause et résultats sont recopiés chez lui.
// Signaux « net » dans un canal propre au duel (jdw-duel-<code>) ; invitation « netinv » dans le canal de la salle ou par un lien ?duel=<code>.
const NET_LINK = () => location.origin + location.pathname + '?duel=' + NET.code;
function rtBroadcastTo(topic, data) { return rtSend(topic, 'broadcast', { type: 'broadcast', event: 'poke', payload: Object.assign({ from: clientId }, data) }); }
function netSig(data) { if (NET.topic) rtBroadcastTo(NET.topic, Object.assign({ t: 'net', code: NET.code }, data)); }
function netCtl(m) { if (NET.ctl && NET.ctl.readyState === 'open') try { NET.ctl.send(JSON.stringify(m)); } catch (e) {} }
// ce que le jeu voit en ligne (DUO-CONTRACT.md, « Ajout : le jeu EN LIGNE »)
function netApi(seq) {
  const mine = () => DUO.seq === seq;
  return {
    role: NET.role, me: NET.role === 'host' ? 0 : 1,
    flipped: NET.role === 'guest' && !!NET.d && NET.d.layout !== 'landscape',
    send(msg, o) {
      if (!mine()) return;
      try {
        if (o && o.reliable) { if (NET.ctl && NET.ctl.readyState === 'open') NET.ctl.send(JSON.stringify({ h: 'g', m: msg })); }
        else if (NET.g && NET.g.readyState === 'open') NET.g.send(JSON.stringify(msg));
      } catch (e) {}
    },
    onMessage(fn) { if (typeof fn === 'function' && mine()) NET.handlers.push(fn); },
    now: () => performance.now() + (NET.role === 'guest' ? NET.off : 0),
    rtt: () => NET.rttv || 120
  };
}
function netDeliver(m) {
  if (!NET.handlers.length) { NET.queue.push(m); if (NET.queue.length > 300) NET.queue.shift(); return; }
  for (const f of NET.handlers) try { f(m); } catch (e) { reportError('Duel en ligne (message) : ' + e.message, e.stack, { quiet: true }); }
}
function netMyPhoto() { const ph = activePhoto(profile); return ph && ph.length < 200000 ? ph : ''; }
// les doigts rejoués ont des numéros >= 1000 : pas de capture de pointeur pour eux
for (const k of ['setPointerCapture', 'releasePointerCapture']) { const f = Element.prototype[k]; if (f) Element.prototype[k] = function (id) { if (id >= 1000) return; return f.call(this, id); }; }
{ const f = Element.prototype.hasPointerCapture; if (f) Element.prototype.hasPointerCapture = function (id) { return id >= 1000 ? true : f.call(this, id); }; }
function netReset() {
  if (NET.pc) try { NET.pc.close(); } catch (e) {}
  if (NET.stream) try { NET.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
  if (NET.topic) rtLeave(NET.topic);
  clearInterval(NET.helloT); clearTimeout(NET.waitT); clearInterval(NET.pingT);
  Object.assign(NET, { code: '', role: '', d: null, topic: '', pc: null, ctl: null, inp: null, peer: '', peerCid: '', seats: null, turn: -1, pend: [], remote: false, guestInfo: null, stream: null, vSender: null, aSender: null, start: null,
    data: false, g: null, handlers: [], queue: [], off: 0, rttv: 0, pings: [] });
  NET.blocked.clear(); NET.ids.clear();
  $('jdw-duo').classList.remove('net-guest', 'net-host', 'net-video', 'net-flip', 'net-single');
  $('jdw-net-stage').hidden = true; const v = $('jdw-net-video'); try { v.pause(); } catch (e) {} v.srcObject = null;
}
function netEnd(notify, msg) {
  if (!NET.role) return;
  if (notify) { netCtl({ h: 'quit' }); netSig({ k: 'bye' }); }
  const wasGuest = NET.role === 'guest';
  netReset();
  if (!$('jdw-net').hidden) closeSheet('jdw-net');
  if (!$('jdw-duo').hidden) { unmountDuo(); DUO.d = null; DUO.waitRot = false; DUO.paused = false; $('jdw-duo').hidden = true; $('jdw-duo-res').hidden = true; $('jdw-duo-pause').hidden = true; $('jdw-duo-rotate').hidden = true; $('jdw-lib').hidden = false; setWhere('menu'); refreshDuoTiles(); }
  musicBaseLevel(1); MUS.override = false; setMusic('accueil');
  fsLeave();
  if (msg) toastCheer(msg, profile.name, true);
  else if (wasGuest && notify) {}
}
// ---------- l'hôte : lancer le défi, inviter ----------
function netCreate(d) {
  if (isGuest()) { guestAsk('Duel en ligne'); return; }
  if (netOff()) { netNeed('Le duel en ligne'); return; }
  loadTurn();
  if (!profile.name) { startWelcome(); return; }
  if (!ONLINE || !window.RTCPeerConnection) { toastCheer('Le duel en ligne demande une connexion internet.', profile.name, true); return; }
  if (!room) { openRooms(); return; }
  netReset(); Audio.ensure();
  fsEnter(false);   // le défi est lancé d'un toucher : plein écran dès maintenant (la partie démarrera sans toucher)
  NET.code = Math.random().toString(36).slice(2, 8); NET.role = 'host'; NET.d = d; NET.topic = 'jdw-duel-' + NET.code;
  rtJoin(NET.topic);
  $('jdw-net-game').textContent = d.title + ' · duel en ligne';
  $('jdw-net-h').textContent = 'Défi lancé !';
  $('jdw-net-sub').textContent = 'Invite un copain : dès qu\'il accepte, la partie commence chez vous deux.';
  $('jdw-net-sharebox').hidden = false; $('jdw-net-lh').hidden = false;
  $('jdw-net').style.setProperty('--acc', d.accent || COLORS.amber);
  netRenderList(); openSheet('jdw-net', 'jdw-net-share');
}
function netRenderList() {
  const list = $('jdw-net-list'); list.textContent = '';
  const me = cleanName(profile.name), seen = new Set();
  const on = presList().filter(x => x.name !== me && x.cid && !seen.has(x.name) && seen.add(x.name));
  if (!on.length) { const p = document.createElement('p'); p.className = 'small'; p.textContent = 'Personne d\'autre en ligne dans ta salle pour le moment : envoie-lui le lien.'; list.appendChild(p); return; }
  for (const x of on) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pick-row';
    const t = document.createElement('span'); t.className = 'pr-t'; const bb = document.createElement('b'); bb.textContent = dispName(x.name); const sm = document.createElement('small');
    sm.textContent = x.game && x.game !== 'menu' ? gameLabel(x.game) : 'dans le menu'; t.append(bb, sm);
    const go = document.createElement('span'); go.className = 'cg-go'; go.textContent = 'Défier';
    b.append(chatHead(x.name, { passive: true }), t, go);
    b.addEventListener('click', () => {
      rtBroadcast({ t: 'netinv', code: NET.code, g: NET.d.id, n: me, to: x.name });
      go.textContent = 'Invité ✓'; b.disabled = true;
      $('jdw-net-sub').textContent = 'Invitation envoyée à ' + dispName(x.name) + ' : en attente de sa réponse…';
    });
    list.appendChild(b);
  }
}
async function netShare() {
  const txt = cleanName(profile.name) + ' te défie à ' + NET.d.title + ' sur la borne d\'arcade ! Touche le lien pour jouer :';
  try { if (navigator.share) { await navigator.share({ title: 'Duel : ' + NET.d.title, text: txt, url: NET_LINK() }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  netCopy();
}
async function netCopy() {
  try { await navigator.clipboard.writeText(NET_LINK()); toastCheer('Lien copié : colle-le dans Messenger, SMS…', profile.name, true); }
  catch (e) { $('jdw-net-sub').textContent = 'Envoie ce lien à ton copain : ' + NET_LINK(); }
}
$('jdw-net-share').addEventListener('click', netShare);
$('jdw-net-copy').addEventListener('click', netCopy);
$('jdw-net-cancel').addEventListener('click', () => netEnd(true));
// ---------- l'invité : invitation reçue ou lien ouvert ----------
let netInvite = null;
function netOnInvite(p) {
  if (cleanName(p.to) !== cleanName(profile.name) || NET.role) return;
  const d = duoById(p.g); if (!d || !d.net) return;   // jeu pas encore disponible en ligne de ce côté : on ignore
  netInvite = { code: String(p.code || '').slice(0, 12), g: d.id, from: cleanName(p.n) };
  const hd = $('jdw-netinv-head'); hd.textContent = ''; hd.appendChild(chatHead(netInvite.from, { passive: true }));
  $('jdw-netinv-t').textContent = netInvite.from + ' te défie à ' + d.title + (/[!?]\s*$/.test(d.title) ? '' : ' !');
  $('jdw-netinv').hidden = false; Audio.tone(784, 0.1, 'square', 0.05, 1046);
  clearTimeout(netInvite.t); netInvite.t = setTimeout(() => { $('jdw-netinv').hidden = true; }, 40000);
}
$('jdw-netinv-ok').addEventListener('click', () => { $('jdw-netinv').hidden = true; if (netInvite) netJoin(netInvite.code, netInvite.g, netInvite.from); });
$('jdw-netinv-no').addEventListener('click', () => { $('jdw-netinv').hidden = true; if (netInvite) rtBroadcastTo('jdw-duel-' + netInvite.code, { t: 'net', code: netInvite.code, k: 'no', n: cleanName(profile.name) }); netInvite = null; });
function netJoin(code, g, from) {
  loadTurn();
  if (!profile.name) { startWelcome(); return; }
  if (!window.RTCPeerConnection) { toastCheer('Ce téléphone ne permet pas le duel en ligne.', profile.name, true); return; }
  netReset(); Audio.ensure();
  fsEnter(false);   // « Accepter » est un toucher : plein écran dès maintenant (la partie démarrera sans toucher)
  NET.code = code; NET.role = 'guest'; NET.topic = 'jdw-duel-' + code; NET.d = g ? duoById(g) : null;
  rtJoin(NET.topic);
  $('jdw-net-game').textContent = (NET.d ? NET.d.title + ' · ' : '') + 'duel en ligne';
  $('jdw-net-h').textContent = 'Connexion au duel…';
  $('jdw-net-sub').textContent = from ? 'On rejoint la partie de ' + from + '.' : 'On rejoint la partie de ton copain.';
  $('jdw-net-sharebox').hidden = true; $('jdw-net-lh').hidden = true; $('jdw-net-list').textContent = '';
  openSheet('jdw-net', 'jdw-net-cancel');
  const hello = () => netSig({ k: 'hello', n: cleanName(profile.name), cid: clientId });
  hello(); NET.helloT = setInterval(hello, 1500);
  NET.waitT = setTimeout(() => { if (NET.role === 'guest' && !NET.pc) netEnd(false, 'Le duel n\'a pas répondu : il a peut-être été annulé.'); }, 25000);
}
// ---------- signaux ----------
function netOnSignal(p) {
  if (p.code !== NET.code || (p.to && p.to !== clientId)) return;
  if (NET.role === 'host') {
    if (p.k === 'hello') { if (NET.peerCid && NET.peerCid !== p.cid) { netSig({ k: 'busy', to: p.cid }); return; } if (!NET.pc) { NET.peer = cleanName(p.n); NET.peerCid = p.cid; netHostStart(); } return; }
    if (p.k === 'answer' && NET.pc) { NET.pc.setRemoteDescription({ type: 'answer', sdp: p.sdp }).then(() => { NET.remote = true; for (const c of NET.pend.splice(0)) NET.pc.addIceCandidate(c).catch(() => {}); }).catch(() => {}); return; }
    if (p.k === 'no') { $('jdw-net-sub').textContent = cleanName(p.n) + ' ne peut pas jouer maintenant. Invite quelqu\'un d\'autre ?'; return; }
  } else if (NET.role === 'guest') {
    if (p.k === 'offer' && !NET.pc) { clearInterval(NET.helloT); NET.peer = cleanName(p.n); NET.peerCid = p.from; netGuestOffer(p); return; }
    if (p.k === 'busy') { netEnd(false, 'Ce duel a déjà un adversaire.'); return; }
  }
  if (p.k === 'ice' && NET.pc) { if (NET.remote) NET.pc.addIceCandidate(p.c).catch(() => {}); else NET.pend.push(p.c); return; }
  if (p.k === 'bye' && NET.role) netEnd(false, (NET.peer || 'Ton adversaire') + ' a quitté le duel.');
}
function netWatchPc(pc) {
  pc.onicecandidate = e => { iceSeen(pc, e); if (e.candidate && NET.peerCid) netSig({ k: 'ice', to: NET.peerCid, c: e.candidate.toJSON() }); };
  pc.onconnectionstatechange = () => {
    if (NET.pc !== pc) return;
    if (pc.connectionState === 'failed') { iceReport('Duel en ligne avec ' + (NET.peer || '?'), pc, 'échec'); netEnd(false, 'Connexion impossible avec ' + (NET.peer || 'ton adversaire') + ' (réseau).'); }
    if (pc.connectionState === 'disconnected') setTimeout(() => { if (NET.pc === pc && pc.connectionState === 'disconnected') netEnd(false, (NET.peer || 'Ton adversaire') + ' s\'est déconnecté.'); }, 6000);
  };
}
// ---------- l'hôte : connexion, partie, image ----------
async function netHostStart() {
  $('jdw-net-h').textContent = 'Connexion avec ' + NET.peer + '…';
  $('jdw-net-sub').textContent = 'La partie démarre dans un instant.';
  $('jdw-net-sharebox').hidden = true; $('jdw-net-lh').hidden = true; $('jdw-net-list').textContent = '';
  try {
    const pc = NET.pc = new RTCPeerConnection(RTC_CFG); netWatchPc(pc);
    NET.data = !!NET.d.net;   // le jeu sait jouer en ligne : chaque appareil le fait tourner (sinon : image vidéo, en secours)
    if (!NET.data) {
      const tv = pc.addTransceiver('video', { direction: 'sendonly' }); NET.vSender = tv.sender;
      // encodeur vidéo matériel du téléphone (H.264) en priorité : moins de délai, moins de chauffe
      try { const caps = RTCRtpSender.getCapabilities('video'); const h = caps.codecs.filter(c => /h264/i.test(c.mimeType)); if (h.length && tv.setCodecPreferences) tv.setCodecPreferences(h.concat(caps.codecs.filter(c => !/h264/i.test(c.mimeType)))); } catch (e) {}
      NET.aSender = pc.addTransceiver('audio', { direction: 'sendonly' }).sender;
    }
    NET.g = pc.createDataChannel('g', { ordered: false, maxRetransmits: 0 });
    NET.g.onmessage = e => { try { netDeliver(JSON.parse(e.data)); } catch (x) {} };
    NET.ctl = pc.createDataChannel('ctl');
    NET.inp = pc.createDataChannel('inp', { ordered: false, maxRetransmits: 0 });
    NET.ctl.onopen = () => { NET.waitT = setTimeout(netHostGo, 1500); };   // on attend sa tête (message « me ») 1,5 s au plus
    NET.ctl.onmessage = e => { try { netCtlHost(JSON.parse(e.data)); } catch (x) {} };
    NET.inp.onmessage = e => { try { netInject(JSON.parse(e.data)); } catch (x) {} };
    await pc.setLocalDescription(await pc.createOffer());
    netSig({ k: 'offer', to: NET.peerCid, sdp: pc.localDescription.sdp, g: NET.d.id, n: cleanName(profile.name) });
  } catch (e) { netEnd(true, 'Impossible de lancer le duel en ligne.'); reportError('Duel en ligne : ' + e.message, e.stack, { quiet: true }); }
}
function netHostGo() {
  if (NET.role !== 'host' || NET.start) return;
  clearTimeout(NET.waitT); NET.start = true;
  const gi = NET.guestInfo;
  if (gi && gi.photo && /^data:image\//.test(gi.photo) && !players.has(NET.peer)) setPlayer(NET.peer, gi.photo, gi.sound || null);
  NET.seats = [cleanName(profile.name), NET.peer];
  if (!$('jdw-net').hidden) closeSheet('jdw-net');
  $('jdw-duo').classList.add('net-host');
  openDuo(NET.d);
}
function netCtlHost(m) {
  if (m.h === 'g') { netDeliver(m.m); return; }
  if (m.h === 'ping') { netCtl({ h: 'pong', t: m.t, th: performance.now() }); return; }
  if (m.h === 'me') { NET.guestInfo = m; if (NET.ctl && NET.ctl.readyState === 'open' && !NET.start) netHostGo(); return; }
  if (m.h === 'pausereq') { duoPause(); return; }
  if (m.h === 'resumereq') { duoResume(); return; }
  if (m.h === 'rematch') { if (DUO.over || !$('jdw-duo-res').hidden || DUO.paused) mountDuo(); return; }
  if (m.h === 'quit') netEnd(false, NET.peer + ' a quitté le duel.');
}
function duoCanvas() {
  if (!DUO.root) return null;
  let best = null, area = 0;
  for (const c of DUO.root.querySelectorAll('canvas')) { if (c.offsetParent === null) continue; const r = c.getBoundingClientRect(), a = r.width * r.height; if (a > area) { best = c; area = a; } }
  return best;
}
async function netAttach() {
  if (NET.role !== 'host' || !NET.pc) return;
  const cv = duoCanvas(); if (!cv || !cv.captureStream) { setTimeout(netAttach, 200); return; }
  try {
    if (NET.stream) NET.stream.getVideoTracks().forEach(t => t.stop());
    NET.stream = cv.captureStream(30);
    const vt = NET.stream.getVideoTracks()[0]; try { vt.contentHint = 'motion'; } catch (e) {}
    await NET.vSender.replaceTrack(vt);
    try { const prm = NET.vSender.getParameters(); if (prm.encodings && prm.encodings[0]) { Object.assign(prm.encodings[0], { maxBitrate: 1200000, maxFramerate: 30, scaleResolutionDownBy: Math.max(1, cv.width / 480) }); prm.degradationPreference = 'maintain-framerate'; await NET.vSender.setParameters(prm); } } catch (e) {}
    if (!NET.dest && Audio.ctx) { NET.dest = Audio.ctx.createMediaStreamDestination(); Audio.master.connect(NET.dest); if (MUS.gain) MUS.gain.connect(NET.dest); }
    if (NET.dest) await NET.aSender.replaceTrack(NET.dest.stream.getAudioTracks()[0]);
    netCtl({ h: 'start', g: DUO.d.id, layout: DUO.d.layout, w: cv.clientWidth, hh: cv.clientHeight, names: NET.seats, s: DUO.scores });
  } catch (e) { reportError('Duel en ligne (image) : ' + e.message, e.stack, { quiet: true }); }
}
// les doigts de l'adversaire, rejoués sur le plateau (moitié du haut ; au tour par tour : seulement quand c'est son tour)
function netInject(m) {
  if (NET.role !== 'host' || !DUO.root || !DUO.d) return;
  const cv = duoCanvas(); if (!cv) return;
  const land = DUO.d.layout === 'landscape', id = 1000 + ((m.id | 0) % 50);
  const type = { d: 'pointerdown', m: 'pointermove', u: 'pointerup', c: 'pointercancel' }[m.t]; if (!type) return;
  if (type === 'pointerdown') {
    if (land ? NET.turn !== 1 : m.y > 0.5) { NET.ids.set(id, false); return; }   // pas sa moitié / pas son tour
    NET.ids.set(id, true);
  } else if (!NET.ids.get(id)) return;
  if (type === 'pointerup' || type === 'pointercancel') NET.ids.delete(id);
  const r = cv.getBoundingClientRect();
  const x = r.left + Math.max(0, Math.min(1, +m.x || 0)) * r.width, y = r.top + Math.max(0, Math.min(1, +m.y || 0)) * r.height;
  const ev = new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: false, bubbles: true, cancelable: true, composed: true,
    clientX: x, clientY: y, screenX: x, screenY: y, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1, button: type === 'pointermove' ? -1 : 0, pressure: type === 'pointerup' ? 0 : 0.5, width: 20, height: 20 });
  cv.dispatchEvent(ev);
}
// chez l'hôte, ses propres doigts n'agissent pas sur la moitié (ou le tour) de l'adversaire
function netGuard(e) {
  if (!(NET.role === 'host' || (NET.role === 'guest' && NET.data)) || !e.isTrusted || !DUO.root || !DUO.d) return;
  // tour par tour : en mode données, le jeu gère lui-même qui a la main (on peut toujours bouger sa caméra) ; en mode vidéo, la bibliothèque bloque
  if (DUO.d.layout === 'landscape') { if (!NET.data && NET.role === 'host' && NET.turn === 1) { e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); } return; }
  if (e.type === 'pointerdown') { const r = DUO.root.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) NET.blocked.add(e.pointerId); }
  if (NET.blocked.has(e.pointerId)) { e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); if (e.type === 'pointerup' || e.type === 'pointercancel') NET.blocked.delete(e.pointerId); }
}
for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) $('jdw-duo-host').addEventListener(t, netGuard, true);
// ---------- l'invité : la vidéo, les doigts, l'habillage ----------
async function netGuestOffer(p) {
  try {
    const pc = NET.pc = new RTCPeerConnection(RTC_CFG); netWatchPc(pc);
    pc.ontrack = e => {
      // délai minimal à la réception : on affiche chaque image dès qu'elle arrive
      try { if (e.track.kind === 'video') { e.receiver.jitterBufferTarget = 0; e.receiver.playoutDelayHint = 0; } } catch (x) {}
      const v = $('jdw-net-video'); const st = e.streams[0] || new MediaStream([e.track]); if (v.srcObject !== st) { if (!v.srcObject) v.srcObject = st; else st.getTracks().forEach(t => { try { v.srcObject.addTrack(t); } catch (x) {} }); } v.play().catch(() => {}); };
    pc.ondatachannel = e => {
      const ch = e.channel;
      if (ch.label === 'ctl') { NET.ctl = ch; ch.onopen = netGuestHello; ch.onmessage = ev => { try { netCtlGuest(JSON.parse(ev.data)); } catch (x) {} }; if (ch.readyState === 'open') netGuestHello(); }
      else if (ch.label === 'inp') NET.inp = ch;
      else if (ch.label === 'g') { NET.g = ch; ch.onmessage = ev => { try { netDeliver(JSON.parse(ev.data)); } catch (x) {} }; }
    };
    await pc.setRemoteDescription({ type: 'offer', sdp: p.sdp });
    NET.remote = true; for (const c of NET.pend.splice(0)) pc.addIceCandidate(c).catch(() => {});
    await pc.setLocalDescription(await pc.createAnswer());
    netSig({ k: 'answer', to: NET.peerCid, sdp: pc.localDescription.sdp });
    $('jdw-net-h').textContent = 'Connexion avec ' + NET.peer + '…';
  } catch (e) { netEnd(true, 'Impossible de rejoindre le duel.'); reportError('Rejoindre un duel : ' + e.message, e.stack, { quiet: true }); }
}
function netGuestHello() {
  // horloge commune : quelques allers-retours rapides, puis un toutes les 2 s
  clearInterval(NET.pingT); let n = 0;
  const ping = () => netCtl({ h: 'ping', t: performance.now() });
  ping(); NET.pingT = setInterval(() => { ping(); if (++n === 6) { clearInterval(NET.pingT); NET.pingT = setInterval(ping, 2000); } }, 200);
  // ma tête (si elle est petite) et mon nom, pour que l'hôte me dessine dans le jeu
  netCtl({ h: 'me', name: cleanName(profile.name), photo: netMyPhoto() });
}
function netCtlGuest(m) {
  if (m.h === 'g') { netDeliver(m.m); return; }
  if (m.h === 'pong') {
    const now = performance.now(), rtt = now - m.t; if (!(rtt >= 0) || rtt > 5000) return;
    NET.pings.push({ rtt, off: m.th + rtt / 2 - now }); if (NET.pings.length > 10) NET.pings.shift();
    const best = NET.pings.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    NET.off = best.off; NET.rttv = NET.pings.map(x => x.rtt).sort((a, b) => a - b)[NET.pings.length >> 1];
    return;
  }
  if (m.h === 'start') { netGuestShow(m); return; }
  if (!NET.start) return;
  if (m.h === 'say') { duoSay(m.text, m.o || {}); return; }
  if (m.h === 'pills') {
    DUO.scores = Array.isArray(m.s) ? m.s.slice(0, 2) : DUO.scores; DUO.over = false; duoPills(m.p);
    if (NET.data && (m.p === 0 || m.p === 1)) {   // mode données : les sons sont joués ici (pas de son envoyé par l'hôte)
      sting('point', 0.55, false);
      if (DUO.scores[m.p] === (DUO.d.target || 5) - 1 && !DUO.mp) { DUO.mp = true; setTimeout(() => { sting('match', 0.6); if (duoMusicId(DUO.d)) setMusic(duoMusicId(DUO.d), 'intense'); }, 700); }
    }
    return;
  }
  if (m.h === 'res') {
    DUO.winner = m.w; DUO.scores = m.s; DUO.over = true; addWin(DUO.d.id, m.w);
    if (NET.data) unmountDuo();
    const landR = DUO.d.layout === 'landscape', single = NET.data && !landR;
    $('jdw-duo').classList.toggle('net-single', !!single);
    if (single) resHalf(1, false); else { resHalf(0, landR); if (!landR) resHalf(1, false); }
    $('jdw-duo-res').hidden = false; $('jdw-duo-hud').hidden = true;
    if (NET.data) { musicBaseLevel(0.5); sting('win', 0.9); if ((window.JDW_MUSIC || {}).dscores) setMusic('dscores', 'calm'); const wn = seatName(m.w); if (wn !== GUEST) setTimeout(() => playCri(wn), 1800); }
    return;
  }
  if (m.h === 'pause') { DUO.paused = true; if (NET.data && DUO.inst && DUO.inst.pause) try { DUO.inst.pause(); } catch (e) {} netGuestPauseCard(); return; }
  if (m.h === 'resume') { DUO.paused = false; if (NET.data && DUO.inst && DUO.inst.resume) try { DUO.inst.resume(); } catch (e) {} $('jdw-duo-pause').hidden = true; return; }
  if (m.h === 'quit') netEnd(false, NET.peer + ' a quitté le duel.');
}
function netGuestShow(m) {
  const d = duoById(m.g); if (!d) { netEnd(true, 'Ce duel n\'existe pas sur ta version : mets la borne à jour.'); return; }
  if (m.mode === 'data') {   // le jeu tourne aussi ici : on le monte, tourné pour que ma moitié soit en bas
    NET.data = true; NET.d = d; NET.start = { data: true };
    NET.seats = Array.isArray(m.names) ? m.names.map(cleanName) : [NET.peer, cleanName(profile.name)];
    if (m.photo && /^data:image\//.test(m.photo) && !players.has(NET.seats[0])) setPlayer(NET.seats[0], m.photo);
    if (!$('jdw-net').hidden) closeSheet('jdw-net');
    $('jdw-lib').hidden = true; $('jdw-duo').hidden = false;
    $('jdw-duo').classList.toggle('land', d.layout === 'landscape');
    $('jdw-duo').classList.add('net-guest'); $('jdw-duo').classList.remove('net-video');
    $('jdw-duo').classList.toggle('net-flip', d.layout !== 'landscape');
    $('jdw-net-stage').hidden = true;
    DUO.d = d; DUO.waitRot = false;
    for (const i of [0, 1]) { const av = $('jdw-duo-pill' + i).querySelector('.dp-av'); av.textContent = ''; av.appendChild(chatHead(seatPlayer(i).name, { passive: true })); }
    mountDuo();
    return;
  }
  NET.d = d; NET.start = { w: +m.w || 390, h: +m.hh || 780 }; NET.seats = Array.isArray(m.names) ? m.names.map(cleanName) : [NET.peer, cleanName(profile.name)];
  if (!$('jdw-net').hidden) closeSheet('jdw-net');
  DUO.d = d; DUO.scores = Array.isArray(m.s) ? m.s.slice(0, 2) : [0, 0]; DUO.over = false; DUO.winner = null; DUO.paused = false; DUO.inst = null;
  $('jdw-lib').hidden = true; $('jdw-duo').hidden = false;
  $('jdw-duo').classList.toggle('land', d.layout === 'landscape');
  $('jdw-duo').classList.add('net-guest', 'net-video');
  $('jdw-duo').classList.toggle('net-flip', d.layout !== 'landscape');   // l'image est tournée : ma moitié (celle du haut chez l'hôte) en bas
  $('jdw-duo-res').hidden = true; $('jdw-duo-pause').hidden = true; $('jdw-duo-hud').hidden = false; $('jdw-duo-rotate').hidden = true;
  for (const i of [0, 1]) { const av = $('jdw-duo-pill' + i).querySelector('.dp-av'); av.textContent = ''; av.appendChild(chatHead(seatPlayer(i).name, { passive: true })); }
  duoPills();
  $('jdw-net-stage').hidden = false; netFitStage();
  musicOut(0.4);   // on entend le son de la partie de l'hôte
  setWhere('duel-' + d.id);
}
function netFitStage() {
  if (!NET.start || NET.role !== 'guest') return;
  const st = $('jdw-net-stage'), W = innerWidth, H = innerHeight, k = Math.min(W / NET.start.w, H / NET.start.h);
  const w = Math.round(NET.start.w * k), h = Math.round(NET.start.h * k);
  Object.assign(st.style, { width: w + 'px', height: h + 'px', left: Math.round((W - w) / 2) + 'px', top: Math.round((H - h) / 2) + 'px' });
}
addEventListener('resize', netFitStage);
function netGuestPauseCard() {
  const sub = $('jdw-duo-pause-sub'); sub.textContent = '';
  const side = i => { const b = document.createElement('span'); b.className = 'dp-side'; b.style.setProperty('--pc', DUO_COLORS[i]); const n = document.createElement('b'); n.textContent = dispName(seatPlayer(i).name); b.append(chatHead(seatPlayer(i).name, { passive: true }), n); return b; };
  const sc = document.createElement('span'); sc.className = 'dp-score'; sc.textContent = DUO.scores[0] + ' – ' + DUO.scores[1];
  sub.append(side(0), sc, side(1));
  $('jdw-duo-pause').hidden = false;
}
// doigts de l'invité → hôte (coordonnées 0..1 du plateau de l'hôte ; image tournée : on retourne)
(() => {
  const st = $('jdw-net-stage'); let lastMove = 0;
  const send = (t, e) => {
    if (NET.role !== 'guest' || !NET.inp || NET.inp.readyState !== 'open') return;
    const r = st.getBoundingClientRect(); let x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if ($('jdw-duo').classList.contains('net-flip')) { x = 1 - x; y = 1 - y; }
    try { NET.inp.send(JSON.stringify({ t, id: e.pointerId % 50, x: +x.toFixed(4), y: +y.toFixed(4) })); } catch (x2) {}
  };
  st.addEventListener('pointerdown', e => { e.preventDefault(); try { st.setPointerCapture(e.pointerId); } catch (x) {} send('d', e); });
  st.addEventListener('pointermove', e => { if (!e.buttons && e.pointerType === 'mouse') return; const now = performance.now(); if (now - lastMove < 12) return; lastMove = now; send('m', e); });
  st.addEventListener('pointerup', e => send('u', e));
  st.addEventListener('pointercancel', e => send('c', e));
  st.addEventListener('contextmenu', e => e.preventDefault());
})();
// lien d'invitation ouvert : ?duel=<code>
(() => {
  let code = ''; try { code = new URLSearchParams(location.search).get('duel') || ''; } catch (e) {}
  if (!/^[a-z0-9]{4,12}$/.test(code)) return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  if (isGuest()) { setTimeout(() => guestAsk('Duel en ligne'), 1200); return; }
  setTimeout(() => {
    netInvite = { code, g: '', from: '' };
    const hd = $('jdw-netinv-head'); hd.textContent = ''; hd.textContent = '⚔️';
    $('jdw-netinv-t').textContent = 'Un copain t\'a défié en duel !';
    $('jdw-netinv').hidden = false;
  }, 1200);
})();

/* ================= Lancer un jeu ================= */
let current = null, mountSeq = 0;
function mountGame(g) {
  const seq = ++mountSeq;
  let root;
  if (g.external) { root = $(g.external); root.hidden = false; }
  else { root = document.createElement('div'); root.className = 'game-root'; $('jdw-host').prepend(root); }
  const api = {
    audio: audioApi, colors: COLORS, fonts: FONTS,
    assets: () => window.JDW_ASSETS.load(g.id),
    // un jeu peut demander un morceau précis (ex. musique de boss) ; api.music() rend la main à la musique normale
    music: (track) => {
      if (!current || current.seq !== seq) return;
      if (track && track !== g.id) { MUS.override = true; setMusic(track, 'calm'); return; }
      MUS.override = false;
      let lvl = 0; try { lvl = current.inst && current.inst.currentLevel ? +current.inst.currentLevel() : 0; } catch (e) {}
      setMusic(g.id, lvl >= (INTENSE_AT[g.id] || 99) ? 'intense' : 'calm');
    },
    isMuted: () => muted,
    heads: () => headsShown(),
    player: playerObj(),
    mode: CMP.playing || CMP.practice ? 'compet' : 'normal',
    startLevel: CMP.playing || CMP.practice ? COMPET_START[g.id] || 1 : 1,
    seed: CMP.playing ? CMP.seed : undefined,
    celebrate: (text, name) => { if (current && current.seq === seq) toastCheer(text, name); },
    gameOver(score) {
      if (!current || current.seq !== seq || current.over) return;
      current.over = true;
      const sc = Math.max(0, Math.floor(+score || 0));
      setTimeout(() => { if (current && current.seq === seq) { if (CMP.playing) cmpOut(sc); else if (CMP.practice) cmpPracticeOver(); else showEnd(sc); } }, 900);
    }
  };
  current = { game: g, root, seq, over: false, inst: null, lvBase: lvBest(profile.name, g.id) };
  recReset(); setTimeout(recLine, 50);
  musicBaseLevel(0.8); MUS.override = false; setMusic(g.id);
  try { current.inst = g.mount(root, api) || {}; } catch (e) { current.inst = {}; reportError('Lancement de ' + g.id + ' : ' + e.message, e.stack); }
  setWhere(g.id);
  if (LANDSCAPE.has(g.id)) fsTip();   // iPhone dans Safari : astuce « Sur l'écran d'accueil » (une seule fois)
}
function unmountGame() {
  if (!current) return;
  castEndAll();
  const { game, root, inst } = current;
  try { inst && inst.destroy && inst.destroy(); } catch (e) {}
  if (game.external) root.hidden = true; else root.remove();
  current = null;
  $('jdw-cheer').hidden = true; $('jdw-rescue').hidden = true;
}
const LANDSCAPE = new Set(['pleingaz', 'canards', 'rouleaux']);
const portraitMQ = matchMedia('(orientation: portrait) and (max-width: 900px)');
let waitRotate = null;
function openGame(g) {
  if (!isGuest()) {                    // invité : il joue tout de suite (score non enregistré)
    if (!profile.name) { startWelcome(); return; }
    if (ONLINE && !room) { openRooms(); return; }
  }
  markGameSeen(g.id);
  Audio.ensure();
  $('jdw-lib').hidden = true; $('jdw-play').hidden = false;
  $('jdw-play').style.setProperty('--acc', g.accent);
  $('jdw-gtitle').textContent = g.title;
  $('jdw-end').hidden = true;
  fsEnter(LANDSCAPE.has(g.id));      // téléphone dans le navigateur : plein écran (dans le toucher même), à l'horizontale pour les jeux en paysage
  if (LANDSCAPE.has(g.id) && portraitMQ.matches) {
    waitRotate = g; $('jdw-rotate').hidden = false;
    return;
  }
  mountGame(g);
}
function startAfterRotate() {
  if (!waitRotate) return;
  const g = waitRotate; waitRotate = null; $('jdw-rotate').hidden = true;
  setTimeout(() => mountGame(g), 250);            // laisse le temps à l'écran de se redimensionner
}
portraitMQ.addEventListener ? portraitMQ.addEventListener('change', () => { if (!portraitMQ.matches) startAfterRotate(); })
                            : portraitMQ.addListener(() => { if (!portraitMQ.matches) startAfterRotate(); });
$('jdw-rotate-skip').addEventListener('click', startAfterRotate);
function backToLibrary() {
  flushPending();
  waitRotate = null; $('jdw-rotate').hidden = true;
  unmountGame();
  $('jdw-end').hidden = true; $('jdw-play').hidden = true; $('jdw-lib').hidden = false;
  $('jdw-play').classList.remove('cmp'); $('jdw-cmp-side').hidden = true; cmpClosePick();
  setWhere('menu'); refreshAll(); musicBaseLevel(1); MUS.override = false; setMusic('accueil');
  fsLeave();
  if (siteNew) setTimeout(maybeReload, 800);
}
// Quitter en pleine partie : le score en cours compte comme une fin de partie (record enregistré s'il est battu)
function quitGame() {
  if (CMP.playing || CMP.practice) {   // compétition : quitter = sortir avec le score atteint
    let sc = 0;
    try { if (current && !current.over && current.inst && current.inst.currentScore) sc = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (e) {}
    if (current) current.over = true;
    if (CMP.playing) cmpOut(sc); else cmpPracticeOver();
    return;
  }
  if (current && !current.over && current.inst && current.inst.currentScore) {
    let sc = 0;
    try { sc = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (e) { sc = 0; }
    if (sc > 0) {
      current.over = true;
      try { current.lastLevel = current.inst.currentLevel ? +current.inst.currentLevel() || 0 : 0; } catch (e) {}   // pour l'écran de fin
      try { current.inst.destroy && current.inst.destroy(); } catch (e) {}
      current.inst = {};
      if (current.game.external) current.root.hidden = true; else current.root.textContent = '';
      showEnd(sc);
      return;
    }
  }
  backToLibrary();
}
$('jdw-back').addEventListener('click', quitGame);
$('jdw-tolib').addEventListener('click', backToLibrary);
$('jdw-again').addEventListener('click', () => { flushPending(); if (!current) return; const g = current.game; unmountGame(); $('jdw-end').hidden = true; Audio.ensure(); mountGame(g); });
function syncMute() {
  const silent = muted && !MUS.on && !criOn;
  $('jdw-mute').textContent = silent ? '🔇' : '🔊';
  $('jdw-mute').setAttribute('aria-label', 'Réglages du son : musique, bruitages, cris');
  if (Audio.master) Audio.master.gain.value = muted ? 0 : 0.6;
  for (const g of GAMES) if (g.setMuted) { try { g.setMuted(muted); } catch (e) {} }
}
// bouton de la partie : un petit menu pour couper séparément la musique, les bruitages et les cris
function syncSoundMenu() {
  $('jdw-sm-music').checked = MUS.on; $('jdw-sm-sfx').checked = !muted; $('jdw-sm-cris').checked = criOn;
}
$('jdw-mute').addEventListener('click', e => {
  e.stopPropagation(); Audio.ensure(); syncSoundMenu();
  const m = $('jdw-soundmenu'); m.hidden = !m.hidden; $('jdw-mute').setAttribute('aria-expanded', String(!m.hidden));
});
document.addEventListener('pointerdown', e => { const m = $('jdw-soundmenu'); if (!m.hidden && !m.contains(e.target) && e.target !== $('jdw-mute')) { m.hidden = true; $('jdw-mute').setAttribute('aria-expanded', 'false'); } }, true);
$('jdw-sm-music').addEventListener('change', () => { setMusicOn($('jdw-sm-music').checked); syncMute(); });
$('jdw-sm-sfx').addEventListener('change', () => { muted = !$('jdw-sm-sfx').checked; store.set('jdw.muted', muted); syncMute(); if (!muted) Audio.tone(660, 0.08, 'square', 0.05); });
$('jdw-sm-cris').addEventListener('change', () => { criOn = $('jdw-sm-cris').checked; store.set('jdw.cris', criOn); if (!criOn && criAudio) { try { criAudio.pause(); } catch (e) {} } });

/* ================= Plein écran pendant la partie (téléphone, dans le navigateur) ================= */
// Dans un onglet du navigateur, la barre d'adresse mange l'écran (surtout en paysage). Une partie lancée d'un toucher passe en plein écran,
// dans le geste même : openGame, openDuo, duel en ligne (netCreate chez l'hôte, netJoin chez l'invité), compétition seulement si le départ
// est un toucher (le GO, lancé par la minuterie, ne peut pas). Les jeux en paysage verrouillent ensuite l'écran à l'horizontale
// (screen.orientation.lock ne marche qu'en plein écran ou dans la borne installée). Jamais dans l'appli Android (déjà en plein écran), dans
// la borne installée (PWA), sur ordinateur (TOUCH) ni sur iPhone / iPad (pas d'API pour une page : astuce « Sur l'écran d'accueil », une
// seule fois, au premier jeu en paysage). Retour à la bibliothèque : on sort du plein écran et on relâche le verrou (jamais entre deux
// « Rejouer » / « Revanche »). Le joueur qui sort lui-même (geste retour) n'est jamais contrarié : la partie continue ; le bouton de la
// barre du haut (#jdw-fs) le remet, et s'il l'enlève avec ce bouton, les parties suivantes de la séance restent sans plein écran.
const FS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && (navigator.maxTouchPoints || 0) > 1);
const FS_PWA = (() => { try { return navigator.standalone === true || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches; } catch (e) { return false; } })();   // lu au chargement (en plein écran, display-mode change)
const FS = { seq: 0, off: false, land: false, locked: false, leaveT: 0, rzT: 0, tipped: false,
  can: (() => { try { const d = document.documentElement; return TOUCH && !/BorneArcade/.test(navigator.userAgent) && !FS_PWA && !FS_IOS && !!(d.requestFullscreen || d.webkitRequestFullscreen) && document.fullscreenEnabled !== false && document.webkitFullscreenEnabled !== false; } catch (e) { return false; } })() };
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
function fsOrient(on) {   // à l'horizontale (jeu en paysage) ou libre ; un refus (pas en plein écran) ne fait rien
  FS.land = !!on;
  try {
    const o = screen.orientation;
    if (on) { if (TOUCH && o && o.lock) o.lock('landscape').then(() => { FS.locked = true; if (!FS.land) fsOrient(false); }, () => {}); }
    else if (FS.locked) { FS.locked = false; if (o && o.unlock) o.unlock(); }
  } catch (e) {}
}
const fsLand = () => { if (fsEl() || !FS.can) fsOrient(true); };   // jeu en paysage qui démarre sans toucher (duel en ligne chez l'invité)
function fsEnter(land) {
  clearTimeout(FS.leaveT); FS.leaveT = 0;
  if (!FS.can || fsEl()) { fsOrient(land); return; }   // déjà en plein écran (partie suivante) ; appli, borne installée : le verrou seul
  if (FS.off || (navigator.userActivation && !navigator.userActivation.isActive)) return;   // enlevé avec le bouton ; pas un toucher (GO)
  const d = document.documentElement, seq = ++FS.seq;
  const then = () => { if (land && seq === FS.seq && fsEl()) fsOrient(true); };
  try { const p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : d.webkitRequestFullscreen(); if (p && p.then) p.then(then, () => {}); else setTimeout(then, 400); } catch (e) {}
}
function fsExit() { try { const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen ? document.webkitExitFullscreen() : null; if (p && p.catch) p.catch(() => {}); } catch (e) {} }
function fsLeave() {   // retour à la bibliothèque (vérifié juste après : une autre partie a pu reprendre aussitôt, ex. « Revanche » depuis le chat)
  clearTimeout(FS.leaveT);
  FS.leaveT = setTimeout(() => {
    FS.leaveT = 0;
    if (!$('jdw-play').hidden || !$('jdw-duo').hidden || NET.role) return;
    FS.seq++; fsOrient(false);
    if (fsEl() === document.documentElement) fsExit();
  }, 0);
}
const FS_ICON = { in: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
  out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>' };
function fsBtnSync() {
  const b = $('jdw-fs'); if (!b) return;
  const on = !!fsEl(), k = on ? 'out' : 'in', t = on ? 'Quitter le plein écran' : 'Plein écran';
  if (b.dataset.k !== k) { b.dataset.k = k; b.innerHTML = FS_ICON[k]; }
  b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', t); b.title = t;
}
function fsSync() {
  if (!fsEl()) FS.locked = false;            // en sortant du plein écran, le navigateur relâche le verrou tout seul
  fsBtnSync();
  clearTimeout(FS.rzT); FS.rzT = setTimeout(() => dispatchEvent(new Event('resize')), 150);   // les jeux se remesurent (certains n'écoutent que « resize »)
}
document.addEventListener('fullscreenchange', fsSync);
document.addEventListener('webkitfullscreenchange', fsSync);
if (FS.can) {   // petit bouton à côté du son, seulement là où le plein écran est possible
  const b = document.createElement('button'); b.type = 'button'; b.id = 'jdw-fs'; b.className = 'btn btn-ghost btn-sm';
  $('jdw-mute').before(b); b.parentNode.classList.add('has-fs'); fsBtnSync();
  b.addEventListener('click', () => {
    if (fsEl()) { FS.off = true; FS.seq++; fsOrient(false); fsExit(); return; }
    FS.off = false; fsEnter(!!((current && LANDSCAPE.has(current.game.id)) || (waitRotate && LANDSCAPE.has(waitRotate.id))));
  });
}
// iPhone / iPad dans Safari (pas la borne installée) : une astuce, une seule fois sur l'appareil (jdw.fstip), au premier jeu en paysage
const FS_TIP = FS_IOS && !FS_PWA && /Safari\//.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|DuckDuckGo|BorneArcade/.test(navigator.userAgent);
function fsTip() {
  if (!FS_TIP || FS.tipped) return;
  FS.tipped = true;
  if (store.get('jdw.fstip', false)) return;
  store.set('jdw.fstip', true);
  const el = document.createElement('div'); el.id = 'jdw-fstip'; el.className = 'fs-tip'; el.setAttribute('role', 'status');
  el.innerHTML = '<span class="ft-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 14.5V3.5M8 7.5l4-4 4 4"/><path d="M8.5 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5"/></svg></span>' +
    '<span class="ft-tx"><b>Astuce&nbsp;:</b> pour jouer sans la barre de Safari, touche <b>Partager</b> puis <span class="ft-nw">«&nbsp;Sur l’écran d’accueil&nbsp;»</span></span>' +
    '<button class="ft-x" type="button" aria-label="Fermer l’astuce">✕</button>';
  document.body.appendChild(el);
  let t = 0;
  const close = () => { clearTimeout(t); el.classList.remove('on'); setTimeout(() => el.remove(), 400); };
  el.addEventListener('click', close);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  t = setTimeout(close, 9000);
}

/* ================= 1re place affichée pendant toute la partie ================= */
const REC = { leader: '', score: -1, passed: '', flashUntil: 0 };
function recReset() { REC.leader = ''; REC.score = -1; REC.passed = ''; REC.flashUntil = 0; }
function recLine() {
  const el = $('jdw-recline');
  if ((CMP.playing || CMP.practice) && current && !$('jdw-play').hidden) { cmpLine(el); return; }
  if (!current || $('jdw-play').hidden || !$('jdw-end').hidden || isGuest()) { el.hidden = true; return; }   // invité : pas de classement
  const g = current.game, me = cleanName(profile.name), lead = top(g.id)[0], u = unit(g);
  let cur = 0;
  try { if (!current.over && current.inst && current.inst.currentScore) cur = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (e) {}
  el.hidden = false;
  let cls = 'recline', txt;
  if (lead && REC.leader && (REC.leader !== lead.name || REC.score !== lead.score) && lead.name !== me) {
    // un copain vient de prendre (ou d'améliorer) la 1re place pendant qu'on joue
    REC.flashUntil = Date.now() + 2500;
    toastCheer(dispName(lead.name) + (REC.leader === lead.name ? ' améliore son record : ' : ' prend la 1re place : ') + fmt(lead.score) + u + ' !', lead.name);
  }
  if (lead) { REC.leader = lead.name; REC.score = lead.score; }
  if (!lead) { txt = cur > 0 ? '👑 Toi · ' + fmt(cur) + u + ' · premier record !' : '👑 Pas encore de record : à toi !'; if (cur > 0) cls += ' me'; }
  else if (lead.name === me) { cls += ' me'; txt = cur > lead.score ? '👑 Toi · ' + fmt(cur) + u + ' · nouveau record !' : '👑 Toi · ' + fmt(lead.score) + u + (cur ? ' · en cours ' + fmt(cur) : ''); }
  else if (cur > lead.score) {
    cls += ' me'; txt = '👑 Toi · ' + fmt(cur) + u + ' · devant ' + dispName(lead.name) + ' !';
    const key = lead.name + ':' + lead.score;
    if (REC.passed !== key) {
      REC.passed = key; REC.flashUntil = Date.now() + 2500;
      toastCheer('Tu passes devant ' + dispName(lead.name) + ' ! 👑', me, true);
      Audio.tone(784, 0.12, 'square', 0.06); setTimeout(() => Audio.tone(1046, 0.22, 'square', 0.06), 120);
    }
  } else txt = '👑 ' + dispName(lead.name) + ' · ' + fmt(lead.score) + u + (cur ? '   ·   toi ' + fmt(cur) : '');
  if (Date.now() < REC.flashUntil) cls += ' flash';
  txt = watchersTxt() + txt;
  try {
    const lvl = current.inst && current.inst.currentLevel ? +current.inst.currentLevel() : 0;
    if (!MUS.override && lvl >= (INTENSE_AT[g.id] || 99) && MUS.wantMode !== 'intense' && !current.over) setMusic(g.id, 'intense');
  } catch (e) {}
  if (el.className !== cls) el.className = cls;
  if (el.textContent !== txt) el.textContent = txt;
}
setInterval(recLine, 400);

/* ================= Fin de partie ================= */
// Score en attente : enregistré pour le joueur choisi (par défaut le joueur actuel, en quittant l'écran de fin).
let pending = null;
// en ligne, le record qui compte est celui du classement de la salle (les anciens scores restés sur l'appareil ne bloquent rien)
const knownBest = (name, game) => {
  const srv = (top(game).find(r => r.name === cleanName(name)) || {}).score || 0;
  return ONLINE && room && serverOk ? srv : Math.max(bestOf(name, game), srv);
};
async function commitScore(name) {
  if (!pending || pending.done) return;
  const p = pending; p.done = true;
  name = cleanName(name) || cleanName(profile.name) || 'JOUEUR';
  const g = gameById(p.game), live = () => pending === p && !$('jdw-end').hidden, st = $('jdw-status');
  $('jdw-who').hidden = true;
  const prev = knownBest(name, p.game);
  if (p.score <= prev) { if (live()) st.textContent = name + ' a déjà mieux : ' + fmt(prev) + unit(g) + '. Score non enregistré.'; return; }
  if (live()) st.textContent = 'Enregistrement pour ' + name + '…';
  const res = await saveScore(p.game, p.score, name);
  if (!live()) return;
  st.textContent = (prev ? 'Nouveau record pour ' + name + ' ! ' : 'Premier score de ' + name + ' ici ! ') +
    (res === 'shared' ? 'Enregistré en ligne dans le classement de la salle.' : (ONLINE ? "Pas de connexion : gardé sur cet appareil, il partira au retour du réseau." : 'Enregistré sur cet appareil.'));
  if (res === 'shared') loadChat();
  renderEndBoard(g, cleanName(profile.name));
}
function flushPending() { if (pending && !pending.done && pending.record) commitScore(profile.name); }
addEventListener('pagehide', flushPending);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushPending(); });
function whoChip(name, label, primary) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'who-chip' + (primary ? ' main' : '');
  const av = document.createElement('span'); av.className = 'avatar'; avatarInto(av, name);
  const t = document.createElement('span'); t.textContent = label;
  b.append(av, t); b.addEventListener('click', () => commitScore(name)); return b;
}
function buildWho(record) {
  const me = cleanName(profile.name), list = $('jdw-who-list'); list.textContent = '';
  const others = deviceNames().filter(n => n !== me);
  if (!record && !others.length) { $('jdw-who').hidden = true; return; }
  $('jdw-who-q').textContent = record ? "C'était bien toi ? Enregistrer ce score pour :" : "Ce n'était pas " + me + ' ? Enregistrer ce score pour :';
  if (record) list.appendChild(whoChip(me, me + ' (moi)', true));
  for (const n of others) list.appendChild(whoChip(n, n, false));
  const add = document.createElement('button'); add.type = 'button'; add.className = 'who-chip'; add.textContent = '+ Autre nom';
  add.addEventListener('click', () => { $('jdw-who-newrow').hidden = false; add.hidden = true; $('jdw-who-name').value = ''; $('jdw-who-name').focus(); });
  list.appendChild(add);
  $('jdw-who-newrow').hidden = true; $('jdw-who').hidden = false;
}
$('jdw-who-ok').addEventListener('click', () => { const n = cleanName($('jdw-who-name').value); if (n) commitScore(n); else $('jdw-who-name').focus(); });
$('jdw-who-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('jdw-who-ok').click(); } });
// fin de partie : jusqu'où je suis allé dans les niveaux, comparé à mon meilleur niveau (gardé sur l'appareil, par joueur et par jeu)
const LV_WORD = { magic: 'Salle', ilo: 'Secteur', mouches: 'Vague' };
// jeux à mondes : Empilo, Glouton (g.worlds[] + g.worldOf ; Glouton : une pièce par niveau, médaillon g.drawWorldIcon) ou Chasse aux mouches
// (g.worlds.list + g.worlds.at) → une seule façon de les lire
function lvWorlds(g) {
  try {
    if (Array.isArray(g.worlds) && typeof g.worldOf === 'function') return { per: g.levelsPerWorld || 3, count: g.worlds.length, word: g.worldWord != null ? g.worldWord : 'Monde',
      icon: typeof g.drawWorldIcon === 'function' ? (x, n, r) => g.drawWorldIcon(x, n, 0, 0, r) : null,
      at: i => { const o = g.worldOf(i); return { n: o.n, stage: o.stage, name: o.world.name, emoji: o.world.emoji, acc: o.world.colors.accent, cyc: o.tour ? 'Tour ' + mapRoman(o.tour) : '', boss: !!o.boss }; } };
    const W = g.worlds;
    if (W && Array.isArray(W.list) && typeof W.at === 'function') return { per: W.perWorld || 3, count: W.list.length, word: 'Monde', icon: typeof W.drawIcon === 'function' ? (x, n, r) => W.drawIcon(x, n, 0, 0, r) : null,
      at: i => { const a = W.at(i), d = W.list[a.world - 1]; return { n: a.world, stage: a.stage - 1, name: d.name, emoji: '', acc: d.colors.acc, cyc: a.cycle > 1 ? (W.cycleWord || 'Jour') + ' ' + a.cycle : '', boss: !!a.boss }; } };
  } catch (e) {}
  return null;
}
function lvIcon(WS, n, px) {      // médaillon d'un monde (dessiné par le jeu), en petit
  const c = document.createElement('canvas'), d = Math.min(3, window.devicePixelRatio || 1), x = c.getContext('2d');
  c.width = c.height = Math.round(px * d); c.style.width = c.style.height = px + 'px'; x.scale(d, d); x.translate(px / 2, px / 2);
  try { WS.icon(x, n, px / 2 - 1); } catch (e) {}
  return c;
}
function showLevelProgress(g, me) {
  const box = $('jdw-lvprog'); box.hidden = true; box.textContent = '';
  let lv = current.lastLevel || 0; try { if (!lv) lv = Math.floor(+current.inst.currentLevel() || 0); } catch (e) {}
  if (!(lv >= 1) || current.mode === 'compet' || isGuest()) return;
  // record d'avant la partie (pendant la partie, progTick garde déjà chaque nouveau niveau sur l'appareil)
  const best = current.lvBase != null && cleanName(profile.name) === me ? current.lvBase : lvBest(me, g.id);
  const had = lvBest(me, g.id);
  if (lv > had && me) { lvSetBest(me, g.id, lv); progPush(me, g.id, lv); }   // dernier niveau pas encore vu par progTick
  // jeu à mondes (Empilo, Chasse aux mouches) : le monde atteint à côté du niveau, la piste se colore monde par monde
  const WS = lvWorlds(g); let wo = null; try { if (WS) wo = WS.at(lv); } catch (e) { wo = null; }
  const per = wo ? WS.per * WS.count : 5;
  const word = LV_WORD[g.id] || 'Niveau', top = Math.max(lv, best), n = wo ? Math.max(per, Math.ceil((top + 1) / per) * per) : Math.max(10, Math.ceil((top + 2) / 5) * 5);
  const h = document.createElement('p'); h.className = 'lv-h';
  const b = document.createElement('b'); b.textContent = word + ' ' + lv; h.append(b);
  if (wo) {
    const c = document.createElement('span'); c.className = 'lv-w'; c.style.setProperty('--wc', wo.acc);
    if (WS.icon) c.append(lvIcon(WS, wo.n, 16), ' ');
    c.append((wo.emoji && !WS.icon ? wo.emoji + ' ' : '') + (WS.word ? WS.word + ' ' + wo.n + ' · ' : '') + wo.name + (wo.cyc ? ' · ' + wo.cyc : ''));
    h.append(c);
  }
  const recTxt = lv > best ? (best ? 'nouveau record ! (avant : ' + best + ')' : 'premier record !') : lv === best ? 'ton record égalé !' : 'ton record : ' + best + ' (encore ' + (best - lv) + ')';
  if (wo) { const r = document.createElement('span'); r.className = 'lv-rec'; r.textContent = recTxt; h.append(r); } else h.append(document.createTextNode(' · ' + recTxt));
  const track = document.createElement('div'); track.className = 'lv-track' + (wo ? ' worlds' : ''); track.style.setProperty('--n', n);
  for (let i = 1; i <= n; i++) {
    const d = document.createElement('i'); if (i <= lv) d.className = 'on'; if (i === lv) d.classList.add('now');
    if (i === best && best !== lv) { d.classList.add('best'); d.title = 'ton record'; }
    if (wo) { const wi = WS.at(i); d.style.setProperty('--acc', wi.acc); if (i > 1 && (WS.per > 1 ? wi.stage === 0 : wi.n === 1)) d.classList.add('wstart'); if (wi.boss) d.classList.add('boss'); }
    d.style.setProperty('--d', (i * 0.05).toFixed(2) + 's'); track.appendChild(d);
  }
  box.append(h, track);
  if (wo) {      // sous la piste : l'emoji (ou le médaillon) de chaque monde, celui atteint en grand (plus petits quand ils sont nombreux)
    const row = document.createElement('div'); row.className = 'lv-worlds'; row.style.setProperty('--n', n / WS.per);
    const nI = n / WS.per, isz = nI > 12 ? 13 : 18, tours = WS.per === 1 && nI > 18;
    // une pièce par niveau et plus de 3 tours (Glouton) : sous la piste, le numéro de chaque tour (les médaillons seraient minuscules)
    for (let i = 1; i <= n; i += tours ? WS.count : WS.per) {
      const wi = WS.at(i), e = document.createElement('i');
      if (tours) {
        const last = Math.min(n, i + WS.count - 1), here = lv >= i && lv <= last;
        e.className = 'tour' + (here ? ' now' : lv > last ? ' on' : ''); e.style.gridColumn = 'span ' + (last - i + 1);
        e.textContent = (here ? 'Tour ' : '') + mapRoman(Math.floor((i - 1) / WS.count));
      } else {
        const now = wi.n === wo.n && wi.cyc === wo.cyc;
        if (WS.icon) e.append(lvIcon(WS, wi.n, now ? isz + (nI > 12 ? 5 : 6) : isz)); else e.textContent = wi.emoji;
        e.title = wi.name + (wi.cyc ? ' · ' + wi.cyc : '');
        if (now) e.className = 'now'; else if (i <= lv) e.className = 'on';
      }
      e.style.setProperty('--d', (i * 0.05 + 0.15).toFixed(2) + 's'); row.appendChild(e);
    }
    box.append(row);
  }
  box.hidden = false;
}
async function showEnd(score) {
  castEndAll(score);   // les spectateurs voient le score final
  flushPending(); musicBaseLevel(0.5);
  const g = current.game, me = cleanName(profile.name);
  const before = top(g.id);
  const myBest = knownBest(me, g.id);
  $('jdw-endcard').style.setProperty('--acc', g.accent);
  $('jdw-endgame').textContent = g.title + ' · partie terminée';
  $('jdw-endscore').textContent = fmt(score);
  $('jdw-endunit').textContent = g.scoreLabel === 'm' ? 'mètres' : (g.scoreLabel || 'points');
  showLevelProgress(g, me);
  // qui ai-je battu ?
  const others = before.filter(r => r.name !== me);
  // seulement ceux qu'on vient de dépasser avec cette partie (pas ceux qui étaient déjà derrière nous)
  const beaten = others.filter(r => score > r.score && r.score >= myBest);
  const beat = $('jdw-beat'); beat.hidden = true; beat.classList.remove('has-cri'); beat.onclick = null;
  if (score > 0 && beaten.length) {
    const victim = beaten[0], wasFirst = before[0] && victim.name === before[0].name;
    const p = players.get(victim.name);
    $('jdw-beat-txt').innerHTML = '';
    const b = document.createElement('b'); b.textContent = (wasFirst ? 'Tu as battu le premier : ' : 'Tu as battu ') + dispName(victim.name) + ' !';
    $('jdw-beat-txt').append(b, (wasFirst ? 'Nouveau record de la bande. ' : '') + 'Son score : ' + fmt(victim.score) + unit(g) + (p && p.photo ? '. Snif, ' + victim.name + ' pleure !' : ''));
    if (p && p.photo) { $('jdw-beat-img').src = sadUrl(p); $('jdw-beat-img').hidden = false; } else $('jdw-beat-img').hidden = true;
    beat.hidden = false;
    Audio.tone(523, 0.12, 'square', 0.06); setTimeout(() => Audio.tone(784, 0.2, 'square', 0.06), 130);
  }
  // un copain crie : celui qu'on vient de battre (tête triste), sinon celui qui mène et se moque
  const taunt = $('jdw-taunt'); taunt.hidden = true;
  let crier = null, cryMode = '', ahead = null;
  if (score > 0 && beaten.length) {
    // on a battu quelqu'un : c'est lui qui pleure (jamais de moquerie)
    if (hasCri(beaten[0].name)) { crier = beaten[0].name; cryMode = 'sad'; }
  } else {
    // personne de battu : seul le PREMIER du classement se moque (s'il n'a pas de cri, aucun cri)
    const lead = before[0];
    if (lead && lead.name !== me && lead.score >= score && hasCri(lead.name)) { ahead = lead; crier = lead.name; cryMode = 'mock'; }
  }
  if (crier) {
    if (cryMode === 'mock') {
      const head = $('jdw-taunt-head'); head.textContent = ''; head.appendChild(chatHead(crier, { passive: true }));
      $('jdw-taunt-name').textContent = crier;
      const first = before[0] && before[0].name === crier;
      const says = first ? ['garde la 1re place et se moque de toi !', 'est toujours le roi de ce jeu…', 'reste premier et te chambre !']
                         : ['reste devant toi et se moque !', 'garde son avance et rigole…', 'te devance encore !'];
      $('jdw-taunt-say').textContent = ' ' + says[Math.floor(shellRand() * says.length)] + ' (' + fmt(ahead.score) + unit(g) + ')';
      taunt.hidden = false; taunt.onclick = () => playCri(crier, head.firstChild);
      setTimeout(() => { if (!$('jdw-end').hidden) playCri(crier, head.firstChild); }, 450);
    } else {
      $('jdw-beat').classList.add('has-cri'); $('jdw-beat').onclick = () => playCri(crier, $('jdw-beat-img'));
      setTimeout(() => { if (!$('jdw-end').hidden) playCri(crier, $('jdw-beat-img')); }, 450);
    }
  }
  const st = $('jdw-status'), record = score > 0 && score > myBest && !isGuest();
  $('jdw-end-guest').hidden = !isGuest();
  pending = score > 0 && !isGuest() ? { game: g.id, score, record, done: false } : null;
  if (isGuest()) st.textContent = score > 0 ? 'Joli score ! En invité, il n’est pas enregistré.' : 'Pas de points cette fois. Retente ta chance !';
  else if (record) st.textContent = 'Nouveau record ! Enregistrement en ligne…';
  else st.textContent = myBest ? 'Ton record : ' + fmt(myBest) + unit(g) + '. Encore un effort !' : 'Pas de points cette fois. Retente ta chance !';
  if (pending && !record) buildWho(false); else $('jdw-who').hidden = true;
  $('jdw-end').hidden = false;
  renderEndBoard(g, me);
  if (record) commitScore(me);           // un record part tout de suite dans le classement en ligne
  $('jdw-again').focus({ preventScroll: true });
  if (record) Audio.tone(660, 0.1, 'square', 0.05);
}
function renderEndBoard(g, me) {
  const ol = $('jdw-endboard'); ol.textContent = '';
  ol.hidden = isGuest();                // invité : pas de classement (scores non enregistrés)
  if (ol.hidden) return;
  const rows = top(g.id).slice(0, 5);
  if (!rows.length) return emptyRow(ol);
  for (const r of rows) { const s = document.createElement('span'); s.className = 's'; s.textContent = fmt(r.score) + unit(g); ol.appendChild(rowEl(r.name, s, r.name === me)); }
}

/* ================= Inviter par un lien (source/invite.sql) ================= */
// Un membre partage le lien de sa salle : …/jouer/?salle=<jeton>. Le jeton est un secret fabriqué par le serveur (make_invite), un par salle,
// le même pour tous les membres ; « Annuler ce lien » en fabrique un nouveau et les anciens liens ne marchent plus. Pour celui qui le reçoit,
// le lien remplace le nom + le code de la salle. Partage : navigator.share (Messenger, WhatsApp, SMS…), sinon copie (+ WhatsApp / SMS sur
// téléphone, dans l'appli Android qui n'a pas navigator.share). Serveur sans invite.sql (404) : l'ancienne invitation (nom + code de la salle).
// Lien ouvert (INV_URL, lu au chargement puis retiré de l'adresse ; gardé dans jdw.invite jusqu'au bout, 30 jours au plus) :
//   compte connecté → « Rejoindre Les kiki du gard ? » (invite_info, public) → join_by_invite → on y est ;
//   invité → l'invitation attend (fenêtre + bandeau « Crée ton compte ») ; la salle est rejointe toute seule dès que le compte est là
//   (afterOnboarding, guestSync) ; lien annulé ou faux → « Lien périmé » ; pas de réseau → elle attend le retour du réseau.
const INV = { busy: false, link: '', oldTxt: '', rid: null, shown: '', kind: '', v: null, copyT: 0, off: false, bad: false };
function invPending() {
  const v = store.get('jdw.invite', null);
  if (!v || typeof v !== 'object' || !INV_RX.test(String(v.t || '')) || !(Date.now() - (+v.at || 0) < 30 * 86400e3)) return null;
  return v;
}
function invForget() { try { localStorage.removeItem('jdw.invite'); } catch (e) {} INV.shown = ''; try { guestBar(); } catch (e) {} }
if (INV_URL !== null) {
  try { const s = new URLSearchParams(location.search); s.delete('salle'); const qs = s.toString(); history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch (e) {}
  const t = INV_URL.trim(), old = invPending(), same = !!old && old.t === t;
  if (ONLINE && INV_RX.test(t)) { store.set('jdw.invite', { t, at: Date.now(), name: same ? old.name || '' : '', n: same ? old.n || 0 : 0, auto: same && !!old.auto }); INV.fresh = true; }
  else if (ONLINE) INV.bad = true;                           // lien coupé ou recopié de travers : on le dira
}
const invChime = () => { Audio.ensure(); Audio.tone(523, 0.12, 'triangle', 0.05, 784); setTimeout(() => Audio.tone(784, 0.16, 'triangle', 0.045, 1046), 110); setTimeout(() => Audio.tone(1046, 0.22, 'sine', 0.04), 230); };
// ---- l'invité : la fenêtre du lien ouvert (data-kind : ask | guest | noname | bad | old) ----
function invShow(kind, v) {
  const box = $('jdw-inv'), name = (v && v.name) || '', n = (v && +v.n) || 0, guest = kind === 'guest';
  INV.kind = kind; INV.v = v || null;
  box.dataset.kind = guest && !name ? 'noname' : kind;
  box.querySelector('.inv-card').style.setProperty('--h', name && kind !== 'bad' ? roomHue(name) : kind === 'bad' ? 350 : 196);
  $('jdw-inv-room').textContent = kind === 'bad' || kind === 'old' ? '' : name;
  $('jdw-inv-orb').textContent = kind === 'bad' || kind === 'old' ? '🎟️' : '🎮';
  $('jdw-inv-tag').textContent = 'Invitation';
  const mem = $('jdw-inv-mem'); mem.textContent = '';
  if (name && n && (kind === 'ask' || guest)) { mem.innerHTML = ICON_USERS; mem.append(n + (n > 1 ? ' membres' : ' membre')); }
  const h = $('jdw-inv-h'); h.textContent = '';
  const em = t => { const e = document.createElement('em'); e.textContent = t; return e; };
  const me = cleanName(profile.name);
  let s = '', ok = '', alt = '', no = '';
  if (kind === 'ask') {
    h.append('Rejoindre ', em(name), ' ?');
    s = 'Tu y entres avec ton joueur ' + me + ' : classement, chat, duels et compétitions avec les copains de la salle.';
    ok = 'Rejoindre la salle'; no = 'Pas maintenant';
  } else if (guest) {
    guestBar();
    if (name) h.append('Tes copains t’invitent dans ', em(name), ' !'); else h.append('Tes copains t’invitent dans leur salle !');
    s = 'Crée ton compte (gratuit) ou connecte-toi : tu entreras directement dans la salle, sans nom ni code à taper.';
    ok = $('jdw-guest-new').textContent; alt = $('jdw-guest-login').textContent; no = 'Plus tard';
  } else if (kind === 'bad') {
    h.append('Ce lien ne marche plus');
    s = 'Il a été annulé par la salle, ou il est incomplet. Demande un nouveau lien à tes copains.';
    ok = 'OK'; alt = isGuest() ? '' : 'Chercher la salle par son nom';
  } else {   // old : serveur pas encore à jour (invite.sql)
    h.append('Les liens d’invitation arrivent bientôt');
    s = 'Le serveur de la borne n’est pas encore prêt pour ce lien : demande aux copains le nom de leur salle (et son code s’il y en a un).';
    ok = 'OK'; alt = isGuest() ? '' : 'Rejoindre avec le nom';
  }
  $('jdw-inv-s').textContent = s;
  const st = $('jdw-inv-status'); st.textContent = ''; st.className = 'small inv-status';
  const bOk = $('jdw-inv-ok'), bAlt = $('jdw-inv-alt'), bNo = $('jdw-inv-no');
  bOk.textContent = ok; bOk.disabled = false; bAlt.textContent = alt; bAlt.hidden = !alt; bNo.textContent = no; bNo.hidden = !no;
  if (!box.hidden) { const tk = $('jdw-inv-ticket'); tk.style.animation = 'none'; void tk.offsetWidth; tk.style.animation = ''; }   // le ticket retombe
  openSheet('jdw-inv', TOUCH ? null : 'jdw-inv-ok');      // téléphone : pas d'anneau de focus sur une fenêtre ouverte toute seule
  if (kind === 'ask' || guest) invChime(); else { Audio.ensure(); Audio.tone(330, 0.16, 'sawtooth', 0.03, 196); }
}
function invStatus(t, cls) { const st = $('jdw-inv-status'); st.textContent = t || ''; st.className = 'small inv-status' + (cls ? ' ' + cls : ''); }
$('jdw-inv-ok').addEventListener('click', () => {
  const k = INV.kind, v = INV.v;
  if (k === 'ask' && v) { invJoin(v); return; }
  closeSheet('jdw-inv');
  if (k === 'guest') $('jdw-guest-new').click();           // même chemin que le bandeau : créer un compte (ou se connecter, ajouter au compte…)
  else if (!isGuest() && !room) openRooms();
});
$('jdw-inv-alt').addEventListener('click', () => {
  const k = INV.kind; closeSheet('jdw-inv');
  if (k === 'guest') { $('jdw-guest-login').click(); return; }
  Promise.resolve(openRooms()).then(() => showRoomsTab('join', true));
});
$('jdw-inv-no').addEventListener('click', () => {
  const k = INV.kind; closeSheet('jdw-inv');
  if (k === 'ask') { invForget(); if (!room) openRooms(); }   // compte connecté qui ne veut pas : l'invitation est oubliée
});
$('jdw-inv').addEventListener('click', e => { if (e.target === $('jdw-inv')) invDismiss(); });
// fermée sans répondre (fond, Échap, retour Android) : l'invitation reste gardée, redemandée au prochain lancement
function invDismiss() { if (INV.kind === 'ask' && INV.v) INV.dismissed = INV.v.t; closeSheet('jdw-inv'); }
// ---- le lien ouvert : que faire ? (au démarrage, après la création du compte, au retour du réseau) ----
async function invInfo(v, me) {   // { info } (null : lien faux ou annulé) | { err }
  try { return { info: ((await rpc('invite_info', { p_code: CODE(), p_token: v.t, p_name: me || null }, { quiet: true, quiet404: true })) || [])[0] || null }; }
  catch (e) { return { err: e }; }
}
async function invRun() {
  if (!ONLINE || (!INV.bad && !invPending())) return;
  if (INV.busy) { clearTimeout(INV.waitT); INV.waitT = setTimeout(invRun, 800); return; }   // déjà en route (ex. : compte qui arrive pendant la lecture du lien)
  // en pleine partie (ou une autre fenêtre importante ouverte) : on attend d'être revenu au calme
  if (['jdw-play', 'jdw-duo', 'jdw-net', 'jdw-watch', 'jdw-welcome', 'jdw-acct', 'jdw-photo', 'jdw-cri'].some(id => $(id) && !$(id).hidden)) { clearTimeout(INV.waitT); INV.waitT = setTimeout(invRun, 3000); return; }
  if (INV.bad) { INV.bad = false; invShow('bad'); return; }
  const v = invPending();
  if (netOff()) { if (!INV.off) { INV.off = true; netPill('📡 Invitation gardée : elle s’ouvrira avec le réseau', 'need'); } return; }
  INV.off = false; INV.busy = true;
  try { if (isGuest()) await invForGuest(v); else if (profile.name) await invForMember(v); }
  finally { INV.busy = false; }
}
async function invForGuest(v) {
  if (INV.shown === v.t) return;                       // déjà montrée : le bandeau « Invitation » reste là
  if (!INV.fresh) { v.auto = true; store.set('jdw.invite', v); INV.shown = v.t; guestBar(); return; }   // gardée d'une visite précédente : seulement le bandeau
  const r = await invInfo(v, null);
  if (r.err && r.err.offline) return;
  if (r.err && r.err.status === 404) { invForget(); invShow('old', v); return; }
  if (!r.err && !r.info) { invForget(); invShow('bad'); return; }
  if (r.info) { v.name = String(r.info.r_name || ''); v.n = +r.info.r_members || 0; }   // trop d'essais : sans le nom de la salle
  v.auto = true; store.set('jdw.invite', v);          // le compte créé (ou retrouvé), la salle est rejointe toute seule
  INV.shown = v.t; guestBar();
  if (isGuest()) invShow('guest', v);
}
async function invForMember(v) {
  if (v.auto) { await invJoin(v); return; }           // invitation gardée pendant la création du compte : on entre directement
  if (INV.dismissed === v.t) return;
  const r = await invInfo(v, cleanName(profile.name));
  if (r.err && r.err.offline) return;
  if (r.err && r.err.status === 404) { invForget(); invShow('old', v); return; }
  if (r.err) { toastCheer(/trop d essais/.test(String(r.err.message)) ? 'Trop d’essais : réessaie dans quelques minutes.' : 'Le lien d’invitation n’a pas pu être lu.', profile.name, true); return; }
  if (!r.info) { invForget(); invShow('bad'); return; }
  v.name = String(r.info.r_name || ''); v.n = +r.info.r_members || 0; store.set('jdw.invite', v);
  if (r.info.r_member) { await invJoin(v); return; }  // déjà dans cette salle : on y va, sans question
  invShow('ask', v);
}
async function invJoin(v) {
  const me = cleanName(profile.name); if (!me || !ONLINE) return false;
  const sheet = !$('jdw-inv').hidden;
  if (sheet) { invStatus('Entrée dans la salle…'); $('jdw-inv-ok').disabled = true; }
  let r = null;
  try { r = ((await rpc('join_by_invite', { p_code: CODE(), p_token: v.t, p_name: me }, { quiet404: true })) || [])[0] || null; }
  catch (e) {
    if (e.status === 404) { invForget(); invShow('old', v); return false; }
    if (e.offline && !sheet) return false;             // pas de réseau : l'invitation attend
    const m = e.offline ? 'Pas de réseau : réessaie dans un instant.' : /trop d essais/.test(String(e.message)) ? 'Trop d’essais : attends quelques minutes, puis réessaie.'
      : e.acct ? 'Connecte-toi à ton compte, puis réessaie.' : 'Impossible d’entrer dans la salle pour l’instant : réessaie.';
    if (!sheet) { v.auto = false; store.set('jdw.invite', v); invShow('ask', v); }
    invStatus(m, 'err'); $('jdw-inv-ok').disabled = false;
    return false;
  }
  if (!r || r.r_id == null) { invForget(); invShow('bad'); return false; }
  invForget();
  if (!$('jdw-inv').hidden) closeSheet('jdw-inv');
  for (const id of ['jdw-rooms', 'jdw-guestask']) if (!$(id).hidden) closeSheet(id);
  if (selfLeave === me) selfLeave = '';
  const rid = +r.r_id, same = !!room && room.id === rid;
  if (same) { const p = players.get(me); if (p) p.member = true; memberNames.add(me); loadPlayers(); poke('players'); rtTrack(); }
  else enterRoom({ id: rid, name: String(r.r_name || ''), priv: !!r.r_private, owner: r.r_owner || null });
  toastCheer('Bienvenue dans « ' + String(r.r_name || '') + ' » !', me, true);
  invChime();
  return true;
}
// ---- un membre invite : le lien de sa salle ----
function invShareStatus(t, cls) { const st = $('jdw-invshare-status'); st.textContent = t || ''; st.className = 'small inv-status' + (cls ? ' ' + cls : ''); }
function invShareMembers() {
  const box = $('jdw-invshare-mem'); box.textContent = '';
  const me = cleanName(profile.name), names = [...memberNames].filter(n => n && n !== 'IA');
  if (!names.length) return;
  const ph = n => !!(players.get(n) || {}).photo;
  names.sort((a, b) => (b === me) - (a === me) || ph(b) - ph(a) || a.localeCompare(b));
  const hs = document.createElement('span'); hs.className = 'it-heads';
  for (const n of names.slice(0, 5)) hs.appendChild(chatHead(n, { passive: true }));
  const t = document.createElement('span'); t.textContent = names.length + (names.length > 1 ? ' membres' : ' membre');
  box.append(hs, t);
}
function invShareLink(url, fresh) {
  const lk = $('jdw-invshare-link'), u = $('jdw-invshare-url');
  lk.classList.remove('done'); lk.disabled = !url; lk.classList.toggle('wait', !url); $('jdw-invshare-copy').textContent = 'Copier';
  u.textContent = '';
  if (!url) { u.textContent = 'Création du lien…'; return; }
  const m = String(url).replace(/^https?:\/\//, '').match(/^(.*?)(\?salle=.*)?$/);
  const a = document.createElement('small'); a.textContent = m[1]; const b = document.createElement('b'); b.textContent = m[2] || '';
  u.append(a, b); u.title = url;
  if (fresh) { lk.classList.remove('fresh'); void lk.offsetWidth; lk.classList.add('fresh'); }
  const msg = invText() + (INV.oldTxt ? '' : ' ' + url);
  $('jdw-invshare-wa').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
  $('jdw-invshare-sms').href = 'sms:?&body=' + encodeURIComponent(msg);
}
const invText = () => INV.oldTxt || ('Viens jouer avec nous dans « ' + (room ? room.name : '') + ' » sur la Borne d’arcade entre amis 🎮 Touche le lien pour entrer dans la salle :');
function invShareOpen() {
  if (!ONLINE) return;
  if (!room) { openRooms(); return; }
  if (isGuest()) { guestAsk('Les salles'); return; }
  $('jdw-invshare').querySelector('.inv-card').style.setProperty('--h', roomHue(room.name));
  $('jdw-invshare-h').textContent = room.name;
  invShareMembers();
  INV.link = ''; INV.oldTxt = ''; INV.rid = room.id;
  invShareLink('');
  $('jdw-invshare-ask').hidden = true; $('jdw-invshare-renew').hidden = false;
  invShareStatus('');
  const share = !!navigator.share;
  $('jdw-invshare-go').textContent = share ? '📨 Partager le lien' : '📋 Copier le lien';
  $('jdw-invshare-go').disabled = true;
  $('jdw-invshare-apps').hidden = share || !TOUCH;      // appli Android (pas de partage du système) : WhatsApp et SMS en un toucher
  openSheet('jdw-invshare', 'jdw-invshare-go');
  invMake(false);
  if (membersFor !== room.id) loadPlayers().then(() => { if (!$('jdw-invshare').hidden) invShareMembers(); });
}
async function invMake(renew) {
  if (!room) return;
  const rid = room.id, me = cleanName(profile.name), prev = INV.link;
  INV.link = ''; invShareLink(''); $('jdw-invshare-go').disabled = true;
  try {
    const t = await rpc('make_invite', Object.assign({ p_code: CODE() }, RP(), { p_name: me, p_renew: !!renew }), { quiet404: true });
    if (!room || room.id !== rid || $('jdw-invshare').hidden) return;
    if (!INV_RX.test(String(t || ''))) throw new Error('make_invite : jeton inattendu');
    INV.link = SITE_URL() + '?salle=' + t;
    const changed = !renew && !!prev && prev !== INV.link;          // renouvelé par un autre membre pendant que la fenêtre était ouverte
    invShareLink(INV.link, renew || changed); $('jdw-invshare-go').disabled = false;
    if (changed) invShareStatus('Un copain a refait le lien : voici le nouveau.', 'ok');
    if (renew) { invShareStatus('Nouveau lien prêt : l’ancien ne marche plus.', 'ok'); Audio.ensure(); Audio.tone(660, 0.08, 'triangle', 0.04, 990); poke('invite'); }   // les autres membres qui ont la fenêtre ouverte reçoivent le nouveau lien
  } catch (e) {
    if (!room || room.id !== rid || $('jdw-invshare').hidden) return;
    if (e.status === 404) { invShareOld(); return; }
    $('jdw-invshare-link').classList.remove('wait'); $('jdw-invshare-url').textContent = 'Lien indisponible';
    invShareStatus(e.offline ? 'Pas de réseau : réessaie dans un instant.' : /membre requis/.test(String(e.message)) ? 'Rejoins d’abord la salle pour inviter des copains.'
      : /trop d essais/.test(String(e.message)) ? 'Trop d’essais : attends quelques minutes.' : 'Impossible de créer le lien pour l’instant : réessaie.', 'err');
  }
}
// serveur pas encore à jour (pas de make_invite) : l'ancienne invitation, avec le nom (et le code) de la salle
function invShareOld() {
  const site = new URL(ROOT || './', location.href).href, code = roomCodes[room.id];
  INV.oldTxt = 'Viens jouer avec moi sur la Borne d’arcade entre amis 🎮\n' + site + '\nCrée ton compte (gratuit), puis « Rejoindre une salle » :\nSalle : ' + room.name + (code ? '\nCode de la salle : ' + code : '');
  INV.link = site; invShareLink(site); $('jdw-invshare-go').disabled = false; $('jdw-invshare-renew').hidden = true;
  invShareStatus('Les liens d’invitation arrivent bientôt : en attendant, on envoie le nom' + (code ? ' et le code' : '') + ' de la salle.', '');
}
async function invShare() {
  if (!INV.link) return;
  if (navigator.share) {
    try { await navigator.share(INV.oldTxt ? { title: 'Borne d’arcade', text: INV.oldTxt } : { title: 'Borne d’arcade · ' + room.name, text: invText(), url: INV.link }); invShareStatus('Invitation envoyée ✓', 'ok'); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  invCopy();
}
async function invCopy() {
  if (!INV.link) return;
  const txt = INV.oldTxt || INV.link;
  let ok = false;
  try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) {
    try { const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (e2) { ok = false; }
  }
  if (!ok) { invShareStatus('Copie impossible : recopie ce lien → ' + txt, 'err'); return; }
  const lk = $('jdw-invshare-link'); lk.classList.add('done'); $('jdw-invshare-copy').textContent = 'Copié ✓';
  clearTimeout(INV.copyT); INV.copyT = setTimeout(() => { lk.classList.remove('done'); $('jdw-invshare-copy').textContent = 'Copier'; }, 2600);
  invShareStatus('Lien copié : colle-le dans Messenger, WhatsApp, un SMS…', 'ok');
  Audio.ensure(); Audio.tone(880, 0.06, 'triangle', 0.035, 1175);
}
$('jdw-invite').addEventListener('click', invShareOpen);
$('jdw-invshare-go').addEventListener('click', invShare);
$('jdw-invshare-link').addEventListener('click', invCopy);
$('jdw-invshare-close').addEventListener('click', () => closeSheet('jdw-invshare'));
$('jdw-invshare').addEventListener('click', e => { if (e.target === $('jdw-invshare')) closeSheet('jdw-invshare'); });
$('jdw-invshare-cancel').addEventListener('click', () => { $('jdw-invshare-renew').hidden = true; $('jdw-invshare-ask').hidden = false; invShareStatus(''); });
$('jdw-invshare-renew-no').addEventListener('click', () => { $('jdw-invshare-ask').hidden = true; $('jdw-invshare-renew').hidden = false; });
$('jdw-invshare-renew-ok').addEventListener('click', () => { $('jdw-invshare-ask').hidden = true; $('jdw-invshare-renew').hidden = false; invMake(true); });
for (const a of [$('jdw-invshare-wa'), $('jdw-invshare-sms')]) a.addEventListener('click', e => { if (!INV.link) e.preventDefault(); });

/* ================= Carte d'avancement ================= */
// Bouton « carte » sous les tuiles des jeux qui en ont une (MAP_DEFS : une description par jeu, facile à étendre) →
// carte plein écran : chemin du niveau 1 (en bas) vers le haut, paliers, têtes des joueurs de la salle sur leur meilleur niveau.
// Progression partagée : table progress (source/progress.sql), save_progress dès qu'un nouveau record de niveau tombe en pleine
// partie (jdw.bestlv sur l'appareil, envoyé seulement quand il monte), get_progress à l'ouverture et au signal « progress » du direct.
// Serveur pas à jour (404) : la carte marche avec la progression de l'appareil, sans erreur visible.
const MAP_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const mapRoman = i => MAP_ROMAN[i] || String(i + 1);
const hexRgb = h => { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgbHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mixHex = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
const rgbaHex = (h, a) => { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
function hueShift(hex, deg) {
  if (!deg) return hex;
  let [r, g, b] = hexRgb(hex).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  h = ((h + deg) % 360 + 360) % 360;
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs((h / 60) % 2 - 1)), m = l - C / 2;
  [r, g, b] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return rgbHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
const mapRng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// Galaxy Wars (games/ilo.js) : 8 secteurs par cycle, mini-boss + boss par secteur, niveau = cycle * 8 + secteur
// (noms des boss = BOSS_NAMES / MINI_NAMES de ilo.js ; bk = clé du boss dans le jeu, sert au dessin du repère de boss)
const GW_SEC = [
  { name: "Ceinture d'Ilo", hue: 196, sat: 80, bg0: '#020812', bg1: '#06243a', acc: '#38e1ff', land: 10, deco: [11, 13], boss: 'La Planète vivante', bk: 'planete', mini: 'Le Gardien', news: 'Le Vaisseau Noir décolle' },
  { name: 'Nébuleuse Ambre', hue: 28, sat: 85, bg0: '#0d0602', bg1: '#2e1404', acc: '#ffa630', land: 29, deco: [4, 20], boss: 'Croiseur Vela', bk: 'vela', mini: 'Le Bélier ambre', news: 'Astéroïdes et frégates' },
  { name: 'Champ de Kepra', hue: 148, sat: 75, bg0: '#020c06', bg1: '#06301c', acc: '#46f08a', land: 6, deco: [8, 2], boss: "Ver de l'hyperespace", bk: 'ver', mini: 'La Mère-mine', news: 'Poseurs de mines' },
  { name: 'Tempête Ionique', hue: 262, sat: 80, bg0: '#07031a', bg1: '#1d0b45', acc: '#a77bff', land: 31, deco: [9, 17], boss: "Reine de l'essaim", bk: 'reine', mini: 'Le Paratonnerre', news: 'Sentinelles laser' },
  { name: "Abysse d'Obsidienne", hue: 222, sat: 55, bg0: '#010205', bg1: '#060b1c', acc: '#7fa8ff', land: 12, deco: [21, 23], boss: 'Station Gaïa', bk: 'gaia', mini: 'Le Spectre', news: 'Éclaireurs furtifs' },
  { name: 'Couloir Écarlate', hue: 350, sat: 85, bg0: '#0e0206', bg1: '#330818', acc: '#ff4d6d', land: 15, deco: [14, 19], boss: 'Les Jumelles', bk: 'jumelles', mini: 'La Herse écarlate', news: 'Croiseurs à bouclier' },
  { name: "Gouffre d'Ophis", hue: 292, sat: 75, bg0: '#08020c', bg1: '#25062e', acc: '#ff5fd2', land: 27, deco: [30, 24], boss: "L'Œil du gouffre", bk: 'oeil', mini: 'Le Pèlerin noir', news: 'Trou noir !' },
  { name: "Cœur d'ILO", hue: 46, sat: 90, bg0: '#0c0802', bg1: '#2c2108', acc: '#ffd34d', land: 25, deco: [16, 18], boss: 'Le Vaisseau blanc', bk: 'blanc', mini: "Le Héraut d'ILO", news: 'Tout à la fois !' }
];
// Plein Gaz (pleingaz-src.html) : une zone tous les 2 niveaux, 5 zones puis la tournée recommence (II, III…), un boss à chaque niveau
// (BOSSES du jeu, dans l'ordre, puis « Mk2 », « Mk3 »… tous les 5 niveaux)
const PG_ZONES = [
  { name: "Hall d'assemblage", short: 'Hall', wall: '#14222e', dk: '#0e1922', sky: '#1b3346', steel: '#22394a', steel2: '#3a5568', lamp: '#ffa630' },
  { name: 'La Fonderie', short: 'Fonderie', wall: '#2a1813', dk: '#1b0f0b', sky: '#6b2c10', steel: '#3e2a24', steel2: '#6d4a3c', lamp: '#ff7a2e' },
  { name: "L'Entrepôt", short: 'Entrepôt', wall: '#16251c', dk: '#0d1811', sky: '#1f3b2b', steel: '#25402f', steel2: '#41694e', lamp: '#c9ff6b' },
  { name: 'La Centrale', short: 'Centrale', wall: '#1c1631', dk: '#120d22', sky: '#2b2153', steel: '#2f2952', steel2: '#4f4785', lamp: '#5ef0ff' },
  { name: 'Les Toits', short: 'Toits', wall: '#0c1424', dk: '#070d18', sky: '#13234a', steel: '#26324a', steel2: '#45567a', lamp: '#ffd34d' }
];
const PG_BOSSES = ['Presse-7', 'Grue folle', 'Turbine mère', 'Foreuse', 'Ruche-Drone'];
const PG_BK = ['presse', 'grue', 'turbine', 'foreuse', 'ruche'];
const PG_NEWS = { 3: 'Jets de flammes', 4: 'Couloir électrique', 5: 'Scies circulaires', 6: 'Slalom', 7: 'Portes électriques', 8: 'Salve de missiles', 9: 'Drones de garde' };

// Description d'une carte : count(max) = niveaux dessinés ; level(n) = { tier, kicker, name, lines, acc, bg, bg0, … } ;
// tier(t) = palier (bandeau ; emoji en grand au-dessus du titre s'il y en a un) ; theme = peintre du décor ('space' | 'factory' | 'empilo') ;
// start / cap = textes du départ et du haut ; boss(n) = le boss qui ferme le niveau n { bk (dessin), name, kicker, final (boss de fin de
// cycle : couronne) } → étape « BOSS » sur le chemin. Sans boss() : un niveau tous les `step` px. Un jeu peut dessiner lui-même sa carte :
// stops(L) (dégradé du fond), paint(x, L, W, y0, h) (décor d'un morceau de 1000 px), node(x, info, size, P) (pastille d'un niveau) ;
// bgDpr = résolution plafonnée du décor (doux : pas besoin de 2,5) ; lazy = les morceaux loin de l'écran se peignent juste après l'ouverture
// (chunk = hauteur d'un morceau, 1000 px par défaut ; near = distance à l'écran peinte tout de suite, 600 px par défaut) ;
// boss(n) peut rendre null (pas de boss à ce niveau) ; bossArt(x, bi, size, P) = médaillon du boss dessiné par le jeu ; T.icon(x, r) = icône du palier ;
// warm(L, bgDpr, dpr, tailles) = le jeu prépare ses dessins d'avance, au calme sur l'accueil (même mise en page qu'à l'ouverture) ;
// startArt(x, P) = le héros du jeu dessiné au départ (canvas P × P posé sur le départ).
const MAP_DEFS = {
  ilo: {
    theme: 'space', word: 'Secteur', tierGap: 170, tierAt: 0.58,
    count: max => Math.min(160, Math.max(16, Math.ceil((max + 1) / 8) * 8)),
    level(lv) {
      const i = (lv - 1) % 8, c = Math.floor((lv - 1) / 8), S = GW_SEC[i], rot = c * 41;
      return { lv, tier: c, i, kicker: (c ? 'Cycle ' + mapRoman(c) + ' · ' : '') + 'Secteur ' + (i + 1), name: S.name,
        lines: [c ? 'Mini-boss : ' + S.mini : '✦ ' + S.news],
        acc: S.acc, bg: hueShift(S.bg1, rot), bg0: hueShift(S.bg0, rot), hue: (S.hue + rot) % 360, sat: S.sat, planet: S.land, deco: S.deco };
    },
    short(lv) { const i = (lv - 1) % 8, c = Math.floor((lv - 1) / 8); return (c ? 'Cycle ' + mapRoman(c) + ' · ' : '') + 'Secteur ' + (i + 1) + ' · ' + GW_SEC[i].name; },
    boss(lv) {
      const i = (lv - 1) % 8, c = Math.floor((lv - 1) / 8), S = GW_SEC[i];
      return { lv, bk: S.bk, name: S.boss + (c ? ' ' + mapRoman(c) : ''), final: i === 7, kicker: i === 7 ? 'Fin du cycle ' + mapRoman(c) : (c ? 'Cycle ' + mapRoman(c) + ' · fin du secteur ' : 'Fin du secteur ') + (i + 1) };
    },
    tier(c) {
      return { kicker: c ? 'Palier ' + (c + 1) : 'Palier 1', title: 'Cycle ' + mapRoman(c), acc: hueShift('#38e1ff', c * 41), acc2: hueShift('#ff3fb4', c * 41),
        sub: c ? 'Les 8 secteurs reviennent, plus coriaces' : 'Huit secteurs, un boss au bout de chacun' };
    },
    start: { title: 'Départ', sub: 'Le Vaisseau Noir décolle' },
    cap: { title: 'La galaxie continue…', sub: 'Chaque cycle recommence, toujours plus féroce' }
  },
  pleingaz: {
    theme: 'factory', word: 'Niveau', tierGap: 110, majorGap: 200, tierAt: 0.6,
    count: max => Math.min(200, Math.max(20, Math.ceil((max + 2) / 10) * 10)),
    level(lv) {
      const z = Math.floor((lv - 1) / 2), Z = PG_ZONES[z % 5], tour = Math.floor(z / 5), mk = Math.floor((lv - 1) / 5);
      return { lv, tier: z, kicker: 'Niveau ' + lv, name: Z.name + (tour ? ' ' + mapRoman(tour) : ''),
        lines: PG_NEWS[lv] ? ['✦ ' + PG_NEWS[lv]] : [],
        acc: Z.lamp, bg: Z.wall, bg0: Z.dk, zone: Z };
    },
    short(lv) { const z = Math.floor((lv - 1) / 2), tour = Math.floor(z / 5); return 'Niveau ' + lv + ' · ' + PG_ZONES[z % 5].name + (tour ? ' ' + mapRoman(tour) : ''); },
    boss(lv) { const t = (lv - 1) % 5, mk = Math.floor((lv - 1) / 5); return { lv, bk: PG_BK[t], name: PG_BOSSES[t] + (mk ? ' Mk' + (mk + 1) : ''), final: false, kicker: 'Fin du niveau ' + lv }; },
    tier(z) {
      const Z = PG_ZONES[z % 5], tour = Math.floor(z / 5);
      return { kicker: 'Zone ' + (z + 1), title: Z.name + (tour ? ' ' + mapRoman(tour) : ''), acc: Z.lamp, zone: Z,
        major: z % 5 === 0, majorTitle: tour ? 'Tournée ' + mapRoman(tour) : 'Tournée I', majorSub: tour ? "L'usine recommence, en plus folle !" : 'Les 5 zones de l’usine' };
    },
    start: { title: 'Entrée', sub: "Les portes de l'usine" },
    cap: { title: "L'usine continue…", sub: 'Nouvelle tournée tous les 10 niveaux' }
  },
  // Empilo (games/empilo.js) : 5 mondes de 3 niveaux (Plaine, Océan, Ciel, Espace, Au-delà), puis le Tour II, III… Pas de boss :
  // chaque niveau est une marche, avec l'ambiance de son moment (le matin, plein soleil…). Fond, transitions et marches : le jeu.
  empilo: {
    theme: 'empilo', word: 'Niveau', tierGap: 150, majorGap: 250, tierAt: 0.5, step: 168, nodeSize: 62, bgDpr: 1.6, lazy: true,
    count: max => Math.min(150, Math.max(15, Math.ceil((max + 2) / 15) * 15)),
    game() { const G = window.JDW_GAMES && window.JDW_GAMES.empilo; return G && G.worlds && G.worldOf ? G : null; },
    level(lv) {
      const G = this.game(), wo = G ? G.worldOf(lv) : { w: Math.floor((lv - 1) / 3) % 5, tour: Math.floor((lv - 1) / 15), stage: (lv - 1) % 3 };
      const D = G && G.worlds[wo.w], A = G && G.mapArt, news = A ? A.news(lv) : '';
      return { lv, tier: wo.tour * 5 + wo.w, w: wo.w, tour: wo.tour, stage: wo.stage,
        kicker: 'Niveau ' + lv + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : ''), name: D ? D.stages[wo.stage] : 'Monde ' + (wo.w + 1),
        lines: news ? ['✦ ' + news] : [], acc: A ? A.acc(lv) : D ? D.colors.accent : '#a98bff' };
    },
    short(lv) { const G = this.game(), wo = G ? G.worldOf(lv) : null; return 'Niveau ' + lv + (wo ? ' · ' + wo.world.name + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : '') : ''); },
    tier(t) {
      const G = this.game(), w = t % 5, tour = Math.floor(t / 5), D = G ? G.worlds[w] : null;
      return { kicker: (tour ? 'Tour ' + mapRoman(tour) + ' · ' : '') + 'Monde ' + (w + 1), title: D ? D.name : 'Monde ' + (w + 1), emoji: D ? D.emoji : '',
        sub: D ? D.special.emoji + ' ' + D.special.name + ' : ' + D.special.text.replace(/^./, c => c.toLowerCase()) : '',
        acc: D ? D.colors.accent : '#a98bff', acc2: D ? D.colors.accent2 : '#ff6ec7', w, tour,
        major: w === 0 && tour > 0, majorTitle: 'Tour ' + mapRoman(tour), majorSub: 'Les 5 mondes reviennent, encore plus vite !' };
    },
    stops(L) { const G = this.game(); return G && G.mapArt ? G.mapArt.stops(L) : null; },
    paint(x, L, W, y0, h) { const G = this.game(); if (G && G.mapArt) G.mapArt.paint(x, L, W, y0, h); },
    node(x, info, size, P) { const G = this.game(); if (G && G.mapArt) G.mapArt.node(x, info, size, P); },
    start: { title: 'Départ', sub: 'La prairie, au petit matin' },
    cap: { title: 'Le voyage continue…', sub: 'Un nouveau tour tous les 15 niveaux, toujours plus vite' }
  },
  // Chasse aux mouches (games/mouches.js) : une journée d'été en Provence, 6 mondes de 3 vagues (la 3e = le boss du monde), du matin
  // à la nuit, puis le jour 2, plus coriace. Décor de chaque monde, médaillons des vagues et des boss : le jeu (JDW_GAMES.mouches.mapArt).
  mouches: {
    theme: 'mouches', word: 'Vague', tierGap: 150, majorGap: 250, tierAt: 0.55, step: 150, nodeSize: 56, bossSize: 64, bgDpr: 1.6, lazy: true,
    count: max => Math.min(180, Math.max(18, Math.ceil((max + 2) / 18) * 18)),
    game() { const G = window.JDW_GAMES && window.JDW_GAMES.mouches; return G && G.worlds && Array.isArray(G.worlds.list) && G.worlds.at ? G : null; },
    at(lv) { const G = this.game(); return G ? G.worlds.at(lv) : { world: Math.floor((lv - 1) / 3) % 6 + 1, cycle: Math.floor((lv - 1) / 18) + 1, stage: (lv - 1) % 3 + 1, boss: (lv - 1) % 3 === 2 }; },
    level(lv) {
      const G = this.game(), a = this.at(lv), d = G && G.worlds.list[a.world - 1], wv = G && G.mapArt ? G.mapArt.wave(lv) : null;
      return { lv, tier: (a.cycle - 1) * 6 + a.world - 1, w: a.world - 1, cycle: a.cycle, stage: a.stage, boss: !!a.boss,
        kicker: 'Vague ' + lv + (a.cycle > 1 ? ' · Jour ' + a.cycle : '') + (d ? ' · ' + d.hour : ''),
        name: wv ? wv.name : d ? d.name : 'Vague ' + lv, lines: wv && wv.line ? [wv.line] : [], acc: d ? d.colors.acc : '#ff5fae' };
    },
    short(lv) { const G = this.game(), a = this.at(lv), d = G && G.worlds.list[a.world - 1]; return 'Vague ' + lv + (d ? ' · ' + d.name : '') + (a.cycle > 1 ? ' · Jour ' + a.cycle : ''); },
    boss(lv) {
      const G = this.game(), a = this.at(lv); if (!G || !a.boss) return null;
      const d = G.worlds.list[a.world - 1], nm = d.name.replace(/^L[ae] |^L[’']/, m => m.toLowerCase());
      return { lv, bk: d.boss.key, name: d.boss.title + (a.cycle > 1 ? ' ' + mapRoman(a.cycle - 1) : ''), final: a.world === G.worlds.list.length,
        kicker: (a.cycle > 1 ? 'Jour ' + a.cycle + ' · ' : '') + (/^le /.test(nm) ? 'Fin du ' + nm.slice(3) : 'Fin de ' + nm) };
    },
    tier(t) {
      const G = this.game(), N = G ? G.worlds.list.length : 6, w = t % N, cyc = Math.floor(t / N) + 1, d = G ? G.worlds.list[w] : null;
      return { kicker: (cyc > 1 ? 'Jour ' + cyc + ' · ' : '') + 'Monde ' + (w + 1) + (d ? ' · ' + d.hour : ''), title: d ? d.name : 'Monde ' + (w + 1),
        icon: G && G.worlds.drawIcon ? (x, r) => G.worlds.drawIcon(x, w + 1, 0, 0, r) : null,
        sub: d ? d.news + ' Boss : ' + d.boss.title.replace(/^./, c => c.toLowerCase()) + '.' : '',
        acc: d ? d.colors.acc : '#ff5fae', acc2: d ? d.colors.acc2 : '#ffd34d', w, cyc,
        major: w === 0 && cyc > 1, majorTitle: 'Jour ' + cyc, majorSub: 'Les insectes reviennent, plus coriaces !' };
    },
    stops(L) { const G = this.game(); return G && G.mapArt ? G.mapArt.stops(L) : null; },
    paint(x, L, W, y0, h) { const G = this.game(); if (G && G.mapArt) G.mapArt.paint(x, L, W, y0, h); },
    node(x, info, size, P) { const G = this.game(); if (G && G.mapArt) G.mapArt.node(x, info, size, P); },
    bossArt(x, bi, size, P) { const G = this.game(); if (G && G.mapArt) G.mapArt.boss(x, bi, size, P); },
    warm(L, bgDpr, dpr) { const G = this.game(); if (G && G.mapArt && G.mapArt.warm) G.mapArt.warm(L, bgDpr, dpr, { node: this.nodeSize, boss: this.bossSize }); },
    start: { title: 'Départ', sub: '8 h : la maison s’éveille' },
    cap: { title: 'La chasse continue…', sub: 'Un nouveau jour toutes les 18 vagues, plus coriace' }
  },
  // Glouton (games/glouton.js) : les pièces d'eau de la maison en néons, une par niveau comme dans le jeu (la salle de bain, la douche,
  // le hammam, la tuyauterie, la laverie, le spa de minuit), puis le tour suivant ; le Gros Microbe tous les 5 niveaux. Décor (le vrai
  // labyrinthe de chaque pièce), médaillons (le microbe qu'on rencontre à chaque niveau), boss et canard du départ : le jeu (mapArt).
  glouton: {
    theme: 'glouton', word: 'Niveau', tierGap: 180, majorGap: 290, tierAt: 0.52, step: 150, nodeSize: 56, bossSize: 66, bgDpr: 1.6, lazy: true,
    count: max => Math.min(120, Math.max(12, Math.ceil((max + 2) / 6) * 6)),
    game() { const G = window.JDW_GAMES && window.JDW_GAMES.glouton; return G && Array.isArray(G.worlds) && G.worldOf && G.mapArt ? G : null; },
    wo(lv) { const G = this.game(); return G ? G.worldOf(lv) : { w: (lv - 1) % 6, tour: Math.floor((lv - 1) / 6), boss: lv % 5 === 0, world: null }; },
    level(lv) {
      const G = this.game(), wo = this.wo(lv), D = wo.world, m = G ? G.mapArt.level(lv) : null;
      return { lv, tier: lv - 1, w: wo.w, tour: wo.tour, boss: !!wo.boss,
        kicker: 'Niveau ' + lv + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : ''), name: m ? m.name : D ? D.name : 'Niveau ' + lv,
        lines: m && m.line ? [m.line] : [], acc: D ? D.colors.accent : '#ffd34d' };
    },
    short(lv) { const wo = this.wo(lv); return 'Niveau ' + lv + (wo.world ? ' · ' + wo.world.name : '') + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : ''); },
    boss(lv) {
      const wo = this.wo(lv); if (!wo.boss) return null;
      const k = Math.floor(lv / 5), nm = wo.world ? wo.world.name : '';
      return { lv, bk: 'microbe', name: 'Le Gros Microbe' + (k > 1 ? ' ' + mapRoman(k - 1) : ''), final: false,
        kicker: (wo.tour ? 'Tour ' + mapRoman(wo.tour) + ' · ' : '') + (nm ? 'Dans ' + nm.charAt(0).toLowerCase() + nm.slice(1) : 'Niveau ' + lv) };
    },
    tier(t) {
      const G = this.game(), w = t % 6, tour = Math.floor(t / 6), D = G ? G.worlds[w] : null;
      return { kicker: (tour ? 'Tour ' + mapRoman(tour) + ' · ' : '') + 'Pièce ' + (w + 1), title: D ? D.name : 'Pièce ' + (w + 1),
        icon: G && G.drawWorldIcon ? (x, r) => G.drawWorldIcon(x, w + 1, 0, 0, r) : null, emoji: D ? D.emoji : '',
        sub: D ? D.tag : '', acc: D ? D.colors.accent : '#ffd34d', acc2: D ? D.colors.accent2 : '#ffffff', w, tour,
        major: w === 0 && tour > 0, majorTitle: 'Tour ' + mapRoman(tour), majorSub: 'Les 6 pièces reviennent, encore plus vite !' };
    },
    stops(L) { const G = this.game(); return G ? G.mapArt.stops(L) : [[L.H, '#061520'], [0, '#05090f']]; },
    paint(x, L, W, y0, h) { const G = this.game(); if (G) G.mapArt.paint(x, L, W, y0, h); },
    node(x, info, size, P) { const G = this.game(); if (G) G.mapArt.node(x, info, size, P); },
    bossArt(x, bi, size, P) { const G = this.game(); if (G) G.mapArt.boss(x, bi, size, P); },
    startArt(x, P) { const G = this.game(); if (G && G.mapArt.start) G.mapArt.start(x, P); },
    warm(L, bgDpr, dpr) { const G = this.game(); if (G && G.mapArt.warm) G.mapArt.warm(L, bgDpr, dpr, { node: this.nodeSize, boss: this.bossSize }); },
    start: { title: 'Départ', sub: 'Le canard saute dans le bain' },
    cap: { title: 'Le bain continue…', sub: 'Un nouveau tour toutes les 6 pièces, toujours plus vite' }
  },
  // Les P'tits Rouleaux (games/rouleaux.js) : 5 mondes de 3 niveaux (Salle de bain, Château magique, Usine à tuyaux, Égouts, Station
  // spatiale), puis le Tour II (niveaux en miroir un tour sur deux). Chaque niveau est un étage : le vrai niveau du jeu en miniature ;
  // médaillons, décor, plancher et tuyau entre deux mondes, tourbillon de la chasse d'eau à chaque tour : le jeu (mapArt).
  rouleaux: {
    theme: 'rouleaux', word: 'Niveau', tierGap: 170, majorGap: 280, tierAt: 0.5, step: 208, nodeSize: 60, bgDpr: 1.5, lazy: true, chunk: 520, near: 480,
    count: max => Math.min(150, Math.max(15, Math.ceil((max + 2) / 15) * 15)),
    game() { const G = window.JDW_GAMES && window.JDW_GAMES.rouleaux; return G && Array.isArray(G.worlds) && G.worldOf && G.mapArt ? G : null; },
    wo(lv) { const G = this.game(); return G ? G.worldOf(lv) : { w: Math.floor((lv - 1) / 3) % 5, tour: Math.floor((lv - 1) / 15), stage: (lv - 1) % 3, world: null }; },
    level(lv) {
      const G = this.game(), wo = this.wo(lv), D = wo.world, m = G ? G.mapArt.level(lv) : null;
      return { lv, tier: wo.tour * 5 + wo.w, w: wo.w, tour: wo.tour, stage: wo.stage,
        kicker: 'Niveau ' + lv + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : ''), name: m ? m.name : D ? D.stages[wo.stage] : 'Niveau ' + lv,
        lines: m && m.line ? [m.line] : [], acc: D ? D.colors.accent : '#4fc3ff' };
    },
    short(lv) { const wo = this.wo(lv); return 'Niveau ' + lv + (wo.world ? ' · ' + wo.world.name : '') + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : ''); },
    tier(t) {
      const G = this.game(), w = t % 5, tour = Math.floor(t / 5), D = G ? G.worlds[w] : null;
      return { kicker: (tour ? 'Tour ' + mapRoman(tour) + ' · ' : '') + 'Monde ' + (w + 1), title: D ? D.name : 'Monde ' + (w + 1),
        icon: G && G.drawWorldIcon ? (x, r) => G.drawWorldIcon(x, w + 1, 0, 0, r) : null, emoji: D ? D.emoji : '',
        sub: D ? 'Ton WC : ' + D.wc.name : '', acc: D ? D.colors.accent : '#4fc3ff', acc2: D ? D.colors.accent2 : '#ff8fc8', w, tour,
        major: w === 0 && tour > 0, majorTitle: 'Tour ' + mapRoman(tour), majorSub: 'Chasse d’eau ! Les 5 mondes reviennent' + (tour % 2 ? ', en miroir' : '') };
    },
    stops(L) { const G = this.game(); return G ? G.mapArt.stops(L) : [[L.H, '#cfe4ee'], [0, '#05060c']]; },
    paint(x, L, W, y0, h) { const G = this.game(); if (G) G.mapArt.paint(x, L, W, y0, h); },
    node(x, info, size, P) { const G = this.game(); if (G) G.mapArt.node(x, info, size, P); },
    startArt(x, P) { const G = this.game(); if (G && G.mapArt.start) G.mapArt.start(x, P); },
    warm(L, bgDpr, dpr) { const G = this.game(); if (G && G.mapArt.warm) G.mapArt.warm(L, bgDpr, dpr, { node: this.nodeSize }); },
    start: { title: 'Départ', sub: 'Le premier rouleau sort du distributeur' },
    cap: { title: 'Le voyage continue…', sub: 'Un nouveau tour tous les 15 niveaux : moins d’outils, plus de rouleaux' }
  },
  // Casse-Carreaux (games/carreaux.js, assemblé depuis ses parts) : le tour du monde des carreaux, 6 pays de 3 niveaux (le 3e = le boss du
  // pays), puis le Tour II. Chaque pays est peint avec son vrai décor ; entre deux pays, l'avion traverse les nuages près du tampon du
  // passeport ; à chaque tour, le globe du voyage. Décor, carreaux des niveaux, boss et avion du départ : le jeu (mapArt, p8b-carte.js).
  carreaux: {
    theme: 'carreaux', word: 'Niveau', tierGap: 210, majorGap: 300, tierAt: 0.47, step: 150, nodeSize: 56, bossSize: 66, bgDpr: 1.6, lazy: true,
    count: max => Math.min(180, Math.max(18, Math.ceil((max + 2) / 18) * 18)),
    game() { const G = window.JDW_GAMES && window.JDW_GAMES.carreaux; return G && Array.isArray(G.worlds) && G.worldOf && G.mapArt ? G : null; },
    wo(lv) { const G = this.game(); return G ? G.worldOf(lv) : { w: Math.floor((lv - 1) / 3) % 6, tour: Math.floor((lv - 1) / 18), stage: (lv - 1) % 3, boss: (lv - 1) % 3 === 2, world: null }; },
    level(lv) {
      const G = this.game(), wo = this.wo(lv), D = wo.world, m = G ? G.mapArt.level(lv) : null;
      return { lv, tier: wo.tour * 6 + wo.w, w: wo.w, tour: wo.tour, stage: wo.stage, boss: !!wo.boss,
        kicker: 'Niveau ' + lv + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : '') + (D ? ' · ' + D.place : ''), name: m ? m.name : D ? D.stages[wo.stage] : 'Niveau ' + lv,
        lines: m && m.line ? [m.line] : [], acc: D ? D.colors.accent : '#1fc9a8' };
    },
    short(lv) { const wo = this.wo(lv); return 'Niveau ' + lv + (wo.world ? ' · ' + wo.world.name : '') + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : ''); },
    boss(lv) {
      const wo = this.wo(lv); if (!wo.boss || !wo.world) return null;
      const D = wo.world, nm = D.name.replace(/^L[ae] |^L[’']/, m => m.toLowerCase());
      return { lv, bk: D.boss.id, name: D.boss.name + (wo.tour ? ' ' + mapRoman(wo.tour) : ''), final: wo.w === 5,
        kicker: (wo.tour ? 'Tour ' + mapRoman(wo.tour) + ' · ' : '') + (/^le /.test(nm) ? 'Fin du ' + nm.slice(3) : 'Fin de ' + nm) };
    },
    tier(t) {
      const G = this.game(), w = t % 6, tour = Math.floor(t / 6), D = G ? G.worlds[w] : null;
      return { kicker: (tour ? 'Tour ' + mapRoman(tour) + ' · ' : '') + 'Monde ' + (w + 1) + (D ? ' · ' + D.place : ''), title: D ? D.name : 'Monde ' + (w + 1),
        icon: G && G.drawWorldIcon ? (x, r) => G.drawWorldIcon(x, w + 1, 0, 0, r) : null, emoji: D ? D.emoji : '',
        sub: D ? D.tiles + ' · Boss : ' + D.boss.name.replace(/^L([ae]) /, 'l$1 ') : '', acc: D ? D.colors.accent : '#1fc9a8', acc2: D ? D.colors.accent2 : '#ffcf3a', w, tour,
        major: w === 0 && tour > 0, majorTitle: 'Tour ' + mapRoman(tour), majorSub: 'Le tour du monde recommence, plus coriace !' };
    },
    stops(L) { const G = this.game(); return G ? G.mapArt.stops(L) : [[L.H, '#f3e7cf'], [0, '#04060f']]; },
    paint(x, L, W, y0, h) { const G = this.game(); if (G) G.mapArt.paint(x, L, W, y0, h); },
    node(x, info, size, P) { const G = this.game(); if (G) G.mapArt.node(x, info, size, P); },
    bossArt(x, bi, size, P) { const G = this.game(); if (G) G.mapArt.boss(x, bi, size, P); },
    startArt(x, P) { const G = this.game(); if (G && G.mapArt.start) G.mapArt.start(x, P); },
    warm(L, bgDpr, dpr) { const G = this.game(); if (G && G.mapArt.warm) G.mapArt.warm(L, bgDpr, dpr, { node: this.nodeSize, boss: this.bossSize }); },
    start: { title: 'Départ', sub: 'Lisbonne, au petit matin : en route !' },
    cap: { title: 'Le tour du monde continue…', sub: 'Un nouveau tour tous les 18 niveaux, plus coriace' }
  }
};

/* ---------- progression : appareil + serveur ---------- */
const PROG = { room: null, rows: [], at: 0, missing: false, loading: null, mine: {}, busy: false };
let progQ = store.get('jdw.progq', []); if (!Array.isArray(progQ)) progQ = [];
{ const pc = store.get('jdw.progcache', null); if (pc && room && pc.room === room.id && Array.isArray(pc.rows)) { PROG.room = pc.room; PROG.rows = pc.rows; } }   // dernière carte connue (PROG.at = 0 : rechargée dès que possible)
const lvKey = (name, gid) => (cleanName(name) || '?') + '|' + gid;
function lvBest(name, gid) { const all = store.get('jdw.bestlv', {}) || {}; return +all[lvKey(name, gid)] || 0; }
function lvSetBest(name, gid, lv) { const all = store.get('jdw.bestlv', {}) || {}; const k = lvKey(name, gid); if (lv > (+all[k] || 0)) { all[k] = lv; store.set('jdw.bestlv', all); } }
// en pleine partie : un nouveau record de niveau est gardé sur l'appareil et part en ligne (seulement quand il monte)
function progTick() {
  if (!current || !current.inst || current.over || !current.inst.currentLevel || CMP.playing || CMP.practice || $('jdw-play').hidden) return;
  let lv = 0; try { lv = Math.floor(+current.inst.currentLevel() || 0); } catch (e) { return; }
  const me = cleanName(profile.name), gid = current.game.id;
  if (!me || !(lv >= 1) || lv > 9999 || lv <= lvBest(me, gid)) return;
  lvSetBest(me, gid, lv);
  progPush(me, gid, lv);
}
setInterval(progTick, 1000);
function progPush(name, gid, lv) {
  if (!ONLINE || !room) { if (MAP.open && MAP.gid === gid) mapUpdate(); return; }
  const rid = room.id, k = rid + '|' + name + '|' + gid;
  PROG.mine[k] = Math.max(PROG.mine[k] || 0, lv);
  const q = progQ.find(x => x.room === rid && x.name === name && x.game === gid);
  if (q) q.level = Math.max(q.level, lv); else progQ.push({ room: rid, code: roomCodes[rid] || '', name, game: gid, level: lv });
  progQ = progQ.slice(-40); store.set('jdw.progq', progQ);
  if (MAP.open && MAP.gid === gid) mapUpdate();
  progFlush();
}
async function progFlush() {
  if (PROG.busy || PROG.missing || !ONLINE || !progQ.length || netOff()) return;
  PROG.busy = true;
  let sent = false;
  try {
    while (progQ.length && !PROG.missing) {
      const it = progQ[0];
      if (knownNotMember(it.name) && room && room.id === it.room) { progQ.shift(); continue; }   // pas membre : rien à garder
      try {
        const lv = it.level;
        await rpc('save_progress', { p_code: CODE(), p_room: it.room, p_room_code: it.code || roomCodes[it.room] || '', p_name: it.name, p_game: it.game, p_level: lv }, { quiet404: true });
        sent = true;
        const cur = progQ[0]; if (cur === it && it.level === lv) progQ.shift();   // niveau monté pendant l'envoi : il repart au tour suivant
      } catch (e) {
        if (e.status === 404) { PROG.missing = true; break; }
        if (e.denied || e.status === 400) { progQ.shift(); continue; }   // refus (code de salle, valeur) : on n'insiste pas
        break;                                                            // pas de réseau : renvoyé plus tard
      }
    }
  } finally { PROG.busy = false; store.set('jdw.progq', progQ); }
  if (sent) poke('progress');
}
async function progLoad() {
  if (!ONLINE || !room || PROG.missing) { progFlush(); return; }
  const rid = room.id;
  if (PROG.loading && PROG.loadingFor === rid) return PROG.loading;
  PROG.loadingFor = rid;
  const job = PROG.loading = (async () => {
    try {
      const rows = await rpc('get_progress', Object.assign({ p_code: CODE() }, RP()), { quiet404: true }) || [];
      if (!room || room.id !== rid) return;
      PROG.room = rid; PROG.at = Date.now();
      // est : position estimée d'après un ancien score (source/map-est.sql, r_estimated ; serveur plus ancien : jamais)
      PROG.rows = rows.map(r => ({ name: cleanName(r.r_name), game: String(r.r_game || ''), level: Math.floor(+r.r_level || 0), est: r.r_estimated === true })).filter(r => r.name && r.level > 0);
      store.set('jdw.progcache', { room: rid, rows: PROG.rows.slice(0, 400), at: Date.now() });
      progBoot();
    } catch (e) { if (e.status === 404) PROG.missing = true; }
  })();
  try { await job; } finally { if (PROG.loading === job) PROG.loading = null; }
  progFlush();
}
// première fois dans cette salle avec la carte : le meilleur niveau déjà gardé sur l'appareil part une fois (pas après un retrait)
function progBoot() {
  const me = cleanName(profile.name); if (!me || !room || knownNotMember(me) || membersFor !== room.id) return;
  const boot = store.get('jdw.progboot', {}) || {};
  for (const gid of Object.keys(MAP_DEFS)) {
    const k = room.id + '|' + me + '|' + gid, loc = lvBest(me, gid), row = PROG.rows.find(r => r.name === me && r.game === gid), srv = row ? row.level : 0;
    if (!boot[k]) { boot[k] = 1; if (loc > srv) { progPush(me, gid, loc); continue; } }
    // position « estimée » (ancien score) alors que cet appareil a vu ce joueur l'atteindre en jouant : confirmée une fois au serveur
    const ke = k + '|e' + srv;
    if (row && row.est && loc >= srv && !boot[ke]) { boot[ke] = 1; progPush(me, gid, loc); }
  }
  store.set('jdw.progboot', boot);
}
function progOnPoke() { PROG.at = 0; if (MAP.open) progLoad().then(() => { if (MAP.open) mapUpdate(); }); }
// qui est où sur la carte de ce jeu : Map NOM → meilleur niveau (0 = au départ)
function mapPeople(gid) {
  const me = cleanName(profile.name), out = new Map();
  const srv = ONLINE && room && !PROG.missing && PROG.room === room.id;
  if (srv) for (const r of PROG.rows) if (r.game === gid) out.set(r.name, Math.max(out.get(r.name) || 0, r.level));
  if (ONLINE && room && membersFor === room.id) for (const n of memberNames) if (n !== 'IA' && !out.has(n)) out.set(n, 0);
  if (!ONLINE) for (const n of deviceNames()) if (n !== me) { const b = lvBest(n, gid); if (b) out.set(n, b); }
  if (me) {
    let mine = out.get(me) || 0;
    if (!srv || knownNotMember(me)) mine = Math.max(mine, lvBest(me, gid));
    else mine = Math.max(mine, PROG.mine[room.id + '|' + me + '|' + gid] || 0);
    out.set(me, mine);
  }
  return out;
}
// têtes posées sur une position « estimée » (progress.estimated : niveau tiré d'un ancien score, pas d'une partie suivie par la carte)
function mapEst(gid, people) {
  const out = new Set(), me = cleanName(profile.name);
  if (!(ONLINE && room && !PROG.missing && PROG.room === room.id)) return out;
  for (const r of PROG.rows) {
    if (r.game !== gid || !r.est || people.get(r.name) !== r.level) continue;
    if (r.name === me && Math.max(lvBest(me, gid), PROG.mine[room.id + '|' + me + '|' + gid] || 0) >= r.level) continue;   // cet appareil l'a vu l'atteindre
    out.add(r.name);
  }
  return out;
}
// meilleur score de chacun dans ce jeu et cette salle (les scores de la salle, déjà chargés pour le classement ; + mes scores pas encore partis)
function mapScores(gid) {
  const out = new Map(), add = (n, s) => { n = cleanName(n); s = Math.floor(+s || 0); if (n && s > 0 && s > (out.get(n) || 0)) out.set(n, s); };
  if (ONLINE && room) {
    for (const r of remote[gid] || []) add(r.name, r.score);
    for (const u of unsent) if (u.room === room.id && u.game === gid) add(u.name, u.score);
  } else for (const r of local[gid] || []) add(r.name, r.score);
  return out;
}
// score court (sous les têtes, dans le résumé) : 9 450 · 152 300 · 4,12 M ; Plein Gaz : 14 060 m
function scoreShort(v, g) {
  v = Math.floor(+v || 0);
  if (v >= 1e6 && !(g && g.scoreLabel === 'm')) return (v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: v >= 1e7 ? 1 : 2 }) + ' M';
  return fmt(v) + unit(g);
}

/* ---------- carte plein écran ---------- */
const MAP = { open: false, gid: null, def: null, L: null, heads: new Map(), opener: null, rt: 0, closing: 0 };
const SVGNS = 'http://www.w3.org/2000/svg';
function mapEl(tag, cls, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
function openMap(gid, opener) {
  const def = MAP_DEFS[gid], g = gameById(gid); if (!def || !g) return;
  if (isGuest()) { guestAsk('Les salles'); return; }
  const mapOld = netOff() && !!room;                     // hors ligne : la dernière carte connue (gardée sur l'appareil), sinon rien à montrer
  if (mapOld && PROG.room !== room.id) { netNeed('La carte d’avancement'); return; }
  clearTimeout(MAP.closing); MAP.closing = 0;
  MAP.open = true; MAP.gid = gid; MAP.def = def; MAP.opener = opener || null; MAP.heads = new Map(); MAP.auto = true;
  const box = $('jdw-map');
  box.dataset.theme = def.theme; box.style.setProperty('--acc', g.accent);
  $('jdw-map-title').textContent = g.title;
  $('jdw-map-kicker').textContent = mapOld ? 'Hors ligne · dernière carte connue' : room && ONLINE ? 'Carte d’avancement · ' + room.name : 'Carte d’avancement';
  $('jdw-map-play').setAttribute('aria-label', 'Jouer à ' + g.title);
  // ouverture : la carte se déplie depuis le bouton de la tuile
  const r = opener && opener.getBoundingClientRect ? opener.getBoundingClientRect() : null;
  box.style.setProperty('--ox', r ? Math.round(r.left + r.width / 2) + 'px' : '50%');
  box.style.setProperty('--oy', r ? Math.round(r.top + r.height / 2) + 'px' : '90%');
  box.classList.remove('closing'); box.classList.add('opening'); box.hidden = false;
  mapBuild(true);
  setTimeout(() => box.classList.remove('opening'), 1600);
  setTimeout(() => $('jdw-map-close').focus({ preventScroll: true }), 60);
  Audio.ensure(); Audio.tone(392, 0.09, 'triangle', 0.035, 523); setTimeout(() => Audio.tone(659, 0.16, 'triangle', 0.03), 90);
  if (ONLINE && room && !mapOld) {
    const fresh = PROG.room === room.id && Date.now() - PROG.at < 8000;
    if (!fresh) progLoad().then(() => { if (MAP.open && MAP.gid === gid) { mapUpdate(); if (MAP.auto) mapCenter(true); } });
    if (membersFor !== room.id) loadPlayers();
  }
}
function closeMap() {
  if (!MAP.open) return;
  MAP.open = false;
  const box = $('jdw-map'); box.classList.remove('opening'); box.classList.add('closing');
  MAP.closing = setTimeout(() => { box.hidden = true; box.classList.remove('closing'); $('jdw-map-world').textContent = ''; MAP.closing = 0; }, 260);
  if (MAP.opener && MAP.opener.focus) MAP.opener.focus({ preventScroll: true });
}
function mapLayout(def, n, W, VH) {
  const S = Math.round(Math.max(118, Math.min(150, VH * 0.165)));
  const wide = W >= 700, A = Math.min(W * (wide ? 0.2 : 0.26), 190);
  const nodes = [], tiers = [], bosses = [];
  // chaque niveau = sa pastille puis, plus haut sur le chemin, l'étape « BOSS » qui le ferme (assez loin pour les têtes posées sur la pastille)
  const toBoss = Math.round(S * 0.5 + 94), fromBoss = Math.round(S * 0.5 + 58);
  const hasBoss = typeof def.boss === 'function', step = def.step || fromBoss + toBoss;   // sans boss : un niveau tous les « step » px
  let d = 150, prevTier = null, prevBoss = hasBoss && !def.step;       // distance depuis le bas ; le départ est à 150 px du bas
  const start = { d, k: 0 };
  for (let lv = 1; lv <= n; lv++) {
    const info = def.level(lv);
    const base = lv === 1 ? S : prevBoss ? fromBoss : step;
    let gap = base;
    if (info.tier !== prevTier) {
      const T = def.tier(info.tier);
      const G = T.major && def.majorGap ? def.majorGap : def.tierGap;
      gap = base + G; tiers.push({ t: info.tier, T, dMid: d + gap * (T.major && def.majorGap ? 0.66 : def.tierAt || 0.6), dLo: d, dHi: d + gap });
      prevTier = info.tier;
    }
    d += gap;
    const nd = { lv, info, d, k: lv };
    nodes.push(nd);
    const bi = hasBoss ? def.boss(lv) : null;
    prevBoss = !!bi;
    if (!bi) continue;
    d += toBoss;
    nd.boss = { lv, info, bi: Object.assign({ acc: info.acc }, bi), d, k: lv + 0.5, isBoss: true };
    bosses.push(nd.boss);
  }
  const H = d + S * 0.5 + 250;
  const xAt = k => W / 2 + A * Math.sin(k * 0.95 - 0.35);
  const all = [start, ...nodes, ...bosses];
  for (const p of all) { p.y = H - p.d; p.x = xAt(p.k); }
  for (const t of tiers) { t.y = H - t.dMid; t.yLo = H - t.dLo; t.yHi = H - t.dHi; }
  return { W, H, S, A, start, nodes, bosses, tiers, capY: H - (d + S * 0.5 + 110) };
}
// fond : dégradé continu d'un niveau à l'autre (couleurs du secteur / de la zone)
function mapStops(L, def) {
  if (def.stops) { try { const own = def.stops(L); if (own && own.length) return own.sort((a, b) => a[0] - b[0]); } catch (e) {} }
  const st = [];
  if (def.theme === 'space') {
    st.push([L.H, '#010409'], [L.start.y, '#020812']);
    let prev = null;
    for (const n of L.nodes) { if (prev) st.push([(prev.y + n.y) / 2, mixHex(prev.info.bg0, n.info.bg0, 0.5)]); st.push([n.y, n.info.bg]); prev = n; }
    st.push([L.capY, '#03050c'], [0, '#010208']);
  } else {
    st.push([L.H, '#0b1015'], [L.start.y, '#121b22']);
    let prev = null;
    for (const n of L.nodes) {
      if (prev && prev.info.tier !== n.info.tier) { const t = L.tiers.find(x => x.t === n.info.tier); st.push([t.y + 10, prev.info.bg0], [t.y - 10, n.info.bg0]); }
      st.push([n.y, n.info.bg]); prev = n;
    }
    st.push([L.capY, '#0a0f16'], [0, '#05080c']);
  }
  return st.sort((a, b) => a[0] - b[0]);
}
function mapAt(stops, y) {   // couleur du fond à la hauteur y
  if (y <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (y <= stops[i][0]) { const a = stops[i - 1], b = stops[i]; return mixHex(a[1], b[1], (y - a[0]) / Math.max(1, b[0] - a[0])); }
  return stops[stops.length - 1][1];
}
function mapGrad(x, stops, y0, h) {
  const g = x.createLinearGradient(0, 0, 0, h);
  const at = y => {   // couleur interpolée à la hauteur y
    if (y <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (y <= stops[i][0]) { const a = stops[i - 1], b = stops[i]; return mixHex(a[1], b[1], (y - a[0]) / Math.max(1, b[0] - a[0])); }
    return stops[stops.length - 1][1];
  };
  g.addColorStop(0, at(y0));
  for (const s of stops) if (s[0] > y0 && s[0] < y0 + h) g.addColorStop((s[0] - y0) / h, s[1]);
  g.addColorStop(1, at(y0 + h));
  return g;
}
function gwPlanetImg(i) {
  const c = window.JDW_ASSETS && window.JDW_ASSETS.cache && window.JDW_ASSETS.cache.ilo;
  const im = c && c.planets && c.planets.length >= 8 ? c.planets[i % c.planets.length] : null;
  return im && im.complete && im.naturalWidth ? im : null;
}
function drawProcPlanet(x, cx, cy, r, col, seed) {
  const R = mapRng(seed);
  const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, mixHex(col, '#ffffff', 0.45)); g.addColorStop(0.55, col); g.addColorStop(1, mixHex(col, '#000000', 0.75));
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip();
  x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  x.globalAlpha = 0.22;
  for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? mixHex(col, '#000000', 0.5) : mixHex(col, '#ffffff', 0.3); x.fillRect(cx - r, cy - r + (0.2 + R() * 1.6) * r, r * 2, r * (0.08 + R() * 0.16)); }
  x.globalAlpha = 1;
  const sh = x.createRadialGradient(cx - r * 0.5, cy - r * 0.5, r * 0.6, cx - r * 0.2, cy - r * 0.2, r * 1.6);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.75)');
  x.fillStyle = sh; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  x.restore();
}
function paintSpace(x, L, W, y0, h) {
  x.globalCompositeOperation = 'lighter';
  for (const n of L.nodes) {                                     // nébuleuses du secteur
    if (n.y + 380 < y0 || n.y - 380 > y0 + h) continue;
    const R = mapRng(n.lv * 7919 + 13);
    for (let k = 0; k < 3; k++) {
      const cx = W * (0.08 + R() * 0.84), cy = n.y - y0 + (R() - 0.5) * L.S * 1.3, rad = (120 + R() * 150) * (W > 700 ? 1.5 : 1);
      const hue = Math.round(n.info.hue + (R() - 0.5) * 36), col = 'hsla(' + hue + ',' + n.info.sat + '%,' + Math.round(42 + R() * 16) + '%,';
      const gg = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      gg.addColorStop(0, col + (0.2 + R() * 0.14).toFixed(2) + ')'); gg.addColorStop(0.45, col + '0.08)'); gg.addColorStop(1, col + '0)');
      x.fillStyle = gg; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
  }
  for (const t of L.tiers) if (t.t > 0 && t.y + 200 > y0 && t.y - 200 < y0 + h) {   // saut hyperespace entre deux cycles
    const R = mapRng(t.t * 911 + 5);
    for (let k = 0; k < 46; k++) {
      const sx = R() * W, len = 40 + R() * 160, sy = t.y - y0 + (R() - 0.5) * 240;
      const lg = x.createLinearGradient(0, sy - len / 2, 0, sy + len / 2);
      const c = R() < 0.5 ? t.T.acc : t.T.acc2;
      lg.addColorStop(0, rgbaHex(c, 0)); lg.addColorStop(0.5, rgbaHex(c, 0.35 + R() * 0.3)); lg.addColorStop(1, rgbaHex(c, 0));
      x.fillStyle = lg; x.fillRect(sx, sy - len / 2, R() < 0.2 ? 2 : 1, len);
    }
  }
  const R = mapRng(Math.floor(y0) * 31 + 7), count = Math.round(W * h / 1400);   // étoiles
  for (let i = 0; i < count; i++) {
    const sx = R() * W, sy = R() * h, b = R();
    x.fillStyle = 'rgba(' + (b > 0.8 ? '255,246,220' : '214,236,255') + ',' + (0.25 + b * 0.6).toFixed(2) + ')';
    const s = b > 0.96 ? 1.9 : b > 0.75 ? 1.25 : 0.8; x.fillRect(sx, sy, s, s);
    if (b > 0.988) { x.fillStyle = 'rgba(220,240,255,.35)'; x.fillRect(sx - 4, sy + 0.5, 9.5, 0.9); x.fillRect(sx + 0.5, sy - 4, 0.9, 9.5); }
  }
  x.globalCompositeOperation = 'source-over';
  for (const n of L.nodes) {                                    // planètes lointaines du secteur
    if (n.lv % 2) continue;
    const R2 = mapRng(n.lv * 131 + 3), side = n.x > W / 2 ? -1 : 1;
    const sz = (W > 700 ? 150 : 96) + R2() * 70, cx = side < 0 ? W * 0.02 + R2() * 16 : W * 0.98 - R2() * 16, cy = n.y - y0 - L.S * (0.3 + R2() * 0.4);
    if (cy + sz < 0 || cy - sz > h) continue;
    const im = gwPlanetImg(n.info.deco[n.lv % 2]);
    x.globalAlpha = 0.3;
    if (im) x.drawImage(im, cx - sz / 2, cy - sz / 2, sz, sz); else drawProcPlanet(x, cx, cy, sz * 0.42, hueShift(n.info.acc, 30), n.lv);
    x.globalAlpha = 1;
  }
}
function paintFactory(x, L, W, y0, h) {
  const zoneAt = y => { let z = L.tiers[0]; for (const t of L.tiers) if (y <= t.y) z = t; return z.T.zone; };
  x.lineWidth = 1;                                              // panneaux du mur
  for (let yy = Math.floor(y0 / 58) * 58; yy < y0 + h; yy += 58) {
    const Z = zoneAt(yy);
    x.fillStyle = rgbaHex(Z.dk, 0.55); x.fillRect(0, yy - y0, W, 2);
    x.fillStyle = 'rgba(255,255,255,.035)'; x.fillRect(0, yy - y0 + 2, W, 1);
    const off = (yy / 58) % 2 ? 0 : 60;
    for (let xx = off; xx < W; xx += 120) { x.fillStyle = rgbaHex(Z.dk, 0.45); x.fillRect(xx, yy - y0, 2, 58); }
  }
  for (const n of L.nodes) {                                     // fenêtres en arc + lampes
    if (n.y + 260 < y0 || n.y - 260 > y0 + h) continue;
    const Z = n.info.zone, R = mapRng(n.lv * 977 + 1), wide = W > 700;
    const side = n.lv % 2 ? 1 : -1, ww = wide ? 86 : 58, wh = wide ? 112 : 78;
    const wx = side < 0 ? (wide ? W * 0.1 : 20) : W - (wide ? W * 0.1 : 20) - ww, wy = n.y - y0 - L.S * 0.55 - wh / 2;
    x.fillStyle = Z.dk; x.beginPath(); x.moveTo(wx - 6, wy + wh + 6); x.lineTo(wx - 6, wy + ww / 2); x.arc(wx + ww / 2, wy + ww / 2, ww / 2 + 6, Math.PI, 0); x.lineTo(wx + ww + 6, wy + wh + 6); x.fill();
    const sg = x.createLinearGradient(0, wy, 0, wy + wh); sg.addColorStop(0, mixHex(Z.sky, '#ffffff', 0.08)); sg.addColorStop(1, mixHex(Z.sky, '#000000', 0.35));
    x.fillStyle = sg; x.beginPath(); x.moveTo(wx, wy + wh); x.lineTo(wx, wy + ww / 2); x.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); x.lineTo(wx + ww, wy + wh); x.fill();
    x.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 5; k++) x.fillRect(wx + 4 + R() * (ww - 8), wy + 6 + R() * (wh - 16), 1.2, 1.2);
    x.fillStyle = Z.dk; x.fillRect(wx + ww / 2 - 1.5, wy + 2, 3, wh - 2); x.fillRect(wx, wy + wh * 0.5, ww, 3);
    if (wide) { x.fillRect(wx + ww * 0.25 - 1, wy + ww * 0.2, 2, wh - ww * 0.2); x.fillRect(wx + ww * 0.75 - 1, wy + ww * 0.2, 2, wh - ww * 0.2); }
    // lampe suspendue de l'autre côté, avec son cône de lumière
    const lx = side < 0 ? W - (wide ? W * 0.16 : 44) : (wide ? W * 0.16 : 44), ly = n.y - y0 - L.S * 0.5 - 40;
    x.fillStyle = Z.steel2; x.fillRect(lx - 1, ly - 60, 2, 60);
    x.fillStyle = Z.steel; x.beginPath(); x.moveTo(lx - 12, ly + 9); x.lineTo(lx - 6, ly); x.lineTo(lx + 6, ly); x.lineTo(lx + 12, ly + 9); x.fill();
    x.globalCompositeOperation = 'lighter';
    const cg = x.createLinearGradient(0, ly + 9, 0, ly + 150); cg.addColorStop(0, rgbaHex(Z.lamp, 0.2)); cg.addColorStop(1, rgbaHex(Z.lamp, 0));
    x.fillStyle = cg; x.beginPath(); x.moveTo(lx - 10, ly + 9); x.lineTo(lx + 10, ly + 9); x.lineTo(lx + 62, ly + 150); x.lineTo(lx - 62, ly + 150); x.fill();
    const bg = x.createRadialGradient(lx, ly + 10, 0, lx, ly + 10, 26); bg.addColorStop(0, rgbaHex(Z.lamp, 0.85)); bg.addColorStop(1, rgbaHex(Z.lamp, 0));
    x.fillStyle = bg; x.fillRect(lx - 26, ly - 16, 52, 52);
    x.globalCompositeOperation = 'source-over';
  }
  for (const n of L.nodes) {                                     // piliers d'acier sur les bords
    if (n.y + 200 < y0 || n.y - 200 > y0 + h) continue;
    const Z = n.info.zone, top = n.y - y0 - L.S / 2 - 2, hh = L.S + 4, pw = W > 700 ? 22 : 12;
    for (const px of [0, W - pw]) { x.fillStyle = Z.steel; x.fillRect(px, top, pw, hh); x.fillStyle = Z.steel2; x.fillRect(px + (px ? 2 : pw - 4), top, 2, hh); }
  }
}
// résolution du décor d'une carte (plafonnée : au plus 14 millions de pixels)
function mapBgDpr(def, L, z) {
  let dpr = Math.min(def.bgDpr || 2.5, (window.devicePixelRatio || 1) * (z || 1));
  if (L.W * L.H * dpr * dpr > 14e6) dpr = Math.max(1, Math.sqrt(14e6 / (L.W * L.H)));
  return dpr;
}
// taille de la carte pour un écran W0 × VH0 : grand écran (PC) → tout est agrandi (zoom z), les dessins restent nets
function mapSize(W0, VH0) {
  const z = W0 >= 700 ? Math.max(1, Math.min(1.45, W0 / 600, VH0 / 680)) : 1;
  return { z, W: Math.max(280, Math.floor(W0 / z)), VH: Math.max(400, VH0 / z) };
}
// au calme sur l'accueil, une carte qui sait se préparer (def.warm) peint d'avance ses décors : l'ouverture n'a plus qu'à les poser
const MAP_WARM = {};
function mapWarmSoon(gid) {
  const def = MAP_DEFS[gid]; if (!def || !def.warm || MAP_WARM[gid]) return;
  MAP_WARM[gid] = setTimeout(() => {
    try {
      if (MAP.open) return;
      const M = mapSize(window.innerWidth, window.innerHeight); let max = 0;
      for (const v of mapPeople(gid).values()) max = Math.max(max, v);
      const L = mapLayout(def, def.count(max), M.W, M.VH);
      def.warm(L, mapBgDpr(def, L, M.z), Math.min(3, (window.devicePixelRatio || 1) * M.z));
    } catch (e) {}
  }, 5000);
}
function mapPaint(world, L, def, focusY) {
  const stops = mapStops(L, def), W = L.W;
  const dpr = mapBgDpr(def, L, MAP.z);
  const CH = def.chunk || 1000, NEAR = def.near || 600, later = [];   // (def.chunk / def.near : morceaux plus petits, moins à peindre à l'ouverture)
  for (let y0 = 0; y0 < L.H; y0 += CH) {
    // (chaque morceau déborde de 2 px sur le suivant : pas de fine ligne entre deux morceaux quand la carte est agrandie sur PC)
    const h = Math.min(CH + 2, L.H - y0), c = mapEl('canvas', 'gmap-bg', world);
    c.width = Math.round(W * dpr); c.height = Math.round(h * dpr); c.style.top = y0 + 'px'; c.style.height = h + 'px';
    const paint = () => {
      const x = c.getContext('2d'); x.scale(dpr, dpr);
      x.fillStyle = mapGrad(x, stops, y0, h); x.fillRect(0, 0, W, h);
      try { if (def.paint) def.paint(x, L, W, y0, h); else if (def.theme === 'space') paintSpace(x, L, W, y0, h); else paintFactory(x, L, W, y0, h); } catch (e) {}
    };
    // def.lazy : loin de l'écran, un dégradé CSS en attendant ; le décor se peint juste après l'ouverture, un morceau à la fois, au calme
    if (def.lazy && focusY != null && (y0 > focusY + NEAR || y0 + h < focusY - NEAR)) {
      c.style.background = 'linear-gradient(' + mapAt(stops, y0) + ',' + mapAt(stops, y0 + h) + ')';
      later.push([Math.abs(y0 + h / 2 - focusY), c, paint]);
    } else paint();
  }
  if (!later.length) return;
  later.sort((a, b) => a[0] - b[0]);
  const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 600 }) : setTimeout(f, 50));
  const next = () => { const j = later.shift(); if (!j || !j[1].isConnected) return; j[2](); j[1].style.background = ''; if (later.length) idle(next); };
  setTimeout(() => idle(next), 750);
}
// pastille d'un niveau : planète du secteur (Galaxy Wars) ou cadran d'usine (Plein Gaz)
function mapNodeCanvas(def, info, size) {
  const c = document.createElement('canvas'), dpr = Math.min(3, (window.devicePixelRatio || 1) * (MAP.z || 1)), P = size + 24;
  c.width = c.height = Math.round(P * dpr); c.style.width = c.style.height = P + 'px';
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const cx = P / 2, cy = P / 2, r = size / 2;
  if (def.node) { try { def.node(x, info, size, P); } catch (e) {} return c; }
  if (def.theme === 'space') {
    const glow = x.createRadialGradient(cx, cy, r * 0.7, cx, cy, r + 12); glow.addColorStop(0, rgbaHex(info.acc, 0.55)); glow.addColorStop(1, rgbaHex(info.acc, 0));
    x.fillStyle = glow; x.beginPath(); x.arc(cx, cy, r + 12, 0, 7); x.fill();
    const im = gwPlanetImg(info.planet);
    if (im) { x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip(); x.fillStyle = '#000'; x.fillRect(0, 0, P, P); x.drawImage(im, cx - r * 1.04, cy - r * 1.04, r * 2.08, r * 2.08); x.restore(); }
    else drawProcPlanet(x, cx, cy, r, info.acc, info.lv * 17 + 3);
    x.strokeStyle = rgbaHex(mixHex(info.acc, '#ffffff', 0.35), 0.9); x.lineWidth = 1.6; x.beginPath(); x.arc(cx, cy, r + 0.5, 0, 7); x.stroke();
  } else {
    const Z = info.zone;
    x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(cx, cy + 3, r + 2, 0, 7); x.fill();
    const rim = x.createLinearGradient(0, cy - r, 0, cy + r); rim.addColorStop(0, mixHex(Z.steel2, '#ffffff', 0.25)); rim.addColorStop(1, Z.steel);
    x.fillStyle = rim; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    x.save(); x.beginPath(); x.arc(cx, cy, r - 5, 0, 7); x.arc(cx, cy, r - 12, 0, 7, true); x.clip();   // bande jaune et noire
    for (let k = 0; k < 16; k++) { x.fillStyle = k % 2 ? '#141a20' : info.acc; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r, k * Math.PI / 8, (k + 1) * Math.PI / 8); x.fill(); }
    x.restore();
    const core = x.createRadialGradient(cx, cy - 4, 2, cx, cy, r - 12); core.addColorStop(0, mixHex(Z.sky, '#ffffff', 0.1)); core.addColorStop(1, '#0b1015');
    x.fillStyle = core; x.beginPath(); x.arc(cx, cy, r - 12, 0, 7); x.fill();
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; x.fillStyle = '#0b1015'; x.beginPath(); x.arc(cx + Math.cos(a) * (r - 2.5), cy + Math.sin(a) * (r - 2.5), 2.2, 0, 7); x.fill(); }
  }
  return c;
}
// repère de boss : dessins des boss en code (formes et couleurs du jeu), dans un carré de -50 à 50 (aucune image)
function mapPoly(x, pts) { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); }
function mapMirror(half) { const out = half.slice(); for (let i = half.length - 2; i >= 0; i -= 2) out.push(-half[i], half[i + 1]); return out; }
function mapHex(x, cx, cy, r, rot) { x.beginPath(); for (let k = 0; k < 6; k++) { const a = (rot || 0) + k * Math.PI / 3; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); }
function mapRadial(x, cx, cy, r, stops) { const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.08, cx, cy, r); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
function mapGlow(x, cx, cy, r, col, a) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, rgbaHex(col, a)); g.addColorStop(1, rgbaHex(col, 0)); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); }
function mapRect(x, rx, ry, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(rx, ry, w, h, r); else x.rect(rx, ry, w, h); }
function mapEye(x, cx, cy, r, col) {   // œil rouge des machines de Plein Gaz
  x.fillStyle = '#0b1015'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  mapGlow(x, cx, cy, r * 2.2, col, 0.55);
  x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r * 0.55, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(cx - r * 0.2, cy - r * 0.22, r * 0.17, 0, 7); x.fill();
}
function mapStripes(x, rx, ry, w, h, a, b, step) {   // bande « danger » en biais
  x.save(); x.beginPath(); x.rect(rx, ry, w, h); x.clip(); x.fillStyle = b; x.fillRect(rx, ry, w, h); x.fillStyle = a;
  for (let k = -h; k < w + h; k += step * 2) { x.beginPath(); x.moveTo(rx + k, ry + h); x.lineTo(rx + k + step, ry + h); x.lineTo(rx + k + step + h, ry); x.lineTo(rx + k + h, ry); x.fill(); }
  x.restore();
}
function mapLetter(x, t, px, py, size, col) { x.fillStyle = col; x.font = '400 ' + size + 'px Bungee, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, px, py); }
const BOSS_ICON = {
  // ---- Galaxy Wars (games/ilo.js, BDRAW)
  planete(x) {          // planète orange au visage fâché, avec ses lunes
    x.fillStyle = mapRadial(x, -30, -24, 7, ['#f2f4f8', '#9aa3b0', '#3b4250']); x.beginPath(); x.arc(-30, -24, 7, 0, 7); x.fill();
    mapGlow(x, 0, 2, 46, '#ff8a3a', 0.35);
    x.fillStyle = mapRadial(x, 0, 2, 30, ['#ffe0b8', '#f39a52', '#c55a24', '#5e1f0c']); x.beginPath(); x.arc(0, 2, 30, 0, 7); x.fill();
    x.save(); x.beginPath(); x.arc(0, 2, 30, 0, 7); x.clip(); x.globalAlpha = 0.28; x.fillStyle = '#9a3d14';
    for (const [yy, hh] of [[-16, 4], [-6, 3], [9, 5], [20, 3]]) { x.beginPath(); x.ellipse(0, yy, 34, hh, -0.12, 0, 7); x.fill(); }
    x.restore();
    for (const s of [-1, 1]) {
      x.fillStyle = '#fff6ec'; x.beginPath(); x.ellipse(s * 10, -3, 6.2, 7.4, 0, 0, 7); x.fill();
      x.fillStyle = '#d4002a'; x.beginPath(); x.arc(s * 9.4, -1.6, 3.2, 0, 7); x.fill();
      x.fillStyle = '#1a0a12'; x.beginPath(); x.arc(s * 9.4, -1.6, 1.6, 0, 7); x.fill();
      x.strokeStyle = '#1a0a12'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.moveTo(s * 17, -14); x.lineTo(s * 5, -9.5); x.stroke();
    }
    x.fillStyle = '#1a0610'; x.beginPath(); x.ellipse(0, 15, 8.5, 4, 0, 0, 7); x.fill();
    x.fillStyle = '#ff5a3c'; x.beginPath(); x.ellipse(0, 16.5, 4.5, 1.8, 0, 0, 7); x.fill();
    x.fillStyle = mapRadial(x, 31, 22, 6, ['#e9edf2', '#8f98a6', '#363c48']); x.beginPath(); x.arc(31, 22, 6, 0, 7); x.fill();
  },
  vela(x) {             // croiseur gris, ailes larges, liserés ambre, 4 tourelles
    mapGlow(x, -7, -30, 9, '#ffa630', 0.9); mapGlow(x, 7, -30, 9, '#ffa630', 0.9);
    x.lineJoin = 'round';
    mapPoly(x, mapMirror([0, -14, 14, -16, 44, -8, 46, 2, 40, 8, 14, 4]));
    x.fillStyle = '#3b3a4a'; x.fill(); x.strokeStyle = '#ffa630'; x.lineWidth = 1.6; x.stroke();
    mapPoly(x, mapMirror([0, -27, 12, -27, 15, 8, 0, 30]));
    const hg = x.createLinearGradient(0, -27, 0, 30); hg.addColorStop(0, '#45435a'); hg.addColorStop(1, '#221f2c'); x.fillStyle = hg; x.fill(); x.stroke();
    x.strokeStyle = '#ffa630'; x.lineWidth = 1.2; x.strokeRect(-6, -9, 12, 15);
    x.fillStyle = '#ffd34d'; for (let k = -1; k <= 1; k++) x.fillRect(k * 4 - 1.2, -22, 2.4, 2.4);
    for (const [tx, ty] of [[-33, -2], [-21, 1], [21, 1], [33, -2]]) {
      x.fillStyle = '#16131e'; x.beginPath(); x.arc(tx, ty, 5.2, 0, 7); x.fill(); x.strokeStyle = '#ffa630'; x.lineWidth = 1.3; x.stroke();
      x.fillStyle = '#38e1ff'; x.beginPath(); x.arc(tx, ty, 1.8, 0, 7); x.fill();
    }
  },
  ver(x) {              // ver violet à épines, tête aux yeux cyan
    const seg = [];
    for (let i = 0; i < 10; i++) seg.push([-14 + 22 * Math.sin(i * 0.5 - 1.2) + i * 1.2, -40 + i * 7.2, 3.6 + i * 0.55]);
    for (const [sx, sy, r] of seg) {
      x.fillStyle = '#c9a8ff';
      for (const s of [-1, 1]) { mapPoly(x, [sx + s * r * 0.6, sy - r * 0.5, sx + s * (r + 5), sy, sx + s * r * 0.6, sy + r * 0.5]); x.fill(); }
      x.fillStyle = mapRadial(x, sx, sy, r, ['#e2d2ff', '#9b5cf0', '#4a1a94']); x.beginPath(); x.arc(sx, sy, r, 0, 7); x.fill();
    }
    const hx = seg[9][0] + 11, hy = seg[9][1] + 9;
    mapGlow(x, hx, hy, 24, '#a77bff', 0.45);
    x.strokeStyle = '#d6b8ff'; x.lineWidth = 1.6; x.lineCap = 'round';
    x.beginPath(); x.moveTo(hx + 6, hy - 10); x.quadraticCurveTo(hx + 16, hy - 22, hx + 21, hy - 13); x.stroke();
    x.fillStyle = mapRadial(x, hx, hy, 13, ['#e6d8ff', '#8a48e6', '#35106e']); x.beginPath(); x.ellipse(hx, hy, 14, 12, 0.4, 0, 7); x.fill();
    mapGlow(x, hx + 5, hy - 2, 9, '#38e1ff', 0.6);
    x.fillStyle = '#38e1ff'; x.beginPath(); x.ellipse(hx + 5, hy - 2, 4.2, 3, 0.4, 0, 7); x.fill(); x.beginPath(); x.ellipse(hx - 3, hy + 5, 2.6, 2, 0.4, 0, 7); x.fill();
  },
  reine(x) {            // reine insecte : ailes vertes translucides, œil rouge
    for (const s of [-1, 1]) {
      mapPoly(x, [s * 6, -6, s * 47, -24, s * 44, 8, s * 8, 5]);
      x.fillStyle = 'rgba(160,236,170,.42)'; x.fill(); x.strokeStyle = '#7fe28e'; x.lineWidth = 1.4; x.stroke();
      x.strokeStyle = 'rgba(127,226,142,.55)'; x.lineWidth = 0.8;
      for (const t of [0.35, 0.65]) { x.beginPath(); x.moveTo(s * 7, -1); x.lineTo(s * (47 - 3 * t), -24 + 32 * t); x.stroke(); }
      x.fillStyle = '#0d2a12'; x.fillRect(s * 38 - 3, -14, 6, 4);
      x.strokeStyle = '#7fe28e'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(s * 3, -13); x.quadraticCurveTo(s * 6, -24, s * 11, -26); x.stroke();
    }
    for (const [yy, rx, ry] of [[26, 5.5, 4.5], [18, 7.5, 5.5], [9, 9, 6.5]]) {
      x.fillStyle = mapRadial(x, 0, yy, rx, ['#9ff0a8', '#3c9a46', '#123d18']); x.beginPath(); x.ellipse(0, yy, rx, ry, 0, 0, 7); x.fill();
    }
    x.fillStyle = mapRadial(x, 0, -4, 12, ['#8fe39a', '#2f8a3a', '#0e3214']); x.beginPath(); x.ellipse(0, -4, 12.5, 10.5, 0, 0, 7); x.fill();
    mapGlow(x, 0, -5, 16, '#ff3b2e', 0.5);
    x.fillStyle = '#ffa630'; x.beginPath(); x.arc(0, -5, 8, 0, 7); x.fill();
    x.fillStyle = mapRadial(x, 0, -5, 6.4, ['#ff9b80', '#ff2a14', '#7a0800']); x.beginPath(); x.arc(0, -5, 6.4, 0, 7); x.fill();
    x.fillStyle = '#1a0402'; x.beginPath(); x.ellipse(0, -5, 1.6, 4.6, 0, 0, 7); x.fill();
  },
  gaia(x) {             // station en anneau, nœuds hexagonaux verts, moyeu
    x.strokeStyle = '#2b5a48'; x.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; x.beginPath(); x.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); x.lineTo(Math.cos(a) * 34, Math.sin(a) * 34); x.stroke(); }
    x.strokeStyle = '#3f7f68'; x.lineWidth = 7; x.beginPath(); x.arc(0, 0, 35, 0, 7); x.stroke();
    x.strokeStyle = 'rgba(70,240,138,.55)'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, 35, 0, 7); x.stroke();
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 3, nx = Math.cos(a) * 35, ny = Math.sin(a) * 35;
      mapHex(x, nx, ny, 6.6, Math.PI / 6); x.fillStyle = '#1f2c2a'; x.fill(); x.strokeStyle = '#7fa89a'; x.lineWidth = 1.4; x.stroke();
      x.fillStyle = '#46f08a'; x.beginPath(); x.arc(nx, ny, 2.2, 0, 7); x.fill();
    }
    x.fillStyle = mapRadial(x, 0, 0, 12, ['#6f8a84', '#2a3936', '#121a19']); x.beginPath(); x.arc(0, 0, 12, 0, 7); x.fill();
    x.strokeStyle = '#9fc2b6'; x.lineWidth = 1.4; x.stroke();
    x.strokeStyle = 'rgba(159,194,182,.6)'; x.lineWidth = 1;
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); x.stroke(); }
    mapGlow(x, 0, 0, 9, '#46f08a', 0.6);
  },
  jumelles(x) {         // deux planètes jumelles : l'une de feu, l'autre pâle
    mapGlow(x, 13, -12, 30, '#ff6a2a', 0.4);
    x.fillStyle = mapRadial(x, 13, -12, 19, ['#ffe27a', '#ff7a2a', '#c0306a', '#4a0820']); x.beginPath(); x.arc(13, -12, 19, 0, 7); x.fill();
    x.save(); x.beginPath(); x.arc(13, -12, 19, 0, 7); x.clip(); x.globalAlpha = 0.35; x.strokeStyle = '#ffd34d'; x.lineWidth = 2.4;
    for (const yy of [-22, -15, -8, -1]) { x.beginPath(); x.moveTo(-8, yy); x.quadraticCurveTo(13, yy - 6, 34, yy + 2); x.stroke(); }
    x.restore();
    mapGlow(x, -9, 8, 30, '#ffb28a', 0.3);
    x.fillStyle = mapRadial(x, -9, 8, 22, ['#fff0e2', '#f6b48c', '#c2603e', '#4a160c']); x.beginPath(); x.arc(-9, 8, 22, 0, 7); x.fill();
    x.globalAlpha = 0.3; x.fillStyle = '#a3482a';
    for (const [cx2, cy2, r2] of [[-16, 2, 4], [-3, 14, 5], [-12, 19, 2.6], [0, 0, 2.4]]) { x.beginPath(); x.arc(cx2, cy2, r2, 0, 7); x.fill(); }
    x.globalAlpha = 1;
  },
  oeil(x) {             // spirale rose autour d'un trou noir qui ouvre l'œil
    x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
    for (let arm = 0; arm < 3; arm++) {
      for (let k = 0; k < 40; k++) {
        const t = k / 40, a = arm * 2.094 + t * 5.2, r = 13 + t * 30;
        x.strokeStyle = 'rgba(255,' + Math.round(80 + 100 * t) + ',' + Math.round(200 + 40 * t) + ',' + (0.85 - t * 0.6).toFixed(2) + ')';
        x.lineWidth = 5.5 - t * 4;
        x.beginPath(); x.arc(0, 0, r, a, a + 0.16); x.stroke();
      }
    }
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#05000a'; x.beginPath(); x.arc(0, 0, 14, 0, 7); x.fill();
    x.strokeStyle = '#ff5fd2'; x.lineWidth = 1.6; x.stroke();
    x.beginPath(); x.moveTo(-10, 0); x.quadraticCurveTo(0, -8, 10, 0); x.quadraticCurveTo(0, 8, -10, 0); x.fillStyle = '#2a0024'; x.fill();
    x.strokeStyle = '#ff9be6'; x.lineWidth = 1.5; x.stroke();
    x.fillStyle = '#ff3fb4'; x.beginPath(); x.arc(0, 0, 3.6, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(-1.2, -1.2, 1, 0, 7); x.fill();
  },
  blanc(x) {            // vaisseau blanc, liserés roses, pointé vers toi
    mapGlow(x, -6, -34, 10, '#38e1ff', 0.9); mapGlow(x, 6, -34, 10, '#38e1ff', 0.9);
    x.lineJoin = 'round';
    mapPoly(x, mapMirror([0, -32, 7, -30, 9, -8, 38, 2, 40, 12, 12, 10, 7, 24, 0, 40]));
    const g = x.createLinearGradient(0, -32, 0, 40); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c4cadb');
    x.fillStyle = g; x.fill(); x.strokeStyle = '#ff3fb4'; x.lineWidth = 1.8; x.stroke();
    x.lineWidth = 1.4;
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 12, 1); x.lineTo(s * 34, 7); x.stroke(); }
    x.fillStyle = '#16141f'; mapPoly(x, mapMirror([0, -2, 4, 2, 3, 20, 0, 28])); x.fill();
    x.fillStyle = '#38e1ff'; x.beginPath(); x.ellipse(0, 10, 2.4, 7, 0, 0, 7); x.fill();
  },
  // ---- Plein Gaz (pleingaz-src.html, drawBoss)
  presse(x) {           // bloc d'acier, bande danger, piston, œil rouge, plaque P-7, réacteurs
    for (const s of [-1, 1]) { mapGlow(x, s * 12, 27, 10, '#ffa630', 0.7); x.fillStyle = '#ffd34d'; mapPoly(x, [s * 12 - 5, 22, s * 12 + 5, 22, s * 12, 34]); x.fill(); }
    x.fillStyle = '#3a5568'; x.fillRect(-5, -36, 10, 14); x.fillStyle = '#22394a'; x.fillRect(-9, -38, 18, 5);
    const g = x.createLinearGradient(0, -24, 0, 22); g.addColorStop(0, '#2f4b5e'); g.addColorStop(1, '#152330');
    x.fillStyle = g; x.fillRect(-26, -24, 52, 46); x.strokeStyle = '#0b1015'; x.lineWidth = 2.4; x.strokeRect(-26, -24, 52, 46);
    mapStripes(x, -25, -23, 9, 44, '#ffd34d', '#11161b', 4);
    mapEye(x, 4, -7, 8, '#ff3344');
    x.fillStyle = '#0b1015'; x.fillRect(-4, 6, 22, 10); mapLetter(x, 'P-7', 7, 11.5, 8, '#ffd34d');
  },
  grue(x) {             // grue orange : flèche rayée, câble et crochet, œil rouge
    const ex = -6 - 40 * Math.cos(0.42), ey = -12 - 40 * Math.sin(0.42);
    x.save(); x.translate(-6, -12); x.rotate(0.42); mapStripes(x, -40, -4, 40, 8, '#ffd34d', '#11161b', 4); x.strokeStyle = '#0b1015'; x.lineWidth = 1.4; x.strokeRect(-40, -4, 40, 8); x.restore();
    x.strokeStyle = '#9fb3c2'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(ex + 2, ey + 2); x.lineTo(ex + 2, 16); x.stroke();
    x.strokeStyle = '#d7e3ea'; x.lineWidth = 2.4; x.lineCap = 'round'; x.beginPath(); x.arc(ex + 2, 21, 4.5, -Math.PI * 0.5, Math.PI * 0.9); x.stroke();
    for (const s of [-1, 1]) { mapGlow(x, 14 + s * 9, 25, 9, '#ffa630', 0.7); x.fillStyle = '#ffd34d'; mapPoly(x, [14 + s * 9 - 4, 20, 14 + s * 9 + 4, 20, 14 + s * 9, 31]); x.fill(); }
    const g = x.createLinearGradient(0, -20, 0, 20); g.addColorStop(0, '#ffbe5c'); g.addColorStop(1, '#d9761a');
    x.fillStyle = g; mapRect(x, -6, -20, 40, 40, 5); x.fill(); x.strokeStyle = '#7a3a06'; x.lineWidth = 2; x.stroke();
    x.fillStyle = '#0b1015'; x.fillRect(-1, -14, 18, 14); mapEye(x, 8, -7, 5.5, '#ff3344');
    mapLetter(x, 'G', 26, 8, 11, '#0b1015');
  },
  turbine(x) {          // turbine sombre, pales, cœur rouge
    x.fillStyle = mapRadial(x, 0, 0, 34, ['#4a5568', '#262c38', '#11151c']); x.beginPath(); x.arc(0, 0, 34, 0, 7); x.fill();
    x.strokeStyle = '#5a6a80'; x.lineWidth = 3; x.stroke();
    x.fillStyle = '#8a98aa'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; x.beginPath(); x.arc(Math.cos(a) * 30, Math.sin(a) * 30, 1.6, 0, 7); x.fill(); }
    for (let k = 0; k < 7; k++) {
      x.save(); x.rotate(k * Math.PI * 2 / 7);
      x.beginPath(); x.moveTo(6, -3); x.quadraticCurveTo(20, -12, 27, -3); x.quadraticCurveTo(18, 1, 7, 4); x.closePath();
      x.fillStyle = '#6b7a90'; x.fill(); x.strokeStyle = '#1a2029'; x.lineWidth = 1; x.stroke(); x.restore();
    }
    mapGlow(x, 0, 0, 24, '#ff3366', 0.75);
    x.fillStyle = mapRadial(x, 0, 0, 9, ['#ffd0dc', '#ff3366', '#7a0a2a']); x.beginPath(); x.arc(0, 0, 9, 0, 7); x.fill();
  },
  foreuse(x) {          // foreuse jaune : cône de forage, chenilles, plaque F
    const cg = x.createLinearGradient(0, -18, 0, 12); cg.addColorStop(0, '#e6edf1'); cg.addColorStop(1, '#6d7a84');
    mapPoly(x, [-6, -18, -6, 12, -44, -3]); x.fillStyle = cg; x.fill(); x.strokeStyle = '#3a4650'; x.lineWidth = 1.2; x.stroke();
    x.strokeStyle = '#4c5862'; x.lineWidth = 1.3;
    for (let k = 1; k <= 4; k++) { const t = k / 5, xx = -6 - 38 * t, hh = 15 * (1 - t); x.beginPath(); x.moveTo(xx + 3, -3 - hh); x.lineTo(xx - 3, -3 + hh); x.stroke(); }
    x.fillStyle = '#1b232b'; mapRect(x, -6, 13, 40, 11, 5); x.fill();
    x.fillStyle = '#ffd34d'; for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(-1 + k * 7.5, 18.5, 1.8, 0, 7); x.fill(); }
    x.fillStyle = '#3a4650'; x.fillRect(22, -28, 5, 10);
    const g = x.createLinearGradient(0, -20, 0, 14); g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#d4a10c');
    x.fillStyle = g; x.fillRect(-6, -20, 38, 34); x.strokeStyle = '#6a4e00'; x.lineWidth = 2; x.strokeRect(-6, -20, 38, 34);
    x.fillStyle = '#0b1015'; x.fillRect(0, -15, 14, 10); mapEye(x, 7, -10, 4.4, '#ff3344');
    x.fillStyle = '#0b1015'; x.fillRect(16, -2, 12, 12); mapLetter(x, 'F', 22, 4.5, 9, '#ffd34d');
  },
  ruche(x) {            // ruche hexagonale orange, plaques-boucliers cyan en orbite
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + 0.5 + k * 2.1, px = Math.cos(a) * 40, py = Math.sin(a) * 40;
      x.save(); x.translate(px, py); x.rotate(a + Math.PI / 2);
      x.fillStyle = 'rgba(94,240,255,.3)'; x.strokeStyle = '#5ef0ff'; x.lineWidth = 1.5;
      mapRect(x, -7, -5, 14, 10, 2.5); x.fill(); x.stroke(); x.restore();
    }
    mapGlow(x, 0, 0, 40, '#ffa630', 0.35);
    mapHex(x, 0, 0, 30, Math.PI / 6); x.fillStyle = mapRadial(x, 0, 0, 30, ['#ffd08a', '#ffa630', '#b25e0e']); x.fill(); x.strokeStyle = '#6a3604'; x.lineWidth = 2.2; x.stroke();
    x.strokeStyle = 'rgba(122,58,6,.75)'; x.lineWidth = 1.4;
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; mapHex(x, Math.cos(a) * 17, Math.sin(a) * 17, 6.5, Math.PI / 6); x.stroke(); }
    mapEye(x, 0, 0, 8, '#ff3344');
  }
};
// médaillon du boss : cadre menaçant (couronne de pointes / octogone danger) + dessin du boss ; or + couronne pour le boss de fin de cycle
function mapBossCanvas(def, bi, size) {
  const c = document.createElement('canvas'), dpr = Math.min(3, (window.devicePixelRatio || 1) * (MAP.z || 1)), P = size + 34;
  c.width = c.height = Math.round(P * dpr); c.style.width = c.style.height = P + 'px';
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  if (def.bossArt) { try { def.bossArt(x, bi, size, P); } catch (e) {} return c; }
  const cx = P / 2, cy = P / 2 + (bi.final ? 3 : 0), r = size / 2, gold = bi.final;
  const rim = gold ? '#ffd34d' : '#ff3b55', rim2 = gold ? '#a85a00' : '#7a0018';
  mapGlow(x, cx, cy, r + 17, gold ? '#ffb22e' : '#ff2448', 0.55);
  if (def.theme === 'space') {
    const n = 18, sp = x.createRadialGradient(cx, cy, r - 2, cx, cy, r + 10);
    sp.addColorStop(0, rim); sp.addColorStop(1, rim2);
    x.beginPath();
    for (let k = 0; k < n * 2; k++) { const a = k * Math.PI / n - Math.PI / 2, rr = k % 2 ? r + 1 : r + 9; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    x.closePath(); x.fillStyle = sp; x.fill();
    x.fillStyle = mapRadial(x, cx, cy, r, [mixHex(bi.acc || rim, '#000000', 0.45), mixHex(bi.acc || rim, '#000000', 0.82), '#030108']);
    x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    x.strokeStyle = rim; x.lineWidth = 2.4; x.beginPath(); x.arc(cx, cy, r - 0.5, 0, 7); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, r - 4.5, 0, 7); x.stroke();
  } else {
    const oct = (rr, keep) => { if (!keep) x.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; x[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); };
    x.fillStyle = 'rgba(0,0,0,.5)'; x.save(); x.translate(0, 3); oct(r + 8); x.fill(); x.restore();
    oct(r + 8); x.fillStyle = '#0b1015'; x.fill();
    x.save(); oct(r + 6); oct(r - 2, true); x.clip('evenodd');
    mapStripes(x, cx - r - 8, cy - r - 8, size + 16, size + 16, rim, '#14090c', 5); x.restore();
    oct(r - 2); x.fillStyle = mapRadial(x, cx, cy, r, [mixHex(bi.acc || '#3a5568', '#000000', 0.55), '#0e151c', '#06090c']); x.fill();
    x.strokeStyle = '#0b1015'; x.lineWidth = 2; x.stroke();
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; x.fillStyle = mapRadial(x, cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), 2.6, ['#c0ccd4', '#55687a', '#1b252e']); x.beginPath(); x.arc(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), 2.6, 0, 7); x.fill(); }
  }
  const draw = BOSS_ICON[bi.bk];
  if (draw) {
    x.save(); x.beginPath(); x.arc(cx, cy, r - 2, 0, 7); x.clip();
    const k = (r - 2) / 45; x.translate(cx, cy); x.scale(k, k);
    try { draw(x); } catch (e) {}
    x.restore();
  }
  if (gold) {   // couronne du boss de fin de cycle
    x.save(); x.translate(cx, cy - r - 3);
    mapPoly(x, [-14, 0, 14, 0, 16, -15, 8, -7, 0, -19, -8, -7, -16, -15]);
    const cg = x.createLinearGradient(0, -19, 0, 0); cg.addColorStop(0, '#fff3b0'); cg.addColorStop(0.5, '#ffd34d'); cg.addColorStop(1, '#c98a00');
    x.fillStyle = cg; x.fill(); x.strokeStyle = '#5a3500'; x.lineWidth = 1.4; x.lineJoin = 'round'; x.stroke();
    x.fillStyle = '#ff3b55'; x.beginPath(); x.arc(0, -6, 2.4, 0, 7); x.fill();
    x.fillStyle = '#38e1ff'; for (const s of [-1, 1]) { x.beginPath(); x.arc(s * 8, -3.5, 1.6, 0, 7); x.fill(); }
    x.restore();
  }
  return c;
}
function mapSegPath(a, b) {
  const my = (a.y + b.y) / 2;
  return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' C' + a.x.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
}
function mapBuild(animate) {
  const def = MAP.def, scroll = $('jdw-map-scroll'), world = $('jdw-map-world');
  // grand écran (PC) : toute la carte est agrandie (zoom), les dessins restent nets
  const W0 = scroll.clientWidth, VH0 = scroll.clientHeight, keepY = (scroll.scrollTop + VH0 / 2) / (MAP.z || 1);
  const { z, W, VH } = mapSize(W0, VH0);
  MAP.z = z; world.style.zoom = z === 1 ? '' : z.toFixed(3); world.style.width = W + 'px';
  const people = mapPeople(MAP.gid), me = cleanName(profile.name);
  let max = 0; for (const v of people.values()) max = Math.max(max, v);
  const n = def.count(max), L = mapLayout(def, n, W, VH);
  MAP.L = L; MAP.n = n; MAP.heads = new Map();
  world.textContent = ''; world.style.height = L.H + 'px';
  world.classList.toggle('anim', !!animate);
  const meLv = people.get(me) || 0;      // à l'ouverture, la carte se centre sur moi : c'est là qu'on peint d'abord
  mapPaint(world, L, def, animate ? (meLv ? L.nodes[Math.min(meLv, L.nodes.length) - 1].y : L.start.y) : keepY);
  // chemin
  const svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'gmap-path'); svg.setAttribute('width', W); svg.setAttribute('height', L.H);
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + L.H); svg.setAttribute('aria-hidden', 'true');
  world.appendChild(svg); MAP.svg = svg;
  // paliers
  for (const t of L.tiers) {
    const b = mapEl('div', 'gmap-tier' + (t.T.major ? ' major' : '') + (t.t === 0 ? ' first' : ''), world);
    b.style.top = t.y + 'px'; b.style.setProperty('--tc', t.T.acc); if (t.T.acc2) b.style.setProperty('--tc2', t.T.acc2);
    if (t.T.major && def.majorGap) { const m = mapEl('div', 'gt-major', b); mapEl('b', '', m).textContent = t.T.majorTitle; mapEl('small', '', m).textContent = t.T.majorSub; }
    const p = mapEl('div', 'gt-plate', b);
    if (t.T.icon || t.T.emoji) {      // l'emoji du monde, ou son médaillon dessiné par le jeu
      const e = mapEl('i', 'gt-emo', p);
      if (t.T.icon) {
        const dz = Math.min(3, (window.devicePixelRatio || 1) * (MAP.z || 1)), cv = document.createElement('canvas'), cx = cv.getContext('2d');
        cv.width = cv.height = Math.round(48 * dz); cv.style.width = cv.style.height = '48px'; cx.scale(dz, dz); cx.translate(24, 24);
        try { t.T.icon(cx, 21); } catch (er) {}
        e.appendChild(cv); e.classList.add('drawn');
      } else e.textContent = t.T.emoji;
    }
    mapEl('small', '', p).textContent = t.T.kicker;
    mapEl('b', '', p).textContent = t.T.title;
    if (t.T.sub) mapEl('span', '', p).textContent = t.T.sub;
    b.dataset.tier = t.t;
  }
  // départ et suite
  const st = mapEl('div', 'gmap-start', world); st.style.left = L.start.x + 'px'; st.style.top = L.start.y + 'px';
  mapEl('i', 'gs-pad', st);
  if (def.theme === 'space') st.insertAdjacentHTML('beforeend', '<svg class="gs-ship" viewBox="0 0 40 56" aria-hidden="true"><defs><linearGradient id="gsF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3fb4"/><stop offset="1" stop-color="#ff3fb4" stop-opacity="0"/></linearGradient></defs><path class="gs-flame" d="M15 43 20 56 25 43z" fill="url(#gsF)"/><path d="M20 2 26 19 36 33v7l-10-3-2 7h-8l-2-7-10 3v-7l10-14z" fill="#0b0f16" stroke="#38e1ff" stroke-width="1.3" stroke-linejoin="round"/><path d="M20 9c2 3 2.6 8 2.6 12h-5.2c0-4 .6-9 2.6-12z" fill="#38e1ff"/><path d="M6 36l8-3M34 36l-8-3" stroke="#ff3fb4" stroke-width="1.2"/></svg>');
  if (def.startArt) {
    const dz = Math.min(3, (window.devicePixelRatio || 1) * (MAP.z || 1)), SP = 72, cv = mapEl('canvas', 'gs-art', st), cx = cv.getContext('2d');
    cv.width = cv.height = Math.round(SP * dz); cv.style.width = cv.style.height = SP + 'px'; cx.scale(dz, dz);
    try { def.startArt(cx, SP); } catch (e) {}
  }
  const stt = mapEl('div', 'gs-txt', st); mapEl('b', '', stt).textContent = def.start.title; mapEl('small', '', stt).textContent = def.start.sub;
  const cap = mapEl('div', 'gmap-cap', world); cap.style.top = L.capY + 'px';
  mapEl('b', '', cap).textContent = def.cap.title; mapEl('small', '', cap).textContent = def.cap.sub;
  // niveaux
  MAP.nodeEls = [];
  for (const nd of L.nodes) {
    const el = mapEl('div', 'gmap-node', world); el.style.left = nd.x + 'px'; el.style.top = nd.y + 'px'; el.style.setProperty('--nc', nd.info.acc);
    el.setAttribute('role', 'img');
    const pin = mapEl('div', 'gn-pin', el); pin.appendChild(mapNodeCanvas(def, nd.info, def.nodeSize || (def.theme === 'space' ? 54 : 52)));
    mapEl('b', 'gn-num', pin).textContent = def.theme === 'space' ? String((nd.lv - 1) % 8 + 1) : String(nd.lv);
    const side = Math.abs(nd.x - W / 2) < L.A * 0.3 ? (nd.lv % 2 ? 'r' : 'l') : nd.x < W / 2 ? 'r' : 'l';
    const lab = mapEl('div', 'gn-lab ' + side, el);
    const room = side === 'r' ? W - 10 - (nd.x + 40) : nd.x - 40 - 10;
    lab.style.width = Math.max(110, Math.min(250, room)) + 'px';
    mapEl('small', '', lab).textContent = nd.info.kicker;
    mapEl('b', '', lab).textContent = nd.info.name;
    for (const ln of nd.info.lines) mapEl('span', ln[0] === '☠' ? 'boss' : '', lab).textContent = ln;
    MAP.nodeEls.push(el); nd.el = el;
  }
  // étapes « BOSS » : médaillon sur le chemin, badge rouge, nom en grand, état (vaincu / à battre)
  const SKULL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c-5 0-8.6 3.4-8.6 8 0 2.7 1.3 4.6 3 5.8V19c0 .9.7 1.6 1.6 1.6h.7v-2h1.6v2h3.4v-2h1.6v2h.7c.9 0 1.6-.7 1.6-1.6v-3c1.7-1.2 3-3.1 3-5.8 0-4.6-3.6-8-8.6-8zM8.4 14.2a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6zm7.2 0a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6zM12 14.6l1.3 2.2h-2.6z"/></svg>';
  const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 7.5l5 4 4.5-7 4.5 7 5-4-2 11h-15zM4.8 20h14.4v2H4.8z"/></svg>';
  for (const nd of L.nodes) {
    const bs = nd.boss; if (!bs) continue;
    const bi = bs.bi;
    const el = mapEl('div', 'gmap-boss' + (bi.final ? ' final' : ''), world); el.style.left = bs.x + 'px'; el.style.top = bs.y + 'px';
    el.style.setProperty('--nc', nd.info.acc); el.setAttribute('role', 'img');
    const em = mapEl('div', 'gb-em', el); em.appendChild(mapBossCanvas(def, bi, def.bossSize || (def.theme === 'space' ? (bi.final ? 70 : 64) : 62)));
    const badge = mapEl('span', 'gb-badge', em); badge.innerHTML = bi.final ? CROWN : SKULL; mapEl('b', '', badge).textContent = bi.final ? 'Boss final' : 'Boss';
    mapEl('i', 'gb-ok', em).textContent = '✓';
    let side = Math.abs(bs.x - W / 2) < L.A * 0.3 ? (nd.lv % 2 ? 'l' : 'r') : bs.x < W / 2 ? 'r' : 'l';
    const lab = mapEl('div', 'gb-lab ' + side, el);
    let room = side === 'r' ? W - 10 - (bs.x + 54) : bs.x - 54 - 10;
    const other = side === 'r' ? bs.x - 54 - 10 : W - 10 - (bs.x + 54);
    if (room < 150 && other > room) { side = side === 'r' ? 'l' : 'r'; room = other; lab.className = 'gb-lab ' + side; }
    const lw = Math.max(100, Math.min(260, room));
    lab.style.width = lw + 'px';
    mapEl('small', '', lab).textContent = bi.kicker;
    const nm = mapEl('b', 'gb-name', lab); nm.textContent = bi.name;
    // le nom en grand, sans couper un mot : taille calée sur le mot le plus long (Bungee ≈ 0,8 em par lettre)
    const longest = Math.max(...bi.name.split(/\s+/).map(w => w.length));
    nm.style.fontSize = Math.max(12, Math.min(bi.final ? 23 : 20, (lw - 22) / (longest * 0.8))).toFixed(1) + 'px';
    mapEl('span', 'gb-st', lab);
    bs.el = el;
  }
  MAP.headLayer = mapEl('div', 'gmap-heads', world);
  mapUpdate(animate);
  mapCenter(false);   // centrée sur moi
}
function mapCenter(smooth) {
  if (!MAP.L) return;
  const mine = mapPeople(MAP.gid).get(cleanName(profile.name)) || 0, p = mine ? MAP.L.nodes[Math.min(mine, MAP.L.nodes.length) - 1] : MAP.L.start;
  const sc = $('jdw-map-scroll'), top = Math.max(0, (p.y - 30) * (MAP.z || 1) - sc.clientHeight * 0.5);
  if (smooth) sc.scrollTo({ top, behavior: 'smooth' }); else sc.scrollTop = top;
}
for (const ev of ['pointerdown', 'wheel', 'touchstart', 'keydown']) $('jdw-map-scroll').addEventListener(ev, () => { MAP.auto = false; }, { passive: true });
// états des niveaux, chemin et têtes (appelé aussi à chaque nouvelle progression, sans tout redessiner)
function mapUpdate(animate) {
  if (!MAP.open || !MAP.L) return;
  const def = MAP.def, L = MAP.L, people = mapPeople(MAP.gid), me = cleanName(profile.name);
  let max = 0; for (const v of people.values()) max = Math.max(max, v);
  if (def.count(max) !== MAP.n) { const sc = $('jdw-map-scroll'), keep = sc.scrollTop; mapBuild(false); sc.scrollTop = keep; return; }
  const mine = people.get(me) || 0;
  // niveaux : atteints par moi / par d'autres / par personne
  const here = new Map();
  for (const [nm, lv] of people) { if (!here.has(lv)) here.set(lv, []); here.get(lv).push(nm); }
  L.nodes.forEach((nd, i) => {
    const el = nd.el; el.classList.toggle('mine', nd.lv <= mine); el.classList.toggle('reached', nd.lv <= max); el.classList.toggle('far', nd.lv > max);
    el.classList.toggle('me-here', nd.lv === mine);
    const who = here.get(nd.lv) || [];
    el.setAttribute('aria-label', nd.info.kicker + ', ' + nd.info.name + (who.length ? ' : ' + who.map(w => w === me ? 'toi' : w).join(', ') : ''));
    if (animate) el.style.setProperty('--d', (0.15 + Math.min(i, 26) * 0.035).toFixed(3) + 's');
  });
  // étapes « BOSS » : vaincu par moi / ma prochaine / vaincu par d'autres / pas encore atteint
  const nextB = (L.bosses.find(b => b.lv >= Math.max(1, mine)) || { lv: -1 }).lv;
  for (const nd of L.nodes) {
    const bs = nd.boss, el = bs && bs.el, lv = nd.lv; if (!el) continue;
    const beaten = mine > lv, next = !beaten && lv === nextB, by = [...people].filter(([, v]) => v > lv).map(([n]) => n).filter(n => n !== me);
    el.classList.toggle('beaten', beaten); el.classList.toggle('next', next); el.classList.toggle('others', !beaten && by.length > 0);
    el.classList.toggle('far', !beaten && !next && lv > max);
    const st = el.querySelector('.gb-st');
    st.textContent = beaten ? 'Boss vaincu ✓' : next ? (lv <= max && by.length ? 'À toi de le battre !' : mine ? 'Ton prochain boss' : 'Ton premier boss')
      : by.length ? 'Vaincu par ' + (by.length > 2 ? by.slice(0, 2).join(', ') + ' +' + (by.length - 2) : by.join(' et ')) : lv <= max ? 'Encore invaincu !' : '';
    st.hidden = !st.textContent;
    el.setAttribute('aria-label', 'Boss : ' + bs.bi.name + ', ' + bs.bi.kicker.toLowerCase() + (st.textContent ? ' — ' + st.textContent.replace(' ✓', '') : ''));
    if (animate) el.style.setProperty('--d', (0.3 + Math.min(lv - 1, 26) * 0.035).toFixed(3) + 's');
  }
  for (const t of $('jdw-map-world').querySelectorAll('.gmap-tier')) { const tt = +t.dataset.tier, first = L.nodes.find(nd => nd.info.tier === tt); t.classList.toggle('far', !!first && first.lv > max); }
  // chemin : groove + segments
  const svg = MAP.svg; svg.textContent = '';
  const pts = [L.start]; for (const nd of L.nodes) { pts.push(nd); if (nd.boss) pts.push(nd.boss); }
  const groove = document.createElementNS(SVGNS, 'path');
  groove.setAttribute('d', pts.slice(1).map((b, i) => mapSegPath(pts[i], b)).join(' '));
  groove.setAttribute('class', 'gp-groove'); svg.appendChild(groove);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], lv = b.lv, col = b.info.acc;
    const state = lv <= mine ? 'mine' : lv <= max ? 'others' : 'far';
    if (state !== 'far') {
      const gl = document.createElementNS(SVGNS, 'path'); gl.setAttribute('d', mapSegPath(a, b)); gl.setAttribute('class', 'gp-glow ' + state); gl.setAttribute('stroke', col); svg.appendChild(gl);
    }
    const s = document.createElementNS(SVGNS, 'path'); s.setAttribute('d', mapSegPath(a, b)); s.setAttribute('class', 'gp-seg ' + state);
    s.setAttribute('stroke', state === 'far' ? 'rgba(255,255,255,.22)' : col);
    if (state !== 'far') { s.setAttribute('pathLength', '1'); if (animate) s.style.setProperty('--d', (0.12 + Math.min(i - 1, 26) * 0.035).toFixed(3) + 's'); }
    svg.appendChild(s);
    if (state === 'mine') { const f = document.createElementNS(SVGNS, 'path'); f.setAttribute('d', mapSegPath(a, b)); f.setAttribute('class', 'gp-flow'); svg.appendChild(f); }
  }
  // têtes : regroupées par niveau, moi au centre et en grand ; sous chaque tête, son meilleur score dans la salle (+ « estimé »)
  const layer = MAP.headLayer, seen = new Set(), G = gameById(MAP.gid), scores = mapScores(MAP.gid), ests = mapEst(MAP.gid, people);
  const top = max > 0 ? [...people].filter(([, v]) => v === max).map(([n]) => n) : [];
  for (const [lv, names0] of here) {
    const names = names0.slice().sort((a, b) => (b === me) - (a === me) || a.localeCompare(b));
    const pos = lv >= 1 ? L.nodes[Math.min(lv, L.nodes.length) - 1] : L.start;
    const cap = lv < 1 ? 6 : 4;          // au départ il y a plus de place
    const shown = names.length > cap ? names.slice(0, cap - 1) : names, extra = names.length - shown.length;
    const m = shown.length + (extra ? 1 : 0);
    // éventail : les places les plus proches du milieu d'abord (moi au milieu)
    const mid = (m - 1) / 2, slots = [...Array(m).keys()].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
    const step = 46;
    for (const [k, nm] of shown.entries()) {
      const slot = slots[k];
      const dx = (slot - mid) * step, dy = -Math.abs(slot - mid) * 8;   // les côtés un peu plus haut : loin des étiquettes
      let h = MAP.heads.get(nm);
      if (!h) {
        h = mapEl('div', 'gmap-head' + (nm === me ? ' me' : ''), layer);
        const hd = chatHead(nm, { passive: true }); hd.classList.add('gh-face'); h.appendChild(hd);
        mapEl('span', 'gh-name', h).textContent = nm === me ? 'Toi' : dispName(nm);
        if (animate) h.style.setProperty('--d', (0.45 + Math.min(lv, 26) * 0.035).toFixed(3) + 's');
        MAP.heads.set(nm, h);
      }
      h.classList.toggle('lead', top.length === 1 && top[0] === nm && people.size > 1);
      h.classList.toggle('start', lv < 1);
      h.style.left = (pos.x + dx) + 'px'; h.style.top = (pos.y - (lv >= 1 ? 34 : 30) + dy) + 'px';
      const sc = scores.get(nm) || 0, est = ests.has(nm);
      h.classList.toggle('est', est);
      let tab = h.querySelector('.gh-sc'); if (!tab) tab = mapEl('span', 'gh-sc', h);
      const key = sc + '|' + est;
      if (tab.dataset.k !== key) {
        tab.dataset.k = key; tab.textContent = '';
        if (sc) mapEl('span', 'gh-pts', tab).textContent = scoreShort(sc, G);
        if (est) mapEl('span', 'gh-est', tab).textContent = 'estimé';
      }
      h.title = (nm === me ? 'Toi' : nm) + ' · ' + (lv >= 1 ? def.short(lv) : 'pas encore parti') + (sc ? ' · record ' + fmt(sc) + unit(G) : '')
        + (est ? ' · position estimée d’après un ancien score' : '');
      seen.add(nm);
    }
    const kx = 'more' + lv;
    let more = MAP.heads.get(kx);
    if (extra) {
      if (!more) { more = mapEl('div', 'gmap-more', layer); MAP.heads.set(kx, more); }
      more.textContent = ''; mapEl('span', '', more).textContent = '+' + extra; more.title = names.slice(shown.length).join(', ');
      const ms = slots[m - 1]; more.style.left = (pos.x + (ms - mid) * step) + 'px'; more.style.top = (pos.y - 34 - Math.abs(ms - mid) * 8) + 'px';
      seen.add(kx);
    }
  }
  for (const [k, el] of [...MAP.heads]) if (!seen.has(k)) { el.remove(); MAP.heads.delete(k); }
  // résumé en bas
  const sum = $('jdw-map-sum'); sum.textContent = '';
  const av = mapEl('span', 'avatar', sum); avatarInto(av, me);
  const tx = mapEl('span', 'gm-sumtx', sum), mi = mine ? def.level(mine) : null;
  if (mi) sum.style.setProperty('--nc', mi.acc);
  mapEl('small', 'gm-k', tx).textContent = mi ? 'Toi · ' + mi.kicker + (ests.has(me) ? ' · estimé' : '') : 'Toi';
  mapEl('b', '', tx).textContent = mi ? mi.name : 'Pas encore parti';
  // celui qui est devant (au niveau, puis au score) ; à égalité de niveau, le meilleur score d'abord
  const others = [...people].filter(([n]) => n !== me).sort((a, b) => b[1] - a[1] || (scores.get(b[0]) || 0) - (scores.get(a[0]) || 0));
  const ahead = others.length && others[0][1] > 0 ? others[0] : null, aName = ahead ? dispName(ahead[0]) : '';
  mapEl('small', '', tx).textContent = ahead
    ? (ahead[1] > mine ? 'Devant toi : ' + aName + ' · ' + def.word + ' ' + ahead[1] : mine >= ahead[1] && mine > 0 ? (ahead[1] === mine ? 'À égalité en tête avec ' + aName : 'Tu mènes la salle !') : '')
    : mine ? 'Ton meilleur ' + def.word.toLowerCase() : 'Lance une partie pour poser ta tête sur la carte';
  // les scores : le sien (s'il est devant ou à égalité) et le mien
  const myS = scores.get(me) || 0, aS = ahead && ahead[1] >= mine ? scores.get(ahead[0]) || 0 : 0;
  const parts = [];
  if (aS) parts.push(aName + ' ' + scoreShort(aS, G));
  if (myS) parts.push((aS ? 'toi ' : 'Ton record : ') + scoreShort(myS, G));
  if (parts.length) mapEl('small', 'gm-sc', tx).textContent = parts.join(' · ');
  sum.title = (ahead && aS ? aName + ' : ' + fmt(aS) + unit(G) + ' · ' : '') + (myS ? 'toi : ' + fmt(myS) + unit(G) : '');
}
$('jdw-map-close').addEventListener('click', closeMap);
$('jdw-map-play').addEventListener('click', () => { const g = gameById(MAP.gid); closeMap(); if (g) setTimeout(() => openGame(g), 120); });
$('jdw-map-me').addEventListener('click', () => {
  mapCenter(true);
  const h = MAP.heads.get(cleanName(profile.name)); if (h) { h.classList.remove('ping'); void h.offsetWidth; h.classList.add('ping'); }
});
addEventListener('resize', () => { if (!MAP.open) return; clearTimeout(MAP.rt); MAP.rt = setTimeout(() => { if (MAP.open) mapBuild(false); }, 180); });

/* ================= Appli Android : retour + mise à jour ================= */
window.JDW_BACK = () => {
  if (popCloseAll()) return true;
  if (!$('jdw-net').hidden) { netEnd(true); return true; }
  if (!$('jdw-watch').hidden) { watchStop(); return true; }
  if (MAP.open) { closeMap(); return true; }
  if (!$('jdw-cmp-pick').hidden) { cmpClosePick(); return true; }
  if (!$('jdw-podium').hidden) { cmpClosePodium(); return true; }
  if (!$('jdw-duo').hidden) { duoBack(); return true; }
  if (!$('jdw-seatpick').hidden) { closeSheet('jdw-seatpick'); return true; }
  if (chat.open) { closeChat(); return true; }
  if (!$('jdw-cri').hidden) { closeCri(); return true; }
  if (!$('jdw-acct').hidden) { if (!AS.locked) closeSheet('jdw-acct'); return true; }
  if (!$('jdw-inv').hidden) { invDismiss(); return true; }
  if (!$('jdw-invshare').hidden) { closeSheet('jdw-invshare'); return true; }
  for (const id of ['jdw-photo', 'jdw-settings', 'jdw-board', 'jdw-rooms', 'jdw-notifs', 'jdw-profiles', 'jdw-members', 'jdw-welcome']) {
    if (!$(id).hidden) { if (id === 'jdw-photo') closePhoto(); else if (id !== 'jdw-welcome') closeSheet(id); else return true; return true; }
  }
  if (!$('jdw-play').hidden) { quitGame(); return true; }
  if (MODE !== 'classique' && !$('jdw-lib').hidden) { setMode('classique', true); return true; }   // les autres modes sont des pages : retour à la page normale
  return false;
};
checkAppVersion();
setTimeout(loadTurn, 4000);   // relais prêt avant le premier duel en ligne ou la première diffusion
// juste après une mise à jour automatique : message + notification avec les nouveautés
(() => {
  let rf = ''; try { rf = sessionStorage.getItem('jdw.reloadfor') || ''; } catch (e) {}
  if (!rf || rf !== window.JDW_BUILD) return;
  try { sessionStorage.removeItem('jdw.reloadfor'); } catch (e) {}
  const B = String(window.JDW_BUILD);
  UPD.installed = (window.JDW_VERSION || '') + (/^\d{12}/.test(B) ? ' du ' + B.slice(6, 8) + '/' + B.slice(4, 6) : '');
  setTimeout(() => { refreshBell(); toastCheer('✨ Mise à jour ' + (window.JDW_VERSION || '') + ' installée !', profile.name, true); }, 1800);
})();


/* ================= Invité (site public, sans compte) ================= */
// Un visiteur joue tout de suite : jeux solo, duels sur l'appareil ou contre l'IA. Le reste (scores, salles, chat, duel en ligne,
// compétition, regarder, pseudo, tête, cri) demande un compte : bandeau « Crée ton compte », fenêtre jdw-guestask.
let guestWas = null;
function guestSync() {
  const g = isGuest();
  $('jdw-lib').classList.toggle('guest', g); document.body.classList.toggle('jdw-guest', g);
  guestBar();
  if (g === guestWas) return;
  const first = guestWas === null; guestWas = g;
  if (g) {
    const t = roomTopic(); room = null; if (t) RT.topics.delete(t);       // la salle reste retenue sur l'appareil (jdw.room)
    rtClose(); RT.topics.clear();
    players.clear(); memberNames = new Set(); membersFor = null; remote = {}; remoteLoaded = false; counts = {}; total = 0;
    ensureAiPlayer();
    if (!first) { try { chatReset(); closeChat(); } catch (e) {} }
  } else {
    syncOwnPlayer();
    const saved = store.get('jdw.room', null);
    if (!first && !room && saved && saved.id != null) enterRoom(saved);
    RT.topics.add('jdw-all'); if (room) RT.topics.add('jdw-room-' + room.id);
    if (RT.ws && RT.uid && profile.acct && profile.acct.uid !== RT.uid) rtClose();   // autre compte : autre jeton
    rtConnect();
  }
  if (first) return;
  refreshAll(); refreshChatBtn(); refreshBell();
  if (MODE === 'duel') renderSeats(); else if (MODE === 'compet') renderCompet();
  setDuelWhere(DUEL_WHERE);
  if (!g && invPending()) setTimeout(invRun, 300);       // le compte est là : la salle du lien d'invitation est rejointe toute seule
}
// joueur « sans compte » de l'appareil (enfant) et compte connecté sur l'appareil : on peut l'y rattacher (un compte = plusieurs joueurs)
function guestKidUid() {
  if (!profile.name || !ONLINE || !ACCT.ready) return '';
  const st = acctState(profile); if (st !== 'local' && st !== 'none') return '';
  return acctUids()[0] || '';
}
function guestBar() {
  const bar = $('jdw-guestbar'); if (!bar) return;
  const st = ONLINE && ACCT.ready ? acctState(profile) : 'off';
  const show = isGuest() && st !== 'pending';          // e-mail à confirmer : c'est la bannière du compte qui parle
  bar.hidden = !show; if (!show) return;
  const kid = guestKidUid(), N = cleanName(profile.name), iv = !kid && st !== 'need' ? invPending() : null;   // iv : un lien d'invitation attend le compte
  bar.dataset.kind = kid ? 'kid' : st === 'need' ? 'need' : iv ? 'invite' : 'new';
  $('jdw-guestbar-t').textContent = kid ? N + ' n’a pas encore de compte' : st === 'need' ? N + ' a un compte' : iv ? (iv.name ? 'Invitation : « ' + iv.name + ' »' : 'Tu es invité dans une salle') : 'Tu joues en invité';
  $('jdw-guestbar-s').textContent = kid ? 'Ajoute-le au compte de ' + acctLabel(kid) + ' : ses scores seront enregistrés et il rejoindra la salle.'
    : st === 'need' ? 'Connecte-toi pour enregistrer tes scores et retrouver tes copains.'
    : iv ? 'Crée ton compte (gratuit) : tu entreras directement dans la salle de tes copains.'
    : 'Crée ton compte pour enregistrer tes scores et rejoindre tes copains.';
  $('jdw-guest-new').textContent = kid ? 'Ajouter ' + N + ' au compte' : st === 'need' ? '🔑 Me connecter' : 'Créer un compte';
  $('jdw-guest-login').textContent = kid || st === 'need' ? 'Changer de joueur' : 'J’ai déjà un compte';
}
function guestCreate() {
  closeSheet('jdw-guestask');
  if (profile.name) { adding = profile; profile = blankProfile(); }
  startWelcome();
}
function guestLogin() {
  closeSheet('jdw-guestask');
  if (profile.name) { adding = profile; profile = blankProfile(); }
  startWelcome(); welTab('login');
  setTimeout(() => $('jdw-wel-lemail').focus(), 40);
}
async function guestAttachKid() {
  const uid = guestKidUid(), N = cleanName(profile.name), pid = profile.pid; if (!uid) return;
  const b = $('jdw-guest-new'); b.disabled = true;
  try {
    const tok = await tokenFor(uid); if (!tok) throw Object.assign(new Error('session'), { status: 401 });
    await rpc('claim_name', { p_code: CODE(), p_name: N }, { token: tok });
    acctPut(pid, { uid }); acctUi(); pushProfile(); maybeAskJoin();
    toastCheer('🔒 ' + N + ' est sur le compte de ' + acctLabel(uid) + ' !', N, true);
  } catch (e) { toastCheer(e.status === 401 ? 'La connexion du compte a expiré : reconnecte-toi.' : claimMsg(e, N), N, true); }
  b.disabled = false;
}
$('jdw-guest-new').addEventListener('click', () => {
  const kind = $('jdw-guestbar').dataset.kind;
  if (kind === 'kid') guestAttachKid(); else if (kind === 'need') openAcct('connect'); else guestCreate();
});
$('jdw-guest-login').addEventListener('click', () => { const kind = $('jdw-guestbar').dataset.kind; if (kind === 'kid' || kind === 'need') openProfiles(); else guestLogin(); });
// une fonction réservée aux comptes touchée par un invité : petite fenêtre qui explique
const GUEST_WHY = {
  'Les salles': 'Une salle, c’est ta bande : classement commun, chat, têtes et cris des copains.',
  'Duel en ligne': 'Défie un copain sur son téléphone, chacun chez soi.',
  'Compétition': 'Toute la salle sur le même jeu, en direct : que le meilleur gagne !',
  'Ton joueur': 'Ton pseudo, ta tête détourée et ton cri, dans tous les jeux.',
  'Le classement': 'Tes records enregistrés, le classement de ta salle et le classement mondial.'
};
function guestAsk(what) {
  $('jdw-guestask-h').textContent = what || 'Avec un compte';
  $('jdw-guestask-s').textContent = (GUEST_WHY[what] ? GUEST_WHY[what] + ' ' : '') + 'Crée ton compte (gratuit) : tes scores sont enregistrés et tu rejoins tes copains.';
  openSheet('jdw-guestask', 'jdw-guestask-new');
}
$('jdw-guestask-new').addEventListener('click', guestCreate);
$('jdw-guestask-login').addEventListener('click', guestLogin);
$('jdw-guestask-close').addEventListener('click', () => closeSheet('jdw-guestask'));
$('jdw-guestask').addEventListener('click', e => { if (e.target === $('jdw-guestask')) closeSheet('jdw-guestask'); });
$('jdw-end-guest-new').addEventListener('click', () => { backToLibrary(); guestCreate(); });
$('jdw-end-guest-login').addEventListener('click', () => { backToLibrary(); guestLogin(); });

/* ================= Hors ligne : bandeau, pastille, fonctions grisées, service worker ================= */
// État : NETS / netOff() / netFail() / netOk() (en haut, à côté de rpc). Sans réseau : jeux solo, duels sur le téléphone, contre l'IA et
// musique (gardée par jouer/sw.js) ; salles, chat, duel en ligne, compétition, regarder, classement en ligne : « Il faut du réseau ».
// Les scores et records de niveau attendent (jdw.unsent, jdw.progq) et partent au retour (refreshEverything → flushUnsent, progFlush).
let netBarT = 0;
function netBar(back) {
  const bar = $('jdw-netbar'); if (!bar) return;
  clearTimeout(netBarT); bar.classList.remove('leaving');
  if (netOff()) {
    bar.dataset.state = 'off'; $('jdw-netbar-t').textContent = 'Pas de connexion';
    $('jdw-netbar-s').textContent = isGuest() ? 'Tu joues hors ligne : jeux solo, duels sur ce téléphone, contre l’IA et musique.' : 'Tu joues hors ligne, tes scores partiront au retour du réseau.';
    bar.hidden = false; return;
  }
  if (back && !bar.hidden) {
    bar.dataset.state = 'ok'; $('jdw-netbar-t').textContent = 'Connexion retrouvée ✓';
    $('jdw-netbar-s').textContent = unsent.length || progQ.length ? 'Tes scores partent en ligne.' : 'Salles, chat et classements sont de retour.';
    netBarT = setTimeout(() => { bar.classList.add('leaving'); netBarT = setTimeout(() => { bar.hidden = true; bar.classList.remove('leaving'); }, 400); }, 3500);
    return;
  }
  bar.hidden = true;
}
let netPillT = 0;
function netPill(text, kind) {
  let el = $('jdw-netpill');
  if (!el) { el = document.createElement('div'); el.id = 'jdw-netpill'; el.className = 'net-pill'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.textContent = text; el.dataset.kind = kind || 'off';
  clearTimeout(netPillT); requestAnimationFrame(() => el.classList.add('on'));
  netPillT = setTimeout(() => el.classList.remove('on'), kind === 'need' ? 2600 : 3400);
}
// une fonction qui demande le réseau, touchée hors ligne
function netNeed(what) {
  netPill('📡 ' + what + ' : il faut du réseau', 'need');
  const bar = $('jdw-netbar'); if (bar && !bar.hidden) { bar.classList.remove('pulse'); void bar.offsetWidth; bar.classList.add('pulse'); }
  if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
  netProbeSoon(0);                                   // et on regarde tout de suite si le réseau est revenu
}
const onLibrary = () => !$('jdw-lib').hidden && $('jdw-play').hidden && $('jdw-duo').hidden;
function netChanged(back) {
  if (!ONLINE) return;
  document.body.classList.toggle('net-off', netOff());
  netBar(back);
  try { refreshAll(); refreshChatBtn(); } catch (e) {}
  try { if (MODE === 'compet') renderCompet(); if (duoTiles.length) refreshDuoTiles(); } catch (e) {}
  if (!back) {
    rtClose();                                         // le direct reviendra avec le réseau (refreshEverything → rtConnect)
    try { if (chat.open) closeChat(); for (const id of ['jdw-rooms', 'jdw-members']) if ($(id) && !$(id).hidden) closeSheet(id); } catch (e) {}
    if (!onLibrary()) netPill('📡 Pas de connexion : la partie continue', 'off');   // court : le jeu reste lisible (le score attendra, voir fin de partie)
  } else {
    if (!onLibrary()) netPill('Connexion retrouvée ✓', 'ok');
    lastRefresh = 0; refreshEverything(true); loadPlayers(); acctTick();
    if (!$('jdw-board').hidden) loadWorld();
    setTimeout(swWarm, 10000);
    if (invPending()) setTimeout(invRun, 1200);          // lien d'invitation ouvert sans réseau : c'est le moment
  }
}
$('jdw-netbar-retry').addEventListener('click', () => {
  const b = $('jdw-netbar-retry'); b.classList.add('spin'); setTimeout(() => b.classList.remove('spin'), 1600);
  NETS.wait = 4000; netProbeSoon(0);
});
// le toucher d'un bouton grisé (chat, salle, joueurs) : le message plutôt que rien
for (const id of ['jdw-chat-btn', 'jdw-roombar', 'jdw-invite']) {
  const el = $(id); if (!el) continue;
  el.addEventListener('click', e => { if (!netOff()) return; e.stopImmediatePropagation(); e.preventDefault(); netNeed(id === 'jdw-chat-btn' ? 'Le chat' : 'Les salles'); }, true);
}
for (const b of document.querySelectorAll('#jdw-modes [data-mode=compet]')) b.addEventListener('click', () => { if (netOff() && !isGuest()) netNeed('La compétition'); });
// Service worker (jouer/sw.js) : la borne s'ouvre sans réseau (page, images, jingles, polices, musiques gardées à l'usage).
// Seulement pour la borne publiée (jouer/, SITE_ROOT=../) ; jamais pour les appels du serveur (Supabase).
const SW_OK = 'serviceWorker' in navigator && !!ROOT && BUILD !== 'dev' && /^https?:$/.test(location.protocol);
if (SW_OK) setTimeout(() => { navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).catch(() => {}); }, 1500);
// au calme et en ligne : une musique par jeu gardée sur l'appareil (pour jouer en musique sans réseau), une fois par version
function swWarm() {
  if (!SW_OK || netOff() || document.hidden) return;
  const ctl = navigator.serviceWorker.controller, c = navigator.connection;
  if (!ctl || (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')))) return;
  let done = ''; try { done = localStorage.getItem('jdw.swwarm') || ''; } catch (e) {}
  if (done === BUILD) return;
  const M = window.JDW_MUSIC || {}, list = [];
  for (const id of ['accueil', ...GAMES.map(g => g.id)]) if (M[id]) for (const v of (id === 'accueil' ? musicVariants('accueil') : musicVariants(id, 'calm').slice(0, 1))) list.push(musicPath(v));
  if (MUSIC_ENC.has('dscores-1')) list.push(musicPath('dscores-1'));
  try { ctl.postMessage({ t: 'warm', list }); localStorage.setItem('jdw.swwarm', BUILD); } catch (e) {}
}
if (SW_OK) setTimeout(swWarm, 25000);

/* ================= Démarrage ================= */
['jdw-guestask', 'jdw-inv', 'jdw-invshare', 'jdw-play', 'jdw-end', 'jdw-board', 'jdw-settings', 'jdw-welcome', 'jdw-photo', 'jdw-cheer', 'jdw-rooms', 'jdw-rotate', 'jdw-notifs', 'jdw-profiles', 'jdw-chat', 'jdw-cri', 'jdw-members', 'jdw-duo', 'jdw-seatpick', 'jdw-podium', 'jdw-cmp-pick', 'jdw-watch', 'jdw-net', 'jdw-netinv', 'jdw-map', 'jdw-acct'].forEach(id => { if ($(id)) $(id).hidden = true; });
if ($('jdw-pg')) $('jdw-pg').hidden = true;
$('jdw-lib').hidden = false;
if (isGuest()) room = null;      // la salle reste retenue sur l'appareil (jdw.room) : elle revient avec le compte
syncOwnPlayer();
buildLibrary(); buildDuoLibrary(); buildTabs(); syncMute(); refreshAll(); setMode(MODE);
requestAnimationFrame(previewLoop);
if (document.fonts && document.fonts.load) { document.fonts.load('20px Bungee').catch(() => {}); document.fonts.load('600 14px "Chakra Petch"').catch(() => {}); }
for (const a of document.querySelectorAll('[data-root-href]')) a.setAttribute('href', ROOT + a.dataset.rootHref);   // borne publiée dans jouer/
guestSync();                    // invité : pas de salle, bandeau « Crée ton compte »
if (netOff()) { document.body.classList.add('net-off'); netBar(); }   // ouverte sans réseau (service worker) : bandeau tout de suite
if (ONLINE && !isGuest() && !room && !netOff() && !invPending() && !INV.bad) openRooms();
acctBar(); acctStart();         // comptes : bannière « Protège ton compte », lien reçu par e-mail, jetons rafraîchis
if (ONLINE && (invPending() || INV.bad)) setTimeout(invRun, 900);   // lien d'invitation (?salle=…) ouvert, ou gardé d'une visite précédente
loadPlayers(); loadScores(); heartbeat(); loadChat(); setTimeout(progLoad, 1500);
setTimeout(pushRoomLook, 2500);    // une tête / un cri de salle pas encore envoyé (serveur pas à jour, pas de réseau…)
if (ONLINE && !isGuest()) { RT.topics.add('jdw-all'); if (room) RT.topics.add('jdw-room-' + room.id); rtConnect(); }   // joints à l'ouverture (jeton prêt)
setTimeout(checkSiteVersion, 4000);
// les images des jeux se préparent en douce (aperçu de la tuile + démarrage instantané)
setTimeout(() => { for (const id of ASSET_GAMES) if (gameById(id)) window.JDW_ASSETS.load(id).catch(() => {}); }, 3500);
window.JDW_SHELL = { players, headsList, music: () => ({ id: MUS.id, mode: MUS.mode, track: MUS.track, on: MUS.on, vol: MUS.gain ? +MUS.gain.gain.value.toFixed(3) : null }), toast: toastCheer, game: () => current && current.inst, duo: () => DUO.inst, duoApi: () => DUO.api, cmp: () => CMP };   // diagnostic (tests)
})();
