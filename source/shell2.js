(() => {
'use strict';
const $ = id => document.getElementById(id);
// hasard de la bibliothèque (musique, messages…) : séparé de celui des jeux, qui peut être fixé (mode Local : même partie pour tous)
const shellRand = Math.random.bind(Math);
const ORDER = ['ilo', 'pleingaz', 'empilo', 'glouton', 'mouches', 'carreaux', 'rouleaux', 'canards'];
const NEW_GAMES = new Set(['ilo']);
const GAMES = ORDER.map(id => (window.JDW_GAMES || {})[id]).filter(Boolean);
const gameById = id => GAMES.find(g => g.id === id);
// jeux de duel (deux joueurs face à face) : modules source/duos/*.js, contrat DUO-CONTRACT.md
const DUO_ORDER = ['trouve', 'palet', 'briques', 'boum', 'souris', 'spatial', 'mots', 'guerre'];
const DUOS = DUO_ORDER.map(id => (window.JDW_DUOS || {})[id]).filter(Boolean);
const duoById = id => DUOS.find(d => d.id === id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
let seenGames = store.get('jdw.seengames', {}) || {};
const gameSeen = (id) => (seenGames[cleanName(profile.name)] || []).includes(id);
const isNewGame = (id) => NEW_GAMES.has(id) && !!profile.name && !gameSeen(id);
function markGameSeen(id) {
  const me = cleanName(profile.name); if (!me || !NEW_GAMES.has(id) || gameSeen(id)) return;
  (seenGames[me] = seenGames[me] || []).push(id); store.set('jdw.seengames', seenGames);
  refreshNewBadges(); refreshBell();
}
function refreshNewBadges() { let list = []; try { list = tiles; } catch (e) { return; } for (const t of list) { const nb = t.el.querySelector('.tile-new'); if (nb) nb.hidden = !isNewGame(t.g.id); } }
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
const CODE = () => store.get('jdw.code', '') || window.JDW_CODE || '';
let serverOk = false, netDown = false, roomDenied = false, remoteLoaded = false;
let room = store.get('jdw.room', null);
let roomCodes = store.get('jdw.roomcodes', {}) || {};
const RP = () => ({ p_room: room ? room.id : null, p_room_code: room ? (roomCodes[room.id] || '') : '' });
async function rpc(fn, args, opts) {
  const h = { 'Content-Type': 'application/json', apikey: CFG.key };
  if (!/^sb_/.test(CFG.key)) h.Authorization = 'Bearer ' + CFG.key;
  let r;
  try { r = await fetch(CFG.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: h, body: JSON.stringify(args) }); }
  catch (e) { const er = new Error(fn + ' : pas de réseau'); er.offline = true; netDown = true; throw er; }
  netDown = false;
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    const er = new Error(fn + ' ' + r.status + ' ' + t.slice(0, 120)); er.status = r.status; er.denied = /acces refuse/.test(t);
    // les refus du serveur me sont remontés (une fois par session), pour comprendre ce qui bloque chez chacun
    if (fn !== 'log_error' && !/trop de messages/.test(t) && !(opts && opts.quiet404 && r.status === 404)) { try { reportError('Serveur : ' + fn + ' ' + r.status, t.slice(0, 300), { quiet: true }); } catch (e) {} }
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
  const p = { name, photo: photo || null, img: null, sad: null, sadUrl: '', sound: sound || null,
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
  const me = cleanName(profile.name);
  // seulement les membres de la salle (et moi) : un compte de l'appareil retiré de la salle n'apparaît plus dans les jeux
  for (const p of players.values()) if (p.name !== 'IA' && (p.name === me || !knownNotMember(p.name)) && p.img && p.img.complete && p.img.naturalWidth) out.push({ name: p.name, img: p.img, sad: sadOf(p) || p.img });
  return out;
}
function playerObj() {
  const p = players.get(cleanName(profile.name));
  return { name: profile.name || 'JOUEUR', img: p && p.img && p.img.complete && p.img.naturalWidth ? p.img : null };
}
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
    for (const p of players.values()) p.member = false;    // un joueur retiré de la salle n'en fait plus partie
    memberNames = new Set(rows.map(r => cleanName(r.r_name)));
    for (const r of rows) {
      setPlayer(r.r_name, r.r_photo, r.r_sound || null);
      const p = players.get(cleanName(r.r_name));
      if (p) { p.member = true; p.seen = Math.max(p.seen || 0, Date.parse(r.r_seen) || 0); p.dbGame = r.r_game || null; if (!PRES.ok) p.game = r.r_game || null; p.updated = Date.parse(r.r_updated) || 0; if (r.r_version) p.dbVer = r.r_version; }
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
  let game = 'démarrage';
  try { game = current ? current.game.id : where; } catch (e) {}   // erreur pendant le chargement de la page
  const key = game + '|' + message;
  if (errSeen.has(key) || errCount >= 20) return;
  errSeen.add(key); errCount++;
  let sc = null;
  try { if (current && current.inst && current.inst.currentScore) sc = current.inst.currentScore(); } catch (e) {}
  const d = String(detail || '').slice(0, 3500) + (sc !== null ? '\nscore en cours : ' + sc : '') + '\nécran : ' + innerWidth + 'x' + innerHeight;
  errLog.unshift({ at: Date.now(), game, message, detail: d }); errLog = errLog.slice(0, 20); store.set('jdw.errors', errLog);
  if (ONLINE && CFG) rpc('log_error', { p_code: CODE(), p_name: profile.name || '', p_room: room ? room.id : null, p_game: game, p_message: message,
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
const INTENSE_AT = { ilo: 4, pleingaz: 4, empilo: 6, glouton: 4, mouches: 7, carreaux: 7, rouleaux: 9, canards: 6 };
// morceaux chiffrés (assets/music/<nom>.bin, collection de l'Asset Store) : sel(16) + iv(12) + AES-GCM, clé tirée du mot de passe
const MUSIC_ENC = new Set(window.JDW_MUSIC_ENC || []);
const binKeys = {};
async function decryptBin(u8) {
  const salt = u8.slice(0, 16), k = Array.prototype.join.call(salt, '.');
  if (!binKeys[k]) binKeys[k] = (async () => {
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(CODE()), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  })();
  try { return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8.slice(16, 28) }, await binKeys[k], u8.slice(28)); }
  catch (e) { delete binKeys[k]; throw e; }
}
async function musicBuffer(id) {
  if (MUS.buf[id]) return MUS.buf[id];
  const enc = MUSIC_ENC.has(id);
  const r = await fetch('assets/music/' + id + (enc ? '.bin' : '.mp3')); if (!r.ok) throw new Error('musique ' + id + ' ' + r.status);
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
    const r = await fetch('assets/music/' + id + '.bin'); if (!r.ok) throw new Error('jingle ' + id + ' ' + r.status);
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
  const seq = ++MUS.seq, list = musicVariants(id, mode), idx = Math.floor(shellRand() * list.length);
  let b; try { b = await musicBuffer(list[idx]); } catch (e) { return; }
  if (seq !== MUS.seq || MUS.want !== id || !MUS.on) return;
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
  loadNotifs();
}
async function saveScore(game, score, forName) {
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
function queueScore(game, name, score) {
  if (!room) return;
  unsent.push({ room: room.id, code: roomCodes[room.id] || '', game, name, score });
  unsent = unsent.slice(-30); store.set('jdw.unsent', unsent);
}
let flushing = false;
async function flushUnsent() {
  if (flushing || !ONLINE || !unsent.length) return;
  flushing = true;
  const left = [], before = unsent.length;
  for (const u of unsent) {
    try { await rpc('add_score', { p_code: CODE(), p_room: u.room, p_room_code: u.code, p_game: u.game, p_name: u.name, p_score: u.score }); }
    catch (e) { if (!/ 4\d\d /.test(String(e.message))) left.push(u); }   // refus définitif (4xx) : on abandonne
  }
  unsent = left; store.set('jdw.unsent', unsent); flushing = false;
  if (left.length < before) loadScores();
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
  return [...NEW_GAMES].filter(id => gameById(id) && !gameSeen(id) && !(gameNotifSeen[me] || []).includes(id)).map(id => ({ kind: 'game', game: id }));
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
    li.addEventListener('click', () => { closeSheet('jdw-notifs'); if (app) location.href = 'telecharger/'; else reloadNow(); });
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
  const b = document.createElement('b'); b.textContent = n.actor;
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
  if (opts.title) el.title = cleanName(name);
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
  const t = document.createElement('b'); t.textContent = m.name + ' détrône ' + m.beaten + ' !';
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
    if (!grouped) { const n = document.createElement('span'); n.className = 'chat-name'; n.textContent = mine ? 'Moi' : m.name; col.appendChild(n); }
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
const RT = { ws: null, ref: 0, topics: new Set(), hb: 0, retry: 0, ok: false, joinRefs: {} };
function rtSend(topic, event, payload) {
  if (!RT.ws || RT.ws.readyState !== 1) return false;
  const ref = String(++RT.ref);
  try { RT.ws.send(JSON.stringify({ topic: 'realtime:' + topic, event, payload, ref })); return ref; } catch (e) { return false; }
}
function rtJoin(topic) { RT.topics.add(topic); const r = rtSend(topic, 'phx_join', { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, private: false } }); if (r) RT.joinRefs[topic] = r; }
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
function rtConnect() {
  if (!ONLINE || !window.WebSocket || (RT.ws && RT.ws.readyState <= 1)) return;
  let ws;
  try { ws = new WebSocket(CFG.url.replace(/^http/, 'ws').replace(/\/+$/, '') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(CFG.key) + '&vsn=1.0.0'); }
  catch (e) { return; }
  RT.ws = ws;
  ws.onopen = () => {
    RT.retry = 0; RT.ok = true;
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
    setTimeout(() => { if (!document.hidden) rtConnect(); }, d);
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
  const run = { chat: () => loadChat(), scores: () => { loadScores(); if (!$('jdw-board').hidden) loadWorld(); }, players: () => loadPlayers(), presence: () => heartbeat(), react: () => loadReactions(), progress: () => progOnPoke() }[p.t];   // heartbeat : compteurs des tuiles + liste des joueurs
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
    const r = await fetch('site.json?t=' + Date.now(), { cache: 'no-store' });
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
    const r = await fetch('telecharger/version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
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
      const n = document.createElement('b'); n.textContent = p.name;
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
  if (!ONLINE || !room || !profile.name) return;
  const pid = profile.pid, rid = room.id;
  if (membersFor !== rid) await loadPlayers();
  if (profile.pid !== pid || !room || room.id !== rid || membersFor !== rid || !knownNotMember(profile.name)) return;
  const name = cleanName(profile.name);
  if (await askJoin(name)) { if (profile.pid === pid) await joinHere(); }
  else if (profile.pid === pid) toastCheer(name + ' joue sur cet appareil, sans être dans « ' + room.name + ' ».', name, true);
}
$('jdw-online').addEventListener('click', openMembers);
setInterval(() => { if (!$('jdw-members').hidden) { renderMembers(); refreshPresence(); } }, 15000);   // « vu il y a… » et en ligne, à jour tout seuls
$('jdw-members-close').addEventListener('click', () => closeSheet('jdw-members'));
$('jdw-members').addEventListener('click', e => { if (e.target === $('jdw-members')) closeSheet('jdw-members'); });

/* ================= Images des jeux (paquets chiffrés : assets/<jeu>.bin) ================= */
// Les images de l'Asset Store ne sont jamais publiées en clair : le paquet est déchiffré ici avec le mot de passe du site.
const ASSET_GAMES = new Set(['ilo']);
window.JDW_ASSETS = { cache: {}, pending: {} };
window.JDW_ASSETS.load = function (id) {
  if (this.cache[id]) return Promise.resolve(this.cache[id]);
  if (this.pending[id]) return this.pending[id];
  const p = (async () => {
    const r = await fetch('assets/' + id + '.bin');
    if (!r.ok) throw new Error('images ' + id + ' : ' + r.status);
    const buf = new Uint8Array(await r.arrayBuffer());
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(CODE()), 'PBKDF2', false, ['deriveKey']);
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
    if (NEW_GAMES.has(g.id)) { const nb = document.createElement('span'); nb.className = 'tile-new'; nb.textContent = 'Nouveau'; nb.hidden = !isNewGame(g.id); b.appendChild(nb); }
    b.addEventListener('click', () => openGame(g));
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
    ch.setAttribute('aria-label', 'Champion de la salle à ' + t.g.title + ' : ' + lead.name + ', ' + fmt(lead.score) + unit(t.g) + '. Voir le classement de la salle');
    ch.title = lead.name + ' · ' + fmt(lead.score) + unit(t.g);
  }
}
function refreshOnline() {
  refreshChamps();
  const live = ONLINE && serverOk;
  $('jdw-online').classList.toggle('off', !live);
  // court sur téléphone : « 1 » + icône ; « 1 en ligne » quand il y a la place
  const ot = $('jdw-online-txt'); ot.textContent = '';
  if (live) { const nb = document.createElement('b'); nb.textContent = String(total); const w = document.createElement('span'); w.className = 'ol-word'; w.textContent = ' en ligne'; ot.append(nb, w); }
  else ot.textContent = ONLINE ? 'Connexion…' : 'Mode local';
  $('jdw-online').setAttribute('aria-label', live ? (total <= 1 ? (total === 1 ? '1 joueur en ligne' : 'Personne en ligne') : total + ' joueurs en ligne') + ' : voir les joueurs' : 'Voir les joueurs de la salle');
  for (const t of tiles) {
    const n = counts[t.g.id] || 0, span = t.on.querySelector('span'), ps = live ? tilePlayers(t.g.id) : [];
    t.on.classList.toggle('live', live && n > 0);
    if (live) span.textContent = ps.length ? (ps.length === 1 && ps[0].name === cleanName(profile.name) ? 'Toi, sur un autre appareil' : tileName(ps[0].name) + (ps.length > 1 ? ' + ' + (ps.length - 1) : '') + ' joue') : n ? (n === 1 ? '1 joueur' : n + ' joueurs') : 'Personne';
    if (live && / joue$/.test(span.textContent)) { const v = document.createElement('em'); v.className = 'tile-verb'; v.textContent = ' joue'; span.textContent = span.textContent.slice(0, -5); span.appendChild(v); }   // « joue » s'efface sur téléphone à côté de 👁 + carte
    else { const b = top(t.g.id)[0]; span.textContent = b ? 'Record ' + fmt(b.score) + unit(t.g) + ' · ' + b.name : 'Pas encore de record'; }
    if (t.watch) { t.watch.hidden = !ps.length; t.watch.setAttribute('aria-label', ps.length === 1 ? 'Regarder ' + ps[0].name + ' jouer à ' + t.g.title : 'Voir qui joue à ' + t.g.title); t.el.parentNode.classList.toggle('can-watch', !!ps.length); }
  }
}
// joueurs de la salle (pas moi) qui jouent à ce jeu en ce moment et qu'on peut regarder
// (moi-même sur un autre appareil compris : pratique pour se regarder ; jamais cet appareil-ci)
function tilePlayers(gid) { try { return presList().filter(m => m.game === gid && m.cid && m.cid !== clientId && watchable(m.game)); } catch (e) { return []; } }
const tileName = n => n === cleanName(profile.name) ? 'Toi (autre appareil)' : n;
function refreshMe() {
  $('jdw-me-name').textContent = profile.name || 'Joueur';
  avatarInto($('jdw-me-av'), profile.name);
}
function refreshAll() {
  refreshOnline(); refreshMe(); refreshNewBadges();
  $('jdw-roomrow').hidden = !ONLINE;
  $('jdw-invite').hidden = !room;
  $('jdw-roomname').textContent = room ? room.name : 'Choisis une salle';
  { const L = room ? room.name.length : 0; $('jdw-roomname').style.fontSize = L > 30 ? '13px' : L > 22 ? '14.5px' : L > 14 ? '16px' : ''; }   // nom toujours en entier
  $('jdw-note').textContent = !ONLINE ? 'Mode local : le classement est gardé sur cet appareil.'
    : roomDenied ? 'Le code de ta salle manque sur cet appareil : touche « Changer » pour le retaper.'
    : netDown ? 'Pas de connexion pour le moment : tes scores partiront dès que le réseau revient.'
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
function closeSheet(id) { $(id).hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (MAP.open) { closeMap(); return; }
  if (chat.open) { closeChat(); return; }
  if (!$('jdw-cri').hidden) { closeCri(); return; }
  if (!$('jdw-duo').hidden) { duoBack(); return; }
  if (!$('jdw-seatpick').hidden) { closeSheet('jdw-seatpick'); return; }
  for (const id of ['jdw-photo', 'jdw-settings', 'jdw-board', 'jdw-rooms', 'jdw-notifs', 'jdw-profiles', 'jdw-members']) if (!$(id).hidden) { if (id === 'jdw-photo') closePhoto(); else closeSheet(id); break; }
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
function rowEl(name, right, me) {
  const li = document.createElement('li'); if (me) li.className = 'me';
  const av = document.createElement('span'); av.className = 'avatar'; avatarInto(av, name);
  const n = document.createElement('span'); n.className = 'n'; n.textContent = name;
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
  $('jdw-board-h').textContent = W ? 'Classement mondial' : 'Classement · ' + (room ? room.name : 'cet appareil');
  if (W && !worldLoaded) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = worldErr ? "Le classement mondial arrive bientôt (mise à jour du serveur en cours)." : 'Chargement du classement mondial…'; ol.appendChild(li); return; }
  if (boardTab === 'general') {
    $('jdw-board-hint').textContent = (W ? 'Toutes les salles réunies. ' : '') + 'Le nombre de jeux où chacun est premier, puis deuxième, puis troisième.';
    const rows = generalRanking();
    if (!rows.length) return emptyRow(ol);
    for (const r of rows) {
      const s = document.createElement('span'); s.className = 'medals';
      r.m.forEach((v, i) => { if (!v) return; const md = document.createElement('span'); md.className = 'medal m' + (i + 1); md.innerHTML = '<i></i>'; md.append('×' + v); s.appendChild(md); });
      ol.appendChild(rowEl(r.name, s, r.name === me));
    }
  } else {
    const g = gameById(boardTab);
    $('jdw-board-hint').textContent = g ? (W ? 'Top 10 mondial · ' : 'Top 10 de la salle · ') + g.tagline : '';
    const rows = top(boardTab, boardScope);
    if (!rows.length) return emptyRow(ol);
    for (const r of rows) { const s = document.createElement('span'); s.className = 's'; s.textContent = fmt(r.score) + unit(g); ol.appendChild(rowEl(r.name, s, r.name === me)); }
  }
}
function emptyRow(ol) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = "Personne n'a encore de score ici. La place est libre !"; ol.appendChild(li); }
$('jdw-open-board').addEventListener('click', () => { loadScores(); loadWorld(); renderBoardTab(); openSheet('jdw-board', 'jdw-board-close'); });
for (const b of document.querySelectorAll('#jdw-scope button')) b.addEventListener('click', () => {
  boardScope = b.dataset.scope; store.set('jdw.boardscope', boardScope); if (boardScope === 'world') loadWorld(); renderBoardTab();
});
$('jdw-board-close').addEventListener('click', () => closeSheet('jdw-board'));
$('jdw-board').addEventListener('click', e => { if (e.target === $('jdw-board')) closeSheet('jdw-board'); });

/* ================= Paramètres ================= */
let lookScope = 'all';                 // réglages : « Partout » (profil principal) ou « room » (seulement dans la salle actuelle)
let lookEdit = null;                   // salle visée par la photo / le cri en cours (null = profil principal)
const lookHere = () => lookScope === 'room' && room ? room.id : null;
function openSettings() {
  $('jdw-set-name').value = profile.name;
  lookScope = curLook() ? 'room' : 'all';
  $('jdw-set-sfx').checked = !muted; $('jdw-set-music').checked = MUS.on; $('jdw-set-cris').checked = criOn; syncSoundMenu();
  renderLook();
  $('jdw-set-status').textContent = ONLINE ? (netDown ? 'Pas de connexion pour le moment.' : 'Connecté au classement commun.') : 'Mode local (pas de serveur).';
  $('jdw-set-version').textContent = versionText();
  openSheet('jdw-settings', 'jdw-set-name');
}
// tête dans le rond des réglages : celle du choix affiché (profil principal ou salle), sinon l'initiale
function photoInto(el, photo, name) {
  el.textContent = ''; el.style.background = ''; el.classList.remove('has-photo');
  if (!photo) {
    const n = cleanName(name) || '?'; let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
    el.style.background = 'hsl(' + h + ' 45% 32%)'; el.textContent = n[0]; return;
  }
  const im = document.createElement('img'); im.alt = ''; im.src = photo; el.appendChild(im); el.classList.add('has-photo'); fitHeadWhenReady(im, null);
}
function renderLook() {
  const rid = lookHere(), L = rid != null ? lookOf(profile, rid) : null, inRoom = !!(room && profile.name);
  $('jdw-look').hidden = !inRoom;
  if (inRoom) {
    $('jdw-look-room').textContent = room.name;
    for (const b of document.querySelectorAll('#jdw-look-scope button')) b.setAttribute('aria-pressed', String(b.dataset.look === (rid != null ? 'room' : 'all')));
  }
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
  $('jdw-set-delphoto').textContent = rid != null ? 'Retirer la photo d’ici' : 'Retirer ma tête';
  $('jdw-set-photo').textContent = rid != null ? (hasPhoto ? 'Changer ma photo d’ici' : '📸 Une photo pour cette salle') : (profile.photo ? 'Changer ma photo' : 'Prendre une photo');
  $('jdw-set-cri').textContent = rid != null ? (hasCri ? '🎙️ Changer mon cri d’ici' : '🎙️ Un cri pour cette salle') : (hasCri ? '🎙️ Changer mon cri' : '🎙️ Enregistrer mon cri');
  $('jdw-set-cri-play').hidden = !(hasCri || (rid != null && mainCri));
  $('jdw-set-lookreset').hidden = !(rid != null && L);
}
for (const b of document.querySelectorAll('#jdw-look-scope button')) b.addEventListener('click', () => {
  lookScope = b.dataset.look === 'room' && room ? 'room' : 'all'; renderLook(); $('jdw-set-status').textContent = '';
});
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
  // même numéro pour l'appli et le site ; si l'appli est plus ancienne, on le signale
  return site + (appV === window.JDW_VERSION ? ' · appli à jour' : ' · appli ' + appV + (window.JDW_VERSION ? ' (mise à jour ' + window.JDW_VERSION + ' disponible)' : ''));
}
$('jdw-open-settings').addEventListener('click', openSettings);
$('jdw-me').addEventListener('click', openProfiles);
$('jdw-set-close').addEventListener('click', () => closeSheet('jdw-settings'));
$('jdw-set-sfx').addEventListener('change', () => { muted = !$('jdw-set-sfx').checked; store.set('jdw.muted', muted); Audio.ensure(); syncMute(); if (!muted) Audio.tone(660, 0.08, 'square', 0.05); });
$('jdw-set-music').addEventListener('change', () => { setMusicOn($('jdw-set-music').checked); syncMute(); });
$('jdw-set-cris').addEventListener('change', () => { criOn = $('jdw-set-cris').checked; syncMute(); store.set('jdw.cris', criOn); if (!criOn && criAudio) { try { criAudio.pause(); } catch (e) {} } else playCri(profile.name); });
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
$('jdw-set-save').addEventListener('click', async () => {
  const n = cleanName($('jdw-set-name').value);
  if (!n) { $('jdw-set-status').textContent = 'Il faut un nom.'; return; }
  const changed = n !== profile.name, old = cleanName(profile.name);
  if (changed && deviceNames().includes(n)) { $('jdw-set-status').textContent = 'Ce nom est déjà un profil de cet appareil : change de joueur avec ta tête en haut.'; return; }
  if (changed && old && bests[old] && !bests[n]) { bests[n] = bests[old]; delete bests[old]; store.set('jdw.bests2', bests); }
  if (changed && profile.rooms) for (const k in profile.rooms) if (profile.rooms[k]) profile.rooms[k].sent = 0;   // à renvoyer sous le nouveau nom
  // changer de nom, c'est le même joueur : s'il était dans la salle, il y reste sous son nouveau nom (choix volontaire, pas un ajout implicite)
  const keepIn = changed && ONLINE && room && membersFor === room.id && memberNames.has(old) ? room.id : null;
  profile.name = n; saveProfile(); syncOwnPlayer(); refreshAll();
  closeSheet('jdw-settings');
  if (keepIn != null) {
    try { if (await rpc('join_room', { p_code: CODE(), p_room: keepIn, p_room_code: roomCodes[keepIn] || '', p_name: n }) && room && room.id === keepIn) { memberNames.add(n); const pl = players.get(n); if (pl) pl.member = true; poke('players'); } } catch (e) {}
  }
  await pushProfile();
});
$('jdw-set-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('jdw-set-save').click(); } });

/* ================= Qui joue ? (plusieurs joueurs sur le même appareil) ================= */
function openProfiles() {
  if (!profile.name) { startWelcome(); return; }
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
$('jdw-cri-del').addEventListener('click', async () => {
  const rid = welReturn ? null : lookEdit;
  if (rid != null) { closeCri(); await lookReset(rid, 'sound'); toastCheer('Ici, tu reprends le cri de ton profil principal.', profile.name, true); return; }
  profile.sound = ''; saveProfile(); syncOwnPlayer(); closeCri(); refreshAll();
  await pushProfile(); toastCheer('Ton cri est retiré.', profile.name, true);
});

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
function startWelcome() {
  $('jdw-wel-cancel').hidden = !adding;
  $('jdw-wel-h').textContent = adding ? 'Nouveau joueur' : 'Crée ton joueur';
  $('jdw-wel-eyebrow').textContent = adding ? 'Un copain de plus sur cet appareil' : "Bienvenue à la Borne d'arcade";
  $('jdw-wel-name').value = profile.name || '';
  Object.assign(NAMECK, { n: '', state: '', photo: null, sound: null, claimed: '' });
  $('jdw-wel-check').textContent = ''; $('jdw-wel-check').className = 'wel-check'; $('jdw-wel-claim').hidden = true;
  renderWelcome();
  openSheet('jdw-welcome', 'jdw-wel-name');
}
function reopenWelcome() { welReturn = false; renderWelcome(); $('jdw-welcome').hidden = false; }
function nameMsg(t, cls) { const el = $('jdw-wel-check'); el.textContent = t; el.className = 'wel-check' + (cls ? ' ' + cls : ''); }
function showClaim() {
  const f = $('jdw-wel-claim-face'); f.textContent = '';
  if (NAMECK.photo) { const im = document.createElement('img'); im.alt = ''; im.src = NAMECK.photo; f.appendChild(im); }
  else { f.textContent = NAMECK.n[0] || '?'; f.style.background = 'hsl(' + nameHue(NAMECK.n) + ' 45% 32%)'; }
  $('jdw-wel-claim-t').textContent = NAMECK.n + ' existe déjà';
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
  if (r && r.r_exists) { NAMECK.state = 'taken'; NAMECK.photo = r.r_photo || null; NAMECK.sound = r.r_sound || null; nameMsg('Pseudo déjà utilisé.', 'warn'); showClaim(); }
  else { NAMECK.state = 'free'; nameMsg('✓ Pseudo libre', 'ok'); }
}
$('jdw-wel-name').addEventListener('input', () => { clearTimeout(NAMECK.timer); NAMECK.timer = setTimeout(checkName, 380); });
$('jdw-wel-claim-yes').addEventListener('click', () => {
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
async function welcomeOk() {
  clearTimeout(NAMECK.timer);
  const n = cleanName($('jdw-wel-name').value);
  if (!n || n.length < 2) { nameMsg(n ? '2 lettres minimum.' : 'Il faut un pseudo.', 'warn'); $('jdw-wel-name').focus(); return; }
  if (NAMECK.n !== n) await checkName();
  if (NAMECK.state === 'taken' && NAMECK.claimed !== n) { showClaim(); return; }
  Audio.ensure();
  const existing = profiles.find(p => cleanName(p.name) === n && p.pid !== profile.pid);
  if (existing) { adding = null; closeSheet('jdw-welcome'); switchProfile(existing.pid); return; }
  const wasAdding = !!adding; adding = null;
  profile.name = n; profile.askedFor = n; saveProfile(); syncOwnPlayer();
  if (NAMECK.claimed === n && NAMECK.sound && !profile.sound) setPlayer(n, profile.consent ? profile.photo : null, NAMECK.sound);
  closeSheet('jdw-welcome'); refreshAll();
  if (wasAdding) afterSwitch(); else pushProfile();
  toastCheer((NAMECK.claimed === n ? 'Re-bonjour ' : 'Bienvenue ') + n + ' !', n, true);
  setTimeout(() => playCri(n), 400);
  afterOnboarding();
}
$('jdw-wel-cancel').addEventListener('click', () => {
  if (!adding) return;
  profile = adding; adding = null; store.set('jdw.profile', profile);
  closeSheet('jdw-welcome'); refreshAll();
});
function afterOnboarding() { if (ONLINE && !room && profile.name) setTimeout(openRooms, 250); }
$('jdw-wel-ok').addEventListener('click', welcomeOk);
$('jdw-wel-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); welcomeOk(); } });
$('jdw-wel-photo').addEventListener('click', () => { welReturn = true; startPhoto(); });
$('jdw-wel-cri').addEventListener('click', () => { welReturn = true; $('jdw-welcome').hidden = true; openCri(); });

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
  Object.assign(ACC, { glasses: '', hat: '', face: '', back: '', tab: 'glasses' }, LK.photoAcc || {});
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
/* ================= Accessoires sur la tête (lunettes posées sur les yeux, chapeaux, visage, effets derrière) ================= */
const ACC = { glasses: '', hat: '', face: '', back: '', tab: 'glasses' };
const ACC_LIST = {
  glasses: [['', 'Aucune', '🚫'], ['soleil', 'Soleil', '🕶️'], ['pixel', 'Pixel', '😎'], ['rondes', 'Rondes', '👓'], ['coeur', 'Cœurs', '💖'],
            ['etoiles', 'Étoiles', '⭐'], ['ski', 'Masque de ski', '🥽'], ['3d', 'Cinéma 3D', '🎬'], ['monocle', 'Monocle', '🧐']],
  hat: [['', 'Aucun', '🚫'], ['couronne', 'Couronne', '👑'], ['casquette', 'Casquette', '🧢'], ['fete', 'Fête', '🥳'], ['cowboy', 'Cow-boy', '🤠'],
        ['haut', 'Haut-de-forme', '🎩'], ['viking', 'Viking', '⚔️'], ['chef', 'Chef', '👨‍🍳'], ['bonnet', 'Bonnet', '🧶'], ['lapin', 'Lapin', '🐰'],
        ['diable', 'Cornes', '😈'], ['casque', 'Casque audio', '🎧']],
  face: [['', 'Rien', '🚫'], ['moustache', 'Moustache', '🥸'], ['clown', 'Nez de clown', '🔴'], ['joues', 'Joues roses', '😊'],
         ['bouche', 'Grand sourire', '😁'], ['pansement', 'Pansement', '🩹']],
  back: [['', 'Rien', '🚫'], ['aureole', 'Auréole', '😇'], ['flammes', 'Flammes', '🔥'], ['eclairs', 'Éclairs', '⚡'], ['coeurs', 'Cœurs', '💕'],
         ['etoiles', 'Paillettes', '✨'], ['neon', 'Néon', '💡']]
};
const ACC_TABS = [['glasses', '👓 Lunettes'], ['hat', '🎩 Chapeaux'], ['face', '🥸 Visage'], ['back', '✨ Derrière']];
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
function scaleGeo(g, s, dx, dy) {
  const P = p => ({ x: dx + p.x * s, y: dy + p.y * s });
  return Object.assign({}, g, { top: dy + g.top * s, bottom: dy + g.bottom * s, cx: dx + g.cx * s, w: g.w * s, ed: g.ed * s, eyes: g.eyes.map(P), nose: P(g.nose), mouth: P(g.mouth) });
}
function rr(x, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }
function starPath(x, cx, cy, r1, r2, n) { x.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); }
function heartPath(x, cx, cy, s) { x.beginPath(); x.moveTo(cx, cy + s * 0.35); x.bezierCurveTo(cx - s, cy - s * 0.25, cx - s * 0.45, cy - s * 0.95, cx, cy - s * 0.42); x.bezierCurveTo(cx + s * 0.45, cy - s * 0.95, cx + s, cy - s * 0.25, cx, cy + s * 0.35); x.closePath(); }
function drawGlasses(x, g, kind) {
  const [a, b] = g.eyes, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = g.ed;
  x.save(); x.translate(mx, my); x.rotate(g.ang);
  const L = -d / 2, R = d / 2, lw = d * 0.78, lh = d * 0.52;
  const lens = (cx, fill, stroke, lwid) => { rr(x, cx - lw / 2, -lh / 2, lw, lh, lh * 0.45); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.lineWidth = lwid; x.strokeStyle = stroke; x.stroke(); } };
  if (kind === 'soleil') {
    const gr = x.createLinearGradient(0, -lh / 2, 0, lh / 2); gr.addColorStop(0, '#2b3442'); gr.addColorStop(1, '#05070b');
    lens(L, gr, '#111', d * 0.07); lens(R, gr, '#111', d * 0.07);
    x.strokeStyle = '#111'; x.lineWidth = d * 0.08; x.beginPath(); x.moveTo(L + lw / 2, -lh * 0.15); x.quadraticCurveTo(0, -lh * 0.45, R - lw / 2, -lh * 0.15); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.35)'; for (const c of [L, R]) { x.beginPath(); x.ellipse(c - lw * 0.18, -lh * 0.12, lw * 0.16, lh * 0.1, -0.5, 0, 7); x.fill(); }
    x.strokeStyle = '#111'; x.lineWidth = d * 0.07; x.beginPath(); x.moveTo(L - lw / 2, -lh * 0.2); x.lineTo(L - lw / 2 - d * 0.35, -lh * 0.05); x.moveTo(R + lw / 2, -lh * 0.2); x.lineTo(R + lw / 2 + d * 0.35, -lh * 0.05); x.stroke();
  } else if (kind === 'pixel') {
    const px = d * 0.11; x.fillStyle = '#000';
    const rows = ['11111111111111111', '01111110011111100', '01100110011001100', '00111100001111000'];
    const ox = -8.5 * px, oy = -1.6 * px;
    rows.forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') x.fillRect(ox + i * px, oy + j * px, px + 0.5, px + 0.5); }));
    x.fillStyle = '#fff'; x.fillRect(ox + 2 * px, oy + px, px, px); x.fillRect(ox + 10 * px, oy + px, px, px);
  } else if (kind === 'rondes') {
    for (const c of [L, R]) { x.beginPath(); x.arc(c, 0, lh * 0.62, 0, 7); x.fillStyle = 'rgba(180,220,255,.18)'; x.fill(); x.lineWidth = d * 0.05; x.strokeStyle = '#c9a227'; x.stroke(); }
    x.beginPath(); x.moveTo(L + lh * 0.62, -lh * 0.1); x.quadraticCurveTo(0, -lh * 0.35, R - lh * 0.62, -lh * 0.1); x.stroke();
  } else if (kind === 'coeur') {
    for (const c of [L, R]) { heartPath(x, c, lh * 0.08, lw * 0.62); x.fillStyle = 'rgba(255,70,150,.82)'; x.fill(); x.lineWidth = d * 0.05; x.strokeStyle = '#d6246e'; x.stroke(); }
    x.strokeStyle = '#d6246e'; x.lineWidth = d * 0.06; x.beginPath(); x.moveTo(L + lw * 0.3, -lh * 0.1); x.lineTo(R - lw * 0.3, -lh * 0.1); x.stroke();
  } else if (kind === 'etoiles') {
    for (const c of [L, R]) { starPath(x, c, 0, lw * 0.62, lw * 0.3, 5); x.fillStyle = 'rgba(255,214,77,.85)'; x.fill(); x.lineWidth = d * 0.045; x.strokeStyle = '#ff8a00'; x.stroke(); }
    x.strokeStyle = '#ff8a00'; x.lineWidth = d * 0.05; x.beginPath(); x.moveTo(L + lw * 0.35, -lh * 0.05); x.lineTo(R - lw * 0.35, -lh * 0.05); x.stroke();
  } else if (kind === 'ski') {
    const bw = g.w * 1.08 / 1, gw = d * 2.05, gh = d * 0.82;
    x.fillStyle = '#ff5fae'; x.fillRect(-bw / 2, -gh * 0.22, bw, gh * 0.44);
    rr(x, -gw / 2, -gh / 2, gw, gh, gh * 0.45); x.fillStyle = '#1b1b1f'; x.fill();
    const gr = x.createLinearGradient(-gw / 2, -gh / 2, gw / 2, gh / 2); gr.addColorStop(0, '#ffd34d'); gr.addColorStop(0.5, '#ff6a3d'); gr.addColorStop(1, '#7a3cff');
    rr(x, -gw / 2 + d * 0.08, -gh / 2 + d * 0.08, gw - d * 0.16, gh - d * 0.16, gh * 0.38); x.fillStyle = gr; x.fill();
    x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.ellipse(-gw * 0.22, -gh * 0.14, gw * 0.16, gh * 0.08, -0.3, 0, 7); x.fill();
  } else if (kind === '3d') {
    x.fillStyle = '#fafafa'; rr(x, L - lw / 2 - d * 0.06, -lh / 2 - d * 0.06, d + lw + d * 0.12, lh + d * 0.12, d * 0.08); x.fill();
    x.fillStyle = 'rgba(255,40,60,.85)'; rr(x, L - lw / 2, -lh / 2, lw, lh, d * 0.05); x.fill();
    x.fillStyle = 'rgba(40,160,255,.85)'; rr(x, R - lw / 2, -lh / 2, lw, lh, d * 0.05); x.fill();
  } else if (kind === 'monocle') {
    x.beginPath(); x.arc(L, 0, lh * 0.7, 0, 7); x.fillStyle = 'rgba(200,230,255,.2)'; x.fill(); x.lineWidth = d * 0.07; x.strokeStyle = '#d4af37'; x.stroke();
    x.lineWidth = d * 0.025; x.beginPath(); x.moveTo(L, lh * 0.7); x.quadraticCurveTo(L - d * 0.1, d * 1.2, L - d * 0.5, d * 1.6); x.stroke();
  }
  x.restore();
}
function drawFace(x, g, kind) {
  const d = g.ed, n = g.nose, m = g.mouth;
  x.save();
  if (kind === 'moustache') {
    x.translate((n.x + m.x) / 2, n.y + (m.y - n.y) * 0.5); x.rotate(g.ang); x.fillStyle = '#3b2412';
    x.beginPath(); x.moveTo(0, -d * 0.05);
    x.bezierCurveTo(-d * 0.25, -d * 0.28, -d * 0.62, -d * 0.12, -d * 0.7, -d * 0.32); x.bezierCurveTo(-d * 0.72, d * 0.05, -d * 0.3, d * 0.16, 0, d * 0.04);
    x.bezierCurveTo(d * 0.3, d * 0.16, d * 0.72, d * 0.05, d * 0.7, -d * 0.32); x.bezierCurveTo(d * 0.62, -d * 0.12, d * 0.25, -d * 0.28, 0, -d * 0.05); x.fill();
  } else if (kind === 'clown') {
    const gr = x.createRadialGradient(n.x - d * 0.06, n.y - d * 0.08, d * 0.02, n.x, n.y, d * 0.28); gr.addColorStop(0, '#ff8a8a'); gr.addColorStop(1, '#d4000f');
    x.fillStyle = gr; x.beginPath(); x.arc(n.x, n.y, d * 0.26, 0, 7); x.fill();
  } else if (kind === 'joues') {
    for (const e of g.eyes) { const gr = x.createRadialGradient(e.x, e.y + d * 0.55, 0, e.x, e.y + d * 0.55, d * 0.32); gr.addColorStop(0, 'rgba(255,90,120,.55)'); gr.addColorStop(1, 'rgba(255,90,120,0)'); x.fillStyle = gr; x.beginPath(); x.arc(e.x, e.y + d * 0.55, d * 0.32, 0, 7); x.fill(); }
  } else if (kind === 'bouche') {
    x.translate(m.x, m.y); x.rotate(g.ang); x.fillStyle = '#5a0d1a'; x.beginPath(); x.moveTo(-d * 0.42, -d * 0.05); x.quadraticCurveTo(0, d * 0.55, d * 0.42, -d * 0.05); x.closePath(); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(-d * 0.36, -d * 0.02); x.quadraticCurveTo(0, d * 0.16, d * 0.36, -d * 0.02); x.closePath(); x.fill();
  } else if (kind === 'pansement') {
    const e = g.eyes[1]; x.translate(e.x + d * 0.12, e.y + d * 0.5); x.rotate(-0.6); x.fillStyle = '#f2c6a0'; rr(x, -d * 0.3, -d * 0.09, d * 0.6, d * 0.18, d * 0.08); x.fill();
    x.fillStyle = '#e0a87e'; x.fillRect(-d * 0.08, -d * 0.09, d * 0.16, d * 0.18);
  }
  x.restore();
}
function drawHat(x, g, kind, W) {
  const top = g.top, cx = g.cx, w = g.w * 1.05, a = g.ang;
  x.save(); x.translate(cx, top + w * 0.1); x.rotate(a);
  if (kind === 'couronne') {
    const cw = w * 0.78, ch = w * 0.42; const gr = x.createLinearGradient(0, -ch, 0, 0); gr.addColorStop(0, '#ffe680'); gr.addColorStop(1, '#d49b00');
    x.fillStyle = gr; x.beginPath(); x.moveTo(-cw / 2, 0); x.lineTo(-cw / 2, -ch * 0.55); x.lineTo(-cw / 4, -ch * 0.2); x.lineTo(0, -ch); x.lineTo(cw / 4, -ch * 0.2); x.lineTo(cw / 2, -ch * 0.55); x.lineTo(cw / 2, 0); x.closePath(); x.fill();
    x.lineWidth = w * 0.02; x.strokeStyle = '#9c6b00'; x.stroke();
    for (const [gx, col] of [[-cw / 4, '#ff3b5c'], [0, '#3bc2ff'], [cw / 4, '#4cc36a']]) { x.fillStyle = col; x.beginPath(); x.arc(gx, -ch * 0.18, w * 0.045, 0, 7); x.fill(); }
  } else if (kind === 'casquette') {
    x.fillStyle = '#ff4d5e'; x.beginPath(); x.ellipse(0, w * 0.02, w * 0.5, w * 0.36, 0, Math.PI, 0); x.fill();
    x.fillStyle = '#c4202f'; x.beginPath(); x.ellipse(w * 0.32, w * 0.03, w * 0.42, w * 0.09, 0.05, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(0, -w * 0.33, w * 0.04, 0, 7); x.fill();
  } else if (kind === 'fete') {
    const hw = w * 0.42, hh = w * 0.82; x.save(); x.rotate(-0.12);
    x.beginPath(); x.moveTo(-hw / 2, 0); x.lineTo(0, -hh); x.lineTo(hw / 2, 0); x.closePath(); x.save(); x.clip();
    for (let i = -6; i < 8; i++) { x.fillStyle = i % 2 ? '#5ef0ff' : '#ff5fae'; x.beginPath(); x.moveTo(-hw, -i * hh * 0.14); x.lineTo(hw, -i * hh * 0.14 - hh * 0.25); x.lineTo(hw, -i * hh * 0.14 - hh * 0.32); x.lineTo(-hw, -i * hh * 0.14 - hh * 0.07); x.fill(); }
    x.restore(); x.fillStyle = '#ffd34d'; x.beginPath(); x.arc(0, -hh, w * 0.07, 0, 7); x.fill(); x.restore();
  } else if (kind === 'cowboy') {
    x.fillStyle = '#8b5a2b'; x.beginPath(); x.ellipse(0, 0, w * 0.75, w * 0.14, 0, 0, 7); x.fill();
    x.fillStyle = '#a0682f'; x.beginPath(); x.moveTo(-w * 0.34, 0); x.quadraticCurveTo(-w * 0.36, -w * 0.5, -w * 0.12, -w * 0.46); x.quadraticCurveTo(0, -w * 0.36, w * 0.12, -w * 0.46); x.quadraticCurveTo(w * 0.36, -w * 0.5, w * 0.34, 0); x.closePath(); x.fill();
    x.fillStyle = '#3b2412'; x.fillRect(-w * 0.34, -w * 0.12, w * 0.68, w * 0.07);
  } else if (kind === 'haut') {
    x.fillStyle = '#121212'; x.beginPath(); x.ellipse(0, 0, w * 0.6, w * 0.11, 0, 0, 7); x.fill();
    x.fillRect(-w * 0.32, -w * 0.72, w * 0.64, w * 0.72); x.beginPath(); x.ellipse(0, -w * 0.72, w * 0.32, w * 0.07, 0, 0, 7); x.fill();
    x.fillStyle = '#c4202f'; x.fillRect(-w * 0.32, -w * 0.2, w * 0.64, w * 0.1);
  } else if (kind === 'viking') {
    x.fillStyle = '#9aa7b4'; x.beginPath(); x.ellipse(0, 0, w * 0.5, w * 0.42, 0, Math.PI, 0); x.fill();
    x.fillStyle = '#6e7b88'; x.fillRect(-w * 0.5, -w * 0.06, w, w * 0.08);
    x.fillStyle = '#f3ead8'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * w * 0.44, -w * 0.12); x.quadraticCurveTo(s * w * 0.8, -w * 0.2, s * w * 0.72, -w * 0.62); x.quadraticCurveTo(s * w * 0.62, -w * 0.3, s * w * 0.38, -w * 0.26); x.closePath(); x.fill(); }
  } else if (kind === 'chef') {
    x.fillStyle = '#fafafa'; x.fillRect(-w * 0.34, -w * 0.18, w * 0.68, w * 0.2);
    for (const [px, py, r] of [[-w * 0.24, -w * 0.38, w * 0.22], [0, -w * 0.5, w * 0.26], [w * 0.24, -w * 0.38, w * 0.22]]) { x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
    x.strokeStyle = '#d6d6d6'; x.lineWidth = w * 0.015; x.strokeRect(-w * 0.34, -w * 0.18, w * 0.68, w * 0.2);
  } else if (kind === 'bonnet') {
    x.fillStyle = '#2f8bff'; x.beginPath(); x.ellipse(0, 0, w * 0.5, w * 0.46, 0, Math.PI, 0); x.fill();
    x.fillStyle = '#ffd34d'; x.fillRect(-w * 0.52, -w * 0.08, w * 1.04, w * 0.14);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(0, -w * 0.47, w * 0.1, 0, 7); x.fill();
  } else if (kind === 'lapin') {
    for (const s of [-1, 1]) { x.save(); x.translate(s * w * 0.18, -w * 0.05); x.rotate(s * 0.18); x.fillStyle = '#f5f5f5'; x.beginPath(); x.ellipse(0, -w * 0.38, w * 0.11, w * 0.4, 0, 0, 7); x.fill(); x.fillStyle = '#ffb3c8'; x.beginPath(); x.ellipse(0, -w * 0.38, w * 0.055, w * 0.3, 0, 0, 7); x.fill(); x.restore(); }
  } else if (kind === 'diable') {
    x.fillStyle = '#d4141f'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * w * 0.12, w * 0.02); x.quadraticCurveTo(s * w * 0.3, -w * 0.2, s * w * 0.3, -w * 0.38); x.quadraticCurveTo(s * w * 0.18, -w * 0.12, s * w * 0.3, w * 0.04); x.closePath(); x.fill(); }
  } else if (kind === 'casque') {
    x.strokeStyle = '#222'; x.lineWidth = w * 0.07; x.beginPath(); x.arc(0, w * 0.32, w * 0.5, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
    for (const s of [-1, 1]) { x.fillStyle = '#ff4d5e'; rr(x, s * w * 0.5 - w * 0.1, w * 0.3, w * 0.2, w * 0.3, w * 0.07); x.fill(); }
  }
  x.restore();
}
function drawBack(x, g, kind, base, s, dx, dy, W, H) {
  const cx = g.cx, cy = (g.top + g.bottom) / 2, R = g.w * (kind === 'flammes' ? 0.95 : 0.62);
  x.save();
  if (kind === 'aureole') {
    x.lineWidth = g.w * 0.06; x.strokeStyle = '#ffd34d'; x.shadowColor = '#ffe680'; x.shadowBlur = g.w * 0.12;
    x.beginPath(); x.ellipse(cx, g.top - g.w * 0.02, g.w * 0.36, g.w * 0.09, g.ang, 0, 7); x.stroke();
  } else if (kind === 'flammes') {
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.33, h = R * (1.05 + (i % 2) * 0.25), bx = cx + Math.cos(a) * R * 0.55, by = cy + Math.sin(a) * R * 0.55;
      const gr = x.createLinearGradient(bx, by, cx + Math.cos(a) * h, cy + Math.sin(a) * h); gr.addColorStop(0, 'rgba(255,90,0,.95)'); gr.addColorStop(1, 'rgba(255,214,77,0)');
      x.fillStyle = gr; x.beginPath(); x.moveTo(bx - Math.sin(a) * R * 0.18, by + Math.cos(a) * R * 0.18); x.quadraticCurveTo(cx + Math.cos(a) * h * 0.8 + Math.sin(a) * R * 0.1, cy + Math.sin(a) * h * 0.8, cx + Math.cos(a) * h, cy + Math.sin(a) * h);
      x.quadraticCurveTo(cx + Math.cos(a) * h * 0.8 - Math.sin(a) * R * 0.1, cy + Math.sin(a) * h * 0.8, bx + Math.sin(a) * R * 0.18, by - Math.cos(a) * R * 0.18); x.fill();
    }
  } else if (kind === 'eclairs') {
    x.fillStyle = '#ffe14d'; x.strokeStyle = '#ff9d00'; x.lineWidth = 3;
    for (const [ox, oy, sc, rot] of [[-0.62, -0.25, 1, -0.3], [0.62, -0.18, 0.9, 0.35], [-0.5, 0.35, 0.7, -0.6], [0.55, 0.4, 0.75, 0.5]]) {
      x.save(); x.translate(cx + ox * g.w, cy + oy * g.w); x.rotate(rot); x.scale(sc * g.w / 160, sc * g.w / 160);
      x.beginPath(); x.moveTo(-6, -34); x.lineTo(14, -34); x.lineTo(2, -6); x.lineTo(16, -6); x.lineTo(-12, 36); x.lineTo(-2, 4); x.lineTo(-16, 4); x.closePath(); x.fill(); x.stroke(); x.restore();
    }
  } else if (kind === 'coeurs' || kind === 'etoiles') {
    const pts = [[-0.62, -0.32, 0.2], [0.6, -0.4, 0.16], [-0.66, 0.2, 0.14], [0.64, 0.12, 0.2], [-0.3, -0.62, 0.12], [0.34, -0.6, 0.14], [0, -0.72, 0.1]];
    for (const [ox, oy, sz] of pts) {
      const px = cx + ox * g.w, py = cy + oy * g.w, r = sz * g.w;
      if (kind === 'coeurs') { heartPath(x, px, py, r); x.fillStyle = '#ff4f8b'; x.fill(); }
      else { starPath(x, px, py, r, r * 0.4, 4); x.fillStyle = '#fff6b0'; x.shadowColor = '#ffd34d'; x.shadowBlur = r; x.fill(); }
    }
  } else if (kind === 'neon') {
    x.shadowColor = '#5ef0ff'; x.shadowBlur = g.w * 0.12;
    for (let i = 0; i < 3; i++) x.drawImage(base, dx, dy, W * s, H * s);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = '#5ef0ff'; x.fillRect(0, 0, W, H);
  }
  x.restore();
}
function composeOut() {
  const base = PH.base; if (!base) return;
  const W = base.width, H = base.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  // un chapeau a besoin de place : la tête descend et rapetisse un peu
  const HAT_S = { haut: 0.66, fete: 0.68, chef: 0.7, lapin: 0.7, viking: 0.72, cowboy: 0.76, couronne: 0.76, bonnet: 0.8, casquette: 0.84 };
  const s = (ACC.hat && HAT_S[ACC.hat]) || 1, dx = (W - W * s) / 2, dy = H - H * s;
  const g = scaleGeo(PH.geo || headGeo(base, null), s, dx, dy);
  if (ACC.back) { const b = document.createElement('canvas'); b.width = W; b.height = H; drawBack(b.getContext('2d'), g, ACC.back, base, s, dx, dy, W, H); x.drawImage(b, 0, 0); }
  x.drawImage(base, dx, dy, W * s, H * s);
  if (ACC.face) drawFace(x, g, ACC.face);
  if (ACC.glasses) drawGlasses(x, g, ACC.glasses);
  if (ACC.hat) drawHat(x, g, ACC.hat, W);
  const fin = $('jdw-ph-out'), fc = fin.getContext('2d');
  fc.clearRect(0, 0, OUT_W, OUT_H); fc.imageSmoothingQuality = 'high'; fc.drawImage(c, 0, 0, OUT_W, OUT_H);
}
function renderAcc() {
  const tabs = $('jdw-acc-tabs'); tabs.textContent = '';
  for (const [id, label] of ACC_TABS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'acc-tab'; b.textContent = label;
    b.setAttribute('aria-pressed', String(ACC.tab === id)); if (ACC[id]) b.classList.add('set');
    b.addEventListener('click', () => { ACC.tab = id; renderAcc(); }); tabs.appendChild(b);
  }
  const grid = $('jdw-acc-grid'); grid.textContent = '';
  for (const [id, label, ic] of ACC_LIST[ACC.tab]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'acc-item'; b.setAttribute('aria-pressed', String(ACC[ACC.tab] === id));
    const i = document.createElement('span'); i.className = 'acc-ic'; i.textContent = ic; const t = document.createElement('span'); t.textContent = label;
    b.append(i, t); b.addEventListener('click', () => { ACC[ACC.tab] = id; renderAcc(); composeOut(); });
    grid.appendChild(b);
  }
  $('jdw-acc-hint').textContent = ACC.tab === 'glasses' ? (PH.geo && PH.geo.detected ? 'Les lunettes se posent toutes seules sur tes yeux.' : 'Les lunettes se placent sur tes yeux (au mieux si ton visage est bien de face).') : '';
}
function resetAcc() { ACC.glasses = ACC.hat = ACC.face = ACC.back = ''; ACC.tab = 'glasses'; renderAcc(); }

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
    L.photoAcc = { glasses: ACC.glasses, hat: ACC.hat, face: ACC.face, back: ACC.back };
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
  profile.photoAcc = { glasses: ACC.glasses, hat: ACC.hat, face: ACC.face, back: ACC.back };
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
  $('jdw-cheer-name').textContent = p ? p.name : (cleanName(name) || ''); $('jdw-cheer-txt').textContent = String(text || '').slice(0, 60);
  el.hidden = true; void el.offsetWidth; el.hidden = false;
  clearTimeout(cheerTimer); cheerTimer = setTimeout(() => { el.hidden = true; }, 2700);
}

/* ================= Salles ================= */
let roomsCache = [], pendingRoom = null;
function roomsStatus(t) { $('jdw-rooms-status').textContent = t || ''; }
async function listRooms() {
  try {
    try { roomsCache = await rpc('list_rooms', { p_code: CODE(), p_name: profile.name || '' }) || []; }
    catch (e) { if (e.status === 404) roomsCache = await rpc('list_rooms', { p_code: CODE() }) || []; else throw e; }   // ancien serveur
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
function renderRooms() {
  const wrap = $('jdw-roomlist'); wrap.textContent = '';
  if (!roomsCache.length) { const p = document.createElement('p'); p.className = 'small'; p.textContent = "Aucune salle pour l'instant. Crée la première juste en dessous !"; wrap.appendChild(p); return; }
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
  if (!profile.name) { startWelcome(); return; }
  roomsStatus('Chargement des salles…'); $('jdw-joinbox').hidden = true; pendingRoom = null;
  openSheet('jdw-rooms'); return listRooms();
}
async function chooseRoom(r) {
  if (room && room.id === r.r_id) {
    closeSheet('jdw-rooms');
    if (knownNotMember(profile.name) && await askJoin(profile.name)) await joinHere();   // sa salle, mais pas (plus) membre : on la rejoint
    return;
  }
  if (r.r_private && !roomCodes[r.r_id]) { askCode(r); return; }
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
const seatName = i => (NET.seats ? NET.seats[i] : seats[i]) || GUEST;
const sameSeats = () => seatName(0) === seatName(1);
function seatPlayer(i) {
  if (seatName(i) === AI_NAME) ensureAiPlayer();
  const name = seatName(i), rec = name === GUEST ? null : players.get(name);
  if (name === AI_NAME) { const ok = !!(rec && rec.img && rec.img.complete && rec.img.naturalWidth); return { name: AI_NAME, img: ok ? rec.img : null, sad: ok ? (sadOf(rec) || rec.img) : null, color: DUO_COLORS[i], ai: true }; }
  const ok = !!(rec && rec.img && rec.img.complete && rec.img.naturalWidth);
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
    b.querySelector('.seat-name').textContent = pl.name;
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
  for (const p of profiles) add(p.name, 'sur ce téléphone');
  for (const p of [...players.values()].filter(p => p.member).sort((a, b) => a.name.localeCompare(b.name))) add(p.name, room ? 'de la salle' : '');
  rows.push([GUEST, 'un copain sans compte']);
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
let DUEL_WHERE = 'local';
function setDuelWhere(w) {
  DUEL_WHERE = w;
  for (const b of document.querySelectorAll('#jdw-duel-switch button')) b.setAttribute('aria-selected', String(b.dataset.where === w));
  $('jdw-duel-local').hidden = w !== 'local'; $('jdw-duel-online').hidden = w !== 'online';
  if (duoTiles.length) refreshDuoTiles();
}
for (const b of document.querySelectorAll('#jdw-duel-switch button')) b.addEventListener('click', () => setDuelWhere(b.dataset.where));
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
      if (DUEL_WHERE === 'online') { if (netBlocks(d)) { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); return; } netCreate(d); return; }
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
// en ligne : seuls les jeux qui ont leur vrai jeu en ligne (net: true, chacun fait tourner la partie) ; pas de vidéo
const netBlocks = d => DUEL_WHERE === 'online' && !d.net;
function refreshDuoTiles() {
  for (const t of duoTiles) {
    const w = pairWins(t.g.id), noNet = netBlocks(t.g), off = noNet || aiBlocks(t.g);
    t.tag.textContent = noNet ? 'Bientôt en ligne' : off ? 'Bientôt contre l\'IA' : w[0] + w[1] && !sameSeats() ? seatName(0) + ' ' + w[0] + ' – ' + w[1] + ' ' + seatName(1) : (t.g.tagline || '');
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
    heads: () => headsList(),
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
  const h = document.createElement('h2'); h.textContent = land ? '🏆 ' + seatPlayer(w).name + ' gagne !' : win ? 'Gagné !' : 'Perdu…';
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
    const n = document.createElement('b'); n.textContent = seatPlayer(i).name; b.append(chatHead(seatPlayer(i).name, { passive: true }), n); return b; };
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
const COMPET_START = { ilo: 4, pleingaz: 4, empilo: 5, glouton: 4, mouches: 7, carreaux: 7, rouleaux: 9 };
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
  $('jdw-podium-h').textContent = solo ? 'Tout seul…' : '🏆 ' + rank[0].name + ' gagne !';
  const st = $('jdw-podium-steps'); st.textContent = '';
  const order = [1, 0, 2];
  for (const i of order) {
    const r = rank[i]; if (!r) continue;
    const col = document.createElement('div'); col.className = 'pod pod' + (i + 1) + (r.name === me ? ' me' : '');
    const hd = chatHead(r.name, { passive: true, sad: i > 0 });
    if (i === 0) { const cr = document.createElement('span'); cr.className = 'champ-crown'; cr.textContent = '👑'; hd.appendChild(cr); }
    const nm = document.createElement('b'); nm.textContent = r.name;
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
  const lab = document.createElement('span'); lab.className = 'pk-to'; lab.textContent = '→ ' + name; pk.appendChild(lab);
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
    const nm = document.createElement('b'); nm.textContent = from; box.append(hd, em, nm);
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
  const v = cmpSync(), noRoom = !ONLINE || !room;
  $('jdw-cmp-none').hidden = !noRoom;
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
    const nb = document.createElement('b'); nb.textContent = m.name; const stt = cmpRowStatus(m); const sm = document.createElement('small'); sm.className = 'st-' + stt.c; sm.textContent = stt.t;
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
$('jdw-cmp-room').addEventListener('click', () => openRooms());
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
    txt = '🏆 ' + (pos ? (pos === 1 ? '1er' : pos + 'e') + ' sur ' + rank.length : 'Compétition') + (lead && lead.name !== me ? ' · ' + lead.name + ' ' + fmt(lead.s) : '') + ' · toi ' + fmt(cur);
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
  const cid = presCid(name, game); if (!cid || !window.RTCPeerConnection) { toastCheer('Impossible de regarder ' + name + ' pour le moment.', name, true); return; }
  watchStop(true);
  Audio.ensure();
  const sid = 'w' + Date.now().toString(36) + shellRand().toString(36).slice(2, 6), g = gameById(game);
  Object.assign(WATCH, { sid, cid, name, game, live: false, pend: [] });
  const hd = $('jdw-watch-head'); hd.textContent = ''; hd.appendChild(chatHead(name, { passive: true }));
  $('jdw-watch-name').textContent = name; $('jdw-watch-game').textContent = g ? g.title : '';
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
  const nm = document.createElement('b'); nm.textContent = from; box.append(hd, em, nm);
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
  if (msg) toastCheer(msg, profile.name, true);
  else if (wasGuest && notify) {}
}
// ---------- l'hôte : lancer le défi, inviter ----------
function netCreate(d) {
  loadTurn();
  if (!profile.name) { startWelcome(); return; }
  if (!ONLINE || !window.RTCPeerConnection) { toastCheer('Le duel en ligne demande une connexion internet.', profile.name, true); return; }
  if (!room) { openRooms(); return; }
  netReset(); Audio.ensure();
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
    const t = document.createElement('span'); t.className = 'pr-t'; const bb = document.createElement('b'); bb.textContent = x.name; const sm = document.createElement('small');
    sm.textContent = x.game && x.game !== 'menu' ? gameLabel(x.game) : 'dans le menu'; t.append(bb, sm);
    const go = document.createElement('span'); go.className = 'cg-go'; go.textContent = 'Défier';
    b.append(chatHead(x.name, { passive: true }), t, go);
    b.addEventListener('click', () => {
      rtBroadcast({ t: 'netinv', code: NET.code, g: NET.d.id, n: me, to: x.name });
      go.textContent = 'Invité ✓'; b.disabled = true;
      $('jdw-net-sub').textContent = 'Invitation envoyée à ' + x.name + ' : en attente de sa réponse…';
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
  const side = i => { const b = document.createElement('span'); b.className = 'dp-side'; b.style.setProperty('--pc', DUO_COLORS[i]); const n = document.createElement('b'); n.textContent = seatPlayer(i).name; b.append(chatHead(seatPlayer(i).name, { passive: true }), n); return b; };
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
    heads: () => headsList(),
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
  if (!profile.name) { startWelcome(); return; }
  if (ONLINE && !room) { openRooms(); return; }
  markGameSeen(g.id);
  Audio.ensure();
  $('jdw-lib').hidden = true; $('jdw-play').hidden = false;
  $('jdw-play').style.setProperty('--acc', g.accent);
  $('jdw-gtitle').textContent = g.title;
  $('jdw-end').hidden = true;
  if (LANDSCAPE.has(g.id) && portraitMQ.matches) {
    waitRotate = g; $('jdw-rotate').hidden = false;
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
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

/* ================= 1re place affichée pendant toute la partie ================= */
const REC = { leader: '', score: -1, passed: '', flashUntil: 0 };
function recReset() { REC.leader = ''; REC.score = -1; REC.passed = ''; REC.flashUntil = 0; }
function recLine() {
  const el = $('jdw-recline');
  if ((CMP.playing || CMP.practice) && current && !$('jdw-play').hidden) { cmpLine(el); return; }
  if (!current || $('jdw-play').hidden || !$('jdw-end').hidden) { el.hidden = true; return; }
  const g = current.game, me = cleanName(profile.name), lead = top(g.id)[0], u = unit(g);
  let cur = 0;
  try { if (!current.over && current.inst && current.inst.currentScore) cur = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (e) {}
  el.hidden = false;
  let cls = 'recline', txt;
  if (lead && REC.leader && (REC.leader !== lead.name || REC.score !== lead.score) && lead.name !== me) {
    // un copain vient de prendre (ou d'améliorer) la 1re place pendant qu'on joue
    REC.flashUntil = Date.now() + 2500;
    toastCheer(lead.name + (REC.leader === lead.name ? ' améliore son record : ' : ' prend la 1re place : ') + fmt(lead.score) + u + ' !', lead.name);
  }
  if (lead) { REC.leader = lead.name; REC.score = lead.score; }
  if (!lead) { txt = cur > 0 ? '👑 Toi · ' + fmt(cur) + u + ' · premier record !' : '👑 Pas encore de record : à toi !'; if (cur > 0) cls += ' me'; }
  else if (lead.name === me) { cls += ' me'; txt = cur > lead.score ? '👑 Toi · ' + fmt(cur) + u + ' · nouveau record !' : '👑 Toi · ' + fmt(lead.score) + u + (cur ? ' · en cours ' + fmt(cur) : ''); }
  else if (cur > lead.score) {
    cls += ' me'; txt = '👑 Toi · ' + fmt(cur) + u + ' · devant ' + lead.name + ' !';
    const key = lead.name + ':' + lead.score;
    if (REC.passed !== key) {
      REC.passed = key; REC.flashUntil = Date.now() + 2500;
      toastCheer('Tu passes devant ' + lead.name + ' ! 👑', me, true);
      Audio.tone(784, 0.12, 'square', 0.06); setTimeout(() => Audio.tone(1046, 0.22, 'square', 0.06), 120);
    }
  } else txt = '👑 ' + lead.name + ' · ' + fmt(lead.score) + u + (cur ? '   ·   toi ' + fmt(cur) : '');
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
    (res === 'shared' ? 'Enregistré en ligne dans le classement de la salle.' : (ONLINE ? "Pas de connexion : gardé sur cet appareil, réessaie plus tard." : 'Enregistré sur cet appareil.'));
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
const LV_WORD = { ilo: 'Secteur', mouches: 'Vague' };
function showLevelProgress(g, me) {
  const box = $('jdw-lvprog'); box.hidden = true; box.textContent = '';
  let lv = current.lastLevel || 0; try { if (!lv) lv = Math.floor(+current.inst.currentLevel() || 0); } catch (e) {}
  if (!(lv >= 1) || current.mode === 'compet') return;
  // record d'avant la partie (pendant la partie, progTick garde déjà chaque nouveau niveau sur l'appareil)
  const best = current.lvBase != null && cleanName(profile.name) === me ? current.lvBase : lvBest(me, g.id);
  const had = lvBest(me, g.id);
  if (lv > had && me) { lvSetBest(me, g.id, lv); progPush(me, g.id, lv); }   // dernier niveau pas encore vu par progTick
  const word = LV_WORD[g.id] || 'Niveau', top = Math.max(lv, best), n = Math.max(10, Math.ceil((top + 2) / 5) * 5);
  const h = document.createElement('p'); h.className = 'lv-h';
  const b = document.createElement('b'); b.textContent = word + ' ' + lv; h.append(b, document.createTextNode(lv > best ? (best ? ' · nouveau record ! (avant : ' + best + ')' : ' · premier record !') : lv === best ? ' · ton record égalé !' : ' · ton record : ' + best + ' (encore ' + (best - lv) + ')'));
  const track = document.createElement('div'); track.className = 'lv-track'; track.style.setProperty('--n', n);
  for (let i = 1; i <= n; i++) {
    const d = document.createElement('i'); if (i <= lv) d.className = 'on'; if (i === lv) d.classList.add('now');
    if (i === best && best !== lv) { d.classList.add('best'); d.title = 'ton record'; }
    d.style.setProperty('--d', (i * 0.05).toFixed(2) + 's'); track.appendChild(d);
  }
  box.append(h, track); box.hidden = false;
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
    const b = document.createElement('b'); b.textContent = (wasFirst ? 'Tu as battu le premier : ' : 'Tu as battu ') + victim.name + ' !';
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
  const st = $('jdw-status'), record = score > 0 && score > myBest;
  pending = score > 0 ? { game: g.id, score, record, done: false } : null;
  if (record) st.textContent = 'Nouveau record ! Enregistrement en ligne…';
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
  const rows = top(g.id).slice(0, 5);
  if (!rows.length) return emptyRow(ol);
  for (const r of rows) { const s = document.createElement('span'); s.className = 's'; s.textContent = fmt(r.score) + unit(g); ol.appendChild(rowEl(r.name, s, r.name === me)); }
}

/* ================= Inviter (tous les membres peuvent inviter) ================= */
$('jdw-invite').addEventListener('click', async () => {
  if (!room) { openRooms(); return; }
  const site = location.origin + location.pathname.replace(/[^/]*$/, '');
  const code = roomCodes[room.id];
  const txt = 'Viens jouer avec moi sur la Borne d\'arcade entre amis 🎮\n' + site +
    '\nMot de passe du site : ' + (CODE() || '(demande-le moi)') +
    '\nSalle : ' + room.name + (code ? '\nCode de la salle : ' + code : '');
  try { if (navigator.share) { await navigator.share({ title: 'Borne d\'arcade', text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  let ok = false;
  try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) {
    try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (e2) { ok = false; }
  }
  toastCheer(ok ? 'Invitation copiée ! Colle-la dans Messenger ou WhatsApp.' : 'Copie impossible : le code est dans ⚙.', profile.name, true);
  if (!ok) alertBox(txt);
});
function alertBox(txt) { $('jdw-rooms-status').textContent = txt; openRooms(); }

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
// tier(t) = palier (bandeau) ; theme = peintre du décor ('space' | 'factory') ; start / cap = textes du départ et du haut ;
// boss(n) = le boss qui ferme le niveau n { bk (dessin), name, kicker, final (boss de fin de cycle : couronne) } → étape « BOSS » sur le chemin.
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
  }
};

/* ---------- progression : appareil + serveur ---------- */
const PROG = { room: null, rows: [], at: 0, missing: false, loading: null, mine: {}, busy: false };
let progQ = store.get('jdw.progq', []); if (!Array.isArray(progQ)) progQ = [];
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
  if (PROG.busy || PROG.missing || !ONLINE || !progQ.length) return;
  PROG.busy = true;
  let sent = false;
  try {
    while (progQ.length && !PROG.missing) {
      const it = progQ[0];
      if (knownNotMember(it.name) && room && room.id === it.room) { progQ.shift(); continue; }   // pas membre : rien à garder
      try {
        await rpc('save_progress', { p_code: CODE(), p_room: it.room, p_room_code: it.code || roomCodes[it.room] || '', p_name: it.name, p_game: it.game, p_level: it.level }, { quiet404: true });
        sent = true;
        const cur = progQ[0]; if (cur === it) progQ.shift();
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
      PROG.rows = rows.map(r => ({ name: cleanName(r.r_name), game: String(r.r_game || ''), level: Math.floor(+r.r_level || 0) })).filter(r => r.name && r.level > 0);
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
    const k = room.id + '|' + me + '|' + gid; if (boot[k]) continue;
    boot[k] = 1;
    const loc = lvBest(me, gid), srv = (PROG.rows.find(r => r.name === me && r.game === gid) || {}).level || 0;
    if (loc > srv) progPush(me, gid, loc);
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

/* ---------- carte plein écran ---------- */
const MAP = { open: false, gid: null, def: null, L: null, heads: new Map(), opener: null, rt: 0, closing: 0 };
const SVGNS = 'http://www.w3.org/2000/svg';
function mapEl(tag, cls, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
function openMap(gid, opener) {
  const def = MAP_DEFS[gid], g = gameById(gid); if (!def || !g) return;
  clearTimeout(MAP.closing); MAP.closing = 0;
  MAP.open = true; MAP.gid = gid; MAP.def = def; MAP.opener = opener || null; MAP.heads = new Map(); MAP.auto = true;
  const box = $('jdw-map');
  box.dataset.theme = def.theme; box.style.setProperty('--acc', g.accent);
  $('jdw-map-title').textContent = g.title;
  $('jdw-map-kicker').textContent = room && ONLINE ? 'Carte d’avancement · ' + room.name : 'Carte d’avancement';
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
  if (ONLINE && room) {
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
  let d = 150, prevTier = null;       // distance depuis le bas ; le départ est à 150 px du bas
  const start = { d, k: 0 };
  for (let lv = 1; lv <= n; lv++) {
    const info = def.level(lv);
    const base = lv === 1 ? S : fromBoss;
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
    d += toBoss;
    nd.boss = { lv, info, bi: Object.assign({ acc: info.acc }, def.boss(lv)), d, k: lv + 0.5, isBoss: true };
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
function mapPaint(world, L, def) {
  const stops = mapStops(L, def), W = L.W;
  let dpr = Math.min(2.5, (window.devicePixelRatio || 1) * (MAP.z || 1));
  if (W * L.H * dpr * dpr > 14e6) dpr = Math.max(1, Math.sqrt(14e6 / (W * L.H)));
  const CH = 1000;
  for (let y0 = 0; y0 < L.H; y0 += CH) {
    const h = Math.min(CH, L.H - y0), c = mapEl('canvas', 'gmap-bg', world);
    c.width = Math.round(W * dpr); c.height = Math.round(h * dpr); c.style.top = y0 + 'px'; c.style.height = h + 'px';
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    x.fillStyle = mapGrad(x, stops, y0, h); x.fillRect(0, 0, W, h);
    try { if (def.theme === 'space') paintSpace(x, L, W, y0, h); else paintFactory(x, L, W, y0, h); } catch (e) {}
  }
}
// pastille d'un niveau : planète du secteur (Galaxy Wars) ou cadran d'usine (Plein Gaz)
function mapNodeCanvas(def, info, size) {
  const c = document.createElement('canvas'), dpr = Math.min(3, (window.devicePixelRatio || 1) * (MAP.z || 1)), P = size + 24;
  c.width = c.height = Math.round(P * dpr); c.style.width = c.style.height = P + 'px';
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const cx = P / 2, cy = P / 2, r = size / 2;
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
  const W0 = scroll.clientWidth, VH0 = scroll.clientHeight;
  const z = W0 >= 700 ? Math.max(1, Math.min(1.45, W0 / 600, VH0 / 680)) : 1;
  const W = Math.max(280, Math.floor(W0 / z)), VH = Math.max(400, VH0 / z);
  MAP.z = z; world.style.zoom = z === 1 ? '' : z.toFixed(3); world.style.width = W + 'px';
  const people = mapPeople(MAP.gid), me = cleanName(profile.name);
  let max = 0; for (const v of people.values()) max = Math.max(max, v);
  const n = def.count(max), L = mapLayout(def, n, W, VH);
  MAP.L = L; MAP.n = n; MAP.heads = new Map();
  world.textContent = ''; world.style.height = L.H + 'px';
  world.classList.toggle('anim', !!animate);
  mapPaint(world, L, def);
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
    mapEl('small', '', p).textContent = t.T.kicker;
    mapEl('b', '', p).textContent = t.T.title;
    if (t.T.sub) mapEl('span', '', p).textContent = t.T.sub;
    b.dataset.tier = t.t;
  }
  // départ et suite
  const st = mapEl('div', 'gmap-start', world); st.style.left = L.start.x + 'px'; st.style.top = L.start.y + 'px';
  mapEl('i', 'gs-pad', st);
  if (def.theme === 'space') st.insertAdjacentHTML('beforeend', '<svg class="gs-ship" viewBox="0 0 40 56" aria-hidden="true"><defs><linearGradient id="gsF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3fb4"/><stop offset="1" stop-color="#ff3fb4" stop-opacity="0"/></linearGradient></defs><path class="gs-flame" d="M15 43 20 56 25 43z" fill="url(#gsF)"/><path d="M20 2 26 19 36 33v7l-10-3-2 7h-8l-2-7-10 3v-7l10-14z" fill="#0b0f16" stroke="#38e1ff" stroke-width="1.3" stroke-linejoin="round"/><path d="M20 9c2 3 2.6 8 2.6 12h-5.2c0-4 .6-9 2.6-12z" fill="#38e1ff"/><path d="M6 36l8-3M34 36l-8-3" stroke="#ff3fb4" stroke-width="1.2"/></svg>');
  const stt = mapEl('div', 'gs-txt', st); mapEl('b', '', stt).textContent = def.start.title; mapEl('small', '', stt).textContent = def.start.sub;
  const cap = mapEl('div', 'gmap-cap', world); cap.style.top = L.capY + 'px';
  mapEl('b', '', cap).textContent = def.cap.title; mapEl('small', '', cap).textContent = def.cap.sub;
  // niveaux
  MAP.nodeEls = [];
  for (const nd of L.nodes) {
    const el = mapEl('div', 'gmap-node', world); el.style.left = nd.x + 'px'; el.style.top = nd.y + 'px'; el.style.setProperty('--nc', nd.info.acc);
    el.setAttribute('role', 'img');
    const pin = mapEl('div', 'gn-pin', el); pin.appendChild(mapNodeCanvas(def, nd.info, def.theme === 'space' ? 54 : 52));
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
    const bs = nd.boss, bi = bs.bi;
    const el = mapEl('div', 'gmap-boss' + (bi.final ? ' final' : ''), world); el.style.left = bs.x + 'px'; el.style.top = bs.y + 'px';
    el.style.setProperty('--nc', nd.info.acc); el.setAttribute('role', 'img');
    const em = mapEl('div', 'gb-em', el); em.appendChild(mapBossCanvas(def, bi, def.theme === 'space' ? (bi.final ? 70 : 64) : 62));
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
  const nextB = Math.max(1, mine);
  for (const nd of L.nodes) {
    const bs = nd.boss, el = bs.el, lv = nd.lv; if (!el) continue;
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
  const pts = [L.start]; for (const nd of L.nodes) pts.push(nd, nd.boss);
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
  // têtes : regroupées par niveau, moi au centre et en grand
  const layer = MAP.headLayer, seen = new Set();
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
        mapEl('span', 'gh-name', h).textContent = nm === me ? 'Toi' : nm;
        if (animate) h.style.setProperty('--d', (0.45 + Math.min(lv, 26) * 0.035).toFixed(3) + 's');
        MAP.heads.set(nm, h);
      }
      h.classList.toggle('lead', top.length === 1 && top[0] === nm && people.size > 1);
      h.classList.toggle('start', lv < 1);
      h.style.left = (pos.x + dx) + 'px'; h.style.top = (pos.y - (lv >= 1 ? 34 : 30) + dy) + 'px';
      h.title = (nm === me ? 'Toi' : nm) + ' · ' + (lv >= 1 ? def.short(lv) : 'pas encore parti');
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
  mapEl('small', 'gm-k', tx).textContent = mi ? 'Toi · ' + mi.kicker : 'Toi';
  mapEl('b', '', tx).textContent = mi ? mi.name : 'Pas encore parti';
  const others = [...people].filter(([n]) => n !== me).sort((a, b) => b[1] - a[1]);
  mapEl('small', '', tx).textContent = others.length && others[0][1] > 0
    ? (others[0][1] > mine ? 'Devant toi : ' + others[0][0] + ' · ' + def.word + ' ' + others[0][1] : mine >= others[0][1] && mine > 0 ? (others[0][1] === mine ? 'À égalité en tête avec ' + others[0][0] : 'Tu mènes la salle !') : '')
    : mine ? 'Ton meilleur ' + def.word.toLowerCase() : 'Lance une partie pour poser ta tête sur la carte';
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
  if (!$('jdw-net').hidden) { netEnd(true); return true; }
  if (!$('jdw-watch').hidden) { watchStop(); return true; }
  if (MAP.open) { closeMap(); return true; }
  if (!$('jdw-cmp-pick').hidden) { cmpClosePick(); return true; }
  if (!$('jdw-podium').hidden) { cmpClosePodium(); return true; }
  if (!$('jdw-duo').hidden) { duoBack(); return true; }
  if (!$('jdw-seatpick').hidden) { closeSheet('jdw-seatpick'); return true; }
  if (chat.open) { closeChat(); return true; }
  if (!$('jdw-cri').hidden) { closeCri(); return true; }
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

/* ================= Démarrage ================= */
['jdw-play', 'jdw-end', 'jdw-board', 'jdw-settings', 'jdw-welcome', 'jdw-photo', 'jdw-cheer', 'jdw-rooms', 'jdw-rotate', 'jdw-notifs', 'jdw-profiles', 'jdw-chat', 'jdw-cri', 'jdw-members', 'jdw-duo', 'jdw-seatpick', 'jdw-podium', 'jdw-cmp-pick', 'jdw-watch', 'jdw-net', 'jdw-netinv', 'jdw-map'].forEach(id => { if ($(id)) $(id).hidden = true; });
if ($('jdw-pg')) $('jdw-pg').hidden = true;
$('jdw-lib').hidden = false;
syncOwnPlayer();
buildLibrary(); buildDuoLibrary(); buildTabs(); syncMute(); refreshAll(); setMode(MODE);
requestAnimationFrame(previewLoop);
if (document.fonts && document.fonts.load) { document.fonts.load('20px Bungee').catch(() => {}); document.fonts.load('600 14px "Chakra Petch"').catch(() => {}); }
if (!profile.name) startWelcome(); else if (ONLINE && !room) openRooms();
loadPlayers(); loadScores(); heartbeat(); loadChat(); setTimeout(progLoad, 1500);
setTimeout(pushRoomLook, 2500);    // une tête / un cri de salle pas encore envoyé (serveur pas à jour, pas de réseau…)
if (ONLINE) { rtJoin('jdw-all'); if (room) rtJoin('jdw-room-' + room.id); rtConnect(); }
setTimeout(checkSiteVersion, 4000);
// les images des jeux se préparent en douce (aperçu de la tuile + démarrage instantané)
setTimeout(() => { if (CODE()) for (const id of ASSET_GAMES) if (gameById(id)) window.JDW_ASSETS.load(id).catch(() => {}); }, 3500);
window.JDW_SHELL = { players, headsList, music: () => ({ id: MUS.id, mode: MUS.mode, track: MUS.track, on: MUS.on, vol: MUS.gain ? +MUS.gain.gain.value.toFixed(3) : null }), toast: toastCheer, game: () => current && current.inst, duo: () => DUO.inst, duoApi: () => DUO.api, cmp: () => CMP };   // diagnostic (tests)
})();
