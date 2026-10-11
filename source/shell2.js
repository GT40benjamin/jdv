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
  const p = { name, photo: photo || null, img: null, sad: null, sadUrl: '', sound: sound || null };
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
async function loadPlayers() {
  if (!ONLINE || !room) return;
  try {
    const rows = await rpc('get_players', Object.assign({ p_code: CODE() }, RP())) || [];
    serverOk = true;
    for (const r of rows) setPlayer(r.r_name, r.r_photo, r.r_sound || null);
    syncOwnPlayer();
    refreshAll();
  } catch (e) { serverOk = false; refreshAll(); }
}
async function pushProfile() {
  syncOwnPlayer();
  if (!ONLINE || !profile.name) return true;
  const args = { p_code: CODE(), p_name: profile.name, p_photo: profile.consent ? profile.photo : null, p_consent: !!profile.consent };
  if (profile.sound !== undefined && profile.sound !== null) args.p_sound = profile.sound;   // '' = retirer le cri
  try { await rpc('save_player', args); return true; }
  catch (e) { return false; }
}

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
    try {
      await rpc('add_score', Object.assign({ p_code: CODE() }, RP(), { p_game: game, p_name: name, p_score: score }));
      (remote[game] = remote[game] || []).push(entry); serverOk = true;
      loadScores();
      return 'shared';
    } catch (e) { return 'local'; }
  }
  return 'local';
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
const chat = { msgs: [], lastId: 0, ok: false, open: false, busy: false, pending: [], roomId: null };
let chatSeen = store.get('jdw.chatseen', {}) || {};
const chatKey = () => (room ? room.id : '-') + ':' + cleanName(profile.name);
const QUICK = ['👏', '😂', '🔥', '😭', '🏆', '🚽', 'GG !', 'Revanche ?'];
function chatReset() {
  chat.msgs = []; chat.lastId = 0; chat.pending = []; chat.roomId = room ? room.id : null;
  $('jdw-chat-log').textContent = ''; refreshChatBtn();
}
async function loadChat() {
  if (!ONLINE || !room || chat.busy) return;
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
    }
  } catch (e) { if (!chat.msgs.length) chat.ok = false; }
  finally { chat.busy = false; refreshChatBtn(); }
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
  if (g) {
    const go = document.createElement('button'); go.type = 'button'; go.className = 'cr-go'; go.textContent = 'Revanche';
    go.setAttribute('aria-label', 'Jouer à ' + g.title + ' pour reprendre le record');
    go.addEventListener('click', () => { closeChat(); if (!$('jdw-play').hidden) backToLibrary(); openGame(g); });
    el.append(go);
  }
  return el;
}
function renderChat(fromPoll) {
  const log = $('jdw-chat-log'), stick = !fromPoll || chatAtBottom() || !chat.open;
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
    col.appendChild(bub); row.appendChild(col); log.appendChild(row);
    prev = m;
  }
  if (stick) { log.scrollTop = log.scrollHeight; $('jdw-chat-new').hidden = true; }
  else if (fromPoll) $('jdw-chat-new').hidden = false;
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
  $('jdw-chat').hidden = false; document.body.classList.add('chat-open');
  renderBand(); renderChat(false); markChatSeen(); refreshChatBtn(); refreshChatOnline();
  loadChat();
  if (matchMedia('(pointer: fine)').matches) setTimeout(() => $('jdw-chat-input').focus({ preventScroll: true }), 60);
}
function closeChat() {
  if (!chat.open) return;
  chat.open = false; $('jdw-chat').hidden = true; document.body.classList.remove('chat-open');
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
setInterval(() => { if (!document.hidden && chat.open) loadChat(); }, 4000);
setInterval(() => { if (!document.hidden && !chat.open) loadChat(); }, 20000);

/* ================= Joueurs connectés ================= */
let counts = {}, total = 0, where = 'menu';
async function heartbeat() {
  if (!ONLINE || !profile.name || !room) return;
  try {
    const rows = await rpc('heartbeat', { p_code: CODE(), p_room: room.id, p_client: clientId, p_name: profile.name, p_game: where }) || [];
    counts = {}; total = 0;
    for (const r of rows) { counts[r.r_game] = r.r_count; total += r.r_count; }
    serverOk = true;
  } catch (e) { serverOk = false; }
  refreshOnline(); if (chat.open) refreshChatOnline();
}
function setWhere(w) { where = w; heartbeat(); }
setInterval(() => { if (!document.hidden) heartbeat(); }, 20000);
setInterval(() => { if (!document.hidden && !$('jdw-lib').hidden) loadScores(); }, 45000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) heartbeat(); });

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
    try { tl.g.preview(ctx, w, h, t); } catch (e) { ctx.fillStyle = COLORS.night; ctx.fillRect(0, 0, w, h); }
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
  for (const id of ['jdw-photo', 'jdw-settings', 'jdw-board', 'jdw-rooms', 'jdw-notifs', 'jdw-profiles']) if (!$(id).hidden) { if (id === 'jdw-photo') closePhoto(); else closeSheet(id); break; }
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
  if (changed && !profile.photo && isNewName(n)) offerPhoto();
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
function closeCri() { criStop(true); closeSheet('jdw-cri'); }
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
  profile.sound = CR.data; saveProfile(); syncOwnPlayer();
  closeCri(); refreshAll();
  const ok = await pushProfile();
  toastCheer(ok ? 'Ton cri est prêt : les copains vont l’entendre !' : 'Cri gardé sur cet appareil.', profile.name, true);
  setTimeout(() => playCri(profile.name), 300);
});
$('jdw-cri-del').addEventListener('click', async () => {
  profile.sound = ''; saveProfile(); syncOwnPlayer(); closeCri(); refreshAll();
  await pushProfile(); toastCheer('Ton cri est retiré.', profile.name, true);
});

/* ================= Bienvenue ================= */
function isNewName(n) { const p = players.get(cleanName(n)); return profile.askedFor !== cleanName(n) && !(p && p.photo); }
let adding = null;                                // profil précédent pendant l'ajout d'un joueur
function startWelcome() {
  $('jdw-step-name').hidden = false; $('jdw-step-photo').hidden = true;
  $('jdw-wel-cancel').hidden = !adding; $('jdw-wel-name').value = '';
  openSheet('jdw-welcome', 'jdw-wel-name');
}
function offerPhoto() {
  profile.askedFor = cleanName(profile.name); saveProfile();
  $('jdw-wel-hi').textContent = profile.name;
  $('jdw-step-name').hidden = true; $('jdw-step-photo').hidden = false;
  openSheet('jdw-welcome', 'jdw-wel-photo');
}
async function welcomeOk() {
  const n = cleanName($('jdw-wel-name').value);
  if (!n) { $('jdw-wel-name').focus(); return; }
  Audio.ensure();
  const existing = profiles.find(p => cleanName(p.name) === n && p.pid !== profile.pid);
  if (existing) { adding = null; closeSheet('jdw-welcome'); switchProfile(existing.pid); return; }
  const wasAdding = !!adding; adding = null;
  profile.name = n; saveProfile(); syncOwnPlayer(); refreshAll();
  if (wasAdding) afterSwitch();
  offerPhoto();
}
$('jdw-wel-cancel').addEventListener('click', () => {
  if (!adding) return;
  profile = adding; adding = null; store.set('jdw.profile', profile);
  closeSheet('jdw-welcome'); refreshAll();
});
function afterOnboarding() { if (ONLINE && !room && profile.name) setTimeout(openRooms, 250); }
$('jdw-wel-ok').addEventListener('click', welcomeOk);
$('jdw-wel-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); welcomeOk(); } });
$('jdw-wel-skip').addEventListener('click', () => { closeSheet('jdw-welcome'); afterOnboarding(); });
$('jdw-wel-photo').addEventListener('click', () => { closeSheet('jdw-welcome'); startPhoto(); });

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
    openSheet('jdw-photo', 'jdw-ph-zoom');
    drawCrop(); scheduleOut();
  };
  im.onerror = () => { URL.revokeObjectURL(url); };
  im.src = url;
});
function closePhoto() { $('jdw-photo').hidden = true; if (PH.img && PH.img.src.startsWith('blob:')) URL.revokeObjectURL(PH.img.src); PH.img = null; }
$('jdw-ph-cancel').addEventListener('click', () => { closePhoto(); afterOnboarding(); });
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
  profile.photo = data; profile.consent = true; profile.askedFor = cleanName(profile.name); saveProfile();
  players.delete(cleanName(profile.name)); syncOwnPlayer();
  closePhoto(); refreshAll();
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
  room = rm; store.set('jdw.room', room);
  players.clear(); syncOwnPlayer(); remote = {}; counts = {}; total = 0;
  $('jdw-joinbox').hidden = true; closeSheet('jdw-rooms');
  chatReset(); closeChat();
  refreshAll(); pushProfile(); loadPlayers(); loadScores(); heartbeat(); loadChat();
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
  try { current.inst = g.mount(root, api) || {}; } catch (e) { current.inst = {}; }
  setWhere(g.id);
}
function unmountGame() {
  if (!current) return;
  const { game, root, inst } = current;
  try { inst && inst.destroy && inst.destroy(); } catch (e) {}
  if (game.external) root.hidden = true; else root.remove();
  current = null;
  $('jdw-cheer').hidden = true;
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
}
$('jdw-back').addEventListener('click', backToLibrary);
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

/* ================= Fin de partie ================= */
// Score en attente : enregistré pour le joueur choisi (par défaut le joueur actuel, en quittant l'écran de fin).
let pending = null;
const knownBest = (name, game) => Math.max(bestOf(name, game), (top(game).find(r => r.name === cleanName(name)) || {}).score || 0);
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
    (res === 'shared' ? 'Enregistré dans le classement commun.' : 'Enregistré sur cet appareil.');
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
  const beaten = others.filter(r => score > r.score);
  const beat = $('jdw-beat'); beat.hidden = true; beat.classList.remove('has-cri'); beat.onclick = null;
  if (score > 0 && beaten.length) {
    const victim = beaten[0], wasFirst = before[0] && victim.name === before[0].name;
    const p = players.get(victim.name);
    $('jdw-beat-txt').innerHTML = '';
    const b = document.createElement('b'); b.textContent = (wasFirst ? 'Tu détrônes ' : 'Tu as battu ') + victim.name + ' !';
    $('jdw-beat-txt').append(b, (wasFirst ? 'Nouveau record de la bande. ' : '') + 'Son score : ' + fmt(victim.score) + unit(g) + (p && p.photo ? '. Snif, ' + victim.name + ' pleure !' : ''));
    if (p && p.photo) { $('jdw-beat-img').src = sadUrl(p); $('jdw-beat-img').hidden = false; } else $('jdw-beat-img').hidden = true;
    beat.hidden = false;
    Audio.tone(523, 0.12, 'square', 0.06); setTimeout(() => Audio.tone(784, 0.2, 'square', 0.06), 130);
  }
  // un copain crie : celui qu'on vient de battre (tête triste), sinon celui qui mène et se moque
  const taunt = $('jdw-taunt'); taunt.hidden = true;
  let crier = null, cryMode = '';
  if (score > 0 && beaten.length && hasCri(beaten[0].name)) { crier = beaten[0].name; cryMode = 'sad'; }
  else {
    const lead = before.find(r => r.name !== me && hasCri(r.name));
    const anyone = [...players.values()].filter(p => p.sound && p.name !== me);
    crier = lead ? lead.name : (anyone.length ? anyone[Math.floor(Math.random() * anyone.length)].name : null); cryMode = 'mock';
  }
  if (crier) {
    if (cryMode === 'mock') {
      const head = $('jdw-taunt-head'); head.textContent = ''; head.appendChild(chatHead(crier, { passive: true }));
      $('jdw-taunt-name').textContent = crier;
      const says = ['se moque de toi !', 'rigole bien…', 'te chambre !', "t'a vu perdre !", 'est mort de rire'];
      $('jdw-taunt-say').textContent = ' ' + says[Math.floor(Math.random() * says.length)];
      taunt.hidden = false; taunt.onclick = () => playCri(crier, head.firstChild);
      setTimeout(() => { if (!$('jdw-end').hidden) playCri(crier, head.firstChild); }, 450);
    } else {
      $('jdw-beat').classList.add('has-cri'); $('jdw-beat').onclick = () => playCri(crier, $('jdw-beat-img'));
      setTimeout(() => { if (!$('jdw-end').hidden) playCri(crier, $('jdw-beat-img')); }, 450);
    }
  }
  const st = $('jdw-status'), record = score > 0 && score > myBest;
  pending = score > 0 ? { game: g.id, score, record, done: false } : null;
  if (record) st.textContent = (before.length === 0 ? 'Premier record de ce jeu ! ' : 'Nouveau record perso ! ') + 'Il sera enregistré pour ' + me + '.';
  else st.textContent = myBest ? 'Ton record : ' + fmt(myBest) + unit(g) + '. Encore un effort !' : 'Pas de points cette fois. Retente ta chance !';
  if (pending) buildWho(record); else $('jdw-who').hidden = true;
  $('jdw-end').hidden = false;
  renderEndBoard(g, me);
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
  for (const id of ['jdw-photo', 'jdw-settings', 'jdw-board', 'jdw-rooms', 'jdw-notifs', 'jdw-profiles', 'jdw-welcome']) {
    if (!$(id).hidden) { if (id === 'jdw-photo') closePhoto(); else if (id !== 'jdw-welcome') closeSheet(id); else return true; return true; }
  }
  if (!$('jdw-play').hidden) { backToLibrary(); return true; }
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
['jdw-play', 'jdw-end', 'jdw-board', 'jdw-settings', 'jdw-welcome', 'jdw-photo', 'jdw-cheer', 'jdw-rooms', 'jdw-rotate', 'jdw-notifs', 'jdw-profiles', 'jdw-chat', 'jdw-cri'].forEach(id => { if ($(id)) $(id).hidden = true; });
if ($('jdw-pg')) $('jdw-pg').hidden = true;
$('jdw-lib').hidden = false;
syncOwnPlayer();
buildLibrary(); buildTabs(); syncMute(); refreshAll();
requestAnimationFrame(previewLoop);
if (document.fonts && document.fonts.load) { document.fonts.load('20px Bungee').catch(() => {}); document.fonts.load('600 14px "Chakra Petch"').catch(() => {}); }
if (!profile.name) startWelcome(); else if (ONLINE && !room) openRooms();
loadPlayers(); loadScores(); heartbeat(); loadChat();
window.JDW_SHELL = { players, headsList };
})();
