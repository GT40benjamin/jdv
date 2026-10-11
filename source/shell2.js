(() => {
'use strict';
const $ = id => document.getElementById(id);
const ORDER = ['pleingaz', 'empilo', 'glouton', 'mouches', 'carreaux', 'rouleaux', 'canards'];
const GAMES = ORDER.map(id => (window.JDW_GAMES || {})[id]).filter(Boolean);
const gameById = id => GAMES.find(g => g.id === id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const fmt = n => Math.floor(n).toLocaleString('fr-FR');
const unit = g => g && g.scoreLabel === 'm' ? ' m' : '';
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12).toUpperCase();
const COLORS = { night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3', muted: '#8aa0ae',
  amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff', spray: '#ff5fae', leaf: '#4cc36a' };
const FONTS = { display: "'Bungee', Impact, sans-serif", body: "'Chakra Petch', system-ui, sans-serif" };

/* ================= Audio commun ================= */
let muted = !!store.get('jdw.muted', false);
const Audio = {
  ctx: null, master: null, buf: null,
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = muted ? 0 : 0.6; this.master.connect(this.ctx.destination);
      this.buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
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
      s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    } catch (e) {}
  }
};
const audioApi = { tone: (...a) => Audio.tone(...a), noise: (...a) => Audio.noise(...a) };

/* ================= Serveur (Supabase) ou mode local ================= */
const CFG = window.JDW_CONFIG || null;
const ONLINE = !!(CFG && CFG.url && CFG.key);
const CODE = () => store.get('jdw.code', '') || window.JDW_CODE || '';
let serverOk = false;
let room = store.get('jdw.room', null);
let roomCodes = store.get('jdw.roomcodes', {}) || {};
const RP = () => ({ p_room: room ? room.id : null, p_room_code: room ? (roomCodes[room.id] || '') : '' });
async function rpc(fn, args) {
  const h = { 'Content-Type': 'application/json', apikey: CFG.key };
  if (!/^sb_/.test(CFG.key)) h.Authorization = 'Bearer ' + CFG.key;
  const r = await fetch(CFG.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: h, body: JSON.stringify(args) });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(fn + ' ' + r.status + ' ' + t.slice(0, 120)); }
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}
let clientId = store.get('jdw.client', '');
if (!clientId) { clientId = 'c' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); store.set('jdw.client', clientId); }

/* ================= Profils de l'appareil & têtes ================= */
// Plusieurs joueurs peuvent partager le même téléphone : chaque profil a un identifiant (pid).
const newPid = () => 'p' + Math.random().toString(36).slice(2, 10);
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
function setPlayer(name, photo, sound) {
  name = cleanName(name); if (!name) return;
  const cur = players.get(name);
  if (sound === undefined) sound = cur ? cur.sound : null;
  if (cur && cur.photo === (photo || null)) { cur.sound = sound || null; return; }
  const p = { name, photo: photo || null, img: null, sad: null, sadUrl: '', sound: sound || null,
    member: cur ? cur.member : false, seen: cur ? cur.seen : 0, game: cur ? cur.game : null, updated: cur ? cur.updated : 0 };
  if (photo) { const im = new Image(); im.decoding = 'async'; im.src = photo; p.img = im; }
  players.set(name, p);
}
function syncOwnPlayer() {
  for (const pr of profiles) if (pr.name && pr.pid !== profile.pid) setPlayer(pr.name, pr.consent ? pr.photo : null, pr.sound || undefined);
  if (profile.name) setPlayer(profile.name, profile.consent ? profile.photo : null, profile.sound === '' ? null : (profile.sound || undefined));
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
  for (const p of players.values()) if (p.img && p.img.complete && p.img.naturalWidth) out.push({ name: p.name, img: p.img, sad: sadOf(p) || p.img });
  return out;
}
function playerObj() {
  const p = players.get(cleanName(profile.name));
  return { name: profile.name || 'JOUEUR', img: p && p.img && p.img.complete && p.img.naturalWidth ? p.img : null };
}
function avatarInto(el, name) {
  el.textContent = ''; el.style.background = '';
  const p = players.get(cleanName(name));
  if (p && p.photo) { const im = document.createElement('img'); im.alt = ''; im.src = p.photo; el.appendChild(im); return; }
  const n = cleanName(name) || '?';
  let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
  el.style.background = 'hsl(' + h + ' 45% 32%)';
  el.textContent = n[0];
}
let playersAt = 0;
async function loadPlayers() {
  if (!ONLINE || !room) return;
  try {
    const rows = await rpc('get_players', Object.assign({ p_code: CODE() }, RP())) || [];
    serverOk = true;
    for (const r of rows) {
      setPlayer(r.r_name, r.r_photo, r.r_sound || null);
      const p = players.get(cleanName(r.r_name));
      if (p) { p.member = true; p.seen = Math.max(p.seen || 0, Date.parse(r.r_seen) || 0); if (!PRES.ok) p.game = r.r_game || null; p.updated = Date.parse(r.r_updated) || 0; }
    }
    playersAt = Date.now();
    syncOwnPlayer();
    refreshAll();
    if (!$('jdw-members').hidden) renderMembers();
  } catch (e) { serverOk = false; refreshAll(); }
}
async function pushProfile() {
  syncOwnPlayer();
  if (!ONLINE || !profile.name) return true;
  const args = { p_code: CODE(), p_name: profile.name, p_photo: profile.consent ? profile.photo : null, p_consent: !!profile.consent };
  if (profile.sound !== undefined && profile.sound !== null) args.p_sound = profile.sound;   // '' = retirer le cri
  try { await rpc('save_player', args); poke('players'); return true; }
  catch (e) { return false; }
}

/* ================= Erreurs : remontées au serveur + sauvetage du score ================= */
const BUILD = window.JDW_BUILD || 'dev';
const errSeen = new Set(); let errCount = 0;
let errLog = store.get('jdw.errors', []); if (!Array.isArray(errLog)) errLog = [];
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
addEventListener('error', e => reportError(e.message, (e.error && e.error.stack) || ((e.filename || '') + ':' + e.lineno + ':' + e.colno)));
addEventListener('unhandledrejection', e => { const r = e.reason; reportError('Promesse : ' + ((r && r.message) || r), r && r.stack, { quiet: true }); });

/* ================= Cris des copains ================= */
let criAudio = null;
function hasCri(name) { const p = players.get(cleanName(name)); return !!(p && p.sound); }
function playCri(name, el) {
  const p = players.get(cleanName(name));
  if (!p || !p.sound || muted) return false;
  try { if (criAudio) { criAudio.pause(); criAudio = null; } } catch (e) {}
  try { criAudio = new window.Audio(p.sound); criAudio.volume = 1; const pr = criAudio.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { return false; }
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
function top(game) { return bestPerName(ONLINE && serverOk ? (remote[game] || []) : (local[game] || [])).slice(0, 10); }
async function loadScores() {
  if (!ONLINE || !room) return;
  try {
    const rows = await rpc('get_scores', Object.assign({ p_code: CODE() }, RP())) || [];
    const next = {};
    for (const r of rows) (next[r.r_game] = next[r.r_game] || []).push({ name: r.r_name, score: +r.r_score || 0, at: Date.parse(r.r_at) || 0 });
    remote = next; serverOk = true;
    if (unsent.length) setTimeout(flushUnsent, 500);
  } catch (e) { serverOk = false; }
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
      (remote[game] = remote[game] || []).push(entry); serverOk = true;
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
function unseenCount() { const s = notifSeen[notifKey()] || 0; return notifs.filter(n => n.id > s).length; }
function refreshBell() {
  $('jdw-bell').hidden = !notifsOk || !profile.name;
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
function openNotifs() {
  const ol = $('jdw-notifs-list'); ol.textContent = '';
  const seen = notifSeen[notifKey()] || 0;
  if (!notifs.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = "Personne n'a battu tes records pour l'instant. Profites-en !"; ol.appendChild(li); }
  for (const n of notifs) {
    const g = gameById(n.game), li = document.createElement('li'); if (n.id > seen) li.className = 'new';
    const av = document.createElement('span'); av.className = 'avatar'; avatarInto(av, n.actor);
    const tx = document.createElement('span'); tx.className = 'nt';
    const b = document.createElement('b'); b.textContent = n.actor;
    tx.append(b, ' a battu ton record' + (g ? ' à ' + g.title : ''));
    const sm = document.createElement('small'); sm.textContent = fmt(n.score) + unit(g) + ' contre ' + fmt(n.prev) + unit(g) + ' pour toi · ' + timeAgo(n.at);
    tx.append(sm); li.append(av, tx); ol.appendChild(li);
  }
  if (notifs.length) { notifSeen[notifKey()] = Math.max(seen, ...notifs.map(n => n.id)); store.set('jdw.notifseen', notifSeen); }
  refreshBell();
  openSheet('jdw-notifs', 'jdw-notifs-close');
}
$('jdw-bell').addEventListener('click', openNotifs);
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
  if (p && p.photo) {
    const im = document.createElement('img'); im.alt = ''; im.decoding = 'async';
    im.src = opts.sad ? sadUrl(p) : p.photo; el.appendChild(im); el.classList.add('photo');
  } else { const i = document.createElement('i'); i.textContent = (cleanName(name) || '?')[0]; el.appendChild(i); }
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
  const names = [...players.keys()].sort((x, y) => (x === me) - (y === me) || (!!(players.get(y) || {}).photo - !!(players.get(x) || {}).photo) || x.localeCompare(y));
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
let presenceBusy = false;
async function refreshPresence() {
  if (!ONLINE || !room || presenceBusy) return;
  presenceBusy = true;
  try {
    const rows = await rpc('get_presence', Object.assign({ p_code: CODE() }, RP())) || [];
    let stale = false;
    for (const r of rows) {
      const p = players.get(cleanName(r.r_name)), up = Date.parse(r.r_updated) || 0;
      if (!p || !p.member || (p.updated || 0) !== up) { stale = true; continue; }
      p.seen = Math.max(p.seen || 0, Date.parse(r.r_seen) || 0); if (!PRES.ok) p.game = r.r_game || null;
    }
    if (stale) await loadPlayers(); else if (!$('jdw-members').hidden) renderMembers();
    if (PRES.ok) presChanged();
  } catch (e) { if (Date.now() - playersAt > 120000) loadPlayers(); }   // ancien serveur : rechargement complet de temps en temps
  finally { presenceBusy = false; }
}
async function heartbeat() {
  if (!ONLINE || !profile.name || !room) return;
  try {
    const rows = await rpc('heartbeat', { p_code: CODE(), p_room: room.id, p_client: clientId, p_name: profile.name, p_game: where }) || [];
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
function rtTrack() {
  const t = roomTopic(); if (!t || !profile.name || document.hidden) return;
  rtSend(t, 'presence', { type: 'presence', event: 'track', payload: { name: cleanName(profile.name), game: where, cid: clientId } });
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
function presList() {
  const out = [];
  for (const metas of Object.values(PRES.state)) { const m = metas[metas.length - 1]; if (m && m.name) out.push({ name: cleanName(m.name), game: m.game || 'menu' }); }
  return out;
}
function presChanged() {
  if (!PRES.ok) return;
  const list = presList(), live = new Map();
  for (const x of list) if (!live.has(x.name) || live.get(x.name) === 'menu') live.set(x.name, x.game);
  counts = {}; total = list.length;
  for (const x of list) counts[x.game] = (counts[x.game] || 0) + 1;
  let unknown = false;
  for (const p of players.values()) {
    if (live.has(p.name)) { p.live = true; p.game = live.get(p.name); }
    else { if (p.live) p.seen = Date.now(); p.live = false; if (p.member) p.game = null; }
  }
  for (const n of live.keys()) { const p = players.get(n); if (!p || !p.member) unknown = true; }
  if (unknown) loadPlayers();
  serverOk = true;
  refreshOnline(); if (chat.open) refreshChatOnline();
  if (!$('jdw-members').hidden) renderMembers();
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
  if (p.t === 'version') { checkSiteVersion(); return; }
  if (p.t === 'rooms') { if (!$('jdw-rooms').hidden) listRooms(); return; }
  if (!room || topic !== 'jdw-room-' + room.id) return;
  const run = { chat: () => loadChat(), scores: () => loadScores(), players: () => loadPlayers(), presence: () => heartbeat(), react: () => loadReactions() }[p.t];   // heartbeat : compteurs des tuiles + liste des joueurs
  if (!run) return;
  clearTimeout(pokeTimers[p.t]); pokeTimers[p.t] = setTimeout(run, p.t === 'chat' ? 60 : 250);   // regroupe les rafales
}
let lastRefresh = 0;
function refreshEverything(force) {
  rtTrack();
  if (!force && Date.now() - lastRefresh < 2500) return;
  lastRefresh = Date.now();
  if (ONLINE && (!RT.ws || RT.ws.readyState > 1)) rtConnect();
  heartbeat(); loadScores(); loadChat(); flushUnsent(); checkSiteVersion();
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
    if (v && v.build && v.build !== BUILD) { siteNew = true; maybeReload(); }
  } catch (e) {}
}
let saving = 0;
function calmMoment() {
  if (!$('jdw-play').hidden || chat.open || saving > 0) return false;
  for (const sh of document.querySelectorAll('.sheet')) if (!sh.hidden) return false;
  const a = document.activeElement; return !(a && /^(INPUT|TEXTAREA)$/.test(a.tagName));
}
function reloadNow() { if (saving > 0) { setTimeout(reloadNow, 400); return; } location.reload(); }
function maybeReload() {
  if (!siteNew) return;
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
function gameLabel(id) { if (!id || id === 'menu') return 'dans le menu'; const g = gameById(id); return g ? 'joue à ' + g.title : 'en ligne'; }
function renderMembers() {
  const me = cleanName(profile.name), list = [...players.values()].filter(p => p.member || p.name === me);
  const isOn = p => p.name === me || (PRES.ok ? !!p.live : !!p.game);
  const on = list.filter(isOn).sort((a, b) => (b.name === me) - (a.name === me) || a.name.localeCompare(b.name));
  const off = list.filter(p => !isOn(p)).sort((a, b) => (b.seen || 0) - (a.seen || 0) || a.name.localeCompare(b.name));
  const wrap = $('jdw-members-list'); wrap.textContent = '';
  const section = (title, arr, online) => {
    if (!arr.length) return;
    const h = document.createElement('p'); h.className = 'eyebrow mem-h'; h.textContent = title + ' · ' + arr.length; wrap.appendChild(h);
    for (const p of arr) {
      const row = document.createElement('div'); row.className = 'mem-row' + (online ? ' on' : '');
      const hd = chatHead(p.name); hd.classList.add('mem-head');
      const tx = document.createElement('div'); tx.className = 'mem-txt';
      const n = document.createElement('b'); n.textContent = p.name === me ? p.name + ' (moi)' : p.name;
      const st = document.createElement('small');
      st.textContent = online ? (p.name === me ? gameLabel(current ? current.game.id : 'menu') : gameLabel(p.game)) : seenText(p.seen);
      tx.append(n, st);
      const tags = document.createElement('div'); tags.className = 'mem-tags';
      const ph = document.createElement('span'); ph.className = 'mem-tag' + (p.photo ? ' yes' : ''); ph.textContent = p.photo ? '📸 tête' : 'pas de tête';
      const cr = document.createElement('button'); cr.type = 'button'; cr.className = 'mem-tag' + (p.sound ? ' yes' : '');
      cr.textContent = p.sound ? '🔊 cri' : 'pas de cri'; cr.disabled = !p.sound;
      if (p.sound) { cr.setAttribute('aria-label', 'Écouter le cri de ' + p.name); cr.addEventListener('click', () => playCri(p.name, hd)); }
      tags.append(ph, cr);
      row.append(hd, tx, tags); wrap.appendChild(row);
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
  await loadPlayers(); if (!$('jdw-members').hidden) renderMembers();
}
$('jdw-online').addEventListener('click', openMembers);
$('jdw-members-close').addEventListener('click', () => closeSheet('jdw-members'));
$('jdw-members').addEventListener('click', e => { if (e.target === $('jdw-members')) closeSheet('jdw-members'); });

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
    b.addEventListener('click', () => openGame(g));
    grid.appendChild(b);
    tiles.push({ g, el: b, canvas: b.querySelector('canvas'), on: b.querySelector('.tile-online'), visible: true });
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { const t = tiles.find(x => x.el === e.target); if (t) t.visible = e.isIntersecting; }), { root: $('jdw-lib') });
    tiles.forEach(t => io.observe(t.el));
  }
}
function refreshOnline() {
  const live = ONLINE && serverOk;
  $('jdw-online').classList.toggle('off', !live);
  $('jdw-online-txt').textContent = live ? (total <= 1 ? (total === 1 ? '1 joueur en ligne' : 'Personne en ligne') : total + ' joueurs en ligne') : (ONLINE ? 'Connexion…' : 'Mode local');
  for (const t of tiles) {
    const n = counts[t.g.id] || 0, span = t.on.querySelector('span');
    t.on.classList.toggle('live', live && n > 0);
    if (live) span.textContent = n ? (n === 1 ? '1 joueur' : n + ' joueurs') : 'Personne';
    else { const b = top(t.g.id)[0]; span.textContent = b ? 'Record ' + fmt(b.score) + unit(t.g) + ' · ' + b.name : 'Pas encore de record'; }
  }
}
function refreshMe() {
  $('jdw-me-name').textContent = profile.name || 'Joueur';
  avatarInto($('jdw-me-av'), profile.name);
}
function refreshAll() {
  refreshOnline(); refreshMe();
  $('jdw-roomrow').hidden = !ONLINE;
  $('jdw-invite').hidden = !room;
  $('jdw-roomname').textContent = room ? room.name : 'Choisis une salle';
  $('jdw-note').textContent = ONLINE ? (serverOk ? 'Classement commun à toute la bande, mis à jour en direct.' : 'Connexion au serveur… les scores restent gardés sur cet appareil en attendant.')
                                     : 'Mode local : le classement est gardé sur cet appareil.';
  if (!$('jdw-board').hidden) renderBoardTab();
}
let prevT = 0;
function previewLoop(ts) {
  requestAnimationFrame(previewLoop);
  if ($('jdw-lib').hidden || ts - prevT < 32) return;
  prevT = ts;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), t = ts / 1000;
  for (const tl of tiles) {
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
  if (chat.open) { closeChat(); return; }
  if (!$('jdw-cri').hidden) { closeCri(); return; }
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
  for (const g of GAMES) top(g.id).slice(0, 3).forEach((r, i) => {
    const e = m.get(r.name) || { name: r.name, m: [0, 0, 0] }; e.m[i]++; m.set(r.name, e);
  });
  return [...m.values()].sort((a, b) => b.m[0] - a.m[0] || b.m[1] - a.m[1] || b.m[2] - a.m[2] || a.name.localeCompare(b.name));
}
function renderBoardTab() {
  for (const b of $('jdw-tabs').children) b.setAttribute('aria-selected', String(b.dataset.id === boardTab));
  const sel = [...$('jdw-tabs').children].find(b => b.dataset.id === boardTab);
  if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const ol = $('jdw-board-list'); ol.textContent = '';
  const me = cleanName(profile.name);
  if (boardTab === 'general') {
    $('jdw-board-hint').textContent = 'Le nombre de jeux où chacun est premier, puis deuxième, puis troisième.';
    const rows = generalRanking();
    if (!rows.length) return emptyRow(ol);
    for (const r of rows) {
      const s = document.createElement('span'); s.className = 'medals';
      r.m.forEach((v, i) => { if (!v) return; const md = document.createElement('span'); md.className = 'medal m' + (i + 1); md.innerHTML = '<i></i>'; md.append('×' + v); s.appendChild(md); });
      ol.appendChild(rowEl(r.name, s, r.name === me));
    }
  } else {
    const g = gameById(boardTab);
    $('jdw-board-hint').textContent = g ? 'Top 10 · ' + g.tagline : '';
    const rows = top(boardTab);
    if (!rows.length) return emptyRow(ol);
    for (const r of rows) { const s = document.createElement('span'); s.className = 's'; s.textContent = fmt(r.score) + unit(g); ol.appendChild(rowEl(r.name, s, r.name === me)); }
  }
}
function emptyRow(ol) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = "Personne n'a encore de score ici. La place est libre !"; ol.appendChild(li); }
$('jdw-open-board').addEventListener('click', () => { loadScores(); renderBoardTab(); openSheet('jdw-board', 'jdw-board-close'); });
$('jdw-board-close').addEventListener('click', () => closeSheet('jdw-board'));
$('jdw-board').addEventListener('click', e => { if (e.target === $('jdw-board')) closeSheet('jdw-board'); });

/* ================= Paramètres ================= */
function openSettings() {
  $('jdw-set-name').value = profile.name;
  avatarInto($('jdw-set-av'), profile.name);
  $('jdw-set-sound').checked = !muted;
  $('jdw-set-delphoto').hidden = !profile.photo;
  const hasMine = !!(profile.sound && profile.sound !== '');
  $('jdw-set-cri').textContent = hasMine ? '🎙️ Changer mon cri' : '🎙️ Enregistrer mon cri';
  $('jdw-set-cri-play').hidden = !hasMine;
  $('jdw-set-photo').textContent = profile.photo ? 'Changer ma photo' : 'Prendre une photo';
  $('jdw-set-status').textContent = ONLINE ? (serverOk ? 'Connecté au classement commun.' : 'Serveur injoignable pour le moment.') : 'Mode local (pas de serveur).';
  openSheet('jdw-settings', 'jdw-set-name');
}
$('jdw-open-settings').addEventListener('click', openSettings);
$('jdw-me').addEventListener('click', openProfiles);
$('jdw-set-close').addEventListener('click', () => closeSheet('jdw-settings'));
$('jdw-set-sound').addEventListener('change', () => { muted = !$('jdw-set-sound').checked; store.set('jdw.muted', muted); syncMute(); });
$('jdw-set-photo').addEventListener('click', () => startPhoto());
$('jdw-set-cri').addEventListener('click', openCri);
$('jdw-set-cri-play').addEventListener('click', () => { if (!playCri(profile.name)) $('jdw-set-status').textContent = muted ? 'Le son est coupé.' : ''; });
$('jdw-set-delphoto').addEventListener('click', async () => {
  profile.photo = null; profile.consent = false; saveProfile();
  players.delete(cleanName(profile.name)); syncOwnPlayer();
  $('jdw-set-status').textContent = 'Ta tête est retirée des jeux.'; $('jdw-set-delphoto').hidden = true;
  avatarInto($('jdw-set-av'), profile.name); refreshAll(); await pushProfile();
});
$('jdw-set-save').addEventListener('click', async () => {
  const n = cleanName($('jdw-set-name').value);
  if (!n) { $('jdw-set-status').textContent = 'Il faut un nom.'; return; }
  const changed = n !== profile.name, old = cleanName(profile.name);
  if (changed && deviceNames().includes(n)) { $('jdw-set-status').textContent = 'Ce nom est déjà un profil de cet appareil : change de joueur avec ta tête en haut.'; return; }
  if (changed && old && bests[old] && !bests[n]) { bests[n] = bests[old]; delete bests[old]; store.set('jdw.bests2', bests); }
  profile.name = n; saveProfile(); syncOwnPlayer(); refreshAll();
  closeSheet('jdw-settings');
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
  if (ONLINE && room) rpc('join_room', Object.assign({ p_code: CODE(), p_room: room.id, p_room_code: roomCodes[room.id] || '', p_name: profile.name })).catch(() => {});
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
  const has = profile.sound && profile.sound !== '';
  $('jdw-cri-del').hidden = !has;
  criHint(criMime() === null ? "Ton navigateur n'enregistre pas le son : choisis plutôt un fichier." : 'Touche le micro et crie, ris ou chante (3 secondes) !');
  criState('idle');
  if (!$('jdw-settings').hidden) $('jdw-settings').hidden = true;
  if (!$('jdw-chat').hidden) closeChat();
  openSheet('jdw-cri', 'jdw-cri-rec');
}
function closeCri() { criStop(true); closeSheet('jdw-cri'); if (welReturn) reopenWelcome(); }
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
  profile.sound = CR.data;
  if (welReturn) { closeCri(); return; }
  saveProfile(); syncOwnPlayer();
  closeCri(); refreshAll();
  const ok = await pushProfile();
  toastCheer(ok ? 'Ton cri est prêt : les copains vont l’entendre !' : 'Cri gardé sur cet appareil.', profile.name, true);
  setTimeout(() => playCri(profile.name), 300);
});
$('jdw-cri-del').addEventListener('click', async () => {
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
    PH.img = im; PH.rot = 0; PH.zoom = 1.4; PH.ox = 0; PH.oy = 0; PH.mask = null;
    $('jdw-ph-zoom').value = '1.4'; $('jdw-ph-consent').checked = !!profile.consent; $('jdw-ph-ok').disabled = !profile.consent;
    if (!$('jdw-settings').hidden) $('jdw-settings').hidden = true;
    if (!$('jdw-welcome').hidden) { $('jdw-welcome').hidden = true; welReturn = true; }
    openSheet('jdw-photo', 'jdw-ph-zoom');
    drawCrop(); scheduleOut();
  };
  im.onerror = () => { URL.revokeObjectURL(url); };
  im.src = url;
});
function closePhoto() { $('jdw-photo').hidden = true; if (PH.img && PH.img.src.startsWith('blob:')) URL.revokeObjectURL(PH.img.src); PH.img = null; }
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
  const fin = $('jdw-ph-out'); const fc = fin.getContext('2d');
  fc.clearRect(0, 0, OUT_W, OUT_H); fc.imageSmoothingQuality = 'high'; fc.drawImage(out, 0, 0, OUT_W, OUT_H);
  $('jdw-ph-info').textContent = mask ? 'Tête détourée automatiquement. Ajuste le cadrage si besoin.' : 'Cadrage en ovale (le détourage automatique ne marche que sur le site en ligne).';
}
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
  if (!h && heads.length) h = heads[Math.floor(Math.random() * heads.length)];
  const p = h ? players.get(h.name) : (force ? players.get(cleanName(name)) : null);
  if ((!p || !p.photo) && !force) return;
  const el = $('jdw-cheer');
  // en dehors d'une partie, on l'affiche sur l'accueil
  const host = $('jdw-play').hidden ? document.body : $('jdw-host');
  if (el.parentNode !== host) host.appendChild(el);
  el.style.position = $('jdw-play').hidden ? 'fixed' : 'absolute';
  if (p && p.photo) { $('jdw-cheer-img').src = p.photo; $('jdw-cheer-img').hidden = false; } else $('jdw-cheer-img').hidden = true;
  $('jdw-cheer-name').textContent = p ? p.name : (cleanName(name) || ''); $('jdw-cheer-txt').textContent = String(text || '').slice(0, 60);
  el.hidden = true; void el.offsetWidth; el.hidden = false;
  clearTimeout(cheerTimer); cheerTimer = setTimeout(() => { el.hidden = true; }, 2700);
}

/* ================= Salles ================= */
let roomsCache = [], pendingRoom = null;
function roomsStatus(t) { $('jdw-rooms-status').textContent = t || ''; }
async function listRooms() {
  try { roomsCache = await rpc('list_rooms', { p_code: CODE() }) || []; serverOk = true; roomsStatus(''); }
  catch (e) { roomsStatus('Impossible de charger les salles. Vérifie ta connexion et réessaie.'); }
  renderRooms();
}
function roomHue(name) { let h = 7; for (const c of String(name).toUpperCase()) h = (h * 31 + c.charCodeAt(0)) % 9973; return Math.round((h * 137.508) % 360); }
const ICON_USERS = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/></svg>';
const ICON_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
function renderRooms() {
  const wrap = $('jdw-roomlist'); wrap.textContent = '';
  if (!roomsCache.length) { const p = document.createElement('p'); p.className = 'small'; p.textContent = "Aucune salle pour l'instant. Crée la première juste en dessous !"; wrap.appendChild(p); return; }
  const list = [...roomsCache].sort((a, b) => (room && b.r_id === room.id) - (room && a.r_id === room.id) || b.r_online - a.r_online || b.r_members - a.r_members);
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
    if (cur) { const bd = document.createElement('span'); bd.className = 'rt-badge'; bd.textContent = 'Ta salle'; b.append(bd); }
    if (r.r_private) { const lk = document.createElement('span'); lk.className = 'rt-lock'; lk.innerHTML = ICON_LOCK; lk.title = 'Salle privée'; b.append(lk); }
    b.addEventListener('click', () => chooseRoom(r));
    wrap.appendChild(b);
  }
}
function openRooms() {
  if (!ONLINE) return;
  if (!profile.name) { startWelcome(); return; }
  roomsStatus('Chargement des salles…'); $('jdw-joinbox').hidden = true; pendingRoom = null;
  openSheet('jdw-rooms'); listRooms();
}
async function chooseRoom(r) {
  if (room && room.id === r.r_id) { closeSheet('jdw-rooms'); return; }
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
    enterRoom({ id: r.r_id, name: r.r_name, priv: !!r.r_private });
  } catch (e) { roomsStatus("Impossible de rejoindre cette salle pour l'instant."); }
}
function enterRoom(rm) {
  const prevId = room ? room.id : null;
  room = rm; store.set('jdw.room', room);
  if (prevId && prevId !== room.id) { rtLeave('jdw-room-' + prevId); presReset(); }
  rtJoin('jdw-room-' + room.id);
  players.clear(); syncOwnPlayer(); remote = {}; counts = {}; total = 0;
  $('jdw-joinbox').hidden = true; closeSheet('jdw-rooms');
  chatReset(); closeChat();
  refreshAll(); pushProfile(); loadPlayers(); loadScores(); heartbeat(); loadChat();
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
    enterRoom({ id, name, priv: !!code });
    poke('rooms', 'jdw-all');
    toastCheer('Bienvenue dans « ' + name + ' » ! Donne le nom' + (code ? ' et le code' : '') + ' aux copains.', profile.name);
  } catch (e) {
    roomsStatus(/existe/.test(String(e.message)) ? 'Ce nom de salle est déjà pris, choisis-en un autre.' : 'Impossible de créer la salle pour le moment.');
  }
  $('jdw-new-ok').disabled = false;
});

/* ================= Lancer un jeu ================= */
let current = null, mountSeq = 0;
function mountGame(g) {
  const seq = ++mountSeq;
  let root;
  if (g.external) { root = $(g.external); root.hidden = false; }
  else { root = document.createElement('div'); root.className = 'game-root'; $('jdw-host').prepend(root); }
  const api = {
    audio: audioApi, colors: COLORS, fonts: FONTS,
    isMuted: () => muted,
    heads: () => headsList(),
    player: playerObj(),
    celebrate: (text, name) => { if (current && current.seq === seq) toastCheer(text, name); },
    gameOver(score) {
      if (!current || current.seq !== seq || current.over) return;
      current.over = true;
      const sc = Math.max(0, Math.floor(+score || 0));
      setTimeout(() => { if (current && current.seq === seq) showEnd(sc); }, 900);
    }
  };
  current = { game: g, root, seq, over: false, inst: null };
  recReset(); setTimeout(recLine, 50);
  try { current.inst = g.mount(root, api) || {}; } catch (e) { current.inst = {}; reportError('Lancement de ' + g.id + ' : ' + e.message, e.stack); }
  setWhere(g.id);
}
function unmountGame() {
  if (!current) return;
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
  setWhere('menu'); refreshAll();
  if (siteNew) setTimeout(maybeReload, 800);
}
// Quitter en pleine partie : le score en cours compte comme une fin de partie (record enregistré s'il est battu)
function quitGame() {
  if (current && !current.over && current.inst && current.inst.currentScore) {
    let sc = 0;
    try { sc = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (e) { sc = 0; }
    if (sc > 0) {
      current.over = true;
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
  $('jdw-mute').textContent = muted ? 'Muet' : 'Son';
  $('jdw-mute').setAttribute('aria-label', muted ? 'Activer le son' : 'Couper le son');
  if (Audio.master) Audio.master.gain.value = muted ? 0 : 0.6;
  if (muted && criAudio) { try { criAudio.pause(); } catch (e) {} }
  for (const g of GAMES) if (g.setMuted) { try { g.setMuted(muted); } catch (e) {} }
}
$('jdw-mute').addEventListener('click', () => { muted = !muted; store.set('jdw.muted', muted); Audio.ensure(); syncMute(); });

/* ================= 1re place affichée pendant toute la partie ================= */
const REC = { leader: '', score: -1, passed: '', flashUntil: 0 };
function recReset() { REC.leader = ''; REC.score = -1; REC.passed = ''; REC.flashUntil = 0; }
function recLine() {
  const el = $('jdw-recline');
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
async function showEnd(score) {
  flushPending();
  const g = current.game, me = cleanName(profile.name);
  const before = top(g.id);
  const myBest = knownBest(me, g.id);
  $('jdw-endcard').style.setProperty('--acc', g.accent);
  $('jdw-endgame').textContent = g.title + ' · partie terminée';
  $('jdw-endscore').textContent = fmt(score);
  $('jdw-endunit').textContent = g.scoreLabel === 'm' ? 'mètres' : (g.scoreLabel || 'points');
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
    // personne de battu : celui qui est juste devant se moque (sinon le premier du classement)
    const front = before.filter(r => r.name !== me && r.score >= score);
    ahead = front.slice().reverse().find(r => hasCri(r.name)) || null;
    if (ahead) { crier = ahead.name; cryMode = 'mock'; }
  }
  if (crier) {
    if (cryMode === 'mock') {
      const head = $('jdw-taunt-head'); head.textContent = ''; head.appendChild(chatHead(crier, { passive: true }));
      $('jdw-taunt-name').textContent = crier;
      const first = before[0] && before[0].name === crier;
      const says = first ? ['garde la 1re place et se moque de toi !', 'est toujours le roi de ce jeu…', 'reste premier et te chambre !']
                         : ['reste devant toi et se moque !', 'garde son avance et rigole…', 'te devance encore !'];
      $('jdw-taunt-say').textContent = ' ' + says[Math.floor(Math.random() * says.length)] + ' (' + fmt(ahead.score) + unit(g) + ')';
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

/* ================= Appli Android : retour + mise à jour ================= */
window.JDW_BACK = () => {
  if (chat.open) { closeChat(); return true; }
  if (!$('jdw-cri').hidden) { closeCri(); return true; }
  for (const id of ['jdw-photo', 'jdw-settings', 'jdw-board', 'jdw-rooms', 'jdw-notifs', 'jdw-profiles', 'jdw-members', 'jdw-welcome']) {
    if (!$(id).hidden) { if (id === 'jdw-photo') closePhoto(); else if (id !== 'jdw-welcome') closeSheet(id); else return true; return true; }
  }
  if (!$('jdw-play').hidden) { quitGame(); return true; }
  return false;
};
(async () => {
  const m = navigator.userAgent.match(/BorneArcade\/(\d+)/);
  if (!m) return;
  try {
    const r = await fetch('telecharger/version.json', { cache: 'no-store' });
    if (!r.ok) return;
    const v = await r.json();
    if (+v.versionCode > +m[1]) { $('jdw-update-txt').textContent = 'Version ' + v.versionName + ' disponible : touche ici pour la télécharger.'; $('jdw-update').hidden = false; }
  } catch (e) {}
})();

/* ================= Démarrage ================= */
['jdw-play', 'jdw-end', 'jdw-board', 'jdw-settings', 'jdw-welcome', 'jdw-photo', 'jdw-cheer', 'jdw-rooms', 'jdw-rotate', 'jdw-notifs', 'jdw-profiles', 'jdw-chat', 'jdw-cri', 'jdw-members'].forEach(id => { if ($(id)) $(id).hidden = true; });
if ($('jdw-pg')) $('jdw-pg').hidden = true;
$('jdw-lib').hidden = false;
syncOwnPlayer();
buildLibrary(); buildTabs(); syncMute(); refreshAll();
requestAnimationFrame(previewLoop);
if (document.fonts && document.fonts.load) { document.fonts.load('20px Bungee').catch(() => {}); document.fonts.load('600 14px "Chakra Petch"').catch(() => {}); }
if (!profile.name) startWelcome(); else if (ONLINE && !room) openRooms();
loadPlayers(); loadScores(); heartbeat(); loadChat();
if (ONLINE) { rtJoin('jdw-all'); if (room) rtJoin('jdw-room-' + room.id); rtConnect(); }
setTimeout(checkSiteVersion, 4000);
window.JDW_SHELL = { players, headsList };
})();
