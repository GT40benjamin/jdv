(() => {
'use strict';
const $ = id => document.getElementById(id);
// hasard de la bibliothèque (musique, messages…) : séparé de celui des jeux, qui peut être fixé (mode Local : même partie pour tous)
const shellRand = Math.random.bind(Math);
const ORDER = ['neon', 'smoothie', 'ilo', 'magic', 'pegase', 'pleingaz', 'empilo', 'glouton', 'mouches', 'carreaux', 'rouleaux', 'canards'];
// Étiquettes des tuiles : « Nouveau » (jeu ou duel ajouté) ou « Mis à jour » (refonte) jusqu'à ce que le joueur l'ouvre.
// id du jeu ou du duel → { kind: 'new' | 'maj', at: 'AAAA-MM-JJ HH:MM' } ; une date plus récente fait revenir l'étiquette, qui s'efface
// seule au bout de NEWS_DAYS jours. Les boutons Classique / Duel disent « nouveau » / « mis à jour » tant qu'une de leurs tuiles en a une.
const TILE_NEWS = {
  magic: { kind: 'maj', at: '2026-10-20 23:40' },   // 6 mondes tous différents, le Jardin et le Vieux Chêne, grande victoire (chantier 24 ; heure = celle de la publication)
  ilo: { kind: 'new', at: '2026-10-12 00:27' },
  glouton: { kind: 'maj', at: '2026-10-13 00:55' },
  empilo: { kind: 'maj', at: '2026-10-14 12:10' },
  mouches: { kind: 'maj', at: '2026-10-14 12:43' },
  rouleaux: { kind: 'maj', at: '2026-10-14 13:32' },
  carreaux: { kind: 'maj', at: '2026-10-14 17:45' },
  pingpong: { kind: 'new', at: '2026-10-15 00:20' },
  'coop-boum': { kind: 'new', at: '2026-10-15 06:00' },   // mode Coop : Boum 2 contre 2 (1.14)
  'coop-ilo': { kind: 'new', at: '2026-10-15 08:00' },   // mode Coop : Galaxy Wars à deux (1.15)
  'coop-magic': { kind: 'maj', at: '2026-10-20 23:40' },   // Magic Force à deux : les mêmes 6 mondes (chantier 24 ; heure = celle de la publication)
  toupies: { kind: 'new', at: '2026-10-24 14:13' },   // Turbo Toupies (duel 3D, en essai derrière la porte labo)
  bolides: { kind: 'new', at: '2026-10-24 14:13' },   // Bolides RC (duel course de voitures, en essai derrière la porte labo ; heure = celle de la publication)
  neon: { kind: 'new', at: '2026-10-24 14:13' },   // Néon Rush (Classique, jeu de rythme, en essai derrière la porte labo ; heure = celle de la publication)
  smoothie: { kind: 'new', at: '2026-10-24 14:13' },   // Smoothie Samouraï (Classique, en essai derrière la porte labo ; heure = celle de la publication)
  tirsaubut: { kind: 'new', at: '2026-10-24 14:13' },   // Tirs au But (duel penaltys, en essai derrière la porte labo ; heure = celle de la publication)
  kombat: { kind: 'new', at: '2026-10-16 09:00' },   // Mandale Kombat sorti pour tous (1.17)
  pegase: { kind: 'maj', at: '2026-10-22 08:11' }   // Pégase 0.9.2 : appels entre copains, maisons des copains, réveil chez soi (1.25.2 ; heure = celle de la publication)
};
const NEWS_DAYS = 30;
const NEW_GAMES = new Set(Object.keys(TILE_NEWS).filter(id => TILE_NEWS[id].kind === 'new'));
// Porte « labo » : un jeu en essai n'apparaît que sur les appareils ouverts une fois avec …/jouer/?labo=<id> (retenu sur l'appareil,
// ?labo=aucun pour tout cacher). Dans l'appli Android (pas de barre d'adresse) : 7 touches rapides sur le titre « Borne d'arcade ».
const LABO = new Set(['iles']);   // en essai : Pégase en îles (onglet à gauche, page des îles) ; sortis pour tous le 2026-10-24 : Turbo Toupies, Tirs au But, Smoothie Samouraï, Néon Rush, Bolides RC
// ménage de la copie magicv1 retirée (18 oct.) : ses réglages jdw.magicv1.* et son entrée dans jdw.labo (jamais jdw.magic.*)
try { for (const k of Object.keys(localStorage)) if (k.startsWith('jdw.magicv1.')) localStorage.removeItem(k);
  const l = JSON.parse(localStorage.getItem('jdw.labo') || '[]'); if (Array.isArray(l) && l.includes('magicv1')) localStorage.setItem('jdw.labo', JSON.stringify(l.filter(x => x !== 'magicv1'))); } catch (e) {}
const LABO_ON = (() => {
  let on = []; try { on = JSON.parse(localStorage.getItem('jdw.labo') || '[]') || []; } catch (e) { on = []; }
  try {
    const q = new URLSearchParams(location.search).get('labo');
    if (q) { on = q === 'aucun' ? [] : [...new Set(on.concat(q.split(',').filter(x => /^[a-z0-9_-]{2,20}$/.test(x))))]; localStorage.setItem('jdw.labo', JSON.stringify(on)); }
  } catch (e) {}
  return new Set(on);
})();
// appareil en mode test (au moins un jeu en essai ouvert) : il voit TOUS les jeux en essai, même ceux ajoutés depuis
const LABO_TEST = [...LABO].some(id => LABO_ON.has(id)) || [...LABO_ON].some(id => ['toupies', 'tirsaubut', 'smoothie', 'neon', 'bolides'].includes(id));   // les appareils déjà en test le restent
const laboOk = id => !LABO.has(id) || LABO_TEST;
const GAMES = ORDER.map(id => (window.JDW_GAMES || {})[id]).filter(g => g && laboOk(g.id));
// mode essai (labo) actif sur cet appareil : le titre le dit (« Borne d'arcade test » au lieu de « entre amis »)
(() => { const p = document.querySelector('.lib-title .plaque'); if (p && LABO_TEST) { p.textContent = 'test'; p.classList.add('plaque-test'); } })();
(() => {
  const t = document.querySelector('.lib-title'); if (!t) return;
  let n = 0, t0 = 0;
  t.addEventListener('click', () => {
    const now = Date.now(); if (now - t0 > 4000) n = 0; t0 = now;
    if (++n < 7) return; n = 0;
    if (!LABO.size) return;   // aucun jeu en essai : pas de message « Labo » ni de rechargement
    const ids = [...LABO], on = new Set(LABO_ON), has = ids.every(id => on.has(id));   // un nouveau jeu en essai s'ajoute à ceux déjà ouverts
    for (const id of ids) { if (has) on.delete(id); else on.add(id); }
    try { localStorage.setItem('jdw.labo', JSON.stringify([...on])); } catch (e) {}
    try { toastCheer(has ? 'Labo : jeux en essai cachés' : 'Labo : jeux en essai activés !', null, true); } catch (e) {}
    setTimeout(() => location.reload(), 1300);
  });
})();
const gameById = id => GAMES.find(g => g.id === id);
// jeux de duel (deux joueurs face à face) : modules source/duos/*.js, contrat DUO-CONTRACT.md
const DUO_ORDER = ['bolides', 'tirsaubut', 'toupies', 'kombat', 'pingpong', 'trouve', 'palet', 'briques', 'boum', 'souris', 'spatial', 'mots', 'guerre'];
const DUOS = DUO_ORDER.map(id => (window.JDW_DUOS || {})[id]).filter(d => d && laboOk(d.id));   // duels en essai : porte labo aussi
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
  try { coopBadge(section(coopTiles)); } catch (e) {}   // 3e section : jeux à deux (ids coop-<id>), « bientôt » tant que la liste est vide
  // mode test : Pégase est à part (onglet du bas) : SA nouveauté va sur son onglet
  let c = ''; try { const pb = document.querySelector('#jdw-modes [data-mode="pegase"]'); if (pb && !pb.hidden) c = tileNews('pegase') || ''; } catch (e) {}
  for (const [id, k] of [['jdw-cls-badge', a], ['jdw-duo-badge', b], ['jdw-pg-badge', c]]) {
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

/* ================= Manette (Xbox, PlayStation, manettes génériques : source/manette.js) =================
   La navigation de toute la borne (focus doré, A valider, B retour, gâchettes = onglets, Start = pause), api.pad des jeux
   (CONTRACT.md « Ajout 10 »), la carte pause des jeux solo, les commandes de chaque jeu (g.pad.help), les vibrations (⚙). */
const PADJ = window.JDW_PAD || null;
const PAD_DOM = new Set(['pegase']);       // « jeux » qui sont des pages (hub de Pégase) : la manette y navigue comme dans la borne
const PADP = { open: false, g: null, by: '' };
// à qui la manette ? un jeu tourne et rien n'est par-dessus → au jeu
function padCapturing() {
  if (!$('jdw-duo').hidden) return !!DUO.inst && !DUO.paused && !DUO.over && $('jdw-duo-res').hidden && $('jdw-duo-pause').hidden && !DUO.waitRot;
  if ($('jdw-play').hidden || !current || !current.inst || current.over || PADP.open || QA.open) return false;
  if (current.coop) return !COOP.paused && !COOP.over && $('jdw-coop-pause').hidden && $('jdw-coopend').hidden;
  if (PAD_DOM.has(current.game.id)) return false;
  return $('jdw-end').hidden && $('jdw-rotate').hidden;
}
// les manettes de chaque joueur d'un duel : 2 manettes = 2 joueurs ; une seule : du côté choisi (jdw.padside, en bas par défaut) ;
// contre l'IA ou en ligne : toutes les manettes pour MON joueur
let padSide = store.get('jdw.padside', 0) === 1 ? 1 : 0, padSwap = !!store.get('jdw.padswap', false);
function padDuoSlots(me) {
  return p => {
    const L = PADJ ? PADJ.pads() : [];
    if (me !== undefined) return p === me ? L : [];
    if (L.length === 1) return p === padSide ? L : [];
    const a = padSwap ? [L[1], L[0]] : [L[0], L[1]];
    return a[p] ? [a[p]] : [];
  };
}
function padApi(opts) {
  if (!PADJ) return undefined;
  try { return PADJ.gameApi(opts); } catch (e) { return undefined; }
}
function padClose(a) { try { if (a && a.close) a.close(); } catch (e) {} }
// ---------- carte pause des jeux solo (Start / Options) ----------
function padHelpOf(g) { return (g && g.pad && Array.isArray(g.pad.help) && g.pad.help.length) ? g.pad.help : null; }
function padHelpInto(box, g) {
  if (!box) return;
  box.textContent = '';
  const h = padHelpOf(g); box.hidden = !h || !PADJ;
  if (!h || !PADJ) return;
  const t = document.createElement('p'); t.className = 'pad-help-h'; t.append('🎮 Commandes'); box.append(t);
  // deux manettes de sortes différentes (duel Xbox contre PlayStation) : les deux jeux de glyphes, côte à côte
  const kinds = [...new Set(PADJ.pads().map(P => P.kind))];
  if (kinds.length < 2) { box.appendChild(PADJ.helpList(h, kinds[0] || PADJ.kind())); box.classList.remove('two'); return; }
  box.classList.add('two');
  const NM = { xbox: 'Xbox', ps: 'PlayStation', nin: 'Nintendo', gen: 'Manette' };
  const row = document.createElement('div'); row.className = 'pad-help-two';
  for (const k of kinds.slice(0, 2)) { const c = document.createElement('div'); const n = document.createElement('small'); n.textContent = NM[k] || k; c.append(n, PADJ.helpList(h, k)); row.appendChild(c); }
  box.appendChild(row);
}
function padPauseOpen(by) {
  if (!current || current.coop || PADP.open) return;
  const inst = current.inst || {};
  PADP.open = true; PADP.g = current.game; PADP.by = by || '';
  try { if (inst.pause) inst.pause(); else padKey('p'); } catch (e) {}
  $('jdw-padpause').style.setProperty('--acc', current.game.accent || COLORS.amber);
  $('jdw-padpause-game').textContent = current.game.title;
  padHelpInto($('jdw-padpause-help'), current.game);
  $('jdw-padpause').hidden = false; musicBaseLevel(0.4);
  setTimeout(() => { if (PADP.open) $('jdw-padpause-resume').focus({ preventScroll: true }); if (PADJ) PADJ.autoFocus(); }, 40);
}
function padPauseClose(resume) {
  if (!PADP.open) return;
  PADP.open = false; $('jdw-padpause').hidden = true; musicBaseLevel(0.8);
  if (resume && current && current.inst) { const inst = current.inst; try { if (current.pad) current.pad.flush(); } catch (e) {} try { if (inst.resume) inst.resume(); else padKey('p'); } catch (e) {} }
  if (PADJ) PADJ.blur(true);
}
// jeu sans pause()/resume() : on lui envoie la touche P (sa pause à lui)
function padKey(k) {
  for (const t of ['keydown', 'keyup']) { try { window.dispatchEvent(new KeyboardEvent(t, { key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, bubbles: true })); } catch (e) {} }
}
$('jdw-padpause-resume').addEventListener('click', () => padPauseClose(true));
$('jdw-padpause-quit').addEventListener('click', () => { padPauseClose(false); quitGame(); });
// ---------- commandes montrées au début d'une partie (3 premières fois par jeu, quand on joue à la manette) ----------
let padIntroT = 0;
function padIntro(g, where, ready) {
  const el = $('jdw-padintro'); clearTimeout(padIntroT); el.hidden = true;
  if (!PADJ || !PADJ.active() || !padHelpOf(g) || (g.pad && g.pad.intro === false)) return;   // pad.intro: false = le jeu montre lui-même ses commandes
  if (g.pad && g.pad.intro === 'ready' && !ready) return;                                     // 'ready' : après api.pad.showHelp() (fin du chargement du jeu)
  const k = 'jdw.padintro.' + g.id, n = +store.get(k, 0) || 0; if (n >= 3) return;
  store.set(k, n + 1);
  padHelpInto($('jdw-padintro-help'), g);
  el.style.setProperty('--acc', g.accent || COLORS.amber);
  (where || $('jdw-play')).appendChild(el);
  el.hidden = false; el.classList.remove('out');
  padIntroT = setTimeout(padIntroHide, 5200);
}
function padIntroHide() { const el = $('jdw-padintro'); if (el.hidden) return; el.classList.add('out'); clearTimeout(padIntroT); padIntroT = setTimeout(() => { el.hidden = true; el.classList.remove('out'); }, 320); }
// ---------- manettes du duel : qui a quelle manette ----------
function renderPadSeats() {
  const box = $('jdw-padseats'); if (!box) return;
  const n = PADJ ? PADJ.count() : 0, ai = seatName(1) === AI_NAME;
  box.hidden = !n || DUEL_WHERE !== 'local';
  if (box.hidden) return;
  box.textContent = '';
  const lab = document.createElement('span'); lab.className = 'ps-lab'; lab.textContent = n > 1 ? '🎮 ' + n + ' manettes' : '🎮 Manette'; box.appendChild(lab);
  const mk = (txt, fn, on) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ps-btn' + (on ? ' on' : ''); b.textContent = txt; b.addEventListener('click', fn); box.appendChild(b); return b; };
  if (ai) { const s = document.createElement('span'); s.className = 'ps-note'; s.textContent = 'toutes pour ' + dispName(seatPlayer(0).name) + ' (en bas)'; box.appendChild(s); return; }
  if (n === 1) {
    mk('En bas · ' + dispName(seatPlayer(0).name), () => { padSide = 0; store.set('jdw.padside', 0); renderPadSeats(); }, padSide === 0);
    mk('En haut · ' + dispName(seatPlayer(1).name), () => { padSide = 1; store.set('jdw.padside', 1); renderPadSeats(); }, padSide === 1);
    const s = document.createElement('span'); s.className = 'ps-note'; s.textContent = TOUCH ? 'l\'autre joue au doigt' : 'branche une 2e manette pour jouer à deux'; box.appendChild(s);
  } else {
    const s = document.createElement('span'); s.className = 'ps-note'; s.textContent = padSwap ? 'manette 2 en bas, manette 1 en haut' : 'manette 1 en bas, manette 2 en haut'; box.appendChild(s);
    mk('⇅ Échanger', () => { padSwap = !padSwap; store.set('jdw.padswap', padSwap); renderPadSeats(); }, false);
  }
}
// sur ordinateur sans écran tactile : avec une manette (ou deux), les duels se jouent aussi sur le même écran
function duelLocalOK() { return TOUCH || !!(PADJ && PADJ.count()); }
// ---------- les crochets de la navigation ----------
if (PADJ) {
  PADJ.setup({
    capturing: padCapturing,
    base: () => !$('jdw-duo').hidden ? $('jdw-duo') : !$('jdw-play').hidden ? $('jdw-play') : $('jdw-lib'),
    back: () => { padIntroHide(); jdwBack(); },   // (B pendant « Quitter la partie ? » : Continuer)
    start: (kind, nav) => {
      padIntroHide();
      if (nav) {   // pas de jeu qui capte la manette : Start referme la pause
        if (QA.open) { quitAskClose(false); return true; }
        if (PADP.open) { padPauseClose(true); return true; }
        if (!$('jdw-duo-pause').hidden) { duoResume(); return true; }
        if (!$('jdw-coop-pause').hidden) { coopResume('me'); return true; }
        return false;
      }
      if (!$('jdw-duo').hidden) { duoPause(); return true; }
      if (current && current.coop) { coopPause('me'); return true; }
      if (current) { padPauseOpen(kind); return true; }
      return false;
    },
    modes: d => {
      if ($('jdw-lib').hidden) return false;
      const M = ['classique', 'duel', 'coop'], i = Math.max(0, M.indexOf(MODE));
      setMode(M[(i + d + M.length) % M.length], true); return true;
    },
    defaultFocus: (layer, list) => {
      const pick = (...ids) => { for (const id of ids) { const e = $(id); if (e && list.includes(e)) return e; } return null; };
      if (!layer) {
        if (!$('jdw-lib').hidden) { const grid = MODE === 'duel' ? $('jdw-duo-grid') : MODE === 'coop' ? $('jdw-coop-grid') : $('jdw-grid'); const t = list.find(e => grid && grid.contains(e) && e.classList.contains('tile')); if (t) return t; }
        return null;
      }
      return pick('jdw-quitask-stay', 'jdw-again', 'jdw-coopend-again', 'jdw-padpause-resume', 'jdw-duo-resume', 'jdw-coop-resume', 'jdw-coopgo-go', 'jdw-natif-go', 'jdw-rescue-ok') || list.find(e => e.matches('.dr-btns .btn-play')) || null;
    },
    onPads: () => {
      try { setDuelWhere(DUEL_WHERE); } catch (e) {}
      try { renderPadSeats(); } catch (e) {}
      const r = $('jdw-set-padvib-row'); if (r) r.hidden = !PADJ.seen();
    },
    onMode: m => { if (m !== 'pad') padIntroHide(); },
    // Y sur une tuile qui a une carte d'avancement : la carte ; X : « 👁 Voir » (un copain joue à ce jeu)
    button: (k, f) => {
      const w = f && f.closest && f.closest('.tile-wrap'); if (!w) return;
      const btn = w.querySelector(k === 'y' ? '.tile-map' : '.tile-watch');
      if (btn && btn.getClientRects().length && !btn.disabled) btn.click();
    },
    sound: k => { try { if (k === 'move') Audio.tone(1320, 0.025, 'sine', 0.012); else if (k === 'ok') Audio.tone(990, 0.04, 'sine', 0.02, 1320); else if (k === 'tab') Audio.tone(660, 0.05, 'sine', 0.02, 990); } catch (e) {} },
    error: e => reportError('Manette : ' + e.message, e.stack, { quiet: true })
  });
  // un bouton de la manette pendant les commandes du début : elles s'en vont
  PADJ.gameApi({ slots: () => PADJ.pads() }).on((b, p, down) => { if (down && !$('jdw-padintro').hidden && /^(a|b|x|y)$/.test(b)) padIntroHide(); });
}
// ⚙ : vibrations de la manette (oui / non), ligne visible dès qu'une manette a servi sur l'appareil
(() => {
  const r = $('jdw-set-padvib-row'), cb = $('jdw-set-padvib'); if (!r || !cb) return;
  r.hidden = !(PADJ && PADJ.seen()); cb.checked = !PADJ || PADJ.vibOn();
  cb.addEventListener('change', () => { if (PADJ) PADJ.setVib(cb.checked); });
})();


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
// aux duels sur l'appareil (ou contre l'IA), sans score enregistré, sans salle, chat, direct, duel en ligne, coop en ligne ni « regarder »,
// sans pseudo, tête ni cri (les jeux montrent des personnages neutres). Mode local (pas de serveur : tests) : jamais invité.
function isGuest() {      // = acctState(profile) !== 'on', sans dépendre de l'ordre de chargement
  if (!ONLINE) return false;
  if (!ACCT.ready) return true;
  const a = profile && profile.acct, se = a && a.uid ? ACCT.s[a.uid] : null;
  return !(profile && profile.name && se && se.rt);
}
// seules fonctions du serveur permises à un invité (toutes les autres sont refusées ici, sans appel réseau)
const GUEST_RPC = new Set(['pg_island_list', 'pg_island_watch', 'pg_island_request', 'pg_island_request_state', 'check_name', 'login_name', 'recover_hint', 'log_error', 'get_world_scores', 'get_my_players', 'claim_name', 'invite_info', 'get_world_coop_scores']);
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

// Tête fabriquée par un jeu (Pégase : portrait de l'avatar 3D, détouré, 160 × 200) : même chemin que la photo des réglages (« ✓ » de
// #jdw-ph-ok) : profil principal (save_player) ou seulement la salle actuelle (save_room_look). Jamais pour un invité. Renvoie
// { ok, sent } (sent = false : gardée sur l'appareil, renvoyée plus tard) ou { ok: false, why: 'guest' | 'image' }.
function gamePhotoInfo() { return { guest: isGuest() || !profile.name, room: ONLINE && room && profile.name && !isGuest() ? String(room.name || '') : '' }; }
async function gameSetPhoto(data, scope) {
  if (isGuest() || !profile.name) return { ok: false, why: 'guest' };
  if (typeof data !== 'string' || !/^data:image\/(webp|png);base64,[A-Za-z0-9+/=]+$/.test(data) || data.length > 120000) return { ok: false, why: 'image' };
  const rid = scope === 'room' && ONLINE && room ? room.id : null;
  if (rid != null) {
    const L = lookTouch(rid); L.photo = data; L.photoBase = null; L.photoAcc = null; saveProfile();
    players.delete(cleanName(profile.name)); syncOwnPlayer(); refreshAll();
    const sent = await pushRoomLook() && !roomLookMissing;
    return { ok: true, sent };
  }
  profile.photo = data; profile.photoBase = null; profile.photoAcc = null; profile.consent = true; profile.askedFor = cleanName(profile.name); saveProfile();
  players.delete(cleanName(profile.name)); syncOwnPlayer(); refreshAll();
  const sent = await pushProfile();
  return { ok: true, sent };
}

// Hub de Pégase (CONTRACT.md, Ajout 8 : api.pegase) : les copains de la salle (membres, en ligne, têtes déjà filtrées par le serveur),
// et quelques fonctions Pégase du serveur (pegase.sql), toujours au nom du joueur actuel (p_name) dans la salle actuelle (p_room).
// Phase 2b (1.19.12) : pg_unlock_buy (acheter une pièce verrouillée, prix du serveur) et les catalogues pg_unlock_catalog / pg_mission_catalog
// (compte connecté, SANS p_name : seulement p_code). Pas de pg_claim ici : les missions se récupèrent dans le jeu.
// 1.19.15 : pg_link_make (carte « Connecter le jeu Pégase » de l'onglet Moi) : code à usage unique pour le compte de la borne, échangé par
// le jeu (Edge Function pegase-redeem) ; p_code + p_name de la borne. 1.19.18 : CODE COURT par défaut (8 caractères « K7Q2-9MXA », 120 s,
// à taper) ; seul argument du hub transmis : p_long = true (billet LONG de 64 hexadécimaux, 60 s, pour les passages appli → appli).
// 1.21.x (SMS, sms.sql) : pg_sms_list / pg_sms_thread / pg_sms_send / pg_sms_read (carte « Messages » de l'onglet Amis) ; arguments filtrés
// ici (adresse « p:PSEUDO » / « pnj:id », texte ≤ 500, id fabriqué par le hub) ; onSms(fn) = signal du canal PRIVÉ jdw-sms-<pseudo en hexa>
// (le serveur y envoie { t: 'sms' } SANS contenu ; le hub relit par RPC) ; rend la fonction pour se désabonner.
// 20 oct. (RÉACTIONS, sms-reactions.sql) : pg_sms_react (p_msg = id d'appareil du message ≤ 64, p_emoji ≤ 16 ou null = retirer ; la liste
// fermée des 6 réactions est vérifiée par le serveur) ; has(fn) = la borne laisse-t-elle passer cette fonction (le hub cache la barre sinon).
// 21 oct. (MAISONS DES COPAINS, maisons-salle.sql) : pg_room_maisons = maisons des autres membres de la salle actuelle (lecture seule ; plan
// {v, p, lot} + parcelle « plot ») ; AUCUN argument du hub transmis : p_code + p_name + p_room = la salle actuelle, comme pg_room_avatars.
// 22 oct. (APPELS entre copains, ~/jdv-tools/pegase/server/appels.sql + APPELS-CONTRAT.md) : pg_appel_lancer / sonne / repondre / fin / attente
// (arguments filtrés : pgAppelArgs) ; onAppel(fn) = signal { t: 'appel' } SANS contenu du canal PRIVÉ des messages (le hub relit
// pg_appel_attente) ; voixAppel(id) = jeton LiveKit de la salle « pegase-appel-<id> » (Edge Function pegase-voix, jeton du compte du joueur
// actuel ; le serveur vérifie que l'appel est décroché et que j'en fais partie). 23 oct. (demande de l'utilisateur : « ils nous voient normal
// depuis la borne et en avatar depuis Pégase ») : pegase-voix v3 = micro ET caméra dans la salle d'un appel ; p_video = true quand la borne
// appelle avec sa caméra ; livekit() = le client LiveKit (copie locale publiée avec la borne) ; appelPris() = l'appel que je viens de
// décrocher sur le bandeau de la borne (plus bas : « appels partout dans la borne »), que le hub prend en main.
const PG_RPC = new Set(['pg_me', 'pg_get_doc', 'pg_put_doc', 'pg_room_avatars', 'pg_room_maisons', 'pg_unlock_buy', 'pg_unlock_catalog', 'pg_mission_catalog', 'pg_link_make',
  'pg_sms_list', 'pg_sms_thread', 'pg_sms_send', 'pg_sms_read', 'pg_sms_react', 'pg_appel_lancer', 'pg_appel_sonne', 'pg_appel_repondre', 'pg_appel_fin', 'pg_appel_attente']);
const pgStr = (v, n) => String(v == null ? '' : v).slice(0, n);
const pgCallId = v => (/^c[0-9a-f]{20}$/.test(String(v || '')) ? String(v) : '');
function pgAppelArgs(fn, x) {
  x = x || {};
  if (fn === 'pg_appel_lancer') return { p_to: pgStr(x.p_to, 40), p_id: pgCallId(x.p_id), p_video: x.p_video === true };
  if (fn === 'pg_appel_sonne' || fn === 'pg_appel_fin') return { p_id: pgCallId(x.p_id) };
  if (fn === 'pg_appel_repondre') return { p_id: pgCallId(x.p_id), p_oui: x.p_oui === true, p_raison: ['refuse', 'occupe', 'manque'].includes(x.p_raison) ? x.p_raison : null };
  return {};
}
const APPEL_SUBS = new Set();
async function pgVoixAppel(id) {
  const a = pgCallId(id); if (!a) throw new Error('pegase.voixAppel : appel inconnu');
  if (isGuest() || !profile.name || !ONLINE) throw Object.assign(new Error('pegase.voixAppel : compte requis'), { guest: true });
  const tok = await acctToken(profile); if (!tok) throw Object.assign(new Error('pegase.voixAppel : compte requis'), { guest: true });
  const r = await netFetch(CFG.url.replace(/\/+$/, '') + '/functions/v1/pegase-voix', { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_name: profile.name, p_appel: a, p_cid: 'borne-' + String(clientId).replace(/[^A-Za-z0-9_-]/g, '').slice(1, 13) }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j || !j.token || !j.url) throw Object.assign(new Error('pegase.voixAppel ' + r.status + ' ' + String((j && j.error) || '').slice(0, 80)), { status: r.status });
  return { token: String(j.token), url: String(j.url), room: String(j.room || ''), identity: String(j.identity || '') };
}
// le client LiveKit des appels (livekit-client 2.22.3, licence Apache-2.0) : copie LOCALE publiée avec la borne (assets/), chargée au 1er appel
const LK_LOCAL = 'assets/livekit-client-2.22.3.umd.js';
let lkWait = null;
function livekitLoad() {
  if (window.LivekitClient && window.LivekitClient.Room) return Promise.resolve(window.LivekitClient);
  if (lkWait) return lkWait;
  lkWait = new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = ROOT + LK_LOCAL; s.async = true;
    const t = setTimeout(() => ko(new Error('appel : client trop long')), 25000);
    s.onload = () => { clearTimeout(t); if (window.LivekitClient && window.LivekitClient.Room) ok(window.LivekitClient); else ko(new Error('appel : client absent')); };
    s.onerror = () => { clearTimeout(t); ko(new Error('appel : chargement raté')); };
    document.head.appendChild(s);
  });
  lkWait.catch(() => { lkWait = null; });
  return lkWait;
}
function pgSmsArgs(fn, x) {
  x = x || {};
  if (fn === 'pg_sms_send') return { p_to: pgStr(x.p_to, 40), p_body: pgStr(x.p_body, 2000), p_id: pgStr(x.p_id, 64) };
  if (fn === 'pg_sms_thread') return { p_with: pgStr(x.p_with, 40), p_before: Number.isSafeInteger(x.p_before) && x.p_before > 0 ? x.p_before : null, p_limit: Math.max(1, Math.min(100, x.p_limit | 0 || 30)) };
  if (fn === 'pg_sms_read') return { p_with: pgStr(x.p_with, 40) };
  if (fn === 'pg_sms_react') return { p_msg: pgStr(x.p_msg, 64), p_emoji: x.p_emoji == null || x.p_emoji === '' ? null : pgStr(x.p_emoji, 16) };
  return {};
}
const SMS_SUBS = new Set();
const smsHex = n => Array.from(new TextEncoder().encode(n), b => b.toString(16).padStart(2, '0')).join('');
let smsTopicOn = null;
function smsTopicSync() {
  const want = !isGuest() && profile.name && ONLINE ? 'jdw-sms-' + smsHex(cleanName(profile.name)) : null;   // toujours : un appel peut sonner partout
  if (want === smsTopicOn) return;
  if (smsTopicOn) rtLeave(smsTopicOn);
  smsTopicOn = want;
  if (want) { RT.topics.add(want); if (RT.ws && RT.ws.readyState === 1) rtJoin(want); else rtConnect(); }
}
const PG_RPC_CAT = new Set(['pg_unlock_catalog', 'pg_mission_catalog']);
// PEGAGRAM (21 oct. 2026, avec Pégase 0.9 — atelier ~/jdv-tools/pegase/borne/hub/pegagram ; serveur ~/jdv-tools/pegase/server/pegagram.sql) : le réseau photo
// du hub. Fonctions pg_gram_* (arguments filtrés ici ; catalogue et gardien SANS p_name), photos du Storage PRIVÉ « pegase » (ph/<uuid>/g|m.jpg,
// jeton du compte, gardées dans le cache « jdw-pg-photos » : une photo ne change jamais), signal { t: 'gram' } du canal de la salle.
const PG_GRAM = new Set(['pg_gram_catalogue', 'pg_gram_fil', 'pg_gram_nouveau', 'pg_gram_activite', 'pg_gram_reagir', 'pg_gram_mot', 'pg_gram_retirer', 'pg_gram_signaler',
  'pg_gram_gardien_liste', 'pg_gram_gardien_decider', 'pg_gram_gardien_menage', 'pg_gram_gardien_annonce']);
const PG_GRAM_NONAME = new Set(['pg_gram_catalogue', 'pg_gram_gardien_liste', 'pg_gram_gardien_decider', 'pg_gram_gardien_menage', 'pg_gram_gardien_annonce']);
const pgInt = v => (Number.isSafeInteger(v) && v > 0 ? v : null);
function pgGramArgs(fn, x) {
  x = x || {};
  switch (fn) {
    case 'pg_gram_fil': return { p_room: pgInt(x.p_room), p_before: pgInt(x.p_before), p_limit: Math.max(1, Math.min(50, x.p_limit | 0 || 20)) };
    case 'pg_gram_nouveau': return { p_vu: pgInt(x.p_vu) || 0, p_vu_react: pgInt(x.p_vu_react) || 0 };
    case 'pg_gram_activite': return { p_after: pgInt(x.p_after) || 0, p_limit: Math.max(1, Math.min(100, x.p_limit | 0 || 30)) };
    case 'pg_gram_reagir': return { p_post: pgInt(x.p_post), p_emoji: x.p_emoji == null ? null : pgStr(x.p_emoji, 16) };
    case 'pg_gram_mot': return { p_post: pgInt(x.p_post), p_mot: x.p_mot == null ? null : pgStr(x.p_mot, 24) };
    case 'pg_gram_retirer': return { p_post: pgInt(x.p_post) };
    case 'pg_gram_signaler': return { p_post: pgInt(x.p_post), p_motif: pgStr(x.p_motif, 20) };
    case 'pg_gram_gardien_decider': return { p_post: pgInt(x.p_post), p_action: pgStr(x.p_action, 10) };
    case 'pg_gram_gardien_annonce': return { p_texte: pgStr(x.p_texte, 400), p_room: pgInt(x.p_room), p_pnj: pgStr(x.p_pnj || 'concours', 24) };
    default: return {};
  }
}
const GRAM_SUBS = new Set(), GRAM_PHOTOS = new Map();
const gramPath = p => (/^ph\/[0-9a-f-]{36}\/(g|m)\.jpg$/.test(String(p || '')) ? String(p) : null);
function gramPhoto(path) {
  const p = gramPath(path); if (!p) return Promise.reject(new Error('pegase.photo : chemin refusé'));
  if (GRAM_PHOTOS.has(p)) return GRAM_PHOTOS.get(p);
  const pr = (async () => {
    let blob = null;
    try { const c = await caches.open('jdw-pg-photos'); const r = await c.match(p); if (r) blob = await r.blob(); } catch (e) { /* pas de cache : on télécharge */ }
    if (!blob) {
      const tok = await acctToken(profile); if (!tok) throw Object.assign(new Error('pegase.photo : compte requis'), { guest: true });
      const r = await netFetch(CFG.url.replace(/\/+$/, '') + '/storage/v1/object/authenticated/pegase/' + p, { headers: { apikey: CFG.key, Authorization: 'Bearer ' + tok } });
      if (!r.ok) throw new Error('pegase.photo ' + r.status);
      blob = await r.blob();
      try { const c = await caches.open('jdw-pg-photos'); await c.put(p, new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } })); } catch (e) { /* rien */ }
    }
    return URL.createObjectURL(blob);
  })();
  GRAM_PHOTOS.set(p, pr); pr.catch(() => GRAM_PHOTOS.delete(p));
  return pr;
}
async function gramDelete(paths) {   // fichiers de MES photos retirées, ou ménage d'un gardien (règle « pg photos effacer » du serveur)
  const l = (Array.isArray(paths) ? paths : []).map(gramPath).filter(Boolean).slice(0, 200); if (!l.length) return 0;
  const tok = await acctToken(profile); if (!tok) return 0;
  const r = await netFetch(CFG.url.replace(/\/+$/, '') + '/storage/v1/object/pegase', { method: 'DELETE', headers: { apikey: CFG.key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: l }) });
  return r.ok ? l.length : 0;
}
// GRAND LIVRE DES ESPÈCES (21 oct. 2026, avec Pégase 0.9 — atelier ~/jdv-tools/pegase/borne/hub/livre ; serveur ~/jdv-tools/pegase/server/livre.sql) :
// « Mon livre » (onglet Moi) et « Les livres de mes amis » (onglet Amis) du hub. pg_livre_amis : AUCUN argument du hub n'est transmis
// (seulement p_code + p_name de la borne) ; onLivre(fn) = signal { t: 'livre' } du canal de la salle (envoyé par le serveur quand un copain
// remplit une case ou change une photo ; rend la fonction pour se désabonner) ; les photos des pages passent par photo() de PegaGram.
const PG_LIVRE = new Set(['pg_livre_amis']);
const LIVRE_SUBS = new Set();
function pegaseApi() {
  const guest = () => isGuest() || !profile.name;
  return {
    info: () => { const g = guest(); return { guest: g, online: !!ONLINE && !netOff(), name: g ? '' : cleanName(profile.name), display: g ? '' : dispName(profile.name),
      room: !g && ONLINE && room ? { id: room.id, name: String(room.name || '') } : null, device: 'borne-' + String(clientId).slice(1, 9),
      ile: typeof PG !== 'undefined' && PG.isle ? Object.assign({}, PG.isle) : null }; },   // l'île choisie sur la page des îles (≠ salle)
    // membres de la salle actuelle (moi compris, me = true) ; online = même règle que la liste des joueurs ; photo = tête (data:/URL) ou null
    members: () => {
      if (guest() || !ONLINE || !room) return [];
      const me = cleanName(profile.name);
      const on = p => p.name === me || !!p.live || !!p.dbGame || (!PRES.ok && !!p.game);
      return [...players.values()].filter(p => p.name !== 'IA' && (p.member || p.name === me)).map(p => ({ name: p.name, display: dispName(p.name), me: p.name === me,
        online: on(p), seen: p.seen || 0, photo: p.photo || null }));
    },
    rpc: async (fn, args) => {
      if (!PG_RPC.has(fn) && !PG_GRAM.has(fn) && !PG_LIVRE.has(fn)) throw new Error('pegase.rpc : fonction refusée (' + fn + ')');
      if (guest() || !ONLINE) { const e = new Error(fn + ' : invité (compte requis)'); e.guest = true; throw e; }
      if (PG_RPC_CAT.has(fn)) return rpc(fn, { p_code: CODE() }, { quiet: true });
      if (PG_LIVRE.has(fn)) return rpc(fn, { p_code: CODE(), p_name: profile.name }, { quiet: true });   // Grand livre : arguments du hub ignorés
      const a = fn === 'pg_unlock_buy' ? { p_unlock: String((args && args.p_unlock) || '').slice(0, 80), p_op: String((args && args.p_op) || '').slice(0, 64) } : fn === 'pg_link_make' ? (args && args.p_long === true ? { p_long: true } : {}) : fn === 'pg_room_maisons' ? {} : fn.startsWith('pg_sms_') ? pgSmsArgs(fn, args) : fn.startsWith('pg_appel_') ? pgAppelArgs(fn, args) : Object.assign({}, args || {});
      if (PG_GRAM.has(fn)) { const g = Object.assign(pgGramArgs(fn, args), { p_code: CODE() }); if (!PG_GRAM_NONAME.has(fn)) g.p_name = profile.name; return rpc(fn, g, { quiet: true }); }
      Object.assign(a, { p_code: CODE(), p_name: profile.name });
      if (fn === 'pg_room_avatars' || fn === 'pg_room_maisons') { if (!room) { const e = new Error(fn + ' : pas de salle'); e.member = true; throw e; } a.p_room = room.id; }
      return rpc(fn, a, { quiet: true });
    },
    account: () => { backToLibrary(); guestAsk('Les copains de Pégase'); },   // invité : créer un compte (quitte le hub)
    // UN SEUL has(fn) pour les nouveautés (hub de Pégase 0.9) : la borne laisse-t-elle passer cette fonction ? Le hub cache ce qu'elle refuse
    // (barre des réactions : pg_sms_react ; onglet PegaGram : pg_gram_* ; Grand livre : pg_livre_amis ; maison d'un copain : pg_room_maisons).
    has: fn => { const f = String(fn || ''); return PG_RPC.has(f) || PG_GRAM.has(f) || PG_LIVRE.has(f); },
    onSms: fn => { if (typeof fn !== 'function') return () => {}; SMS_SUBS.add(fn); smsTopicSync(); return () => { SMS_SUBS.delete(fn); smsTopicSync(); }; },
    photo: path => gramPhoto(path),   // PegaGram, cartes postales de Messages, pages du Grand livre : photo du Storage privé, ph/<uuid>/g|m.jpg
    photoDelete: paths => gramDelete(paths),
    onGram: fn => { if (typeof fn !== 'function') return () => {}; GRAM_SUBS.add(fn); return () => { GRAM_SUBS.delete(fn); }; },
    onLivre: fn => { if (typeof fn !== 'function') return () => {}; LIVRE_SUBS.add(fn); return () => { LIVRE_SUBS.delete(fn); }; },
    onAppel: fn => { if (typeof fn !== 'function') return () => {}; APPEL_SUBS.add(fn); smsTopicSync(); callgHide(); return () => { APPEL_SUBS.delete(fn); smsTopicSync(); CALLG.at = 0; }; },
    voixAppel: id => pgVoixAppel(id),
    livekit: () => livekitLoad(),
    appelPris: () => { const t = CALLG.took; CALLG.took = null; return t && Date.now() - t.t < 60000 && !guest() ? { id: t.id, de: t.de } : null; }
  };
}

/* ================= Appels partout dans la borne (23 oct. 2026) ================= */
// Demande de l'utilisateur : « on peut appeler n'importe qui sur la borne à tout moment, même s'il n'est jamais allé sur Pégase ». Le hub de
// Pégase ouvert (abonné à onAppel) s'occupe de tout ; SINON la borne écoute elle-même : signal { t: 'appel' } du canal PRIVÉ des messages
// (toujours ouvert pour un joueur, smsTopicSync) et relecture de pg_appel_attente (toutes les 30 s, 15 s sans le direct, 2 s pendant que ça
// sonne) → bandeau « X t'appelle » par-dessus tout, même en pleine partie (#jdw-callring). Refuser = pg_appel_repondre (non, refuse) ;
// Décrocher = la borne ouvre le hub de Pégase (la partie en cours s'arrête, comme « Quitter »), qui prend l'appel : api.pegase.appelPris().
const CALLG = { seen: new Map(), cur: null, at: 0, polling: false, ringT: 0, took: null, off: false, missT: 0 };
const callgOn = () => ONLINE && !isGuest() && !!profile.name && !APPEL_SUBS.size && !CALLG.off && !netOff();
async function callgPoll() {
  if (!callgOn() || CALLG.polling) return;
  CALLG.polling = true; CALLG.at = Date.now();
  let r = null;
  try { r = await rpc('pg_appel_attente', { p_code: CODE(), p_name: profile.name }, { quiet: true }); }
  catch (e) { if (e && e.status === 404) CALLG.off = true; }   // serveur sans les appels : on n'insiste pas
  finally { CALLG.polling = false; }
  if (!r || !callgOn()) return;
  const me = cleanName(profile.name);
  for (const a of Array.isArray(r.appels) ? r.appels : []) if (a && /^c[0-9a-f]{20}$/.test(String(a.id))) callgSeen(a, me);
}
function callgSeen(a, me) {
  const prev = CALLG.seen.get(a.id); CALLG.seen.set(a.id, a.etat);
  const c = CALLG.cur;
  if (c && c.id === a.id) {
    if (a.etat === 'appel' || a.etat === 'sonne') return;                      // ça sonne toujours
    if (a.etat === 'manque' || a.etat === 'annule') callgMissed(c); else callgHide();   // décroché ailleurs, refusé, fini : rien à dire
    return;
  }
  if (prev || a.a !== me || (a.etat !== 'appel' && a.etat !== 'sonne') || (c && !c.missed)) return;
  CALLG.cur = { id: a.id, de: String(a.de || ''), t0: Date.now() };
  rpc('pg_appel_sonne', { p_code: CODE(), p_name: profile.name, p_id: a.id }, { quiet: true }).catch(() => {});
  callgShow();
}
function callgFace(n) {
  const p = players.get(n), f = $('jdw-callring-face'); f.textContent = '';
  if (p && p.photo) { const im = document.createElement('img'); im.alt = ''; im.src = p.photo; f.appendChild(im); }
  else { const sp = document.createElement('span'); sp.textContent = (dispName(n)[0] || '?').toUpperCase(); f.appendChild(sp); }
}
function callgShow() {
  const c = CALLG.cur; if (!c) return;
  clearTimeout(CALLG.missT);
  const el = $('jdw-callring'); if (el.parentNode !== document.body) document.body.appendChild(el);   // au-dessus de tout, même d'une partie
  callgFace(c.de);
  $('jdw-callring-name').textContent = dispName(c.de);
  $('jdw-callring-sub').textContent = current && !current.over && current.game && current.game.id !== 'pegase' ? 't\'appelle · Décrocher arrête la partie' : 't\'appelle';
  const no = $('jdw-callring-no'); no.firstChild.textContent = '📞'; no.lastChild.textContent = 'Refuser'; no.setAttribute('aria-label', 'Refuser');
  el.classList.remove('missed'); el.hidden = false;
  callgRing(true);
}
function callgRing(on) {
  clearInterval(CALLG.ringT); CALLG.ringT = 0; if (!on) return;
  const f = () => { Audio.ensure(); Audio.tone(784, 0.2, 'sine', 0.16); setTimeout(() => Audio.tone(988, 0.26, 'sine', 0.16), 230); try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (e) {} };
  f(); CALLG.ringT = setInterval(f, 1800);
}
function callgHide() { clearTimeout(CALLG.missT); CALLG.cur = null; callgRing(false); const el = $('jdw-callring'); if (el) el.hidden = true; }
function callgMissed(c) {   // l'autre a raccroché avant que je réponde (ou 45 s sans réponse) : « Appel manqué » quelques secondes
  callgRing(false); c.missed = true;
  $('jdw-callring-sub').textContent = 'Appel manqué'; $('jdw-callring').classList.add('missed');
  const no = $('jdw-callring-no'); no.firstChild.textContent = '✕'; no.lastChild.textContent = 'Fermer'; no.setAttribute('aria-label', 'Fermer');
  clearTimeout(CALLG.missT); CALLG.missT = setTimeout(() => { if (CALLG.cur === c) callgHide(); }, 4500);
}
function callgOpenHub() {
  const g = gameById('pegase'); if (!g) return;
  for (const id of ['jdw-invshare', 'jdw-photo', 'jdw-settings', 'jdw-board', 'jdw-rooms', 'jdw-notifs', 'jdw-profiles', 'jdw-members']) { const el = $(id); if (el && !el.hidden) { if (id === 'jdw-photo') closePhoto(); else closeSheet(id); } }
  try { if (chat.open) closeChat(); } catch (e) {}
  if (current && current.game && current.game.id === 'pegase') return;   // déjà dans le hub : il prend l'appel tout seul
  const busy = !!current; if (busy) backToLibrary();                     // une partie en cours s'arrête (les records sont déjà enregistrés)
  setTimeout(() => openGame(g), busy ? 300 : 0);
}
$('jdw-callring-no').addEventListener('click', () => {
  const c = CALLG.cur; if (!c || c.missed) { callgHide(); return; }
  rpc('pg_appel_repondre', { p_code: CODE(), p_name: profile.name, p_id: c.id, p_oui: false, p_raison: 'refuse' }, { quiet: true }).catch(() => {});
  callgHide();
});
$('jdw-callring-ok').addEventListener('click', () => {
  const c = CALLG.cur; if (!c || c.missed) return;
  CALLG.took = { id: c.id, de: c.de, t: Date.now() }; callgHide(); Audio.ensure();
  callgOpenHub();
});
setInterval(() => {
  smsTopicSync();                                         // le canal privé suit le joueur actuel (changement de joueur, de compte, réseau)
  if (document.hidden || !callgOn()) return;
  const per = CALLG.cur && !CALLG.cur.missed ? 2000 : RT.ok ? 30000 : 15000;
  if (Date.now() - CALLG.at >= per - 300) callgPoll();
}, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) CALLG.at = 0; });   // retour sur la borne : relire tout de suite

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
  if (current && current.coop) { coopOfferRescue(); return; }
  let sc = 0;
  try { sc = Math.floor(+current.inst.currentScore() || 0); } catch (e) {}
  $('jdw-rescue-txt').textContent = sc > 0 ? 'Ton score de ' + fmt(sc) + ' est gardé.' : 'Tu peux continuer ou relancer la partie.';
  $('jdw-rescue-ok').textContent = sc > 0 ? 'Terminer et garder mon score' : 'Recommencer';
  $('jdw-rescue').hidden = false;
}
$('jdw-rescue-ok').addEventListener('click', () => {
  $('jdw-rescue').hidden = true;
  if (!current) return;
  if (current.coop) { if (COOP.score > 0 || COOP.mode === 'net') coopQuit(); else coopRematch(); return; }   // « Oups » en coop : jamais de remontage solo
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
// jeux sans musique à eux : ils prennent celle d'un autre écran (vide depuis que Pégase a la sienne : assets/music/pegase-1.mp3,
// « Chez toi » harpe, célesta et violoncelle, choisie par l'utilisateur le 22 oct. 2026, jouée dès l'ouverture du hub)
const MUSIC_AS = {};
function musicVariants(id, mode) {
  id = MUSIC_AS[id] || id;
  const v = (window.JDW_MUSIC || {})[id]; if (!v) return [id];
  const c = v.c || [], x = v.x || [];
  const list = id === 'accueil' ? [...c, ...x] : mode === 'intense' ? (x.length ? x : c) : (c.length ? c : x);
  return list.length ? list : [id];
}
// niveau à partir duquel la musique devient énergique, par jeu
const INTENSE_AT = { smoothie: 4, magic: 2, ilo: 4, pleingaz: 4, empilo: 6, glouton: 4, mouches: 7, carreaux: 7, rouleaux: 7, canards: 6 };
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
/* ---- musique calée d'un jeu de rythme (api.rhythm, Néon Rush) : le jeu joue lui-même SON morceau et lit son temps ---- */
const RHY = { src: null, g: null, t0: null, seq: 0 };
function rhythmStop(fade) {
  RHY.seq++; RHY.t0 = null;
  const s = RHY.src, g = RHY.g; RHY.src = null; RHY.g = null;
  if (!s || !Audio.ctx) return;
  const now = Audio.ctx.currentTime, f = fade || 0.05;
  try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now); g.gain.exponentialRampToValueAtTime(0.0001, now + f); s.stop(now + f + 0.02); } catch (e) {}
}
function rhythmApi(mine) {
  return {
    // charge le morceau assets/music/<id> ; rend sa durée en secondes (0 s'il ne vient pas)
    async load(id) { try { Audio.ensure(); return (await musicBuffer(id)).duration; } catch (e) { return 0; } },
    // joue <id> à partir de <at> secondes, une seule fois (la musique de la borne se tait). L'horloge time() part même sans son
    // (musique coupée, morceau absent) ; rend vrai si le son joue vraiment
    async play(id, at) {
      if (!mine()) return false;
      Audio.ensure(); const A = Audio.ctx; if (!A) return false;
      rhythmStop(0.05); const my = RHY.seq;
      MUS.override = true; MUS.want = ''; MUS.seq++; musicOut(0.25);
      let b = null; if (MUS.on) { try { b = await musicBuffer(id); } catch (e) {} }
      if (my !== RHY.seq || !mine()) return false;
      // son bloqué (pas encore touché l'écran, lancé à la manette) : on n'attend pas, le jeu garde sa propre horloge
      try { if (A.state === 'suspended') await Promise.race([A.resume(), new Promise(r => setTimeout(r, 400))]); } catch (e) {}
      if (my !== RHY.seq || !mine()) return false;
      const when = A.currentTime + 0.05; at = Math.max(0, +at || 0);
      if (!b || at >= b.duration || A.state !== 'running') return false;
      RHY.t0 = when - at;
      if (!MUS.gain) { MUS.gain = A.createGain(); MUS.gain.gain.value = musicLevel(); MUS.gain.connect(A.destination); }
      const src = A.createBufferSource(), g = A.createGain(); src.buffer = b; g.gain.value = 1; src.connect(g).connect(MUS.gain);
      src.start(when, at); RHY.src = src; RHY.g = g;
      return true;
    },
    // le temps de la musique (secondes, latence de sortie déduite), null si rien ne joue
    time() { const A = Audio.ctx; if (!A || RHY.t0 == null) return null; return A.currentTime - RHY.t0 - (A.outputLatency || 0) - (A.baseLatency || 0); },   // latence totale : traitement + sortie
    stop(fade) { if (mine()) rhythmStop(fade); }
  };
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
  try { loadCoopNotifs(); } catch (e) {}   // « X et Y ont battu votre record » (rien tant que la liste coop est vide)
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
  return [...NEW_GAMES].filter(id => (gameById(id) || (/^coop-/.test(id) && coopById(id.slice(5)))) && tileNews(id) === 'new' && !(gameNotifSeen[me] || []).includes(id)).map(id => ({ kind: 'game', game: id }));
}
function unseenCount() { const s = notifSeen[notifKey()] || 0; return notifs.filter(n => n.id > s).length + gameNotifs().length + updateNotifs().length + coopFreshN(); }
function refreshBell() {
  $('jdw-bell').hidden = !profile.name || (!notifsOk && !gameNotifs().length && !updateNotifs().length && !coopNotifCount());
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
  if (n.kind === 'coop') return coopNotifRow(n, li, tx);
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
  if (n.kind === 'game' && /^coop-/.test(n.game)) return coopNewGameRow(n, li, tx);
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
  const fresh = [...updateNotifs(), ...gameNotifs(), ...coopNotifsList(true), ...notifs.filter(n => n.id > seen)];
  const old = coopNotifsList(false).concat(notifs.filter(n => n.id <= seen));
  // ce qui est vu disparaît : la prochaine fois, seulement les nouveautés (l'historique reste consultable)
  for (const n of fresh) ol.appendChild(notifRow(n, true));
  if (!fresh.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Rien de nouveau pour le moment.'; ol.appendChild(li); }
  if (showOld === true) for (const n of old) ol.appendChild(notifRow(n, false));
  $('jdw-notifs-old').hidden = showOld === true || !old.length;
  if (notifs.length) { notifSeen[key] = Math.max(seen, ...notifs.map(n => n.id)); store.set('jdw.notifseen', notifSeen); }
  coopNotifsSeenSafe();
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
    const rows = await coopMessages(Object.assign({ p_code: CODE() }, RP(), { p_after: chat.lastId })) || [];
    if (!room || room.id !== rid) return;
    chat.ok = true;
    const fresh = rows.map(r => ({ id: +r.r_id, name: r.r_name, body: r.r_body, kind: r.r_kind, game: r.r_game, score: +r.r_score || 0,
      beaten: r.r_beaten, beatenScore: +r.r_beaten_score || 0, at: Date.parse(r.r_at) || Date.now(), meta: r.r_meta && typeof r.r_meta === 'object' ? r.r_meta : null })).filter(m => m.id > chat.lastId);
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
  const others = chat.msgs.filter(m => m.kind !== 'record' && m.kind !== 'coop' && m.name !== me), lastOther = fromPoll && chat.newIds && others.length && chat.newIds.has(others[others.length - 1].id) ? others[others.length - 1] : null;
  for (const m of all) {
    const day = dayLabel(m.at);
    if (day !== prevDay) { const d = document.createElement('div'); d.className = 'chat-day'; d.textContent = day; log.appendChild(d); prevDay = day; prev = null; }
    if (m.kind === 'coop' && m.meta) { log.appendChild(coopCard(m)); prev = null; continue; }   // sans meta (get_messages) : message ordinaire
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
  $('jdw-chat').hidden = false; document.body.classList.add('chat-open'); chatStick = true; kbFit();
  renderBand(); renderChat(false); markChatSeen(); refreshChatBtn(); refreshChatOnline(); loadReactions();
  loadChat();
  if (matchMedia('(pointer: fine)').matches) setTimeout(() => $('jdw-chat-input').focus({ preventScroll: true }), 60);
}
function closeChat() {
  if (!chat.open) return;
  closePicker();
  chat.open = false; $('jdw-chat').hidden = true; document.body.classList.remove('chat-open');
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
/* ================= Clavier à l'écran : le champ où l'on écrit reste visible ================= */
// Chrome rapetisse la page quand le clavier s'ouvre (interactive-widget=resizes-content, build2.py). Ailleurs (Safari sur iPhone, plein
// écran, borne installée, appli, anciens navigateurs) le clavier passe PAR-DESSUS la page : la zone vraiment visible (visualViewport) donne
// --kbt (haut caché) et --kb (bas caché, le clavier) ; le chat, les fenêtres (.sheet) et « regarder » se tiennent dans cette zone
// (shell2.css « Clavier »). Le chat garde ses derniers messages en vue (s'il était en bas) et se resserre quand il reste peu de place ;
// le champ touché est ramené à l'écran. Rien ne change sans clavier (ordinateur, zoom au doigt).
const KB = { top: -1, kb: -1, pad: -1, nav: 0, t: 0, coarse: (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })() };   // coarse : téléphone, tablette
let chatStick = true;   // le chat était-il en bas (derniers messages visibles) ?
// bord à bord (Android 15 : Chrome dessine sous la barre des gestes, safe-area-inset-bottom > 0 clavier fermé) : quand Chrome rapetisse
// lui-même la page pour le clavier, on garde la hauteur de cette barre sous le champ (--kbpad), au cas où il se tromperait de cette hauteur
const kbNavProbe = document.createElement('div'); kbNavProbe.id = 'jdw-kbnav';
kbNavProbe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
document.body.appendChild(kbNavProbe); KB.nav = Math.min(48, kbNavProbe.offsetHeight || 0);
function kbTyping() {
  const a = document.activeElement;
  return !!(a && (a.tagName === 'TEXTAREA' || a.isContentEditable || (a.tagName === 'INPUT' && !/^(checkbox|radio|range|button|submit|reset|file|color|image|hidden)$/i.test(a.type || ''))));
}
function kbFit() {
  const vv = window.visualViewport, root = document.documentElement, typing = kbTyping();
  let top = 0, kb = 0;
  if (vv && typing && Math.abs((vv.scale || 1) - 1) < 0.05) {
    const lh = root.clientHeight || innerHeight;   // la page (layout viewport) ; si le navigateur l'a déjà rapetissée, rien à faire
    top = Math.max(0, Math.round(vv.offsetTop));
    kb = Math.max(0, Math.round(lh - vv.offsetTop - vv.height));
    if (top + kb < 24) top = kb = 0;               // barre d'adresse, arrondis : rien
  }
  if (!typing) KB.nav = Math.min(48, kbNavProbe.offsetHeight || 0);   // clavier fermé : hauteur de la barre des gestes (0 sans bord à bord)
  const h = vv ? vv.height : innerHeight, open = kb > 0 || (KB.coarse && typing && h < (screen.height || 1e4) * 0.75);   // clavier ouvert
  const pad = open && !kb ? KB.nav : 0;            // Chrome a rapetissé la page lui-même : marge de la barre des gestes sous le champ
  if (top !== KB.top || kb !== KB.kb || pad !== KB.pad) {
    KB.top = top; KB.kb = kb; KB.pad = pad;
    root.style.setProperty('--kbt', top + 'px'); root.style.setProperty('--kb', kb + 'px'); root.style.setProperty('--kbpad', pad + 'px');
  }
  const w = $('jdw-chat');
  if (!w.hidden) {
    w.classList.toggle('compact', h < 520 || open); // plus de bande des têtes
    w.classList.toggle('tiny', h < 330);           // téléphone à l'horizontale + clavier : l'essentiel (titre, messages, champ)
  }
  clearTimeout(KB.t);
  KB.t = setTimeout(() => {                        // le champ touché, ramené dans la zone visible
    const a = document.activeElement; if (!kbTyping() || a === $('jdw-chat-input')) return;
    const r = a.getBoundingClientRect(), y0 = vv ? vv.offsetTop : 0, y1 = y0 + (vv ? vv.height : innerHeight);
    if (r.top < y0 + 4 || r.bottom > y1 - 4) try { a.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) {}
  }, 90);
}
if (window.visualViewport) { visualViewport.addEventListener('resize', kbFit); visualViewport.addEventListener('scroll', kbFit); }
addEventListener('resize', kbFit);
document.addEventListener('focusin', () => { kbFit(); if (kbTyping()) { setTimeout(kbFit, 350); setTimeout(kbFit, 800); } });   // le clavier met un moment à monter
document.addEventListener('focusout', () => setTimeout(() => {
  kbFit();
  if (!kbTyping() && (scrollX || scrollY)) scrollTo(0, 0);   // Safari (iPhone) laisse parfois la page décalée après le clavier
}, 120));
// derniers messages : le chat reste collé en bas quand sa taille change (clavier qui s'ouvre ou se ferme, téléphone tourné), sauf si on
// lisait plus haut. Un défilement qui vient d'un changement de taille (pas du joueur) ne compte pas : l'intention est gardée jusqu'au ResizeObserver.
const chatBox = { w: -1, h: -1 };
$('jdw-chat-log').addEventListener('scroll', () => {
  const l = $('jdw-chat-log');
  if (l.clientWidth === chatBox.w && l.clientHeight === chatBox.h) chatStick = chatAtBottom();
}, { passive: true });
if (window.ResizeObserver) new ResizeObserver(() => {
  const l = $('jdw-chat-log');
  if (chat.open && chatStick) l.scrollTop = l.scrollHeight;
  chatBox.w = l.clientWidth; chatBox.h = l.clientHeight;
}).observe($('jdw-chat-log'));

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
  rtSend(t, 'presence', { type: 'presence', event: 'track', payload: { name: cleanName(profile.name), game: where, cid: clientId, ver: myVersionTag(), co: coopPresCo() } });
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
    out.push({ name, game: m.game || 'menu', ver: m.ver || '', cid: m.cid || '', co: m.co ? cleanName(m.co) : '' });
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
  if (MODE === 'coop' && !$('jdw-lib').hidden) try { refreshCoopTiles(); } catch (e) {}
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
  if (event === 'ile' && p.k === 'ile_demande') { if (typeof islOnDemande === 'function') islOnDemande(p.ile); return; }
  if (p.from === clientId) return;
  if (p.t === 'sms') { if (topic === smsTopicOn) for (const f of [...SMS_SUBS]) { try { f(); } catch (e) {} } return; }
  if (p.t === 'appel') {   // appel : relire pg_appel_attente (le hub de Pégase s'il est ouvert, sinon la borne elle-même)
    if (topic === smsTopicOn) { if (APPEL_SUBS.size) for (const f of [...APPEL_SUBS]) { try { f(); } catch (e) {} } else { CALLG.at = 0; callgPoll(); } }
    return;
  }
  if (p.t === 'gram') { if (room && topic === 'jdw-room-' + room.id) for (const f of [...GRAM_SUBS]) { try { f(); } catch (e) {} } return; }   // PegaGram : relire
  if (p.t === 'rtc') { if (room && topic === 'jdw-room-' + room.id) rtcOnSignal(p); return; }
  if (p.t === 'net') { if (NET.topic && topic === NET.topic) netOnSignal(p); return; }
  if (p.t === 'netinv') { if (room && topic === 'jdw-room-' + room.id) netOnInvite(p); return; }
  if (p.t === 'coopinv') { if (room && topic === 'jdw-room-' + room.id) coopOnInvite(p); return; }
  if (p.t === 'rx') { if (room && topic === 'jdw-room-' + room.id) rxShow(cleanName(p.n), cleanName(p.to), String(p.e || '').slice(0, 40)); return; }
  if (p.t === 'livre') { if (room && topic === 'jdw-room-' + room.id) for (const f of [...LIVRE_SUBS]) { try { f(); } catch (e) {} } return; }   // Grand livre : relire
  if (p.t === 'version') { checkSiteVersion(); return; }
  if (p.t === 'rooms') { if (!$('jdw-rooms').hidden) listRooms(); return; }
  if (!room || topic !== 'jdw-room-' + room.id) return;
  const run = { chat: () => loadChat(), scores: () => { loadScores(); if (!$('jdw-board').hidden) loadWorld(); coopOnPokeScores(); }, players: () => loadPlayers(), presence: () => heartbeat(), react: () => loadReactions(), progress: () => progOnPoke(),
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
  heartbeat(); loadScores(); loadChat(); flushUnsent(); flushUnsentCoop(); checkSiteVersion(); progLoad();
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
  if (!$('jdw-play').hidden || !$('jdw-duo').hidden || chat.open || saving > 0 || MAP.open) return false;
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
function gameLabel(id) { if (!id || id === 'menu') return 'dans le menu'; if (/^coop-/.test(id)) { let e = null; try { e = coopById(id.slice(5)); } catch (x) {} return '🤝 à deux' + (e ? ' · ' + e.title : ''); } if (/^duel-/.test(id)) { const d = duoById(id.slice(5)); return '⚔️ en duel' + (d ? ' · ' + d.title : ''); } const g = gameById(id); return g ? 'joue à ' + g.title : 'en ligne'; }
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
    if (g.id === 'pegase' && LABO_TEST) continue;   // mode test : Pégase est à part (onglet tout à gauche)
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
    else if (t.g.noScore) span.textContent = 'À installer · PC et Android';   // Pégase (hub, pas de score) : pas de « Pas encore de record »
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
  for (const tl of tiles.concat(duoTiles, coopTiles, coopSoonTiles, coopGoTile.visible ? [coopGoTile] : [])) {
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
  if (PADP.open) { e.preventDefault(); e.stopImmediatePropagation(); padPauseClose(true); return; }   // carte pause de la manette (le jeu ne la reçoit pas)
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
  try { coopBoardTabs(wrap); } catch (e) {}   // onglets des jeux à deux (coop:<id>), après les jeux solo
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
  $('jdw-coopkind').hidden = true;
  if (/^coop:/.test(boardTab)) { if (coopById(boardTab.slice(5))) return coopRenderBoard(ol, W); boardTab = 'general'; }
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
$('jdw-open-board').addEventListener('click', () => { if (isGuest()) boardScope = 'world'; loadScores(); loadWorld(); if (/^coop:/.test(boardTab)) { coopLoadScores(true); coopLoadWorld(); } renderBoardTab(); openSheet('jdw-board', 'jdw-board-close'); });   // invité : le classement mondial (public)
for (const b of document.querySelectorAll('#jdw-scope button')) b.addEventListener('click', () => {
  boardScope = b.dataset.scope; store.set('jdw.boardscope', boardScope); if (boardScope === 'world') loadWorld(); if (boardScope === 'world' && /^coop:/.test(boardTab)) coopLoadWorld(); renderBoardTab();
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
  renderAcctSet(); pubNameLoad();
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
// « Mon pseudo public » (mode test, avec les îles) : UNE source côté serveur (pg_public_name_get / _set) ; c'est le nom montré à tout le
// monde (liste des îles, membres, Regarder, musée) ; l'alias de salle reste pour l'arcade. 3 à 20 caractères, filtré, unique, 1 fois par jour.
const PUBN = { ok: null, name: '' };
async function pubNameLoad() {
  const box = $('jdw-pubname'); box.hidden = !(LABO_TEST && ONLINE && !isGuest() && profile.name && PUBN.ok !== false); if (box.hidden) return;
  const i = $('jdw-pubname-in'), s = $('jdw-pubname-s'); s.className = 'alias-s'; s.textContent = 'Le nom que tout le monde voit, sur la borne et dans Pégase (3 à 20 caractères, une fois par jour).';
  i.placeholder = dispName(profile.name);
  try { const v = await rpc('pg_public_name_get', { p_code: CODE(), p_name: profile.name }, { quiet404: true, quiet: true }); PUBN.ok = true; const t = Array.isArray(v) ? (v[0] && (v[0].r_public || v[0].pg_public_name_get)) : v; PUBN.name = String(t || ''); if (document.activeElement !== i) i.value = PUBN.name; }
  catch (e) { if (e.status === 404) { PUBN.ok = false; box.hidden = true; } }
}
async function pubNameSave() {
  const i = $('jdw-pubname-in'), s = $('jdw-pubname-s'), want = i.value.trim();
  if (want.length < 3) { s.className = 'alias-s err'; s.textContent = 'Trop court : 3 caractères minimum.'; return; }
  if (want.length > 20) { s.className = 'alias-s err'; s.textContent = 'Trop long : 20 caractères maximum.'; return; }
  s.className = 'alias-s'; s.textContent = 'Enregistrement…';
  try {
    const got = await rpc('pg_public_name_set', { p_code: CODE(), p_name: profile.name, p_public: want }, { quiet404: true });
    const t = String((Array.isArray(got) ? got[0] && (got[0].r_public || got[0].pg_public_name_set) : got) || want);
    i.value = t; PUBN.name = t; s.className = 'alias-s ok'; s.textContent = 'C\'est fait : tout le monde te voit sous le nom « ' + t + ' ».';
    if (MODE === 'pegase') renderIsles();
  } catch (e) {
    const m = String(e.message || '');
    s.className = 'alias-s err';
    s.textContent = e.status === 404 ? 'Bientôt : le serveur ne connaît pas encore le pseudo public.' : /pris|existe/.test(m) ? 'Ce pseudo est déjà pris : essaie un autre nom.'
      : /refuse|interdit|gentil|filtre/.test(m) ? 'Ce pseudo n\'est pas accepté : choisis un nom gentil.' : /court/.test(m) ? 'Trop court : 3 caractères minimum.' : /long/.test(m) ? 'Trop long : 20 caractères maximum.'
      : /jour|deja change|attend/.test(m) ? 'Tu as déjà changé ton pseudo aujourd\'hui : réessaie demain.' : e.acct ? 'Connecte-toi à ton compte pour changer ce pseudo.' : e.offline ? 'Pas de connexion internet : réessaie.' : 'Le serveur a refusé ce pseudo : réessaie.';
  }
}
$('jdw-pubname-ok').addEventListener('click', pubNameSave);
$('jdw-pubname-in').addEventListener('keydown', e => { if (e.key === 'Enter') pubNameSave(); });
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
  const busy = ['jdw-play', 'jdw-duo', 'jdw-net', 'jdw-watch', 'jdw-profiles', 'jdw-photo', 'jdw-cri', 'jdw-settings', 'jdw-coopgo'].some(id => $(id) && !$(id).hidden);
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

/* ================= Onglets : Classique / Duel / Coop ================= */
// le mode « Classique » est la page normale ; les autres modes ont chacun leur page (barre des modes en bas)
const MODES = {
  pegase: { ic: '🏝️', t: 'Pégase', sub: 'Un monde à part : choisis ton île, rejoins les copains… ou viens juste regarder ce qui s\'y passe.' },
  classique: null,
  duel: { ic: '⚔️', t: 'Duel', sub: 'Toi contre un copain ou l\'IA.' },
  coop: { ic: '🤝', t: 'Coop', sub: 'Jouez ensemble contre le jeu, avec un robot ou un copain en ligne : vos scores d\'équipe comptent !' },
};
let MODE = 'classique';
try { const m = sessionStorage.getItem('jdw.mode'); if (m && m in MODES) MODE = m; } catch (e) {}
function setMode(m, user) {
  if (m === 'arcade') m = (typeof PG !== 'undefined' && PG.last) || 'classique';   // « Nos autres jeux » : le dernier mode de la borne
  if (!(m in MODES)) m = 'classique';
  if (m === 'pegase' && document.querySelector('#jdw-modes [data-mode="pegase"]').hidden) m = 'classique';   // onglet Pégase : mode test seulement
  if (m !== 'pegase' && typeof PG !== 'undefined') PG.last = m;
  $('jdw-modes').classList.toggle('pg-open', m === 'pegase');
  const changed = m !== MODE; MODE = m;
  try { sessionStorage.setItem('jdw.mode', m); } catch (e) {}
  $('jdw-lib').dataset.mode = m;
  for (const b of document.querySelectorAll('#jdw-modes button')) { if (b.dataset.mode === m) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  const md = MODES[m];
  if (md) { $('jdw-mh-ic').textContent = md.ic; $('jdw-mh-title').textContent = md.t; $('jdw-mh-sub').textContent = md.sub; }
  if (m === 'duel') renderSeats();
  if (m === 'coop') renderCoop();
  if (m === 'pegase') renderIsles();
  if (user && changed) {
    const w = document.querySelector('.lib-wrap'); w.classList.remove('page-in'); void w.offsetWidth; w.classList.add('page-in');
    $('jdw-lib').scrollTo({ top: 0 });
    Audio.ensure(); Audio.tone(660, 0.05, 'sine', 0.03, 990);
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
  }
}
for (const b of document.querySelectorAll('#jdw-modes button')) b.addEventListener('click', () => setMode(b.dataset.mode, true));

/* ================= Pégase à part : l'onglet tout à gauche et la page des ÎLES (en essai : mode test seulement) =================
   Une île = un serveur de Pégase qu'on rejoint (publique, ou privée avec mot de passe) ; son créateur en est le gardien (il peut bannir) ;
   autant d'habitants que de parcelles. Les îles NE SONT PAS les salles de la borne : un monde à part, avec ses propres membres (au départ,
   une seule : celle de Patou et Samba, amis seulement). Tant que le serveur des îles n'existe pas, la page est vide (« bientôt »).
   Les NOMS affichés (gardien, membres, Regarder) viennent tels quels du serveur : pseudo public pour un ami, « HabitantXXXXXX » sinon. */
const PG_TAB = LABO_TEST && !!gameById('pegase');
const PG = { tab: 'pub', last: MODE !== 'pegase' ? MODE : 'classique', isle: store.get('jdw.ile', null), dem: {} };   // isle : l'île choisie ; dem : îles avec une demande en attente
if (PG_TAB) {
  const b = document.querySelector('#jdw-modes [data-mode="pegase"]'); b.hidden = false; document.querySelector('#jdw-modes .mb-sep').hidden = false;
  document.querySelector('#jdw-modes [data-mode="arcade"]').hidden = false;
  $('jdw-modes').classList.add('has-pg'); $('jdw-modes').classList.toggle('pg-open', MODE === 'pegase');
  // le badge de « Nos autres jeux » : le plus important de Classique / Duel / Coop (nouveau > mis à jour)
  const arcBadge = () => {
    const bs = ['jdw-cls-badge', 'jdw-duo-badge', 'jdw-coop-badge'].map(id => $(id)).filter(x => x && !x.hidden && x.classList.length > 1), bb = $('jdw-arc-badge');
    const pick = bs.find(x => x.classList.contains('new')) || bs.find(x => x.classList.contains('maj'));
    bb.hidden = !pick; if (pick) { bb.className = 'mb-soon ' + (pick.classList.contains('new') ? 'new' : 'maj'); bb.textContent = pick.textContent; }
  };
  arcBadge(); setInterval(arcBadge, 2500);
}
// L'ÎLE DESSINÉE (cartes de la page Pégase) : vue de haut en 3/4, animée — mer profonde qui scintille, lagon turquoise, vagues d'écume qui
// roulent sur la plage, falaise de sable, prairie texturée, collines éclairées, étang, chemin, ponton, palmiers, arbres, maisons aux
// fenêtres allumées, voilier qui tourne autour, ombres de nuages, copains en ligne qui brillent. Et le BROUILLARD DE DÉCOUVERTE : ce qu'on
// n'a pas encore exploré reste sous la brume (prototype : sans données du serveur, on découvre le ponton, le chemin et les maisons des
// membres ; plus tard, la même carte de découverte que le téléphone du jeu : q.fog). Couches fixes dessinées une fois ; seuls l'eau, l'écume,
// le bateau, les nuages et la brume bougent (30 images/s au plus, seulement quand la carte est à l'écran).
const ISLE_ANIM = new Set();
function isleArt(cv, seed, players, q) {
  if (!cv) return;
  q = q || {};
  const w = cv.clientWidth || 300, h = cv.clientHeight || 170, k = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * k); cv.height = Math.round(h * k);
  let sd = (seed >>> 0) || 7; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const off = () => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d'); x.scale(k, k); return [c, x]; };
  const cx = w * 0.5, cy = h * 0.55, rx = w * 0.36, ry = h * 0.33, ph = [r() * 6.3, r() * 6.3, r() * 6.3, r() * 6.3];
  const R = (a) => 1 + 0.09 * Math.sin(3 * a + ph[0]) + 0.06 * Math.sin(5 * a + ph[1]) + 0.035 * Math.sin(8 * a + ph[2]) + 0.02 * Math.sin(13 * a + ph[3]);
  const P = (a, s) => [cx + Math.cos(a) * rx * s * R(a), cy + Math.sin(a) * ry * s * R(a)];
  const blob = (x, s, dy) => { x.beginPath(); for (let i = 0; i <= 96; i++) { const p = P(i / 96 * Math.PI * 2, s); x.lineTo(p[0], p[1] + (dy || 0)); } x.closePath(); };
  // un point au hasard sur l'herbe (s < 0.8)
  const inGrass = (m) => { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (m || 0.72); return P(a, d); };
  const grad = (x, x0, y0, x1, y1, st) => { const g = x.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; };
  const rad = (x, x0, y0, r0, x1, y1, r1, st) => { const g = x.createRadialGradient(x0, y0, r0, x1, y1, r1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; };
  const S = Math.min(w / 300, h / 170);   // échelle des détails

  // ---------- la mer (fond fixe) ----------
  const [seaC, sea] = off();
  sea.fillStyle = grad(sea, 0, 0, 0, h, [0, '#06324f', 0.5, '#0a4f78', 1, '#0d6390']); sea.fillRect(0, 0, w, h);
  sea.fillStyle = rad(sea, cx, cy, rx * 0.6, cx, cy, rx * 1.9, [0, 'rgba(40,200,220,.55)', 0.45, 'rgba(25,150,190,.25)', 1, 'rgba(10,80,120,0)']); sea.fillRect(0, 0, w, h);
  // lagon : eau claire au-dessus du sable immergé
  blob(sea, 1.28); sea.fillStyle = 'rgba(70,220,225,.30)'; sea.fill();
  blob(sea, 1.14); sea.fillStyle = 'rgba(120,240,230,.42)'; sea.fill();
  blob(sea, 1.07); sea.fillStyle = 'rgba(190,250,235,.35)'; sea.fill();

  // ---------- l'île (couche fixe) ----------
  const [baseC, b] = off();
  // épaisseur (3/4) : la falaise de sable sous la plage
  blob(b, 1.0, 5 * S); b.fillStyle = grad(b, 0, cy, 0, cy + ry + 6, [0, '#a57d45', 1, '#7a5a2e']); b.fill();
  blob(b, 1.0); b.fillStyle = rad(b, cx - rx * 0.3, cy - ry * 0.5, 4, cx, cy, rx * 1.1, [0, '#fff3c8', 0.6, '#f2dc9c', 1, '#e2c27c']); b.fill();
  // sable mouillé au bord
  b.save(); blob(b, 1.0); b.clip(); b.lineWidth = 5 * S; b.strokeStyle = 'rgba(160,120,60,.35)'; blob(b, 1.0); b.stroke(); b.restore();
  // grains de sable
  b.save(); blob(b, 0.98); b.clip(); for (let i = 0; i < 260; i++) { const p = P(r() * 6.283, 0.8 + r() * 0.2); b.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.35)' : 'rgba(170,130,70,.25)'; b.fillRect(p[0], p[1], 1, 1); } b.restore();
  // prairie
  blob(b, 0.8); b.fillStyle = rad(b, cx - rx * 0.35, cy - ry * 0.55, 6, cx, cy, rx, [0, '#9be06a', 0.55, '#5fb848', 1, '#3b8a36']); b.fill();
  b.save(); blob(b, 0.8); b.clip();
  for (let i = 0; i < 700; i++) { const p = inGrass(0.8), l = 1.5 + r() * 2.5; b.strokeStyle = ['rgba(40,110,40,.35)', 'rgba(170,235,120,.35)', 'rgba(60,140,50,.3)'][i % 3]; b.lineWidth = 1; b.beginPath(); b.moveTo(p[0], p[1]); b.lineTo(p[0] + (r() - 0.5) * 1.5, p[1] - l); b.stroke(); }
  // collines éclairées (lumière en haut à gauche)
  const hills = []; for (let i = 0; i < 2 + (r() < 0.5 ? 1 : 0); i++) { const p = inGrass(0.45); hills.push([p[0], p[1], (22 + r() * 18) * S]); }
  for (const [hx, hy, hr] of hills) { b.fillStyle = rad(b, hx - hr * 0.35, hy - hr * 0.45, 1, hx, hy, hr, [0, 'rgba(210,255,160,.55)', 0.5, 'rgba(120,200,90,.15)', 0.8, 'rgba(30,90,30,.18)', 1, 'rgba(30,90,30,0)']); b.beginPath(); b.ellipse(hx, hy, hr, hr * 0.62, 0, 0, 7); b.fill(); }
  // étang
  const pd = inGrass(0.5), pr = 11 * S;
  b.fillStyle = 'rgba(30,90,40,.5)'; b.beginPath(); b.ellipse(pd[0], pd[1] + 1, pr + 2, pr * 0.55 + 2, 0, 0, 7); b.fill();
  b.fillStyle = rad(b, pd[0] - pr * 0.3, pd[1] - pr * 0.2, 1, pd[0], pd[1], pr, [0, '#8ff0ff', 0.6, '#3cb8d8', 1, '#2a8fb0']); b.beginPath(); b.ellipse(pd[0], pd[1], pr, pr * 0.55, 0, 0, 7); b.fill();
  b.fillStyle = 'rgba(255,255,255,.6)'; b.beginPath(); b.ellipse(pd[0] - pr * 0.3, pd[1] - pr * 0.15, pr * 0.3, pr * 0.08, -0.2, 0, 7); b.fill();
  b.restore();
  // ponton (en bas, vers le large) et le chemin qui monte vers les maisons
  const da = Math.PI * (0.38 + r() * 0.24), d0 = P(da, 0.86), d1 = P(da, 1.32);
  b.strokeStyle = '#6b4a2a'; b.lineWidth = 7 * S; b.lineCap = 'butt'; b.beginPath(); b.moveTo(d0[0], d0[1]); b.lineTo(d1[0], d1[1]); b.stroke();
  b.strokeStyle = '#b8875a'; b.lineWidth = 5.5 * S; b.beginPath(); b.moveTo(d0[0], d0[1] - 1); b.lineTo(d1[0], d1[1] - 1); b.stroke();
  b.strokeStyle = 'rgba(80,50,25,.6)'; b.lineWidth = 1; for (let i = 1; i < 9; i++) { const t = i / 9, x0 = d0[0] + (d1[0] - d0[0]) * t, y0 = d0[1] + (d1[1] - d0[1]) * t - 1, nx = -(d1[1] - d0[1]), ny = d1[0] - d0[0], nl = Math.hypot(nx, ny) || 1; b.beginPath(); b.moveTo(x0 - nx / nl * 3 * S, y0 - ny / nl * 3 * S); b.lineTo(x0 + nx / nl * 3 * S, y0 + ny / nl * 3 * S); b.stroke(); }
  // maisons (une par membre, 3 à 8), groupées en village
  const nH = Math.max(3, Math.min(8, q.members || 4)), vil = inGrass(0.35), houses = [];
  for (let i = 0; i < nH; i++) { const a = i / nH * 6.283 + r() * 0.5, d = (14 + r() * 16) * S; houses.push([vil[0] + Math.cos(a) * d * 1.3, vil[1] + Math.sin(a) * d * 0.7, i]); }
  const path = [d0, [(d0[0] + vil[0]) / 2 + (r() - 0.5) * 30 * S, (d0[1] + vil[1]) / 2], vil];
  b.strokeStyle = 'rgba(120,90,50,.55)'; b.lineWidth = 6 * S; b.lineCap = 'round'; b.beginPath(); b.moveTo(path[0][0], path[0][1]); b.quadraticCurveTo(path[1][0], path[1][1], path[2][0], path[2][1]); b.stroke();
  b.strokeStyle = '#e3c88e'; b.lineWidth = 4 * S; b.stroke();
  // décor trié par profondeur (y) : arbres, palmiers, maisons, rochers, fleurs
  const props = [];
  for (let i = 0; i < 26; i++) { const p = inGrass(0.74); if (Math.hypot(p[0] - vil[0], (p[1] - vil[1]) * 1.6) < 34 * S || Math.hypot(p[0] - pd[0], (p[1] - pd[1]) * 1.6) < pr + 8) continue; props.push(['tree', p[0], p[1], (5 + r() * 4) * S]); }
  for (let i = 0; i < 9; i++) { const a = r() * 6.283; if (Math.abs(((a - da + 9.42) % 6.283) - 3.14) < 0.35) continue; const p = P(a, 0.86 + r() * 0.08); props.push(['palm', p[0], p[1], (7 + r() * 3) * S, r() < 0.5 ? -1 : 1]); }
  for (const hs of houses) props.push(['house', hs[0], hs[1], 6.5 * S, hs[2]]);
  for (let i = 0; i < 5; i++) { const p = P(r() * 6.283, 0.96 + r() * 0.05); props.push(['rock', p[0], p[1], (2.5 + r() * 2.5) * S]); }
  for (let i = 0; i < 40; i++) { const p = inGrass(0.75); props.push(['flower', p[0], p[1], 1.1 * S, i]); }
  props.sort((A, B) => A[2] - B[2]);
  const ROOF = ['#e0533d', '#3f7fe0', '#e8a83a', '#9b5de5', '#2fb3a0', '#e05a9b'];
  for (const [t, x0, y0, s, v] of props) {
    if (t === 'flower') { b.fillStyle = ['#fff', '#ffd34d', '#ff8fb8', '#b9a8ff'][v % 4]; b.fillRect(x0, y0, s, s); continue; }
    if (t === 'rock') { b.fillStyle = 'rgba(0,0,0,.18)'; b.beginPath(); b.ellipse(x0 + 1, y0 + 1.5, s * 1.2, s * 0.5, 0, 0, 7); b.fill(); b.fillStyle = rad(b, x0 - s * 0.4, y0 - s * 0.6, 0.5, x0, y0 - s * 0.3, s, [0, '#d8d4cc', 1, '#7d7a74']); b.beginPath(); b.ellipse(x0, y0 - s * 0.3, s, s * 0.7, 0, 0, 7); b.fill(); continue; }
    if (t === 'tree') {
      b.fillStyle = 'rgba(10,50,20,.28)'; b.beginPath(); b.ellipse(x0 + s * 0.7, y0 + s * 0.2, s * 1.3, s * 0.5, 0, 0, 7); b.fill();
      b.fillStyle = '#6a4425'; b.fillRect(x0 - s * 0.15, y0 - s * 0.9, s * 0.3, s * 0.9);
      for (const [ox, oy, rr] of [[-0.45, -1.3, 0.7], [0.45, -1.35, 0.7], [0, -1.8, 0.8]]) { b.fillStyle = rad(b, x0 + (ox - 0.3) * s, y0 + (oy - 0.35) * s, 0.5, x0 + ox * s, y0 + oy * s, rr * s, [0, '#8ee070', 0.55, '#3f9a3c', 1, '#256b2a']); b.beginPath(); b.arc(x0 + ox * s, y0 + oy * s, rr * s, 0, 7); b.fill(); }
      continue;
    }
    if (t === 'palm') {
      const lean = v * s * 0.5, tx = x0 + lean, ty = y0 - s * 1.9;
      b.fillStyle = 'rgba(80,60,20,.25)'; b.beginPath(); b.ellipse(x0 + s * 0.9, y0 + s * 0.1, s * 1.4, s * 0.35, 0, 0, 7); b.fill();
      b.strokeStyle = '#8a6438'; b.lineWidth = s * 0.28; b.lineCap = 'round'; b.beginPath(); b.moveTo(x0, y0); b.quadraticCurveTo(x0 + lean * 0.2, y0 - s, tx, ty); b.stroke();
      for (let f = 0; f < 6; f++) { const a = f / 6 * 6.283 + 0.3, ex = tx + Math.cos(a) * s * 1.3, ey = ty + Math.sin(a) * s * 0.55 + s * 0.25; b.strokeStyle = f % 2 ? '#3f9a3c' : '#58b84a'; b.lineWidth = s * 0.32; b.beginPath(); b.moveTo(tx, ty); b.quadraticCurveTo((tx + ex) / 2, ty - s * 0.45, ex, ey); b.stroke(); }
      b.fillStyle = '#6b4a22'; b.beginPath(); b.arc(tx - s * 0.12, ty + s * 0.12, s * 0.14, 0, 7); b.arc(tx + s * 0.14, ty + s * 0.1, s * 0.14, 0, 7); b.fill();
      continue;
    }
    // maison : ombre, mur de face, mur de côté, toit à deux pans, porte, fenêtre allumée
    const hw = s, hh = s * 0.8, roof = ROOF[(v + (seed & 7)) % ROOF.length];
    b.fillStyle = 'rgba(10,40,10,.3)'; b.beginPath(); b.ellipse(x0 + hw * 0.6, y0 + hw * 0.15, hw * 1.5, hw * 0.45, 0, 0, 7); b.fill();
    b.fillStyle = '#fbf3e4'; b.fillRect(x0 - hw, y0 - hh, hw * 1.4, hh);
    b.fillStyle = '#d9cdb6'; b.beginPath(); b.moveTo(x0 + hw * 0.4, y0); b.lineTo(x0 + hw, y0 - hh * 0.3); b.lineTo(x0 + hw, y0 - hh * 1.3); b.lineTo(x0 + hw * 0.4, y0 - hh); b.fill();
    b.fillStyle = roof; b.beginPath(); b.moveTo(x0 - hw * 1.15, y0 - hh); b.lineTo(x0 - hw * 0.3, y0 - hh * 1.9); b.lineTo(x0 + hw * 0.55, y0 - hh); b.fill();
    b.fillStyle = 'rgba(0,0,0,.22)'; b.beginPath(); b.moveTo(x0 + hw * 0.55, y0 - hh); b.lineTo(x0 - hw * 0.3, y0 - hh * 1.9); b.lineTo(x0 + hw * 0.25, y0 - hh * 2.15); b.lineTo(x0 + hw * 1.1, y0 - hh * 1.3); b.fill();
    b.fillStyle = '#7a4a2a'; b.fillRect(x0 - hw * 0.35, y0 - hh * 0.6, hw * 0.3, hh * 0.6);
    b.fillStyle = '#ffd36b'; b.fillRect(x0 - hw * 0.85, y0 - hh * 0.7, hw * 0.3, hh * 0.3);
  }

  // ---------- le brouillard de découverte (fixe, il « respire ») ----------
  const [fogC, f] = off();
  const fogOn = q.fog !== false;
  if (fogOn) {
    // une brume légère posée sur l'île seulement (la mer reste visible), faite de boules douces, bords flous
    const [rawC, g2] = off();
    blob(g2, 1.06); g2.fillStyle = 'rgba(222,232,246,.80)'; g2.fill();
    for (let i = 0; i < 90; i++) { const p = P(r() * 6.283, Math.sqrt(r()) * 1.05), rr = (12 + r() * 22) * S; g2.fillStyle = rad(g2, p[0] - rr * 0.3, p[1] - rr * 0.4, 1, p[0], p[1], rr, [0, i % 4 ? 'rgba(255,255,255,.55)' : 'rgba(170,185,215,.35)', 1, 'rgba(255,255,255,0)']); g2.beginPath(); g2.ellipse(p[0], p[1], rr, rr * 0.7, 0, 0, 7); g2.fill(); }
    f.save(); f.setTransform(1, 0, 0, 1, 0, 0); f.filter = 'blur(' + Math.round(5 * S * k) + 'px)'; f.drawImage(rawC, 0, 0); f.filter = 'none'; f.restore();
    f.globalCompositeOperation = 'destination-out';
    // ce qu'on a découvert : données du serveur (q.fog = liste de [x, y, rayon] entre 0 et 1), sinon le prototype
    const holes = Array.isArray(q.fog) ? q.fog.map(([fx, fy, fr]) => [fx * w, fy * h, fr * w]) : [];
    if (!holes.length) {
      for (let i = 0; i <= 8; i++) { const t = i / 8, p = P(da, 1.32 - 0.46 * t); holes.push([p[0], p[1], 22 * S]); }
      const steps = 10; for (let i = 0; i <= steps; i++) { const t = i / steps, u = 1 - t; holes.push([u * u * path[0][0] + 2 * u * t * path[1][0] + t * t * path[2][0], u * u * path[0][1] + 2 * u * t * path[1][1] + t * t * path[2][1], 24 * S]); }
      if (q.mine) for (const hs of houses) holes.push([hs[0], hs[1] - 4 * S, 30 * S]);
      if (q.mine) { holes.push([pd[0], pd[1], 34 * S]); for (let i = 0; i < 14; i++) { const a = da + (i - 6.5) * 0.2, p = P(a, 0.93); holes.push([p[0], p[1], 24 * S]); } }
    }
    for (const [hx, hy, hr] of holes) { f.fillStyle = rad(f, hx, hy, hr * 0.2, hx, hy, hr, [0, 'rgba(0,0,0,1)', 0.55, 'rgba(0,0,0,.75)', 1, 'rgba(0,0,0,0)']); f.beginPath(); f.arc(hx, hy, hr, 0, 7); f.fill(); }
    f.globalCompositeOperation = 'source-over';
  }

  // ---------- les nuages (quelques boules douces) ----------
  const clouds = []; for (let i = 0; i < 3; i++) clouds.push({ x: r() * w, y: h * (0.12 + r() * 0.5), s: (0.7 + r() * 0.6) * S, v: 3 + r() * 4 });
  const sparks = []; for (let i = 0; i < 46; i++) sparks.push([r() * w, r() * h, 4 + r() * 10, r() * 6.3, 0.6 + r()]);
  const dots = []; for (let i = 0; i < Math.min(12, players || 0); i++) { const hs = houses[i % houses.length]; dots.push([hs[0] + (r() - 0.5) * 18 * S, hs[1] + 4 * S + r() * 6 * S, ['#ffa630', '#5ef0ff', '#ff5fae', '#ffd34d'][i % 4], r() * 6.3]); }
  const boat = { a: da + 0.9, sp: 0.035 + r() * 0.02 };

  const x = cv.getContext('2d');
  const frame = (t) => {
    t /= 1000;
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(seaC, 0, 0); x.setTransform(k, 0, 0, k, 0, 0);
    // reflets sur l'eau
    x.lineCap = 'round';
    for (const [sx, sy, l, p0, sp] of sparks) { const a = 0.5 + 0.5 * Math.sin(t * 2 * sp + p0); if (a < 0.35) continue; const xx = (sx + t * 6 * sp) % (w + 20) - 10; x.strokeStyle = 'rgba(255,255,255,' + (0.22 * a).toFixed(3) + ')'; x.lineWidth = 1; x.beginPath(); x.moveTo(xx, sy); x.lineTo(xx + l, sy); x.stroke(); }
    // l'écume : deux vagues qui roulent vers la plage
    for (let i = 0; i < 2; i++) { const u = (t * 0.28 + i * 0.5) % 1; blob(x, 1.11 - 0.09 * u); x.strokeStyle = 'rgba(255,255,255,' + (0.55 * Math.sin(u * Math.PI)).toFixed(3) + ')'; x.lineWidth = (1 + 1.6 * u) * S; x.stroke(); }
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(baseC, 0, 0); x.setTransform(k, 0, 0, k, 0, 0);
    // le voilier qui fait le tour de l'île
    const ba = boat.a + t * boat.sp, bp = P(ba, 1.42), bob = Math.sin(t * 2.2) * 0.8 * S, bs = 5 * S;
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.beginPath(); x.ellipse(bp[0], bp[1] + bs * 0.3, bs * 1.6, bs * 0.35, 0, 0, 7); x.stroke();
    x.fillStyle = '#7a4a2a'; x.beginPath(); x.moveTo(bp[0] - bs, bp[1] + bob); x.lineTo(bp[0] + bs, bp[1] + bob); x.lineTo(bp[0] + bs * 0.6, bp[1] + bs * 0.45 + bob); x.lineTo(bp[0] - bs * 0.6, bp[1] + bs * 0.45 + bob); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(bp[0], bp[1] - bs * 1.8 + bob); x.lineTo(bp[0], bp[1] - bs * 0.1 + bob); x.lineTo(bp[0] + bs * 0.9, bp[1] - bs * 0.2 + bob); x.fill();
    // les copains en ligne : des points qui brillent
    for (const [px, py, col, p0] of dots) { const g = 0.6 + 0.4 * Math.sin(t * 3 + p0); x.fillStyle = rad(x, px, py, 0, px, py, 7 * S, [0, col, 1, 'rgba(0,0,0,0)']); x.globalAlpha = 0.5 * g; x.beginPath(); x.arc(px, py, 7 * S, 0, 7); x.fill(); x.globalAlpha = 1; x.fillStyle = col; x.beginPath(); x.arc(px, py, 2.4 * S, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 1; x.stroke(); }
    // ombres des nuages qui glissent sur l'île
    for (const c of clouds) { const xx = (c.x + t * c.v) % (w + 120) - 60; x.fillStyle = 'rgba(0,30,50,.10)'; for (const [ox, oy, rr] of [[0, 0, 22], [18, 4, 16], [-18, 5, 15]]) { x.beginPath(); x.ellipse(xx + ox * c.s + 14, c.y + oy * c.s + 26, rr * c.s, rr * c.s * 0.5, 0, 0, 7); x.fill(); } }
    // la brume (respire doucement)
    if (fogOn) { const dx = Math.sin(t * 0.35) * 2.5 * k, dy = Math.cos(t * 0.27) * 1.5 * k; x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(fogC, dx, dy); x.setTransform(k, 0, 0, k, 0, 0); }
    // les nuages
    for (const c of clouds) { const xx = (c.x + t * c.v) % (w + 120) - 60; for (const [ox, oy, rr] of [[0, 0, 22], [18, 4, 16], [-18, 5, 15], [8, -8, 14]]) { x.fillStyle = rad(x, xx + ox * c.s - rr * c.s * 0.3, c.y + oy * c.s - rr * c.s * 0.4, 1, xx + ox * c.s, c.y + oy * c.s, rr * c.s, [0, 'rgba(255,255,255,.85)', 0.7, 'rgba(240,248,255,.55)', 1, 'rgba(240,248,255,0)']); x.beginPath(); x.arc(xx + ox * c.s, c.y + oy * c.s, rr * c.s, 0, 7); x.fill(); } }
    // lumière douce et coins sombres
    x.fillStyle = rad(x, w * 0.2, h * 0.05, 4, w * 0.4, h * 0.4, w * 0.9, [0, 'rgba(255,240,200,.16)', 1, 'rgba(255,240,200,0)']); x.fillRect(0, 0, w, h);
    x.fillStyle = rad(x, cx, cy, Math.min(w, h) * 0.5, cx, cy, Math.max(w, h) * 0.78, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,10,25,.45)']); x.fillRect(0, 0, w, h);
  };
  frame(performance.now());
  // animation : seulement quand la carte est à l'écran et la page visible (30 images/s au plus)
  const A = { cv, frame, last: 0, on: false };
  ISLE_ANIM.add(A);
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => { for (const e of es) A.on = e.isIntersecting; }); io.observe(cv); A.io = io; } else A.on = true;
  if (!ISLE_ANIM.loop) { const loop = (t) => { ISLE_ANIM.loop = requestAnimationFrame(loop); if (document.hidden) return; for (const a of [...ISLE_ANIM]) { if (!a.cv.isConnected) { if (a.io) a.io.disconnect(); ISLE_ANIM.delete(a); continue; } if (!a.on || t - a.last < 33) continue; a.last = t; a.frame(t); } if (!ISLE_ANIM.size) { cancelAnimationFrame(ISLE_ANIM.loop); ISLE_ANIM.loop = 0; } }; ISLE_ANIM.loop = requestAnimationFrame(loop); }
}
// le serveur des îles (pg_island_*, île = salle ; ~/jdv-tools/pegase/server/INTEGRATION-iles.md) ; tant qu'il n'est pas en ligne (404) :
// l'île de la salle, comme avant. Trois sortes : publique · mdp (mot de passe) · amis. Toutes se regardent, même sans compte ; une île
// protégée se demande (e-mail obligatoire sans compte) : le TICKET reste dans le navigateur pour suivre la demande.
const ISL = { srv: null, rows: [] };
const islName = () => (isGuest() ? null : profile.name);
const KIND = { publique: '🌍 Publique', mdp: '🔒 Mot de passe', amis: '💛 Amis seulement' };
let islTickets = store.get('jdw.iletickets', {}) || {};
async function islesData() {
  if (ISL.srv !== false) {
    try {
      const rows = await rpc('pg_island_list', { p_code: CODE() || '', p_name: islName() }, { quiet404: true, quiet: true });
      if (Array.isArray(rows)) { ISL.srv = true; return (ISL.rows = rows.map(q => { const kind = q.r_kind || (q.r_private ? 'mdp' : 'publique'); return { id: q.r_id, name: q.r_name, kind, priv: kind !== 'publique', keeper: q.r_owner || '', n: q.r_online | 0, max: q.r_max | 0, members: q.r_members | 0, mine: !!q.r_mine, banned: !!q.r_banned, guardian: !!q.r_guardian, cur: !!(PG.isle && PG.isle.id === q.r_id) }; })); }
    } catch (e) { if (e.status === 404) ISL.srv = false; }
  }
  return [];   // pas de serveur des îles : rien (les salles de la borne ne sont pas des îles)
}
const ERRS = [[/pleine/, 'Cette île est pleine (toutes les parcelles sont prises).'], [/mauvais mot de passe/, 'Ce n\'est pas le bon mot de passe.'], [/banni/, 'Le gardien t\'a banni de cette île.'],
  [/reservee aux amis/, 'Cette île est réservée aux amis du gardien : demande l\'accès.'], [/limite/, 'Tu as déjà deux îles : c\'est le maximum.'], [/trop d essais/, 'Trop d\'essais : réessaie dans un moment.'],
  [/e-mail invalide/, 'Cet e-mail n\'est pas valide.'], [/e-mail requis/, 'Sans compte, laisse ton e-mail pour que le gardien sache qui tu es.'], [/deja envoyee/, 'Ta demande est déjà envoyée : le gardien va répondre.'],
  [/deja membre/, 'Tu fais déjà partie de cette île !'], [/ile publique/, 'Cette île est publique : entre directement.'], [/nom d ile refuse/, 'Ce nom d\'île n\'est pas accepté.'],
  [/existe deja/, 'Une île porte déjà ce nom.'], [/trop court/, 'Mot de passe trop court.'], [/ile inconnue/, 'Cette île n\'existe plus.'],
  [/pas gardien/, 'Seul le gardien de l\'île peut faire ça.'], [/pas membre/, 'Cette personne ne fait plus partie de l\'île.']];
const islErr = (e) => { const t = String((e && e.message) || ''); for (const [re, m] of ERRS) if (re.test(t)) return m; return e && e.guest ? 'Crée ton compte (gratuit) pour jouer sur une île.' : 'Impossible pour le moment, réessaie plus tard.'; };
// petit panneau dans la carte (mot de passe, demande, gestion) : pas de prompt()
function islPanel(host, html) { let pn = host.querySelector('.pi-panel'); if (pn) pn.remove(); pn = document.createElement('div'); pn.className = 'pi-panel'; pn.innerHTML = html; host.appendChild(pn); return pn; }
// demander l'accès à une île protégée : e-mail (obligatoire sans compte), puis on suit le ticket
function islRequest(q, card) {
  const pn = islPanel(card, '<b class="pp-t"></b><label>' + (isGuest() ? 'Ton e-mail (obligatoire sans compte)' : 'Ton e-mail (facultatif)') + '<input type="email" autocomplete="email" maxlength="80"></label><div class="pp-row"><button type="button" class="pp-ok">Envoyer la demande</button><button type="button" class="pp-x">Annuler</button></div><p class="pp-msg"></p><p class="pp-small">Ton e-mail n\'est jamais montré au gardien ; il est effacé dès qu\'il répond.</p>');
  pn.querySelector('.pp-t').textContent = '✉️ Demander l\'accès à ' + q.name;
  const inp = pn.querySelector('input'), go = async () => {
    try { const t = await rpc('pg_island_request', { p_code: CODE() || '', p_name: islName(), p_id: q.id, p_email: inp.value.trim() || null }); const tk = typeof t === 'string' ? t : (t && (t.r_ticket || t.ticket)) || ''; if (tk) { islTickets[q.id] = tk; store.set('jdw.iletickets', islTickets); } pn.remove(); renderIsles(); toastCheer('✉️ Demande envoyée : le gardien va te répondre !', null, true); }
    catch (e) { pn.querySelector('.pp-msg').textContent = islErr(e); }
  };
  pn.querySelector('.pp-ok').addEventListener('click', go); inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  pn.querySelector('.pp-x').addEventListener('click', () => pn.remove());
}
async function islJoin(q, card) {
  const g = gameById('pegase'); if (!g) return;
  if (!ISL.srv) { openGame(g); return; }
  if (q.cur && q.mine) { openGame(g); return; }
  if (isGuest()) { if (q.priv) islRequest(q, card); else toastCheer('Crée ton compte (gratuit) pour jouer sur une île 😉 — tu peux déjà la regarder.', null, true); return; }
  const go = async (pw) => {
    try { const r = await rpc('pg_island_join', { p_code: CODE(), p_name: profile.name, p_id: q.id, p_password: pw || '' }); if (r !== 'ok' && r !== true && !(Array.isArray(r) && r.length)) throw new Error(String(r)); }
    catch (e) { if (/reservee aux amis/.test(String(e.message))) { islRequest(q, card); return; } const pn = card.querySelector('.pi-panel'); if (pn) pn.querySelector('.pp-msg').textContent = islErr(e); else toastCheer(islErr(e), null, true); return; }
    PG.isle = { id: q.id, name: q.name, kind: q.kind }; store.set('jdw.ile', PG.isle); openGame(g);   // l'appli lit l'île choisie (api.pegase.info().ile)
  };
  if (q.kind !== 'mdp' || q.mine) { go(''); return; }
  const pn = islPanel(card, '<label>🔒 Mot de passe de l\'île<input type="password" autocomplete="off" maxlength="40"></label><div class="pp-row"><button type="button" class="pp-ok">Entrer</button><button type="button" class="pp-x">Annuler</button></div><p class="pp-msg"></p><button type="button" class="pp-link">Pas le mot de passe ? Demander l\'accès</button>');
  const inp = pn.querySelector('input'); inp.focus();
  pn.querySelector('.pp-ok').addEventListener('click', () => go(inp.value));
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(inp.value); });
  pn.querySelector('.pp-x').addEventListener('click', () => pn.remove());
  pn.querySelector('.pp-link').addEventListener('click', () => islRequest(q, card));
}
async function islWatch(q, card) {
  // toutes les îles se regardent, même privées et sans compte ; les maisons d'une île protégée : seulement pour ses amis
  let w = null; if (ISL.srv) { try { w = await rpc('pg_island_watch', { p_id: q.id, p_code: CODE() || '', p_name: islName() }, { quiet: true }); } catch (e) { w = { err: islErr(e) }; } }
  if (Array.isArray(w)) w = w[0] || null;
  const pn = islPanel(card, '<b class="pp-t"></b><p class="pp-msg"></p><div class="pp-row"><button type="button" class="pp-ok" hidden>Ouvrir dans Pégase</button><button type="button" class="pp-ask pp-ok" hidden>Demander l\'accès</button><button type="button" class="pp-x">Fermer</button></div>');
  pn.querySelector('.pp-t').textContent = '👀 Sur ' + q.name;
  let t;
  if (!ISL.srv) t = 'Bientôt : regarder une île sans jouer, même sans compte.';
  else if (!w || w.err) t = (w && w.err) || 'Impossible de regarder cette île pour le moment.';
  else {
    // en spectateur, on ne voit que les avatars et leur pseudo public (le nom arrive tout prêt du serveur : pseudo public ou « HabitantXXXXXX »)
    const ppl = Array.isArray(w.r_players) ? w.r_players : Array.isArray(w.r_avatars) ? w.r_avatars : [], on = w.r_online | 0;
    t = on + ' joueur' + (on > 1 ? 's' : '') + ' en ligne' + (w.r_members ? ' / ' + w.r_members + ' membre' + (w.r_members > 1 ? 's' : '') : '') + '.' + (ppl.length ? '' : ' Personne sur l\'île pour le moment.');
    if (ppl.length) {
      const who = document.createElement('div'); who.className = 'pp-who';
      for (const a of ppl.slice(0, 24)) { const sp = document.createElement('span'), nm = String(a.r_name || a.n || a.name || '').slice(0, 24), ph = a.r_photo || a.photo || ''; if (ph && /^(data:image\/|https:\/\/)/.test(ph)) { const im = document.createElement('img'); im.src = ph; im.alt = ''; sp.appendChild(im); } else { const b = document.createElement('b'); b.textContent = (nm[0] || '?').toUpperCase(); sp.appendChild(b); } sp.appendChild(document.createTextNode(nm)); who.appendChild(sp); }
      pn.querySelector('.pp-msg').after(who);
    }
    if (q.priv && !q.mine) { const ab = pn.querySelector('.pp-ask'); ab.hidden = false; ab.addEventListener('click', () => islRequest(q, card)); }
  }
  pn.querySelector('.pp-msg').textContent = t;
  // l'appli Pégase (Android) sait regarder une île : salle=<id>&regarder=1, sans jeton
  const ob = pn.querySelector('.pp-ok');
  if (ISL.srv && NAT.b && NAT.info && natApi() >= 1) { ob.hidden = false; ob.addEventListener('click', () => { try { NAT.b.openApp(NAT.info.pkg, (NAT.info.open || 'pegase://open') + '?from=borne&salle=' + encodeURIComponent(q.id) + '&regarder=1'); } catch (e) { toastCheer('Ouvre Pégase depuis sa tuile.', null, true); } }); }
  pn.querySelector('.pp-x').addEventListener('click', () => pn.remove());
}
// ⚙️ PARAMÈTRES de l'île (gardien seulement) : Membres (en ligne ou non, Exclure / Bannir) · Accès (tout le monde / mot de passe / amis,
// changer le mot de passe) · Demandes (Accepter / Refuser) · Bannis (débannir). Les membres et les bannis se désignent par r_key (opaque).
const islKeeper = (q) => !isGuest() && (q.guardian || (q.keeper && (cleanName(q.keeper) === cleanName(profile.name) || (PUBN.name && q.keeper === PUBN.name))));
async function islManage(q, card, tab) {
  const pn = islPanel(card, '<b class="pp-t">⚙️ Paramètres de l\'île</b><div class="pp-tabs" role="tablist"><button type="button" role="tab" data-t="mem">👥<br>Membres</button><button type="button" role="tab" data-t="acc">🔑<br>Accès</button><button type="button" role="tab" data-t="dem">✉️<br>Demandes</button><button type="button" role="tab" data-t="ban">⛔<br>Bannis</button></div>' +
    '<div class="pp-pane"></div><p class="pp-msg"></p><div class="pp-row"><button type="button" class="pp-x">Fermer</button></div>');
  pn.dataset.ile = q.id; let dirty = false;   // la carte se redessine à la fermeture (garder le panneau ouvert pendant la gestion)
  const pane = pn.querySelector('.pp-pane'), msg = (t) => { pn.querySelector('.pp-msg').textContent = t; }, A = (x) => Object.assign({ p_code: CODE(), p_name: profile.name, p_id: q.id }, x || {});
  // un bouton qui demande confirmation (2e appui) avant d'agir
  const sure = (b, label, act) => { b.textContent = label; b.addEventListener('click', () => { if (b.dataset.sure) { act(); return; } b.dataset.sure = '1'; b.textContent = 'Sûr ?'; setTimeout(() => { delete b.dataset.sure; b.textContent = label; }, 3000); }); };
  const when = (t) => { const d = t ? new Date(t) : null; return d && !isNaN(d) ? 'membre depuis le ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''; };
  const mem = async () => {
    pane.textContent = 'Chargement…';
    try {
      const rows = await rpc('pg_island_members', A(), { quiet: true }) || []; pane.textContent = '';
      if (!rows.length) { pane.textContent = 'Personne d\'autre pour l\'instant.'; return; }
      rows.sort((x, y) => (y.r_guardian ? 1 : 0) - (x.r_guardian ? 1 : 0) || (y.r_online ? 1 : 0) - (x.r_online ? 1 : 0));
      for (const r of rows) {
        const row = document.createElement('div'); row.className = 'pp-mem';
        row.innerHTML = '<span><b></b><small></small></span>';
        row.querySelector('b').textContent = (r.r_guardian ? '🛡️ ' : '') + String(r.r_name || 'Habitant');
        const sm = row.querySelector('small'); sm.innerHTML = '<em></em>'; sm.firstChild.className = r.r_online ? 'on' : ''; sm.firstChild.textContent = r.r_online ? '● en ligne' : '○ pas là'; sm.append(r.r_guardian ? ' · gardien' : when(r.r_since) ? ' · ' + when(r.r_since) : '');
        if (!r.r_guardian) {
          const k = document.createElement('button'), b = document.createElement('button'); k.type = b.type = 'button'; k.className = 'pp-chip'; b.className = 'pp-chip';
          sure(k, '🚪 Exclure', async () => { try { await rpc('pg_island_kick', A({ p_target: r.r_key })); msg(r.r_name + ' ne fait plus partie de l\'île (une nouvelle demande reste possible).'); mem(); dirty = true; } catch (e) { msg(islErr(e)); } });
          sure(b, '⛔ Bannir', async () => { try { await rpc('pg_island_ban', A({ p_target: r.r_key })); msg(r.r_name + ' est banni de l\'île.'); mem(); dirty = true; } catch (e) { msg(islErr(e)); } });
          row.append(k, b);
        }
        pane.appendChild(row);
      }
    } catch (e) { pane.textContent = e.status === 404 ? 'Bientôt : la liste des membres.' : 'Liste indisponible.'; }
  };
  const acc = () => {
    pane.innerHTML = '<label>Qui peut entrer ?<select class="pp-kind"><option value="publique">🌍 Tout le monde</option><option value="mdp">🔒 Avec un mot de passe</option><option value="amis">💛 Mes amis seulement</option></select></label>' +
      '<label class="pp-pwl">Nouveau mot de passe<input type="text" class="pp-pw" maxlength="40" autocomplete="off" placeholder="au moins 3 caractères"></label><div class="pp-row"><button type="button" class="pp-ok">Enregistrer</button></div>';
    const ks = pane.querySelector('.pp-kind'); ks.value = q.kind; const syncPw = () => { pane.querySelector('.pp-pwl').hidden = ks.value !== 'mdp'; }; syncPw(); ks.addEventListener('change', syncPw);
    pane.querySelector('.pp-ok').addEventListener('click', async () => {
      const pw = pane.querySelector('.pp-pw').value;
      if (ks.value === 'mdp' && pw && pw.length < 3) { msg('Un mot de passe d\'au moins 3 caractères.'); return; }
      if (ks.value === 'mdp' && !pw && q.kind !== 'mdp') { msg('Choisis le mot de passe de l\'île.'); return; }
      try { await rpc('pg_island_kind', A({ p_kind: ks.value, p_password: ks.value === 'mdp' ? pw : '' })); q.kind = ks.value; msg('C\'est enregistré : ' + KIND[ks.value] + (ks.value === 'mdp' && pw ? ', nouveau mot de passe.' : '.')); pane.querySelector('.pp-pw').value = ''; dirty = true; } catch (e) { msg(islErr(e)); }
    });
  };
  const dem = async () => {
    pane.textContent = 'Chargement…';
    try {
      const rows = await rpc('pg_island_requests', A(), { quiet: true }) || []; pane.textContent = '';
      PG.dem[q.id] = rows.length > 0; islDots();
      if (!rows.length) { pane.textContent = 'Aucune demande pour l\'instant.'; return; }
      for (const r of rows) {
        const row = document.createElement('div'); row.className = 'pp-req';
        row.innerHTML = '<span></span><button type="button" class="pp-chip pp-yes">✓ Accepter</button><button type="button" class="pp-chip">✕ Refuser</button>';
        row.querySelector('span').textContent = (r.r_name || 'Un invité') + (r.r_contact ? ' ✉️' : '');
        const ans = async (ok) => { try { await rpc('pg_island_answer', { p_code: CODE(), p_name: profile.name, p_req_id: r.r_req_id, p_ok: ok }); msg(ok ? 'Demande acceptée.' : 'Demande refusée.'); dem(); dirty = true; } catch (e) { msg(islErr(e)); } };
        row.querySelector('.pp-yes').addEventListener('click', () => ans(true)); row.querySelectorAll('button')[1].addEventListener('click', () => ans(false));
        pane.appendChild(row);
      }
    } catch (e) { pane.textContent = 'Liste indisponible.'; }
  };
  const ban = async () => {
    pane.textContent = 'Chargement…';
    try {
      const rows = await rpc('pg_island_bans', A(), { quiet: true }) || []; pane.textContent = '';
      if (!rows.length) { pane.textContent = 'Personne n\'est banni.'; return; }
      for (const r of rows) {
        const n = String(r.r_name || r), row = document.createElement('div'), b = document.createElement('button'); row.className = 'pp-mem'; row.innerHTML = '<span></span>'; row.firstChild.textContent = '⛔ ' + n;
        b.type = 'button'; b.className = 'pp-chip'; b.textContent = '↩️ Débannir';
        b.addEventListener('click', async () => { try { await rpc('pg_island_unban', A({ p_target: r.r_key || n })); msg(n + ' peut revenir.'); ban(); } catch (e) { msg(islErr(e)); } });
        row.appendChild(b); pane.appendChild(row);
      }
    } catch (e) { pane.textContent = 'Liste indisponible.'; }
  };
  const T = { mem, acc, dem, ban };
  const show = (t) => { pn.dataset.tab = t; msg(''); for (const b of pn.querySelectorAll('.pp-tabs button')) b.setAttribute('aria-selected', b.dataset.t === t ? 'true' : 'false'); T[t](); islDots(); };
  for (const b of pn.querySelectorAll('.pp-tabs button')) b.addEventListener('click', () => show(b.dataset.t));
  pn.querySelector('.pp-x').addEventListener('click', () => { pn.remove(); if (dirty) renderIsles(); });
  show(tab || (PG.dem[q.id] ? 'dem' : 'mem'));
}
// pastille « nouvelle demande » : sur ⚙️ et sur l'onglet Demandes ; le serveur signale chaque demande (événement « ile » sur le canal privé
// de l'île, reçu seulement si la borne l'écoute) ; sinon on relit les demandes des îles dont je suis gardien (ouverture + toutes les 60 s)
function islDots() {
  for (const b of document.querySelectorAll('#jdw-pg-isles .pi-keep')) { const on = !!PG.dem[b.dataset.ile]; let i = b.querySelector('i'); if (on && !i) { i = document.createElement('i'); b.appendChild(i); } else if (!on && i) i.remove(); }
  for (const pn of document.querySelectorAll('#jdw-pg-isles .pi-panel[data-ile]')) { const t = pn.querySelector('.pp-tabs [data-t="dem"]'); if (!t) continue; let i = t.querySelector('i'); const on = !!PG.dem[pn.dataset.ile]; if (on && !i) { i = document.createElement('i'); t.appendChild(i); } else if (!on && i) i.remove(); }
}
async function islPollDem() {
  if (!ISL.srv || isGuest() || !ONLINE) return;
  for (const q of ISL.rows.filter(islKeeper)) { try { const rows = await rpc('pg_island_requests', { p_code: CODE(), p_name: profile.name, p_id: q.id }, { quiet: true }) || []; PG.dem[q.id] = rows.length > 0; } catch (e) {} }
  islDots();
}
function islOnDemande(id) {
  const q = ISL.rows.find(x => x.id === id); if (!q || !islKeeper(q)) return;
  PG.dem[id] = true; islDots();
  const pn = document.querySelector('#jdw-pg-isles .pi-panel[data-ile="' + CSS.escape(String(id)) + '"]'); if (pn && pn.dataset.tab === 'dem') pn.querySelector('.pp-tabs [data-t="dem"]').click();
  toastCheer('✉️ Nouvelle demande pour « ' + q.name + ' » : ouvre ⚙️ pour répondre.', null, true);
}
setInterval(() => { if (PG_TAB && MODE === 'pegase' && !document.hidden) islPollDem(); }, 60000);
async function renderIsles() {
  const box = $('jdw-pg-isles'); if (!box) return;
  const all = await islesData();
  // première ouverture : l'onglet où il y a quelque chose (mes îles, sinon les privées si aucune publique)
  if (!PG.picked && all.length) { PG.picked = true; if (all.some(q => q.mine)) PG.tab = 'mine'; else if (!all.some(q => !q.priv)) PG.tab = 'priv'; }
  for (const b of document.querySelectorAll('#jdw-pg-tabs button')) b.setAttribute('aria-selected', b.dataset.t === PG.tab ? 'true' : 'false');
  const list = all.filter(q => PG.tab === 'pub' ? !q.priv : PG.tab === 'priv' ? q.priv : q.mine || islTickets[q.id]);
  box.textContent = '';
  if (!list.length) {
    const e = document.createElement('div'); e.className = 'pg-empty';
    e.innerHTML = PG.tab === 'priv' ? '<b>🔒 Îles privées</b>' + (ISL.srv ? 'Aucune île privée pour l\'instant : crée la tienne, avec un mot de passe ou pour tes amis seulement.' : 'Bientôt : une île avec mot de passe, rien que pour la famille ou les copains.') : PG.tab === 'mine' ? '<b>⭐ Tes îles</b>Les îles que tu as créées, rejointes ou demandées apparaîtront ici.' : '<b>🌍 Îles publiques</b>' + (ISL.srv ? 'Aucune île publique pour l\'instant : crée la première !' : 'Bientôt : les îles ouvertes à tous, à rejoindre ou à regarder.');
    box.appendChild(e);
  }
  const me = isGuest() ? '' : cleanName(profile.name);
  for (const q of list) {
    const c = document.createElement('div'); c.className = 'pg-isle' + (q.cur ? ' cur' : '') + (q.banned ? ' banned' : ''); c.setAttribute('role', 'listitem');
    c.innerHTML = '<canvas aria-hidden="true"></canvas><span class="pi-badge"></span><span class="pi-live"><i></i><b></b></span>' +
      '<div class="pi-body"><div class="pi-name"></div><div class="pi-sub"></div><div class="pi-req" hidden></div><div class="pi-bar" hidden><u></u></div><div class="pi-act"><button type="button" class="pi-play">Jouer</button><button type="button" class="pi-watch">👀 Regarder</button></div></div>';
    c.querySelector('.pi-badge').textContent = (KIND[q.kind] || KIND.publique) + (q.cur ? ' · ton île' : '');
    c.querySelector('.pi-live b').textContent = q.n + (ISL.srv ? ' / ' + q.members : '') + ' en ligne';   // présents / membres de l'île
    c.querySelector('.pi-name').textContent = q.name;
    const keeperMe = islKeeper(q); void me;
    c.querySelector('.pi-sub').textContent = q.banned ? '⛔ Le gardien t\'a banni de cette île' : keeperMe ? '🛡️ Tu es le gardien de cette île' : q.keeper ? 'Gardien : ' + q.keeper : '';
    // la limite, discrètement : « 2 membres · 20 places max » (une place par parcelle)
    if (ISL.srv) { const cap = document.createElement('div'); cap.className = 'pi-cap'; cap.textContent = q.members + ' membre' + (q.members > 1 ? 's' : '') + (q.max ? ' · ' + q.max + ' places max' : ''); c.querySelector('.pi-sub').after(cap); }
    if (q.max) { c.querySelector('.pi-bar').hidden = false; c.querySelector('.pi-bar u').style.width = Math.min(100, 100 * q.members / q.max) + '%'; }
    const play = c.querySelector('.pi-play');
    if (q.banned) play.disabled = true;
    else if (q.max && q.members >= q.max && !q.mine) { play.textContent = 'Pleine'; play.disabled = true; }
    else if (q.priv && !q.mine && (isGuest() || q.kind === 'amis')) play.textContent = 'Demander';
    play.addEventListener('click', () => islJoin(q, c.querySelector('.pi-body')));
    c.querySelector('.pi-watch').addEventListener('click', () => islWatch(q, c.querySelector('.pi-body')));
    if (keeperMe && ISL.srv) { const m = document.createElement('button'); m.type = 'button'; m.className = 'pi-watch pi-keep'; m.dataset.ile = q.id; m.textContent = '⚙️'; m.title = 'Paramètres de l\'île : membres, accès, demandes, bannis'; m.setAttribute('aria-label', 'Paramètres de l\'île'); m.addEventListener('click', () => islManage(q, c.querySelector('.pi-body'))); c.querySelector('.pi-act').appendChild(m); }
    // ma demande d'accès en cours : on suit le ticket
    const tk = islTickets[q.id];
    if (tk && ISL.srv && !q.mine) {
      rpc('pg_island_request_state', { p_ticket: tk }, { quiet: true }).then((st) => {
        st = String(Array.isArray(st) ? st[0] : st || '');
        const el = c.querySelector('.pi-req'); el.hidden = false;
        el.textContent = st === 'acceptee' ? '✅ Ta demande est acceptée ! ' + (isGuest() ? 'Crée ton compte pour jouer.' : 'Tu peux entrer.') : st === 'refusee' ? '❌ Le gardien a refusé ta demande.' : st === 'attente' ? '⏳ Ta demande attend la réponse du gardien.' : '';
        el.className = 'pi-req ' + st; if (st === 'inconnue' || st === 'refusee') { delete islTickets[q.id]; store.set('jdw.iletickets', islTickets); }
      }).catch(() => {});
    }
    box.appendChild(c);
    requestAnimationFrame(() => isleArt(c.querySelector('canvas'), String(q.name).split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0) | 0, 7), q.n, q));
  }
  islDots(); if (!PG.polled && ISL.srv) { PG.polled = true; islPollDem(); }
  $('jdw-pg-note').textContent = isGuest() ? 'Sans compte, tu vois toutes les îles et tu peux les regarder ; pour jouer, crée ton compte (c\'est gratuit).' : '';
}
for (const b of document.querySelectorAll('#jdw-pg-tabs button')) b.addEventListener('click', () => { PG.tab = b.dataset.t; PG.picked = true; renderIsles(); });
// créer son île : nom, qui peut entrer (tout le monde / mot de passe / amis) ; le créateur en est le gardien
$('jdw-pg-create').addEventListener('click', () => {
  if (!ISL.srv) { toastCheer('🏝️ Bientôt : crée ton île (publique ou avec mot de passe) et deviens son gardien !', null, true); return; }
  if (isGuest()) { toastCheer('Crée ton compte (gratuit) pour avoir ton île 😉', null, true); return; }
  const host = $('jdw-pg-create').parentNode, old = host.querySelector('.pg-new'); if (old) { old.remove(); return; }
  const f = document.createElement('div'); f.className = 'pg-new pi-panel';
  f.innerHTML = '<b class="pp-t">🏝️ Ton île</b><label>Nom de l\'île<input type="text" class="pp-n" maxlength="30" autocomplete="off"></label><label>Qui peut entrer ?<select class="pp-kind"><option value="publique">🌍 Tout le monde</option><option value="mdp">🔒 Avec un mot de passe</option><option value="amis">💛 Mes amis seulement</option></select></label><label class="pp-pwl" hidden>Mot de passe<input type="text" class="pp-pw" maxlength="40" autocomplete="off"></label><div class="pp-row"><button type="button" class="pp-ok">Créer</button><button type="button" class="pp-x">Annuler</button></div><p class="pp-msg"></p>';
  $('jdw-pg-create').after(f);
  const ks = f.querySelector('.pp-kind'); ks.addEventListener('change', () => { f.querySelector('.pp-pwl').hidden = ks.value !== 'mdp'; });
  f.querySelector('.pp-x').addEventListener('click', () => f.remove());
  f.querySelector('.pp-ok').addEventListener('click', async () => {
    const name = f.querySelector('.pp-n').value.trim(), kind = ks.value, pw = f.querySelector('.pp-pw').value;
    if (name.length < 3) { f.querySelector('.pp-msg').textContent = 'Un nom d\'au moins 3 lettres.'; return; }
    if (kind === 'mdp' && pw.length < 3) { f.querySelector('.pp-msg').textContent = 'Un mot de passe d\'au moins 3 caractères.'; return; }
    try { await rpc('pg_island_create', { p_code: CODE(), p_name: profile.name, p_island: name, p_private: kind !== 'publique', p_password: kind === 'mdp' ? pw : '', p_kind: kind }); f.remove(); PG.tab = 'mine'; renderIsles(); toastCheer('🏝️ Ton île est créée : tu en es le gardien !', null, true); }
    catch (e) { f.querySelector('.pp-msg').textContent = islErr(e); }
  });
});
/* ================= Duel : deux joueurs face à face sur le même téléphone ================= */
// P0 = en bas (écran à l'endroit), P1 = en haut (écran à l'envers). Les jeux : source/duos/*.js (DUO-CONTRACT.md).
const DUO_COLORS = ['#ffa630', '#5ef0ff'];
// duel en ligne (bêta) : voir la section « Duel en ligne » plus bas
const NET = { code: '', role: '', d: null, topic: '', pc: null, ctl: null, inp: null, peer: '', peerCid: '', seats: null, turn: -1, blocked: new Set(),
  pend: [], remote: false, helloT: 0, waitT: 0, guestInfo: null, stream: null, dest: null, vSender: null, aSender: null, start: null, ids: new Map(),
  data: false, g: null, handlers: [], queue: [], off: 0, rttv: 0, pings: [], pingT: 0, kind: '', co: null };
// musique de chaque duel : morceaux des jeux solo qui vont bien
const DUO_MUSIC = { bolides: ['pleingaz', 'intense'], pingpong: ['carreaux', 'calm'], trouve: ['accueil', 'calm'], palet: ['carreaux', 'intense'], briques: ['carreaux', 'calm'], boum: ['glouton', 'intense'],
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
// duel marqué local: false (pas à deux sur le même écran) : sur ce téléphone, l'adversaire du haut est toujours l'IA (duoAiOnly)
let duoAiOnly = false;
const seatName = i => (NET.seats ? NET.seats[i] : i === 1 && duoAiOnly ? AI_NAME : isGuest() ? (i === 1 && seats[1] === AI_NAME ? AI_NAME : GUEST) : seats[i]) || GUEST;
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
  try { renderPadSeats(); } catch (e) {}
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
let DUEL_WHERE = TOUCH ? 'local' : 'online', duelPadAuto = !TOUCH;
function setDuelWhere(w) {
  const loc = duelLocalOK();
  if (!TOUCH) {                         // ordinateur : à deux sur le même écran seulement avec une manette (manette.js)
    if (loc && duelPadAuto && w === 'online') { w = 'local'; duelPadAuto = false; }
    if (!loc) { if (w === 'local') duelPadAuto = true; w = 'online'; }
  }
  DUEL_WHERE = w;
  for (const b of document.querySelectorAll('#jdw-duel-switch button')) if (b.dataset.where === 'local') {
    b.classList.toggle('off', !loc); if (loc) { b.removeAttribute('aria-disabled'); b.title = ''; } else { b.setAttribute('aria-disabled', 'true'); b.title = 'Sur ordinateur : défie un copain en ligne'; }
  }
  const pc = $('jdw-duel-pc'); if (pc) {
    pc.hidden = loc && !(w === 'online' && isGuest());
    $('jdw-duel-pc-t').textContent = !loc ? 'Sur ordinateur : défie un copain en ligne' : 'Le duel en ligne demande un compte';
    $('jdw-duel-pc-s').textContent = isGuest() ? 'Chacun sur son appareil : crée ton compte (gratuit) pour défier tes copains.' : 'Les duels à deux sur le même écran se jouent sur un téléphone ou une tablette, posés à plat.';
    $('jdw-duel-pc-go').hidden = !isGuest();
  }
  $('jdw-page-duel').classList.toggle('no-touch', !loc);
  $('jdw-page-duel').classList.toggle('guest-online', w === 'online' && isGuest());
  for (const b of document.querySelectorAll('#jdw-duel-switch button')) b.setAttribute('aria-selected', String(b.dataset.where === w));
  $('jdw-duel-local').hidden = w !== 'local'; $('jdw-duel-online').hidden = w !== 'online';
  if (duoTiles.length) refreshDuoTiles();
  try { renderPadSeats(); } catch (e) {}
}
for (const b of document.querySelectorAll('#jdw-duel-switch button')) b.addEventListener('click', () => { if (!duelLocalOK() && b.dataset.where === 'local') { toastCheer('Sur ordinateur, les duels se jouent en ligne : à deux sur le même écran, branche une manette (ou deux) ou prends un téléphone.', profile.name, true); return; } if (b.dataset.where === 'local') duelPadAuto = false; setDuelWhere(b.dataset.where); });
$('jdw-duel-pc-go').addEventListener('click', () => guestAsk('Duel en ligne'));
for (const b of document.querySelectorAll('#jdw-duel-switch button')) if (!duelLocalOK() && b.dataset.where === 'local') { b.setAttribute('aria-disabled', 'true'); b.classList.add('off'); b.title = 'Sur ordinateur : défie un copain en ligne'; }
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
      duoAiOnly = d.local === false; if (duoAiOnly) ensureAiPlayer();   // pas à deux sur le même écran : contre l'IA
      if (aiBlocks(d)) { duoAiOnly = false; ensureAiPlayer(); toastCheer('Je ne sais pas encore jouer à ce jeu !', AI_NAME, true); return; }
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
    const aiOnly = DUEL_WHERE !== 'online' && t.g.local === false && seatName(1) !== AI_NAME;   // sur ce téléphone : contre l'IA seulement
    t.tag.textContent = noNet ? 'Bientôt en ligne' : gb ? 'En ligne avec un compte' : nr ? 'Il faut du réseau' : off ? 'Bientôt contre l\'IA' : aiOnly ? '🤖 Contre l\'IA (' + AI_LEVELS[aiLevel][0] + ') ou en ligne' : w[0] + w[1] && !sameSeats() ? seatName(0) + ' ' + w[0] + ' – ' + w[1] + ' ' + seatName(1) : (t.g.tagline || '');
    t.tag.classList.toggle('tally', !off && !aiOnly && !!(w[0] + w[1]) && !sameSeats());
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
// le joueur p a-t-il gagné ? (target points, et winBy points d'écart si le duel le demande) ; balle de match : il gagne s'il marque le suivant
const duoWon = (d, s, p) => s[p] >= ((d && d.target) || 5) && s[p] - s[1 - p] >= ((d && d.winBy) || 1);
const duoMatchPt = (d, s, p) => !duoWon(d, s, p) && duoWon(d, p === 0 ? [s[0] + 1, s[1]] : [s[0], s[1] + 1], p);
function duoPills(scored) {
  for (const i of [0, 1]) {
    const pl = $('jdw-duo-pill' + i); pl.querySelector('b').textContent = DUO.scores[i];
    pl.classList.toggle('mp', !DUO.over && duoMatchPt(DUO.d, DUO.scores, i));
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
      const over = duoWon(d, DUO.scores, p);
      if (over) { DUO.over = true; DUO.winner = p; }
      duoPills(p);
      duoSay((why ? why + ' ' : '') + (over ? P[p].name + ' gagne le match !' : 'Point pour ' + P[p].name + ' !'), { ms: 1300, color: P[p].color, small: true });
      if (!sting('point', 0.55, false)) Audio.tone(over ? 784 : 660, 0.12, 'square', 0.05, over ? 1175 : 880);
      if (!over && duoMatchPt(d, DUO.scores, p) && !DUO.mp) {   // balle de match : la musique s'emballe
        DUO.mp = true; setTimeout(() => { if (mine()) { sting('match', 0.6); if (duoMusicId(d)) setMusic(duoMusicId(d), 'intense'); } }, 700);
      }
      if (over) { setTimeout(() => { if (mine()) duoResults(); }, 1500); try { if (PADJ) PADJ.rumble('win'); } catch (e) {} }
      return { scores: DUO.scores.slice(), over, winner: over ? p : null };
    },
    round: () => DUO.scores[0] + DUO.scores[1] + 1,
    scores: () => DUO.scores.slice(),
    say: (text, o) => { if (mine() && NET.role !== 'guest') duoSay(text, o); },
    turn: (p) => { if (mine()) NET.turn = p === 0 || p === 1 ? p : -1; },   // jeux au tour par tour : qui a la main (duel en ligne)
    hasMusic: !!duoMusicId(d),   // la bibliothèque joue une musique pour ce duel : le jeu ne joue pas la sienne
    // vibration du téléphone + des manettes ; p (0 / 1, facultatif) = seulement la manette de ce joueur
    vibrate: (ms, p) => { try { if (navigator.vibrate) navigator.vibrate(Math.max(10, Math.min(400, +ms || 30))); } catch (e) {} try { const a = DUO.api; if (a && a.pad && DUO.seq === seq) a.pad.rumble(+ms > 120 ? 'big' : 'hit', p === 0 || p === 1 ? p : undefined); } catch (e) {} },
    online: !!(NET.role && NET.data),
    // manettes (CONTRACT.md « Ajout 10 ») : 2 manettes = 2 joueurs ; contre l'IA ou en ligne, toutes pour mon joueur ; joueur assis en face
    // (téléphone à plat, ou invité en ligne dont l'écran est tourné) : sticks et croix déjà retournés dans le repère du jeu
    pad: padApi({ players: 2,
      slots: NET.role && NET.data ? padDuoSlots(NET.role === 'host' ? 0 : 1) : (!NET.role && seatName(1) === AI_NAME) ? padDuoSlots(0) : padDuoSlots(),
      invert: p => p === 1 && d.layout !== 'landscape' && (NET.role && NET.data ? NET.role === 'guest' : TOUCH) }),
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
  padIntro(d, $('jdw-duo'));
}
function unmountDuo() {
  DUO.seq++;   // les rappels de l'ancienne partie deviennent sans effet
  if (DUO.api) padClose(DUO.api.pad);
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
  DUO.d = null; DUO.waitRot = false; DUO.paused = false; duoAiOnly = false;
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
  const g = document.createElement('small'); g.className = 'dp-game'; g.textContent = DUO.d.title + ' · en ' + (DUO.d.target || 5) + ' points' + ((DUO.d.winBy || 1) > 1 ? ' (' + DUO.d.winBy + ' d\'écart)' : '');
  sub.append(side(0), sc, side(1), g);
  $('jdw-duo-pause').style.setProperty('--acc', DUO.d.accent || COLORS.amber);
  padHelpInto($('jdw-duo-pause-help'), PADJ && PADJ.count() ? DUO.d : null);
  $('jdw-duo-pause').hidden = false;
  setTimeout(() => { const b = $('jdw-duo-resume'); if (b && !$('jdw-duo-pause').hidden) b.focus({ preventScroll: true }); }, 30);
}
function duoResume() {
  $('jdw-duo-pause').hidden = true;
  try { if (DUO.api && DUO.api.pad) DUO.api.pad.flush(); } catch (e) {}   // le A sur « Reprendre » n'arrive pas au jeu
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

/* ================= Coop : à deux contre le jeu (avec un robot ou un copain en ligne) ================= */
// Plan : ~/jdv-tools/duotest/coop/COOP-PLAN.md ; contrat des jeux : source/COOP-CONTRACT.md ; serveur : coop.sql (add_coop_score…).
// Un jeu coop = un module solo (JDW_GAMES) ou duel (JDW_DUOS) qui déclare `coop`. Tant qu'aucun ne le fait : page d'attente
// « bientôt » et AUCUNE requête coop au serveur (ni get_coop_scores, ni get_coop_notifs, ni get_messages2).
// Partie : scène solo #jdw-play (le jeu dans #jdw-host), pause #jdw-coop-pause, fin #jdw-coopend. En ligne : la tuyauterie du duel
// en ligne (NET.kind = 'coop', messages « c… » du canal ctl, section « Duel en ligne ») : l'hôte décide, l'invité recopie.
const COOP_ORDER = ['boum', 'ilo', 'magic'];
const COOP_LIB = { boum: { music: 'dboum', intenseAt: 4 }, ilo: { music: 'ilo', intenseAt: INTENSE_AT.ilo }, magic: { music: 'magic', intenseAt: INTENSE_AT.magic } };
const COOP_LV = ['facile', 'moyen', 'difficile', 'extreme'];
const COOP_LVI = { facile: '🐣', moyen: '🙂', difficile: '😤', extreme: '🔥' };
const coopLvName = lv => (AI_LEVELS[lv] || AI_LEVELS.moyen)[0];
// build de test seulement : window.JDW_COOP_EXTRA = ['coopfake'] (faux jeu des tests, ~/jdv-tools/coop-fake.js), jamais publié
const coopExtra = () => (Array.isArray(window.JDW_COOP_EXTRA) ? window.JDW_COOP_EXTRA : []).filter(x => /^[a-z0-9_-]{2,20}$/.test(x));
function coopMod(id) {
  if (COOP_ORDER.includes(id)) return duoById(id) || gameById(id) || null;
  return coopExtra().includes(id) ? (window.JDW_DUOS || {})[id] || (window.JDW_GAMES || {})[id] || null : null;
}
// recalculée à chaque fois (porte labo comprise : un jeu caché l'est aussi en coop)
function coopList() {
  const out = [];
  for (const id of COOP_ORDER.concat(coopExtra())) {
    const m = coopMod(id); if (!m || !m.coop || typeof m.mount !== 'function' || out.some(e => e.id === id)) continue;
    const c = m.coop;
    out.push({ id, m, c, duo: m === (window.JDW_DUOS || {})[id], title: c.title || m.title + ' à deux', short: c.short || m.title,
      accent: m.accent || COLORS.leaf, emoji: c.emoji || m.emoji || '🤝' });
  }
  return out;
}
const coopById = id => coopList().find(e => e.id === id) || null;
const coopPv = e => typeof e.c.preview === 'function' ? e.c.preview.bind(e.c) : typeof e.m.preview === 'function' ? e.m.preview.bind(e.m) : (ctx, w, h) => { ctx.fillStyle = COLORS.night; ctx.fillRect(0, 0, w, h); };
const COOP = { e: null, mode: '', kind: '', lvl: 'moyen', k: 0.5, run: '', seed: 0, room: null, ranked: true, players: null, team: [], me: 0, mate: '',
  seq: 0, over: false, score: 0, stage: 0, stats: null, paused: false, ready: [false, false], shared: false, srv: null, msg2: null, lastCsc: null,
  why: '', gone: '', res: '', recToast: false, intense: false, scores: [], scoresAt: 0, scoresOk: false, world: [], worldOk: false, notifs: [], retryT: 0, quitT: 0, tries: 0 };
let COOP_WHERE = store.get('jdw.coopwhere', 'ia') === 'ami' ? 'ami' : 'ia';
let coopDiff = store.get('jdw.coopdiff', {}) || {};
let coopKind = store.get('jdw.coopkind', 'ami') === 'ia' ? 'ia' : 'ami';
let coopBests = store.get('jdw.coopbests', {}) || {};
let coopLocal = store.get('jdw.coopscores', []); if (!Array.isArray(coopLocal)) coopLocal = [];
let unsentCoop = store.get('jdw.unsentcoop', []); if (!Array.isArray(unsentCoop)) unsentCoop = [];
let coopNotifSeen = store.get('jdw.coopnotifseen', {}) || {};
const coopLvOf = (kind, id) => COOP_LV.includes(coopDiff[kind + ':' + id]) ? coopDiff[kind + ':' + id] : 'moyen';
function coopNewRun() {
  let r = 'r'; for (let i = 0; i < 11; i++) r += '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(shellRand() * 36)];
  COOP.run = r; COOP.seed = Math.floor(shellRand() * 0x7fffffff);
}
const coopTeamKey = (kind, a, b) => kind === 'ia' ? 'ia:' + a : 'ami:' + [a, b].filter(Boolean).sort().join('+');
const coopMusicId = e => { const M = window.JDW_MUSIC || {}, L = COOP_LIB[e.id]; return L && M[L.music] ? L.music : M[e.id] ? e.id : 'accueil'; };
const coopIntenseAt = e => (COOP_LIB[e.id] || {}).intenseAt || INTENSE_AT[e.id] || 99;
function coopMusic() { if (COOP.e && !MUS.override) setMusic(coopMusicId(COOP.e), COOP.intense ? 'intense' : 'calm'); }
const coopIsGuestSide = () => COOP.mode === 'net' && NET.role === 'guest';

// ---------- page Coop : onglets, équipe, tuiles (ou page d'attente quand la liste est vide) ----------
const coopTiles = [], coopSoonTiles = [];
let coopSoonBuilt = false;
function coopSoonInit() {
  if (coopSoonBuilt) return; coopSoonBuilt = true;
  for (const card of document.querySelectorAll('#jdw-coop-soon [data-g]')) {
    const id = card.dataset.g, g = card.dataset.duo ? duoById(id) : gameById(id);
    if (g && g.accent) card.style.setProperty('--acc', g.accent);
    if (!g || typeof g.preview !== 'function') { card.classList.add('no-pv'); continue; }   // jeu absent de ce build : l'emoji suffit
    coopSoonTiles.push({ g, el: card, canvas: card.querySelector('canvas'), visible: !('IntersectionObserver' in window) });
  }
  coopObserve(coopSoonTiles);
}
function coopObserve(list) {
  if (!('IntersectionObserver' in window) || !list.length) return;
  const io = new IntersectionObserver(es => es.forEach(x => { const t = list.find(y => y.el === x.target); if (t) t.visible = x.isIntersecting; }), { root: $('jdw-lib') });
  list.forEach(t => io.observe(t.el));
}
function buildCoopLibrary() {
  const grid = $('jdw-coop-grid'); if (!grid || coopTiles.length) return;
  for (const e of coopList()) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tile coop-tile';   // pas « duo-tile » : les sélecteurs des duels (tests compris) ne voient pas les tuiles coop b.style.setProperty('--acc', e.accent);
    b.setAttribute('aria-label', 'Coop : ' + e.title);
    b.innerHTML = '<div class="tile-img"><canvas aria-hidden="true"></canvas><span class="coop-emoji" aria-hidden="true"></span></div><div class="tile-meta"><div class="tile-name"></div><div class="coop-tag"></div></div>';
    b.querySelector('.tile-name').textContent = e.title; b.querySelector('.coop-emoji').textContent = e.emoji;
    b.addEventListener('click', () => coopTileClick(e.id, b));
    const wrap = document.createElement('div'); wrap.className = 'tile-wrap'; wrap.style.setProperty('--acc', e.accent);
    const ch = document.createElement('button'); ch.type = 'button'; ch.className = 'tile-champ coop-champ'; ch.hidden = true;
    ch.addEventListener('click', x => { x.stopPropagation(); coopOpenBoard(e.id, COOP_WHERE); });
    const wb = document.createElement('button'); wb.type = 'button'; wb.className = 'tile-watch'; wb.hidden = true; wb.textContent = '👁 Voir';
    wb.addEventListener('click', x => { x.stopPropagation(); const ps = coopTilePlayers(e.id); if (ps.length === 1) watchStart(ps[0].name, ps[0].game); else openMembers(); });
    wrap.append(b, ch, wb); grid.appendChild(wrap);
    coopTiles.push({ id: e.id, g: { id: 'coop-' + e.id, preview: coopPv(e) }, el: b, wrap, champ: ch, watch: wb, canvas: b.querySelector('canvas'), tag: b.querySelector('.coop-tag'), visible: !('IntersectionObserver' in window) });
  }
  coopObserve(coopTiles);
}
function renderCoop() {
  if (MODE !== 'coop') return;
  const full = coopList().length > 0;
  $('jdw-coop-full').hidden = !full; $('jdw-coop-soon').hidden = full;
  if (!full) { coopSoonInit(); return; }
  buildCoopLibrary(); setCoopWhere(COOP_WHERE); coopLoadScores();
}
function setCoopWhere(w) {
  COOP_WHERE = w === 'ami' ? 'ami' : 'ia'; store.set('jdw.coopwhere', COOP_WHERE);
  for (const b of document.querySelectorAll('#jdw-coop-switch button')) b.setAttribute('aria-selected', String(b.dataset.where === COOP_WHERE));
  renderCoopTeam(); refreshCoopTiles();
}
for (const b of document.querySelectorAll('#jdw-coop-switch button')) b.addEventListener('click', () => {
  if (b.dataset.where === 'ami' && netOff() && !isGuest()) netNeed('La coop en ligne');
  setCoopWhere(b.dataset.where);
});
// ma tête + celle du coéquipier (le robot, ou un rond pointillé « un copain » qu'on invite au lancement)
function renderCoopTeam() {
  const me = $('jdw-coop-me'), mate = $('jdw-coop-mate'); if (!me) return;
  const g = isGuest(), my = cleanName(profile.name);
  const mh = me.querySelector('.ct-head'); mh.textContent = ''; mh.appendChild(chatHead(g || !my ? 'INVITÉ' : my, { passive: true }));
  me.querySelector('.ct-name').textContent = g || !my ? 'Toi' : dispName(my); me.querySelector('small').textContent = g ? 'en invité' : 'toi';
  const th = mate.querySelector('.ct-head'); th.textContent = '';
  if (COOP_WHERE === 'ia') { ensureAiPlayer(); th.appendChild(chatHead(AI_NAME, { passive: true })); mate.querySelector('.ct-name').textContent = 'Robot'; mate.querySelector('small').textContent = 'de Facile à Extrême'; mate.classList.remove('friend'); }
  else { const d = document.createElement('span'); d.className = 'ct-dot'; d.textContent = '?'; th.appendChild(d); mate.querySelector('.ct-name').textContent = 'Un copain'; mate.querySelector('small').textContent = 'tu l\'invites au lancement'; mate.classList.add('friend'); }
}
$('jdw-coop-me').addEventListener('click', () => { if (isGuest()) guestAsk('Ton joueur'); else openProfiles(); });
function coopBlock(e) {   // '' : jouable ; sinon pourquoi la tuile est grisée
  if (COOP_WHERE === 'ia') return e.c.ai ? '' : 'ai';
  if (!e.c.online) return 'online';
  if (isGuest()) return 'guest';
  if (netOff()) return 'net';
  return '';
}
function coopTileClick(id, b) {
  const e = coopById(id); if (!e) return;
  markGameSeen('coop-' + id);
  const why = coopBlock(e);
  if (why === 'guest') { guestAsk('Coop en ligne'); return; }
  if (why === 'net') { netNeed('La coop en ligne'); return; }
  if (why) {
    b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge');
    if (why === 'ai') { ensureAiPlayer(); toastCheer('Je ne sais pas encore jouer à ce jeu !', AI_NAME, true); }
    return;
  }
  openCoopGo(e, COOP_WHERE);
}
// joueurs de la salle en partie coop (pas cet appareil) ; deux appareils d'une même partie = une seule paire
function coopTilePlayers(id) {
  try {
    const seen = new Set(), out = [];
    for (const m of presList()) {
      if (m.game !== 'coop-' + id || !m.cid || m.cid === clientId || seen.has(m.name)) continue;
      seen.add(m.name); if (m.co && m.co !== AI_NAME) seen.add(m.co); out.push(m);
    }
    return out;
  } catch (e) { return []; }
}
const coopPairTxt = m => m.co === AI_NAME ? dispName(m.name) + ' et son robot jouent' : m.co ? dispName(m.name) + ' + ' + dispName(m.co) + ' jouent' : dispName(m.name) + ' joue';
function refreshCoopTiles() {
  const kind = COOP_WHERE, live = ONLINE && serverOk;
  for (const t of coopTiles) {
    const e = coopById(t.id); if (!e) continue;
    const why = coopBlock(e), ps = live && !why ? coopTilePlayers(t.id) : [], lead = coopTop(t.id, kind)[0];
    t.tag.textContent = why === 'ai' ? 'Bientôt avec l\'IA' : why === 'online' ? 'Bientôt en ligne' : why === 'guest' ? 'En ligne avec un compte' : why === 'net' ? 'Il faut du réseau'
      : ps.length ? coopPairTxt(ps[0]) + (ps.length > 1 ? ' (+' + (ps.length - 1) + ')' : '') : lead ? '👑 ' + coopTeamName(lead) + ' · ' + fmt(lead.score) : (e.c.tagline || '');
    t.tag.classList.toggle('tally', !why && !ps.length && !!lead);
    t.el.classList.toggle('no-ai', !!why); t.el.setAttribute('aria-disabled', String(!!why));
    t.watch.hidden = !ps.length; t.wrap.classList.toggle('can-watch', !!ps.length);
  }
  refreshCoopChamps();
}
// bulle des champions : DEUX têtes qui se chevauchent + couronne (classement de l'onglet actif, salle)
function coopHeads(r, cls) {
  const box = document.createElement('span'); box.className = 'coop-heads' + (cls ? ' ' + cls : '');
  const a = chatHead(r.p1, { passive: true }), b = chatHead(r.kind === 'ia' ? AI_NAME : r.p2, { passive: true });
  box.append(a, b); return box;
}
function refreshCoopChamps() {
  const show = coopServerOn() && ONLINE && !!room;
  for (const t of coopTiles) {
    const lead = show ? coopTop(t.id, COOP_WHERE)[0] : null, ch = t.champ;
    const key = lead ? lead.p1 + '+' + lead.p2 + ':' + lead.score : '';
    if (ch.dataset.k === key) continue;
    ch.dataset.k = key; ch.textContent = ''; ch.hidden = !lead; if (!lead) continue;
    if (lead.kind === 'ia') ensureAiPlayer();
    const cr = document.createElement('span'); cr.className = 'champ-crown'; cr.textContent = '👑';
    ch.append(coopHeads(lead, 'champ-pair'), cr);
    ch.setAttribute('aria-label', 'Champions à deux : ' + coopTeamName(lead) + ', ' + fmt(lead.score) + '. Voir le classement');
  }
}
function coopBadge(k) {   // bouton du mode : « bientôt » tant que la liste est vide, ensuite comme Classique / Duel (nouveautés)
  const el = $('jdw-coop-badge'); if (!el) return;
  if (!coopTiles.length && !coopList().length) { el.hidden = false; el.textContent = 'bientôt'; el.classList.remove('new', 'maj'); return; }
  el.classList.add('new'); el.hidden = !k; el.textContent = k === 'new' ? 'nouveau' : 'mis à jour'; el.classList.toggle('maj', k === 'maj');
}

// ---------- classements à deux (D10 : chargés seulement quand une vue les montre) ----------
const coopServerOn = () => COOP.srv !== false && coopList().length > 0;
function coopRows(rows) {
  return (rows || []).map(r => ({ game: r.r_game, kind: r.r_kind === 'ia' ? 'ia' : 'ami', p1: cleanName(r.r_p1), p2: cleanName(r.r_p2 || ''), lvl: r.r_level || 'moyen',
    score: Math.max(0, +r.r_score || 0), stage: +r.r_stage || 0, at: Date.parse(r.r_at) || 0 }));
}
async function coopLoadScores(force) {
  if (!coopServerOn() || !ONLINE || isGuest() || !room || netOff()) return;
  if (!force && Date.now() - COOP.scoresAt < 4000) return;
  COOP.scoresAt = Date.now(); const rid = room.id;
  try {
    const rows = await rpc('get_coop_scores', Object.assign({ p_code: CODE() }, RP()), { quiet404: true });
    if (!room || room.id !== rid) return;
    COOP.scores = coopRows(rows); COOP.scoresOk = true; COOP.srv = true; COOP.scoresRoom = rid;
  } catch (e) { if (e.status === 404) COOP.srv = false; }
  coopRefreshViews();
}
async function coopLoadWorld() {
  if (!coopServerOn() || !ONLINE || netOff()) return;
  try { COOP.world = coopRows(await rpc('get_world_coop_scores', { p_code: CODE() }, { quiet404: true })); COOP.worldOk = true; COOP.srv = true; }
  catch (e) { if (e.status === 404) COOP.srv = false; }
  coopRefreshViews();
}
function coopRefreshViews() {
  try { refreshCoopTiles(); } catch (e) {}
  if (!$('jdw-board').hidden && /^coop:/.test(boardTab)) renderBoardTab();
  if (coopGo && !$('jdw-coopgo').hidden) renderCoopGoTop();
  if (!$('jdw-coopend').hidden && COOP.e) renderCoopEndBoard();
}
const coopViewOpen = () => (MODE === 'coop' && !$('jdw-lib').hidden) || !$('jdw-coopgo').hidden || !$('jdw-coopend').hidden || (!$('jdw-board').hidden && /^coop:/.test(boardTab));
function coopTop(id, kind, scope) {
  let rows;
  if (!ONLINE) rows = coopLocal;
  else if (scope === 'world') rows = COOP.world;
  else rows = room && COOP.scoresRoom === room.id ? COOP.scores : [];
  return rows.filter(r => r.game === id && r.kind === kind).sort((a, b) => b.score - a.score || a.at - b.at).slice(0, 10);
}
function coopTeamName(r, world) {
  const n = x => world ? x : dispName(x);
  return r.kind === 'ia' ? n(r.p1) + ' + 🤖 ' + coopLvName(r.lvl) : n(r.p1) + ' + ' + n(r.p2);
}
function coopRow(r, me, world) {
  const li = document.createElement('li'); li.className = 'coop-row' + (me ? ' me' : '');
  if (r.kind === 'ia') ensureAiPlayer();
  const n = document.createElement('span'); n.className = 'n'; n.textContent = r.kind === 'ia' ? (world ? r.p1 : dispName(r.p1)) + ' + 🤖' : coopTeamName(r, world);
  const lv = document.createElement('small'); lv.className = 'coop-lvtag'; lv.textContent = coopLvName(r.lvl); n.appendChild(lv);
  const s = document.createElement('span'); s.className = 's'; s.textContent = fmt(r.score);
  li.append(coopHeads(r), n, s); return li;
}
// classement du jeu coop dans #jdw-board (onglets « coop:<id> » après les jeux solo)
function coopBoardTabs(wrap) {
  for (const e of coopList()) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab coop-tab'; b.setAttribute('role', 'tab'); b.dataset.id = 'coop:' + e.id;
    b.style.setProperty('--acc', e.accent);
    b.textContent = '🤝 ' + (e.c.tab || e.title.replace(/ à deux$/, ' à 2').replace(/ contre /, ' c. '));
    b.addEventListener('click', () => { boardTab = 'coop:' + e.id; coopLoadScores(); if (boardScope === 'world') coopLoadWorld(); renderBoardTab(); });
    wrap.appendChild(b);
  }
}
function coopRenderBoard(ol, W) {
  const id = boardTab.slice(5), e = coopById(id), me = cleanName(profile.name);
  $('jdw-coopkind').hidden = false;
  for (const b of $('jdw-coopkind').children) b.setAttribute('aria-pressed', String(b.dataset.kind === coopKind));
  $('jdw-board-hint').textContent = (W ? 'Top 10 mondial à deux · ' : 'Top 10 de la salle à deux · ') + (coopKind === 'ia' ? 'avec l\'IA' : 'avec un copain') + (e && e.c.tagline ? ' · ' + e.c.tagline : '');
  if (COOP.srv === false) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Les classements à deux arrivent bientôt.'; ol.appendChild(li); return; }
  if (W && netOff()) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = '📡 Il faut du réseau pour le classement mondial.'; ol.appendChild(li); return; }
  let rows = coopTop(id, coopKind, W ? 'world' : 'room');
  if (!W && !rows.length && (netOff() || !COOP.scoresOk)) rows = coopDeviceRows(id, coopKind);
  if (!rows.length) return emptyRow(ol);
  for (const r of rows) ol.appendChild(coopRow(r, r.p1 === me || r.p2 === me, W));
}
// records de l'appareil (hors ligne, ou serveur pas encore à jour)
function coopDeviceRows(id, kind) {
  const out = [];
  for (const [k, v] of Object.entries(coopBests)) {
    if (!v || !v[id] || k.indexOf(kind + ':') !== 0) continue;
    const ns = k.slice(kind.length + 1).split('+');
    out.push({ game: id, kind, p1: ns[0], p2: kind === 'ia' ? '' : ns[1] || '', lvl: v[id + ':lv'] || 'moyen', score: +v[id] || 0, stage: 0, at: 0 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 10);
}
for (const b of document.querySelectorAll('#jdw-coopkind button')) b.addEventListener('click', () => { coopKind = b.dataset.kind === 'ia' ? 'ia' : 'ami'; store.set('jdw.coopkind', coopKind); renderBoardTab(); });
function coopOpenBoard(id, kind) {
  boardScope = isGuest() ? 'world' : 'room'; boardTab = 'coop:' + id; coopKind = kind === 'ia' ? 'ia' : 'ami';
  coopLoadScores(true); if (boardScope === 'world') coopLoadWorld();
  renderBoardTab(); openSheet('jdw-board', 'jdw-board-close');
}

// ---------- le lanceur (#jdw-coopgo) : la difficulté se choisit ici ----------
let coopGo = null;
const coopGoTile = { g: { id: 'coopgo', preview: () => {} }, el: null, canvas: null, visible: false };
function openCoopGo(e, kind) {
  if (kind === 'ami' && isGuest()) { guestAsk('Coop en ligne'); return; }
  if (!isGuest()) { if (!profile.name) { startWelcome(); return; } if (ONLINE && !room) { openRooms(); return; } }
  coopGo = { e, kind };
  $('jdw-coopgo').style.setProperty('--acc', e.accent);
  $('jdw-coopgo-kind').textContent = kind === 'ia' ? '🤖 Avec l\'IA' : '🌐 Avec un copain en ligne';
  $('jdw-coopgo-h').textContent = e.title;
  $('jdw-coopgo-tag').textContent = e.c.tagline || '';
  Object.assign(coopGoTile, { g: { id: 'coop-' + e.id, preview: coopPv(e) }, canvas: $('jdw-coopgo-cv'), visible: true });
  const tm = $('jdw-coopgo-team'); tm.textContent = '';
  const my = isGuest() || !profile.name ? 'INVITÉ' : cleanName(profile.name);
  if (kind === 'ia') ensureAiPlayer();
  tm.append(chatHead(my, { passive: true }));
  if (kind === 'ia') tm.append(chatHead(AI_NAME, { passive: true })); else { const d = document.createElement('span'); d.className = 'chead ct-dot'; d.textContent = '?'; tm.append(d); }
  renderCoopGoLv(); renderCoopGoTop();
  $('jdw-coopgo-go').textContent = kind === 'ia' ? 'C\'est parti !' : '📨 Inviter un copain';
  const note = $('jdw-coopgo-note');
  note.textContent = !TOUCH ? '⌨️ Clavier : flèches (ou ZQSD) + Espace.' : '';
  note.hidden = !note.textContent;
  openSheet('jdw-coopgo', 'jdw-coopgo-go');
  coopLoadScores();
}
function renderCoopGoLv() {
  if (!coopGo) return;
  const { e, kind } = coopGo, cur = coopLvOf(kind, e.id), box = $('jdw-coopgo-lv'); box.textContent = '';
  COOP_LV.forEach((lv, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.lv = lv;
    b.setAttribute('aria-checked', String(lv === cur));
    const ic = document.createElement('i'); ic.textContent = COOP_LVI[lv];
    const t = document.createElement('b'); t.textContent = coopLvName(lv);
    const mu = (e.c.mult || [])[i]; const sm = document.createElement('small'); sm.textContent = mu ? '×' + String(Math.round(mu * 100) / 100).replace('.', ',') : '';
    b.append(ic, t, sm);
    b.addEventListener('click', () => { coopDiff[kind + ':' + e.id] = lv; store.set('jdw.coopdiff', coopDiff); renderCoopGoLv(); Audio.ensure(); Audio.tone(520 + i * 120, 0.05, 'sine', 0.03); });
    box.appendChild(b);
  });
  $('jdw-coopgo-hint').textContent = e.c.levelHint || '';
  $('jdw-coopgo-hint').hidden = !e.c.levelHint;
}
function renderCoopGoTop() {
  if (!coopGo) return;
  const { e, kind } = coopGo, ol = $('jdw-coopgo-top'); ol.textContent = '';
  const h = $('jdw-coopgo-toph'), me = cleanName(profile.name);
  if (isGuest()) { h.textContent = 'En invité, le score d\'équipe n\'est pas enregistré'; ol.hidden = true; return; }
  h.textContent = 'Record de la salle · ' + (kind === 'ia' ? 'avec l\'IA' : 'avec un copain');
  ol.hidden = false;
  if (COOP.srv === false) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Les classements à deux arrivent bientôt.'; ol.appendChild(li); return; }
  let rows = coopTop(e.id, kind).slice(0, 3); if (!rows.length && !COOP.scoresOk) rows = coopDeviceRows(e.id, kind).slice(0, 3);
  if (!rows.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Pas encore de record d\'équipe : à vous !'; ol.appendChild(li); return; }
  for (const r of rows) ol.appendChild(coopRow(r, r.p1 === me || r.p2 === me));
}
$('jdw-coopgo-go').addEventListener('click', () => {
  if (!coopGo) return; const { e, kind } = coopGo;
  if (kind === 'ia') coopLaunch(e); else coopNetCreate(e);
});
function coopGoClose() { coopGoTile.visible = false; coopGo = null; if (!$('jdw-coopgo').hidden) closeSheet('jdw-coopgo'); }
$('jdw-coopgo-back').addEventListener('click', coopGoClose);
$('jdw-coopgo').addEventListener('click', x => { if (x.target === $('jdw-coopgo')) coopGoClose(); });

// ---------- la partie ----------
function coopSetup(e, mode, lvl) {
  Object.assign(COOP, { e, mode, kind: mode === 'ai' ? 'ia' : 'ami', lvl: COOP_LV.includes(lvl) ? lvl : 'moyen', ready: [false, false], shared: false,
    gone: '', res: '', why: '', over: false, paused: false });
  COOP.k = AI_LEVELS[COOP.lvl][1];
}
function coopPlayer(name, local, ai) {
  if (ai) { ensureAiPlayer(); const p = players.get(AI_NAME); return { name: 'ROBOT', img: p && p.img || null, sad: sadOf(p), ai: true, local: true }; }
  const n = cleanName(name), p = !n || n === 'INVITÉ' ? null : players.get(n);
  return { name: n ? dispName(n) : 'JOUEUR', img: p && p.img || null, sad: sadOf(p), ai: false, local: !!local, key: n };
}
// robot : P0 = moi, P1 = le robot ; en ligne : P0 = l'hôte, P1 = l'invité
function coopSetPlayers(host, guest) {
  const my = isGuest() ? 'INVITÉ' : cleanName(profile.name);
  if (COOP.mode === 'ai') { COOP.players = [coopPlayer(my, true), coopPlayer('', true, true)]; COOP.me = 0; COOP.team = [my]; COOP.mate = ''; return; }
  COOP.me = NET.role === 'guest' ? 1 : 0;
  COOP.players = [coopPlayer(host, COOP.me === 0), coopPlayer(guest, COOP.me === 1)];
  COOP.team = [cleanName(host), cleanName(guest)]; COOP.mate = cleanName(COOP.me === 0 ? guest : host);
}
function coopLaunch(e) {   // avec le robot (« C'est parti ! » est un toucher : plein écran tout de suite)
  coopGoClose(); Audio.ensure(); fsEnter(!!e.c.landscape);
  coopSetup(e, 'ai', coopLvOf('ia', e.id));
  COOP.room = room ? room.id : null; COOP.ranked = !isGuest() && (!ONLINE || !!room);
  coopSetPlayers(); coopNewRun(); coopEnterPlay(); coopMount();
}
function coopEnterPlay() {
  const e = COOP.e;
  $('jdw-lib').hidden = true; $('jdw-play').hidden = false;
  $('jdw-play').style.setProperty('--acc', e.accent);
  $('jdw-gtitle').textContent = '🤝 ' + e.short;
  $('jdw-end').hidden = true; $('jdw-coopend').hidden = true; $('jdw-coop-pause').hidden = true;
  markGameSeen('coop-' + e.id);
}
function coopMount() {
  const e = COOP.e, m = e.m, seq = ++mountSeq;
  Object.assign(COOP, { seq, over: false, paused: false, score: 0, stage: 0, stats: null, intense: false, recToast: false, lastCsc: null, why: '', res: '' });
  if (current) unmountGame();
  const root = document.createElement('div'); root.className = 'game-root'; $('jdw-host').prepend(root);
  if (COOP.mode === 'net') { NET.handlers = []; }
  const api = {
    audio: audioApi, colors: COLORS, fonts: FONTS, hasMusic: true,
    assets: name => window.JDW_ASSETS.load(name || e.id),
    music: track => {
      if (!current || current.seq !== seq) return;
      if (track && track !== e.id) { MUS.override = true; setMusic(track, 'calm'); return; }
      MUS.override = false; coopMusic();
    },
    vibrate: ms => { try { if (navigator.vibrate) navigator.vibrate(Math.max(0, Math.min(400, +ms || 0))); } catch (x) {} },
    isMuted: () => muted,
    heads: () => headsList().filter(h => !COOP.team.includes(h.name)).map(h => Object.assign({}, h, { name: dispName(h.name) })),
    player: playerObj(), seed: COOP.seed,
    celebrate: (text, name) => {
      if (!current || current.seq !== seq) return;
      if (coopIsGuestSide()) return;                                         // l'invité recopie ceux de l'hôte (ccel)
      if (COOP.mode === 'net') netCtl({ h: 'ccel', text: String(text || '').slice(0, 140), name: name ? String(name).slice(0, 20) : '' });
      toastCheer(text, name);
    },
    gameOver(score) {
      if (!current || current.seq !== seq || current.over || coopIsGuestSide()) return;   // en ligne : seul l'hôte termine
      const sc = Math.max(0, Math.floor(+score || 0));
      current.over = true;
      setTimeout(() => { if (current && current.seq === seq) coopOver(sc, 'over', 0); }, 900);
    }
  };
  api.coop = coopApi(seq);
  const coopHelpG = m.pad && m.pad.coopHelp ? { id: 'coop-' + e.id, accent: m.accent, pad: { help: m.pad.coopHelp, intro: m.pad.intro } } : m;
  api.pad = padApi({ slots: p => p === COOP.me && PADJ ? PADJ.pads() : [], intro: () => { if (current && current.seq === seq) padIntro(coopHelpG, null, true); } });   // manettes : toutes pour mon joueur (Ajout 10)
  current = { game: m, root, seq, over: false, inst: null, coop: e, pad: api.pad };
  recReset(); setTimeout(recLine, 50);
  musicBaseLevel(0.8); MUS.override = false; coopMusic();
  try { current.inst = m.mount(root, api) || {}; } catch (x) { current.inst = {}; reportError('Lancement de coop-' + e.id + ' : ' + x.message, x.stack); }
  if (COOP.mode === 'net' && NET.handlers.length && NET.queue.length) for (const q of NET.queue.splice(0)) netDeliver(q);
  setWhere('coop-' + e.id);
  if (e.c.landscape) { fsLand(); fsTip(); }
  padIntro(coopHelpG);
}
function coopApi(seq) {
  const e = COOP.e, cols = Array.isArray(e.c.colors) && e.c.colors.length >= 2 ? e.c.colors : DUO_COLORS;
  ensureAiPlayer(); const rp = players.get(AI_NAME);
  const a = {
    mode: COOP.mode, level: COOP.lvl, k: COOP.k, me: COOP.me, run: COOP.run,
    players: COOP.players.map((p, i) => ({ name: p.name, img: p.img, sad: p.sad, color: cols[i], ai: !!p.ai, local: !!p.local })),
    robot: { img: rp && rp.img || null, sad: sadOf(rp) },
    pause: () => { if (current && current.seq === seq) coopPause('game'); },
    abort: msg => { if (current && current.seq === seq) coopAbort(String(msg || 'La partie n\'a pas pu continuer.').slice(0, 120), true); }
  };
  if (COOP.mode === 'ai') a.ai = { p: 1, level: COOP.lvl, k: COOP.k }; else a.net = coopNetApi(seq);
  return a;
}
// en ligne : les outils du duel en ligne (DUO-CONTRACT.md), sans `flipped` (rien n'est tourné en coop)
function coopNetApi(seq) {
  const mine = () => !!current && current.seq === seq && NET.kind === 'coop';
  return {
    role: NET.role, me: NET.role === 'host' ? 0 : 1,
    send(msg, o) {
      if (!mine()) return;
      try {
        if (o && o.reliable) { if (NET.ctl && NET.ctl.readyState === 'open') NET.ctl.send(JSON.stringify({ h: 'g', m: msg })); }
        else if (NET.g && NET.g.readyState === 'open') NET.g.send(JSON.stringify(msg));
      } catch (x) {}
    },
    onMessage(fn) { if (typeof fn === 'function' && mine()) NET.handlers.push(fn); },
    now: () => performance.now() + (NET.role === 'guest' ? NET.off : 0),
    rtt: () => NET.rttv || 120
  };
}
// ligne 👑 : record de l'équipe de la salle (sorte de la partie), ou « partie pour le plaisir »
function coopRecLine(el) {
  const e = COOP.e; if (!e || COOP.over) { el.hidden = true; return; }
  let cur = 0, lv = 0;
  if (coopIsGuestSide()) { cur = COOP.lastCsc ? COOP.lastCsc.s : 0; lv = COOP.lastCsc ? COOP.lastCsc.lv : 0; }
  else if (current && current.inst) { try { cur = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (x) {} try { lv = Math.floor(+current.inst.currentLevel() || 0); } catch (x) {} }
  COOP.score = cur; COOP.stage = lv;
  if (!COOP.intense && lv >= coopIntenseAt(e)) { COOP.intense = true; coopMusic(); }   // musique énergique au seuil du jeu (B4)
  let txt;
  if (isGuest()) txt = '🤝 À deux · ' + fmt(cur);
  else if (!COOP.ranked) txt = '🤝 Partie pour le plaisir · ' + fmt(cur);
  else {
    const me = cleanName(profile.name), mine = coopTeamKey(COOP.kind, COOP.team[0], COOP.team[1]);
    const rows = coopTop(e.id, COOP.kind), lead = rows[0], leadMine = lead && coopTeamKey(lead.kind, lead.p1, lead.p2) === mine;
    if (!lead) txt = '👑 Pas encore de record d\'équipe : à vous !';
    else if (cur > lead.score && !leadMine) {
      txt = '👑 Vous · ' + fmt(cur) + ' · devant ' + coopTeamName(lead) + ' !';
      if (!COOP.recToast) { COOP.recToast = true; toastCheer('Vous passez devant ' + coopTeamName(lead) + ' !', me, true); sting('point', 0.5, false); }
    } else txt = '👑 ' + (leadMine ? 'Vous' : coopTeamName(lead)) + ' · ' + fmt(Math.max(lead.score, leadMine ? cur : 0)) + (leadMine ? '' : ' · vous ' + fmt(cur));
  }
  txt = watchersTxt() + txt;
  el.hidden = false;
  if (el.className !== 'recline coop') el.className = 'recline coop';
  if (el.textContent !== txt) el.textContent = txt;
}
// l'hôte envoie le score et le niveau à l'invité une fois par seconde (ligne 👑, score de secours)
setInterval(() => {
  if (!current || !current.coop || COOP.over || COOP.mode !== 'net' || NET.role !== 'host' || NET.kind !== 'coop') return;
  netCtl({ h: 'csc', s: COOP.score, lv: COOP.stage });
}, 1000);

// ---------- pause commune (#jdw-coop-pause) ----------
function coopPause(from) {
  if (!current || !current.coop || COOP.over || COOP.paused) return;
  COOP.paused = true;
  try { current.inst.pause && current.inst.pause(); } catch (x) {}
  const hd = $('jdw-coop-pause-heads'); hd.textContent = '';
  COOP.players.forEach((p, i) => { const h = p.ai ? chatHead(AI_NAME, { passive: true }) : chatHead(COOP.team[i] || p.name, { passive: true }); h.style.setProperty('--pc', coopColor(i)); hd.appendChild(h); });
  $('jdw-coop-pause-score').textContent = fmt(COOP.score) + ' points d\'équipe' + (COOP.stage ? ' · niveau ' + COOP.stage : '');
  $('jdw-coop-pause-sub').textContent = COOP.mode === 'net' ? (from === 'net' ? dispName(COOP.mate) + ' a mis la pause.' : 'Ton copain est aussi en pause.') : '';
  { const m = COOP.e && COOP.e.m; padHelpInto($('jdw-coop-pause-help'), PADJ && PADJ.count() && m ? (m.pad && m.pad.coopHelp ? { pad: { help: m.pad.coopHelp } } : m) : null); }
  $('jdw-coop-pause').hidden = false;
  if (COOP.mode === 'net' && from !== 'net') netCtl({ h: NET.role === 'host' ? 'cpause' : 'cpausereq' });
  musicBaseLevel(0.4);
}
function coopResume(from) {
  if (!current || !current.coop || !COOP.paused) return;
  quitAskHide();   // le copain a repris pendant « Quitter la partie ? » : on continue tous les deux
  COOP.paused = false; $('jdw-coop-pause').hidden = true;
  try { if (current.pad) current.pad.flush(); } catch (x) {}   // le A sur « Reprendre » n'arrive pas au jeu
  try { current.inst.resume && current.inst.resume(); } catch (x) {}
  if (COOP.mode === 'net' && from !== 'net') netCtl({ h: NET.role === 'host' ? 'cresume' : 'cresumereq' });
  musicBaseLevel(0.8); Audio.ensure();
}
const coopColor = i => { const c = COOP.e && COOP.e.c.colors; return Array.isArray(c) && c[i] ? c[i] : DUO_COLORS[i]; };
$('jdw-coop-resume').addEventListener('click', () => coopResume('me'));
$('jdw-coop-quit').addEventListener('click', () => { $('jdw-coop-pause').hidden = true; coopQuit(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && current && current.coop && !COOP.over) coopPause('hidden'); });

// ---------- quitter, « Oups », abandon ----------
function coopQuit() {
  if (!current || !current.coop) { backToLibrary(); return; }
  if (COOP.over) { coopToLib(); return; }
  if (coopIsGuestSide()) {          // l'invité demande la fin : l'hôte termine et renvoie « cover » (le score de l'hôte compte)
    netCtl({ h: 'cquit' });
    clearTimeout(COOP.quitT);
    COOP.quitT = setTimeout(() => { if (current && current.coop && !COOP.over) coopGuestFinish({ s: COOP.lastCsc ? COOP.lastCsc.s : 0, st: COOP.lastCsc ? COOP.lastCsc.lv : 0, why: 'quit', by: 1 }); }, 1500);
    return;
  }
  let sc = 0; try { sc = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (x) {}
  if (sc > 0) { coopOver(sc, 'quit', COOP.me); return; }
  if (COOP.mode === 'net') netCtl({ h: 'cover', s: 0, st: 0, stats: null, why: 'quit', by: 0 });
  coopToLib();
}
function coopAbort(msg, mine) {
  if (!current || !current.coop) return;
  if (mine && COOP.mode === 'net') netCtl({ h: 'cabort', msg });
  COOP.over = true; current.over = true;
  coopToLib(); toastCheer(msg, profile.name, true);
}
function coopRematch() {   // robot : nouvelle partie tout de suite (même niveau, nouvelle graine)
  if (!COOP.e) return;
  if (COOP.mode === 'net' && NET.kind === 'coop' && NET.role) { coopReady(); return; }
  if (COOP.mode === 'net') { COOP.mode = 'ai'; COOP.kind = 'ia'; netReset(); COOP.room = room ? room.id : null; COOP.ranked = !isGuest() && (!ONLINE || !!room); coopSetPlayers(); }
  $('jdw-coopend').hidden = true; flushCoopPending();
  coopNewRun(); Audio.ensure(); coopEnterPlay(); coopMount();
}
// retour à la page Coop (« Changer de jeu », partie sans score) ; en ligne : la liaison est fermée
function coopToLib() {
  if (COOP.mode === 'net' && NET.kind === 'coop' && NET.role) { netCtl({ h: 'quit' }); netSig({ k: 'bye' }); netReset(); }
  $('jdw-coopend').hidden = true; $('jdw-coop-pause').hidden = true;
  backToLibrary();
  if (MODE !== 'coop') setMode('coop');
}
function coopReset() {
  clearTimeout(COOP.retryT); clearTimeout(COOP.quitT);
  COOP.paused = false; COOP.lastCsc = null;
  $('jdw-coop-pause').hidden = true; $('jdw-coopend').hidden = true;
  $('jdw-recline').classList.remove('coop');
}

// ---------- fin de partie et enregistrement ----------
function coopCleanStats(st) {
  if (!Array.isArray(st)) return null;
  return st.slice(0, 3).map(x => ({ icon: String(x && x.icon || '').slice(0, 4), n: Math.max(0, Math.floor(+(x && x.n) || 0)), label: String(x && x.label || '').slice(0, 30) })).filter(x => x.label);
}
// robot / hôte : la partie est finie (gameOver, Quitter, copain parti) ; l'hôte envoie « cover » à l'invité
function coopOver(sc, why, by) {
  if (!current || !current.coop || COOP.over) return;
  COOP.over = true; current.over = true;
  let st = 0, stats = null;
  try { st = Math.floor(+current.inst.currentLevel() || 0); } catch (x) {}
  try { stats = current.inst.coopStats ? current.inst.coopStats() : null; } catch (x) {}
  Object.assign(COOP, { score: Math.max(0, Math.floor(+sc || 0)), stage: st || COOP.stage, stats: coopCleanStats(stats), why: why || 'over' });
  if (COOP.mode === 'net' && NET.role === 'host' && NET.kind === 'coop') netCtl({ h: 'cover', s: COOP.score, st: COOP.stage, stats: COOP.stats, why: COOP.why, by: by || 0 });
  if (why !== 'over') coopStopGame();
  showCoopEnd();
}
// l'invité : fin envoyée par l'hôte (ou liaison perdue : dernier score reçu)
function coopGuestFinish(m) {
  if (!current || !current.coop || COOP.over) return;
  clearTimeout(COOP.quitT);
  COOP.over = true; current.over = true;
  Object.assign(COOP, { score: Math.max(0, Math.floor(+m.s || 0)), stage: Math.floor(+m.st || 0), stats: coopCleanStats(m.stats), why: m.why || 'over' });
  if (COOP.why !== 'over') coopStopGame();
  if (COOP.score <= 0 && COOP.why === 'quit') { coopToLib(); toastCheer(dispName(COOP.mate) + ' a quitté la partie.', COOP.mate, true); return; }
  showCoopEnd();
}
function coopStopGame() {   // la partie s'arrête là (quitter, copain parti) : le jeu est démonté, la carte de fin reste
  if (!current) return;
  try { current.inst && current.inst.destroy && current.inst.destroy(); } catch (x) {}
  current.inst = {}; current.root.textContent = '';
}
let coopPending = null;   // fin affichée, score pas encore parti (rechargement automatique : on attend)
function flushCoopPending() { if (coopPending && !coopPending.done) coopCommit(); }
function showCoopEnd() {
  const e = COOP.e, sc = COOP.score;
  castEndAll(sc); musicBaseLevel(0.5); $('jdw-coop-pause').hidden = true; COOP.paused = false; quitAskHide();
  const me = cleanName(profile.name), kind = COOP.kind;
  $('jdw-coopend-card').style.setProperty('--acc', e.accent);
  $('jdw-coopend-game').textContent = e.title + ' · partie terminée';
  // les deux joueurs (ou + robot)
  const before = coopTop(e.id, kind), mineKey = coopTeamKey(kind, COOP.team[0], COOP.team[1]);
  const myRow = before.find(r => coopTeamKey(r.kind, r.p1, r.p2) === mineKey), myBest = Math.max(myRow ? myRow.score : 0, coopDevBest(mineKey, e.id));
  const roomRec = !isGuest() && COOP.ranked && sc > 0 && (!before[0] || sc > before[0].score);
  const tm = $('jdw-coopend-team'); tm.textContent = '';
  COOP.players.forEach((p, i) => {
    const f = document.createElement('figure'); f.className = 'ce-p'; f.style.setProperty('--pc', coopColor(i));
    const h = p.ai ? chatHead(AI_NAME, { passive: true }) : chatHead(COOP.team[i] || p.name, { passive: true });
    if (roomRec) { const cr = document.createElement('span'); cr.className = 'champ-crown'; cr.textContent = '👑'; h.appendChild(cr); }
    const b = document.createElement('figcaption'); b.textContent = p.ai ? '🤖 Robot ' + coopLvName(COOP.lvl) : p.name;
    f.append(h, b); tm.appendChild(f);
  });
  $('jdw-coopend-score').textContent = fmt(sc);
  $('jdw-coopend-unit').textContent = (e.c.scoreLabel || 'points') + ' d\'équipe';
  const bits = [];
  if (COOP.stage > 0) bits.push((e.c.levelWord || 'Niveau') + ' ' + COOP.stage + ' atteint ensemble');
  for (const s of COOP.stats || []) bits.push((s.icon ? s.icon + ' ' : '') + fmt(s.n) + ' ' + s.label);
  $('jdw-coopend-stats').textContent = bits.join(' · '); $('jdw-coopend-stats').hidden = !bits.length;
  // qui a-t-on battu ? (équipes de la salle qu'on vient de dépasser) ; sinon l'équipe en tête se moque (son premier joueur crie)
  const beat = $('jdw-coopend-beat'); beat.hidden = true; beat.onclick = null;
  const beaten = before.filter(r => coopTeamKey(r.kind, r.p1, r.p2) !== mineKey && sc > r.score && r.score >= myBest);
  let crier = null;
  if (sc > 0 && beaten.length && !isGuest() && COOP.ranked) {
    const v = beaten[0], hs = $('jdw-coopend-beat-heads'); hs.textContent = '';
    hs.append(chatHead(v.p1, { passive: true, sad: true }), chatHead(v.kind === 'ia' ? AI_NAME : v.p2, { passive: true, sad: true }));
    const t = $('jdw-coopend-beat-txt'); t.textContent = '';
    const b = document.createElement('b'); b.textContent = 'Vous avez battu ' + (v.kind === 'ia' ? dispName(v.p1) + ' et son robot' : dispName(v.p1) + ' et ' + dispName(v.p2)) + ' !';
    t.append(b, ' Leur score : ' + fmt(v.score)); beat.hidden = false;
    if (hasCri(v.p1)) crier = v.p1; else if (v.kind === 'ami' && hasCri(v.p2)) crier = v.p2;
    Audio.tone(523, 0.12, 'square', 0.06); setTimeout(() => Audio.tone(784, 0.2, 'square', 0.06), 130);
    if (crier) { beat.onclick = () => playCri(crier, hs.firstChild); setTimeout(() => { if (!$('jdw-coopend').hidden) playCri(crier, hs.firstChild); }, 450); }
  } else if (before[0] && !isGuest() && coopTeamKey(before[0].kind, before[0].p1, before[0].p2) !== mineKey && before[0].score >= sc && hasCri(before[0].p1)) {
    const lead = before[0]; setTimeout(() => { if (!$('jdw-coopend').hidden) playCri(lead.p1, null); }, 450);
  }
  // départ du copain
  const gone = $('jdw-coopend-gone');
  gone.hidden = !COOP.gone; gone.textContent = COOP.gone === 'quit' ? dispName(COOP.mate) + ' a quitté la partie : votre score d\'équipe est gardé.'
    : COOP.gone === 'link' ? 'La liaison avec ' + dispName(COOP.mate) + ' est coupée : votre score d\'équipe est gardé.' : '';
  const st = $('jdw-coopend-status');
  if (isGuest()) st.textContent = sc > 0 ? 'Joli score ! En invité, il n\'est pas enregistré : crée ton compte pour garder vos records.' : 'Pas de points cette fois. Retentez votre chance !';
  else if (!COOP.ranked) st.textContent = 'Partie pour le plaisir : pas classée.';
  else if (sc <= 0) st.textContent = 'Pas de points cette fois. Retentez votre chance !';
  else st.textContent = 'Enregistrement…';
  coopAgainBtn();
  $('jdw-coopend-share').hidden = isGuest() || !ONLINE || !room || sc <= 0 || !chat.ok;
  $('jdw-coopend-share').textContent = COOP.shared ? 'Partagé ✓' : '📣 Partager notre score'; $('jdw-coopend-share').disabled = COOP.shared;
  $('jdw-coopend').hidden = false;
  renderCoopEndBoard();
  coopPending = !isGuest() && COOP.ranked && sc > 0 ? { done: false } : null;
  if (coopPending) coopCommit();
  if (roomRec) { Audio.tone(660, 0.1, 'square', 0.05); setTimeout(() => sting('win', 0.7), 200); }
  $('jdw-coopend-again').focus({ preventScroll: true });
}
function coopAgainBtn() {
  const b = $('jdw-coopend-again'), net = COOP.mode === 'net';
  const alone = net && (COOP.gone || NET.kind !== 'coop' || !NET.role);
  b.disabled = false;
  b.textContent = alone ? 'Rejouer avec un robot' : net && COOP.ready[COOP.me] ? 'Prêt ✓ — en attente de ' + dispName(COOP.mate) + '…' : 'Rejouer ensemble';
  if (net && !alone && COOP.ready[COOP.me]) b.disabled = true;
}
function renderCoopEndBoard() {
  const ol = $('jdw-coopend-board'); ol.textContent = '';
  ol.hidden = isGuest() || !COOP.ranked; if (ol.hidden || !COOP.e) return;
  const me = cleanName(profile.name), rows = coopTop(COOP.e.id, COOP.kind).slice(0, 5);
  if (!rows.length) { ol.hidden = true; return; }
  for (const r of rows) ol.appendChild(coopRow(r, r.p1 === me || r.p2 === me));
}
const coopDevBest = (key, id) => +((coopBests[key] || {})[id] || 0);
function coopKeepBest(key, id, sc, lvl) {
  const b = coopBests[key] = coopBests[key] || {};
  if (sc > (+b[id] || 0)) { b[id] = sc; b[id + ':lv'] = lvl; store.set('jdw.coopbests', coopBests); }
}
function coopStatus(t) { if (!$('jdw-coopend').hidden) $('jdw-coopend-status').textContent = t; }
// D6 : saving++ / saving-- autour de l'envoi (le rechargement automatique attend) ; jamais add_score ni save_progress
async function coopCommit() {
  if (!COOP.e || !coopPending || coopPending.done) return;
  const me = cleanName(profile.name), e = COOP.e, sc = COOP.score, key = coopTeamKey(COOP.kind, COOP.team[0], COOP.team[1]);
  coopKeepBest(key, e.id, sc, COOP.lvl);
  if (!ONLINE) {   // mode local (tests) : classement de l'appareil
    const row = { game: e.id, kind: COOP.kind, p1: COOP.team[0], p2: COOP.kind === 'ia' ? '' : COOP.team[1], lvl: COOP.lvl, score: sc, stage: COOP.stage, at: Date.now() };
    const i = coopLocal.findIndex(r => r.game === row.game && coopTeamKey(r.kind, r.p1, r.p2) === key);
    if (i < 0) coopLocal.push(row); else if (coopLocal[i].score < sc) coopLocal[i] = row;
    store.set('jdw.coopscores', coopLocal.slice(-200)); coopPending.done = true;
    coopStatus('Score d\'équipe gardé sur cet appareil.'); coopRefreshViews(); return;
  }
  const args = { p_code: CODE(), p_room: COOP.room, p_room_code: roomCodes[COOP.room] || '', p_game: e.id, p_kind: COOP.kind, p_name: me,
    p_partner: COOP.kind === 'ami' ? COOP.mate : '', p_level: COOP.lvl, p_score: sc, p_stage: COOP.stage, p_run: COOP.run };
  const pend = coopPending;
  if (!coopServerOn() && COOP.srv === false) { coopQueue(args); pend.done = true; coopStatus('Score gardé : il partira dès que les classements à deux seront ouverts.'); return; }
  saving++;
  try {
    const r = await rpc('add_coop_score', args, { quiet404: true });
    COOP.srv = true; pend.done = true; coopResult(String(r || ''), args);
  } catch (x) {
    if (x.status === 404) { COOP.srv = false; coopQueue(args); pend.done = true; coopStatus('Score gardé : il partira dès que les classements à deux seront ouverts.'); }
    else if (x.member || x.guest) { pend.done = true; coopStatus('Partie pour le plaisir : pas classée (il faut être membre de la salle).'); }
    else if (x.offline || !x.status) { coopQueue(args); pend.done = true; coopStatus('Gardé : il partira au retour du réseau.'); }
    else { pend.done = true; coopStatus('Score non enregistré (le serveur l\'a refusé).'); }
  } finally { saving--; }
  poke('scores'); poke('chat'); coopLoadScores(true);
}
function coopResult(r, args) {
  const e = COOP.e; COOP.res = r;
  if (r === 'record' || r === 'deja-record') { coopStatus('Nouveau record de votre équipe ! Enregistré en ligne.'); return; }
  if (r === 'moins' || r === 'deja-moins') { const b = coopDevBest(coopTeamKey(COOP.kind, COOP.team[0], COOP.team[1]), e.id); coopStatus('Enregistré · votre record reste ' + fmt(Math.max(b, args.p_score)) + '.'); return; }
  if (r === 'hors-salle') { coopStatus('Partie pour le plaisir : pas classée (vous n\'êtes pas dans la même salle).'); return; }
  if (r === 'attente') {   // le copain n'a pas encore envoyé : nouvel essai (4 s, 3 fois) et à son poke « scores »
    coopStatus('En attente de ' + dispName(COOP.mate) + '…');
    if (COOP.tries < 3) { COOP.tries++; clearTimeout(COOP.retryT); COOP.retryT = setTimeout(() => coopRetry(args), 4000); }
    else coopQueue(args);
  }
}
async function coopRetry(args) {
  if (!COOP.e || COOP.res !== 'attente' || COOP.run !== args.p_run) return;
  try { const r = await rpc('add_coop_score', args, { quiet404: true }); coopResult(String(r || ''), args); if (r !== 'attente') { poke('scores'); coopLoadScores(true); } } catch (x) {}
}
// file à part : jdw.unsentcoop (B3 ; une entrée par partie ; jamais jdw.unsent qu'un vieux build enverrait au classement SOLO)
function coopQueue(args) {
  unsentCoop = unsentCoop.filter(u => !(u.a && u.a.p_run === args.p_run && u.a.p_name === args.p_name));
  unsentCoop.push({ a: args, at: Date.now() }); unsentCoop = unsentCoop.slice(-30); store.set('jdw.unsentcoop', unsentCoop);
}
let coopFlushing = false;
async function flushUnsentCoop() {
  if (coopFlushing || !ONLINE || !unsentCoop.length || netOff() || COOP.srv === false) return;
  coopFlushing = true; let sent = 0;
  try {
    for (const u of unsentCoop.slice()) {
      let drop = !u.a || (u.a.p_kind === 'ami' && Date.now() - (u.at || 0) > 2 * 86400000);   // une partie à deux de plus de 2 jours : jetée
      if (!drop) {
        try { const r = await rpc('add_coop_score', Object.assign({}, u.a, { p_code: CODE() }), { quiet404: true }); drop = r !== 'attente' || Date.now() - (u.at || 0) > 600000; sent++; }
        catch (x) { if (x.offline) break; if (x.status === 404) { COOP.srv = false; break; } if (!x.acct && !x.guest && / 4\d\d /.test(String(x.message))) drop = true; }
      }
      if (drop) { unsentCoop = unsentCoop.filter(y => y !== u); store.set('jdw.unsentcoop', unsentCoop); }
    }
  } finally { coopFlushing = false; }
  if (sent) { poke('scores'); coopLoadScores(true); }
}
$('jdw-coopend-again').addEventListener('click', () => coopRematch());
$('jdw-coopend-lib').addEventListener('click', () => { flushCoopPending(); coopToLib(); });
$('jdw-coopend-share').addEventListener('click', async () => {
  if (COOP.shared || !COOP.e || !room) return;
  COOP.shared = true; $('jdw-coopend-share').textContent = 'Partagé ✓'; $('jdw-coopend-share').disabled = true;
  if (COOP.mode === 'net') netCtl({ h: 'cshared' });
  const names = COOP.mode === 'ai' ? dispName(COOP.team[0]) + ' et son robot ' + coopLvName(COOP.lvl) : dispName(COOP.team[0]) + ' et ' + dispName(COOP.team[1]);
  const body = '🤝 ' + names + ' : ' + fmt(COOP.score) + ' points à ' + COOP.e.title + (COOP.stage ? ' (' + (COOP.e.c.levelWord || 'niveau').toLowerCase() + ' ' + COOP.stage + ')' : '') + ' !';
  try { await rpc('post_message', Object.assign({ p_code: CODE() }, RP(), { p_name: profile.name, p_body: body.slice(0, 300) })); poke('chat'); loadChat(); }
  catch (x) { COOP.shared = false; $('jdw-coopend-share').textContent = '📣 Partager notre score'; $('jdw-coopend-share').disabled = false; }
});

// ---------- chat : carte « record à deux » ; cloche : « X et Y ont battu votre record » ----------
function coopCard(m) {
  const meta = m.meta || {}, e = coopById(m.game), ia = meta.k === 'ia';
  const el = document.createElement('div'); el.className = 'chat-record coop-record';
  if (e) el.style.setProperty('--acc', e.accent);
  if (ia) ensureAiPlayer();
  const heads = document.createElement('div'); heads.className = 'cr-heads coop-crh';
  const lose = document.createElement('span'); lose.className = 'cr-pair lose';
  lose.append(chatHead(m.beaten, { cls: 'lose', sad: true }), chatHead(ia ? AI_NAME : meta.b2, { cls: 'lose', sad: true }));
  const win = document.createElement('span'); win.className = 'cr-pair win';
  const a = chatHead(m.name, { cls: 'win' }), b = chatHead(ia ? AI_NAME : meta.a2, { cls: 'win' });
  const crown = document.createElement('span'); crown.className = 'cr-crown'; crown.textContent = '👑'; win.append(a, b, crown);
  heads.append(lose, win);
  const tx = document.createElement('div'); tx.className = 'cr-txt';
  const eb = document.createElement('small'); eb.textContent = '🤝 Record à deux' + (e ? ' · ' + e.title : '');
  const t = document.createElement('b');
  t.textContent = ia ? dispName(m.name) + ' et son robot 🤖 ' + coopLvName(meta.lvl) + ' détrônent ' + dispName(m.beaten) + ' et son robot !'
    : dispName(m.name) + ' et ' + dispName(meta.a2) + ' détrônent ' + dispName(m.beaten) + ' et ' + dispName(meta.b2) + ' !';
  const sc = document.createElement('span'); sc.textContent = fmt(m.score) + ' contre ' + fmt(m.beatenScore) + ' · ' + hhmm(m.at);
  tx.append(eb, t, sc); el.append(heads, tx);
  if (m.id) { el.dataset.mid = m.id; const rx = reactPill(m.id); if (rx) { el.appendChild(rx); el.classList.add('has-rx'); } }
  if (e) {
    const go = document.createElement('button'); go.type = 'button'; go.className = 'cr-go'; go.textContent = 'Revanche';
    go.setAttribute('aria-label', 'Jouer à ' + e.title + ' pour reprendre le record');
    go.addEventListener('click', () => { closeChat(); if (!$('jdw-play').hidden) backToLibrary(); setMode('coop'); setCoopWhere(ia ? 'ia' : 'ami'); openCoopGo(e, ia ? 'ia' : 'ami'); });
    el.append(go);
  }
  return el;
}
const coopNotifKey = () => (room ? room.id : '-') + ':' + cleanName(profile.name);
async function loadCoopNotifs() {
  const me = cleanName(profile.name);
  if (!coopServerOn() || !ONLINE || !room || !me || isGuest() || netOff()) { if (!coopList().length) COOP.notifs = []; return; }
  try {
    const rows = await rpc('get_coop_notifs', Object.assign({ p_code: CODE() }, RP(), { p_name: me }), { quiet404: true }) || [];
    if (cleanName(profile.name) !== me) return;
    COOP.notifs = rows.map(r => ({ kind: 'coop', id: +r.r_id, k: r.r_kind === 'ia' ? 'ia' : 'ami', game: r.r_game, a1: cleanName(r.r_actor1), a2: cleanName(r.r_actor2 || ''),
      lvl: r.r_level || 'moyen', score: +r.r_score || 0, mate: cleanName(r.r_mate || ''), prev: +r.r_prev || 0, at: Date.parse(r.r_at) || 0 }));
    COOP.srv = true;
  } catch (x) { if (x.status === 404) COOP.srv = false; }
  refreshBell();
  const key = coopNotifKey(), seen = coopNotifSeen[key] || 0, fresh = COOP.notifs.filter(n => n.id > seen);
  if (fresh.length && $('jdw-play').hidden && !COOP.notifToasted) { COOP.notifToasted = true; const n = fresh[0]; toastCheer(coopNotifTitle(n) + ' !', n.a1, true); }
}
const coopNotifTitle = n => { const e = coopById(n.game); return (n.k === 'ia' ? dispName(n.a1) + ' et son robot ont battu ton record avec ton robot' : dispName(n.a1) + ' et ' + dispName(n.a2) + ' ont battu votre record') + (e ? ' à ' + e.title : ''); };
const coopNotifsFresh = () => { const s = coopNotifSeen[coopNotifKey()] || 0; return COOP.notifs.filter(n => n.id > s); };
const coopNotifsOld = () => { const s = coopNotifSeen[coopNotifKey()] || 0; return COOP.notifs.filter(n => n.id <= s); };
function coopNotifsSeen() { if (COOP.notifs.length) { coopNotifSeen[coopNotifKey()] = Math.max(coopNotifSeen[coopNotifKey()] || 0, ...COOP.notifs.map(n => n.id)); store.set('jdw.coopnotifseen', coopNotifSeen); } }
function coopNotifRow(n, li, tx) {
  const e = coopById(n.game);
  if (n.k === 'ia') ensureAiPlayer();
  const av = coopHeads({ kind: n.k, p1: n.a1, p2: n.a2 }, 'nt-pair');
  const b = document.createElement('b'); b.textContent = n.k === 'ia' ? dispName(n.a1) + ' et son robot' : dispName(n.a1) + ' et ' + dispName(n.a2);
  tx.append(b, n.k === 'ia' ? ' ont battu ton record avec ton robot' + (e ? ' à ' + e.title : '') : ' ont battu votre record' + (e ? ' à ' + e.title : ''));
  const sm = document.createElement('small');
  sm.textContent = fmt(n.score) + ' contre ' + fmt(n.prev) + (n.k === 'ia' ? ' pour toi et ton robot' : ' pour ' + (n.mate ? dispName(n.mate) + ' et toi' : 'toi')) + ' · ' + timeAgo(n.at);
  tx.append(sm); li.append(av, tx); li.classList.add('click');
  li.addEventListener('click', () => { closeSheet('jdw-notifs'); if (!e) return; if (!$('jdw-play').hidden) backToLibrary(); setMode('coop'); setCoopWhere(n.k); openCoopGo(e, n.k); });
  return li;
}

// ---------- en ligne : l'hôte lance et invite, l'invité rejoint (tuyauterie du duel en ligne, NET.kind = 'coop') ----------
function coopNetCreate(e) {
  if (isGuest()) { guestAsk('Coop en ligne'); return; }
  if (netOff()) { netNeed('La coop en ligne'); return; }
  loadTurn();
  if (!profile.name) { startWelcome(); return; }
  if (!ONLINE || !window.RTCPeerConnection) { toastCheer('La coop en ligne demande une connexion internet.', profile.name, true); return; }
  if (!room) { openRooms(); return; }
  coopGoClose(); netReset(); Audio.ensure();
  fsEnter(!!e.c.landscape);   // « Inviter » est un toucher : plein écran dès maintenant (la partie démarrera sans toucher)
  const lv = coopLvOf('ami', e.id);
  NET.code = Math.random().toString(36).slice(2, 8); NET.role = 'host'; NET.kind = 'coop'; NET.co = { id: e.id, lv }; NET.topic = 'jdw-duel-' + NET.code;
  rtJoin(NET.topic);
  coopSetup(e, 'net', lv);
  $('jdw-net-game').textContent = e.title + ' · ' + coopLvName(lv);
  $('jdw-net-h').textContent = 'Partie à deux lancée !';
  $('jdw-net-sub').textContent = 'Invite un copain : dès qu\'il accepte, vous jouez ensemble.';
  $('jdw-net-sharebox').hidden = false; $('jdw-net-lh').hidden = false;
  $('jdw-net').style.setProperty('--acc', e.accent);
  netRenderList(); openSheet('jdw-net', 'jdw-net-share');
}
const coopVer = v => String(v || '').split('·')[0];
function coopRenderList() {
  const list = $('jdw-net-list'); list.textContent = '';
  const me = cleanName(profile.name), seen = new Set(), mine = coopVer(myVersionTag());
  const on = presList().filter(x => x.name !== me && x.cid && !seen.has(x.name) && seen.add(x.name));
  if (!on.length) { const p = document.createElement('p'); p.className = 'small'; p.textContent = 'Personne d\'autre en ligne dans ta salle pour le moment : envoie-lui le lien.'; list.appendChild(p); return; }
  for (const x of on) {
    const old = !!x.ver && coopVer(x.ver) !== mine;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pick-row' + (old ? ' old' : '');
    const t = document.createElement('span'); t.className = 'pr-t'; const bb = document.createElement('b'); bb.textContent = dispName(x.name); const sm = document.createElement('small');
    sm.textContent = old ? 'doit mettre sa borne à jour' : x.game && x.game !== 'menu' ? gameLabel(x.game) : 'dans le menu'; t.append(bb, sm);
    const go = document.createElement('span'); go.className = 'cg-go'; go.textContent = old ? 'Pas à jour' : 'Inviter';
    b.append(chatHead(x.name, { passive: true }), t, go);
    if (old) b.disabled = true;
    else b.addEventListener('click', () => {
      rtBroadcast({ t: 'coopinv', code: NET.code, g: NET.co.id, n: me, to: x.name, lv: NET.co.lv });
      go.textContent = 'Invité ✓'; b.disabled = true;
      $('jdw-net-sub').textContent = 'Invitation envoyée à ' + dispName(x.name) + ' : en attente de sa réponse…';
    });
    list.appendChild(b);
  }
}
async function coopShare() {
  const e = coopById(NET.co && NET.co.id); if (!e) return;
  const txt = cleanName(profile.name) + ' t\'invite à jouer avec lui à ' + e.title + ' (' + coopLvName(NET.co.lv) + ') sur la borne d\'arcade ! Touche le lien :';
  try { if (navigator.share) { await navigator.share({ title: 'À deux : ' + e.title, text: txt, url: NET_LINK() }); return; } } catch (x) { if (x && x.name === 'AbortError') return; }
  netCopy();
}
// invitation reçue (signal « coopinv » : jamais « netinv », qu'un vieil appareil prendrait pour un DUEL)
let coopInvite = null;
function coopInvButtons(on) { $('jdw-netinv').classList.toggle('coop', !!on); $('jdw-netinv-ok').textContent = on ? 'Jouer ensemble' : 'Accepter'; $('jdw-netinv-no').textContent = on ? 'Pas maintenant' : 'Non merci'; }
function coopOnInvite(p) {
  if (cleanName(p.to) !== cleanName(profile.name) || NET.role) return;
  const e = coopById(p.g); if (!e || !e.c.online) return;   // jeu pas encore en ligne de ce côté : on ignore
  const lv = COOP_LV.includes(p.lv) ? p.lv : 'moyen';
  netInvite = null; coopInvite = { code: String(p.code || '').slice(0, 12), g: e.id, from: cleanName(p.n), lv };
  const hd = $('jdw-netinv-head'); hd.textContent = ''; hd.appendChild(chatHead(coopInvite.from, { passive: true }));
  $('jdw-netinv-t').textContent = coopInvite.from + ' t\'invite à jouer avec lui à ' + e.title + ' (' + coopLvName(lv) + ') !';
  coopInvButtons(true);
  $('jdw-netinv').hidden = false; Audio.tone(784, 0.1, 'square', 0.05, 1046);
  clearTimeout(coopInvite.t); coopInvite.t = setTimeout(() => { if (coopInvite) { $('jdw-netinv').hidden = true; coopInvButtons(false); coopInvite = null; } }, 40000);
}
$('jdw-netinv-ok').addEventListener('click', () => {
  const ci = coopInvite; coopInvite = null; coopInvButtons(false);
  if (!ci || netInvite) return;
  clearTimeout(ci.t); $('jdw-netinv').hidden = true;
  if (isGuest()) { guestAsk('Coop en ligne'); return; }
  coopNetJoin(ci.code, ci.g, ci.from, ci.lv);
});
$('jdw-netinv-no').addEventListener('click', () => {
  const ci = coopInvite; coopInvite = null; coopInvButtons(false);
  if (!ci || netInvite) return;
  clearTimeout(ci.t); rtBroadcastTo('jdw-duel-' + ci.code, { t: 'net', code: ci.code, k: 'no', n: cleanName(profile.name) });
});
function coopNetJoin(code, g, from, lv) {
  loadTurn();
  if (!profile.name) { startWelcome(); return; }
  if (!window.RTCPeerConnection) { toastCheer('Ce téléphone ne permet pas la coop en ligne.', profile.name, true); return; }
  const e = g ? coopById(g) : null;
  netReset(); Audio.ensure();
  fsEnter(!!(e && e.c.landscape));   // « Jouer ensemble » est un toucher : plein écran dès maintenant
  NET.code = code; NET.role = 'guest'; NET.kind = 'coop'; NET.co = { id: g || '', lv: lv || 'moyen' }; NET.topic = 'jdw-duel-' + code;
  rtJoin(NET.topic);
  $('jdw-net-game').textContent = e ? e.title + ' · ' + coopLvName(NET.co.lv) : 'Partie à deux';
  $('jdw-net-h').textContent = 'Connexion à la partie…';
  $('jdw-net-sub').textContent = from ? 'On rejoint ' + from + '.' : 'On rejoint ton copain.';
  $('jdw-net-sharebox').hidden = true; $('jdw-net-lh').hidden = true; $('jdw-net-list').textContent = '';
  $('jdw-net').style.setProperty('--acc', e ? e.accent : COLORS.leaf);
  openSheet('jdw-net', 'jdw-net-cancel');
  const hello = () => netSig({ k: 'hello', n: cleanName(profile.name), cid: clientId, coop: 1 });
  hello(); NET.helloT = setInterval(hello, 1500);
  NET.waitT = setTimeout(() => { if (NET.role === 'guest' && !NET.pc) netEnd(false, 'La partie n\'a pas répondu : elle a peut-être été annulée.'); }, 25000);
}
// l'hôte : liaison en données seulement (ni vidéo, ni canal « inp ») ; on attend le « me » de l'invité (5 s au plus)
async function coopNetHostStart() {
  $('jdw-net-h').textContent = 'Connexion avec ' + NET.peer + '…';
  $('jdw-net-sub').textContent = 'La partie démarre dans un instant.';
  $('jdw-net-sharebox').hidden = true; $('jdw-net-lh').hidden = true; $('jdw-net-list').textContent = '';
  try {
    const pc = NET.pc = new RTCPeerConnection(RTC_CFG); netWatchPc(pc); NET.data = true;
    NET.g = pc.createDataChannel('g', { ordered: false, maxRetransmits: 0 });
    NET.g.onmessage = x => { try { netDeliver(JSON.parse(x.data)); } catch (y) {} };
    NET.ctl = pc.createDataChannel('ctl');
    NET.ctl.onopen = () => { NET.waitT = setTimeout(() => { if (NET.kind === 'coop' && NET.role === 'host' && !NET.start) netEnd(true, NET.peer + ' doit mettre sa borne à jour pour jouer à deux.'); }, 5000); };
    NET.ctl.onmessage = x => { try { netCtlHost(JSON.parse(x.data)); } catch (y) {} };
    await pc.setLocalDescription(await pc.createOffer());
    netSig({ k: 'offer', to: NET.peerCid, sdp: pc.localDescription.sdp, g: NET.co.id, n: cleanName(profile.name), coop: 1 });
  } catch (x) { netEnd(true, 'Impossible de lancer la partie à deux.'); reportError('Coop en ligne : ' + x.message, x.stack, { quiet: true }); }
}
function coopHostGo() {
  if (NET.role !== 'host' || NET.kind !== 'coop' || NET.start) return;
  clearTimeout(NET.waitT); NET.start = true;
  const gi = NET.guestInfo || {}, e = coopById(NET.co.id);
  if (!e) { netEnd(true, 'Ce jeu n\'est plus disponible.'); return; }
  if (String(gi.v || '') !== String(BUILD)) {   // même version de la borne obligatoire (D3)
    netCtl({ h: 'cver', v: BUILD, ver: myVersionTag() });
    setTimeout(() => netEnd(true, 'Vos bornes n\'ont pas la même version : mettez-les à jour.'), 300); checkSiteVersion(); return;
  }
  if (gi.photo && /^data:image\//.test(gi.photo) && !players.has(NET.peer)) setPlayer(NET.peer, gi.photo, null);
  COOP.e = e; COOP.mode = 'net'; COOP.kind = 'ami';
  COOP.room = room ? room.id : null; COOP.ranked = !!room && roomMember(NET.peer) && !knownNotMember(NET.peer);
  coopSetPlayers(cleanName(profile.name), NET.peer); coopNewRun();
  if (!$('jdw-net').hidden) closeSheet('jdw-net');
  netCtl({ h: 'cstart', g: e.id, lv: COOP.lvl, run: COOP.run, seed: COOP.seed, room: COOP.room, ranked: COOP.ranked, names: COOP.team.slice(), photo: netMyPhoto() });
  if (!COOP.ranked) toastCheer('Partie pour le plaisir : ' + dispName(NET.peer) + ' n\'est pas dans ta salle, le score ne sera pas classé.', profile.name, true);
  coopEnterPlay(); coopMount();
}
function coopHostRestart() {   // « Rejouer ensemble » : les deux ont touché
  if (NET.role !== 'host' || NET.kind !== 'coop' || !COOP.e) return;
  COOP.ready = [false, false]; COOP.gone = ''; COOP.shared = false; coopNewRun();
  netCtl({ h: 'cstart', g: COOP.e.id, lv: COOP.lvl, run: COOP.run, seed: COOP.seed, room: COOP.room, ranked: COOP.ranked, names: COOP.team.slice(), photo: '' });
  $('jdw-coopend').hidden = true; coopEnterPlay(); coopMount();
}
function coopReady() {
  if (COOP.mode !== 'net' || !NET.role || NET.kind !== 'coop') return;
  COOP.ready[COOP.me] = true; netCtl({ h: 'cready' }); coopAgainBtn();
  if (NET.role === 'host' && COOP.ready[1]) coopHostRestart();
}
function coopCtlHost(m) {
  if (m.h === 'me') { NET.guestInfo = m; if (NET.ctl && NET.ctl.readyState === 'open' && !NET.start) coopHostGo(); return; }
  if (!NET.start) return;
  if (m.h === 'cpausereq') { coopPause('net'); netCtl({ h: 'cpause' }); return; }
  if (m.h === 'cresumereq') { coopResume('net'); netCtl({ h: 'cresume' }); return; }
  if (m.h === 'cquit') { if (current && current.coop && !COOP.over) { let sc = 0; try { sc = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (x) {} COOP.gone = 'quit'; if (sc > 0) coopOver(sc, 'quit', 1); else { netCtl({ h: 'cover', s: 0, st: 0, stats: null, why: 'quit', by: 1 }); coopToLib(); toastCheer(dispName(COOP.mate) + ' a quitté la partie.', COOP.mate, true); } } return; }
  if (m.h === 'cready') { COOP.ready[1] = true; if (COOP.ready[0]) coopHostRestart(); else if (!$('jdw-coopend').hidden) coopStatus(dispName(COOP.mate) + ' est prêt à rejouer !'); return; }
  if (m.h === 'cshared') { COOP.shared = true; coopShareDone(); return; }
  if (m.h === 'cabort') { coopAbort(String(m.msg || 'La partie s\'est arrêtée.').slice(0, 120), false); return; }
  if (m.h === 'quit') { coopLinkGone('quit'); }
}
function coopCtlGuest(m) {
  if (m.h === 'cver') { netEnd(false, 'Vos bornes n\'ont pas la même version : mettez-les à jour.'); checkSiteVersion(); return; }
  if (m.h === 'cstart') { coopGuestStart(m); return; }
  if (m.h === 'cabort' && !NET.start) { netEnd(false, String(m.msg || 'La partie ne peut pas démarrer.').slice(0, 120)); return; }
  if (!current || !current.coop) { if (m.h === 'quit') coopLinkGone('quit'); else if (m.h === 'cready') { COOP.ready[0] = true; if (!$('jdw-coopend').hidden) coopStatus(dispName(COOP.mate) + ' est prêt à rejouer !'); } return; }
  if (m.h === 'csc') { COOP.lastCsc = { s: Math.max(0, Math.floor(+m.s || 0)), lv: Math.floor(+m.lv || 0) }; return; }
  if (m.h === 'ccel') { toastCheer(String(m.text || '').slice(0, 140), m.name || null); return; }
  if (m.h === 'cpause') { coopPause('net'); return; }
  if (m.h === 'cresume') { coopResume('net'); return; }
  if (m.h === 'cover') { if (m.why === 'quit' && +m.by === 0) COOP.gone = 'quit'; coopGuestFinish(m); return; }
  if (m.h === 'cready') { COOP.ready[0] = true; if (!$('jdw-coopend').hidden) coopStatus(dispName(COOP.mate) + ' est prêt à rejouer !'); return; }
  if (m.h === 'cshared') { COOP.shared = true; coopShareDone(); return; }
  if (m.h === 'cabort') { coopAbort(String(m.msg || 'La partie s\'est arrêtée.').slice(0, 120), false); return; }
  if (m.h === 'quit') coopLinkGone('quit');
}
function coopShareDone() { const b = $('jdw-coopend-share'); if (b) { b.textContent = 'Partagé ✓'; b.disabled = true; } }
function coopGuestStart(m) {
  const e = coopById(m.g);
  if (!e) { netEnd(true, 'Ce jeu n\'est pas encore sur ta borne : mets-la à jour.'); return; }
  const names = Array.isArray(m.names) ? m.names.map(cleanName) : [NET.peer, cleanName(profile.name)];
  if (m.photo && /^data:image\//.test(m.photo) && !players.has(names[0])) setPlayer(names[0], m.photo, null);
  NET.start = true;
  coopSetup(e, 'net', m.lv);
  Object.assign(COOP, { run: String(m.run || ''), seed: Math.floor(+m.seed || 0), room: m.room == null ? null : +m.room, ranked: !!m.ranked });
  coopSetPlayers(names[0], names[1] || cleanName(profile.name));
  if (!$('jdw-net').hidden) closeSheet('jdw-net');
  if (!COOP.ranked && !current) toastCheer('Partie pour le plaisir : vous n\'êtes pas dans la même salle, le score ne sera pas classé.', profile.name, true);
  coopEnterPlay(); coopMount();
}
// le copain part (Quitter, appli fermée) ou la liaison tombe : fin des deux côtés avec le score de l'hôte
function coopLinkGone(why) {
  if (current && current.coop && !COOP.over) {
    COOP.gone = why === 'quit' ? 'quit' : 'link';
    if (coopIsGuestSide()) coopGuestFinish({ s: COOP.lastCsc ? COOP.lastCsc.s : 0, st: COOP.lastCsc ? COOP.lastCsc.lv : 0, why: 'link', by: 0 });
    else { let sc = 0; try { sc = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (x) {} coopOver(sc, 'link', 1); }
  } else if (!$('jdw-coopend').hidden) { COOP.gone = COOP.gone || (why === 'quit' ? 'quit' : 'link'); }
}
function coopNetEnd(notify, msg) {
  const wasPlaying = !!(current && current.coop) || !$('jdw-coopend').hidden, peer = NET.peer || COOP.mate;
  if (notify) { netCtl({ h: 'quit' }); netSig({ k: 'bye' }); }
  if (wasPlaying && !notify) coopLinkGone(/a quitté/.test(msg || '') ? 'quit' : 'link');
  netReset();
  if (!$('jdw-net').hidden) closeSheet('jdw-net');
  if (wasPlaying) {
    if (!$('jdw-coopend').hidden) {   // carte de fin : « copain parti », le bouton devient « Rejouer avec un robot »
      const gone = $('jdw-coopend-gone'); if (!COOP.gone) COOP.gone = 'link';
      gone.hidden = false; gone.textContent = COOP.gone === 'quit' ? dispName(peer) + ' est parti.' : 'La liaison avec ' + dispName(peer) + ' est coupée.';
      coopAgainBtn();
    }
    return;
  }
  musicBaseLevel(1); MUS.override = false; setMusic('accueil');
  fsLeave();
  if (msg) toastCheer(/déjà un adversaire/.test(msg) ? 'Cette partie a déjà un deuxième joueur.' : msg.replace(/le duel/g, 'la partie').replace(/Ton adversaire/g, 'Ton copain').replace(/ton adversaire/g, 'ton copain'), profile.name, true);
}
// lien d'invitation ouvert : ?coop=<code>
(() => {
  let code = ''; try { code = new URLSearchParams(location.search).get('coop') || ''; } catch (e) {}
  if (!/^[a-z0-9]{4,12}$/.test(code)) return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  if (isGuest()) { setTimeout(() => guestAsk('Coop en ligne'), 1200); return; }
  setTimeout(() => {
    netInvite = null; coopInvite = { code, g: '', from: '', lv: 'moyen' };
    const hd = $('jdw-netinv-head'); hd.textContent = '🤝';
    $('jdw-netinv-t').textContent = 'Un copain t\'invite à jouer avec lui !';
    coopInvButtons(true); $('jdw-netinv').hidden = false;
  }, 1200);
})();
// ---------- petites prises pour le reste de la bibliothèque (fonctions : utilisables avant cette section) ----------
function coopPresCo() { try { return current && current.coop && !COOP.over ? (COOP.mode === 'net' ? COOP.mate : AI_NAME) : undefined; } catch (e) { return undefined; } }
function coopNotifCount() { try { return COOP.notifs.length; } catch (e) { return 0; } }
function coopFreshN() { try { return coopNotifsFresh().length; } catch (e) { return 0; } }
function coopNotifsList(fresh) { try { return fresh ? coopNotifsFresh() : coopNotifsOld(); } catch (e) { return []; } }
function coopNotifsSeenSafe() { try { coopNotifsSeen(); } catch (e) {} }
function coopMessages(args) {   // chat : get_messages2 (+ r_meta) quand des jeux coop existent ; serveur pas à jour (404) → get_messages pour la séance
  if (!coopList().length || COOP.msg2 === false) return rpc('get_messages', args);
  return rpc('get_messages2', args, { quiet404: true }).then(r => { COOP.msg2 = true; return r; }, e => { if (e.status === 404) { COOP.msg2 = false; return rpc('get_messages', args); } throw e; });
}
function coopOnPokeScores() {
  try {
    if (!coopList().length) return;
    if (coopViewOpen()) { coopLoadScores(true); if (!$('jdw-board').hidden && boardScope === 'world') coopLoadWorld(); }
    if (COOP.res === 'attente' && COOP.e) coopRetry({ p_code: CODE(), p_room: COOP.room, p_room_code: roomCodes[COOP.room] || '', p_game: COOP.e.id, p_kind: COOP.kind, p_name: cleanName(profile.name),
      p_partner: COOP.kind === 'ami' ? COOP.mate : '', p_level: COOP.lvl, p_score: COOP.score, p_stage: COOP.stage, p_run: COOP.run });
  } catch (e) {}
}
function coopOfferRescue() {
  const sc = COOP.score;
  $('jdw-rescue-txt').textContent = sc > 0 ? 'Votre score de ' + fmt(sc) + ' est gardé.' : 'Vous pouvez continuer ou relancer la partie.';
  $('jdw-rescue-ok').textContent = sc > 0 ? 'Terminer et garder notre score' : COOP.mode === 'net' ? 'Arrêter la partie' : 'Recommencer';
  $('jdw-rescue').hidden = false;
}
function coopNewGameRow(n, li, tx) {   // cloche : « Nouveau jeu à deux » (TILE_NEWS coop-<id>)
  const e = coopById(n.game.slice(5));
  const ic = document.createElement('span'); ic.className = 'avatar nt-game'; ic.textContent = '🤝'; if (e) ic.style.background = e.accent;
  const b = document.createElement('b'); b.textContent = 'Nouveau jeu à deux !';
  const sm = document.createElement('small'); sm.textContent = (e ? e.title + ' · ' : '') + 'touche pour y jouer';
  tx.append(b, sm); li.append(ic, tx); li.classList.add('click');
  li.addEventListener('click', () => { closeSheet('jdw-notifs'); if (!e) return; setMode('coop'); const k = e.c.ai ? 'ia' : 'ami'; setCoopWhere(k); openCoopGo(e, k); });
  return li;
}

/* ================= Regarder un copain jouer en direct (vidéo de téléphone à téléphone, WebRTC) ================= */
// Le direct de la salle sert seulement à présenter les deux appareils (signaux « rtc ») ; l'image va ensuite directement
// du téléphone du joueur à celui du spectateur. Rien n'est filmé tant que personne ne regarde ; 3 spectateurs au plus.
// Réactions du « Regarder » : le spectateur en envoie (watchSend) ; le joueur les voit en pleine partie (signal « rx » → rxShow).
// Les éléments [data-rx="<nom>"] (têtes d'un joueur à l'écran) font aussi s'envoler l'emoji (aucun pour l'instant).
const REACTIONS = ['😂', '🔥', '💩', '😱', '👏', '😈'];
const rxIn = {};
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
const watchable = g => !!g && g !== 'menu' && !/^duel-/.test(g) && (!!gameById(g) || (/^coop-/.test(g) && !!coopById(g.slice(5))));
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
  if (CAST.size >= (NET.kind === 'coop' ? 2 : 3) && !CAST.has(p.sid)) { rtcSignal({ k: 'no', to: p.fromCid, sid: p.sid, why: 'complet' }); return; }
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
const NET_LINK = () => location.origin + location.pathname + (NET.kind === 'coop' ? '?coop=' : '?duel=') + NET.code;
function rtBroadcastTo(topic, data) { return rtSend(topic, 'broadcast', { type: 'broadcast', event: 'poke', payload: Object.assign({ from: clientId }, data) }); }
function netSig(data) { if (NET.topic) rtBroadcastTo(NET.topic, Object.assign({ t: 'net', code: NET.code }, data)); }
function netCtl(m) { if (NET.ctl && NET.ctl.readyState === 'open') try { NET.ctl.send(JSON.stringify(m)); } catch (e) { if (!NET.ctlErr) { NET.ctlErr = true; reportError('Liaison : message « ' + m.h + ' » refusé (' + e.message + ')', '', { quiet: true }); } } }
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
// ma tête pour l'autre appareil : un message de canal de données ne dépasse pas la taille que l'autre accepte (iPhone / Safari :
// 64 Ko ; au-delà, send() échoue et la partie ne démarre jamais) → au-delà de 60 000 caractères, une version réduite (160 px)
const NET_PH = { src: '', small: '' };
function netPrepPhoto() {
  const ph = activePhoto(profile);
  if (!ph || ph.length < 60000 || NET_PH.src === ph) return;
  NET_PH.src = ph; NET_PH.small = '';
  const im = new Image();
  im.onload = () => { try { const k = Math.min(1, 160 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); const d = c.toDataURL('image/png'); if (NET_PH.src === ph && d.length < 60000) NET_PH.small = d; } catch (e) {} };
  im.src = ph;
}
function netMyPhoto() { const ph = activePhoto(profile); if (!ph) return ''; if (ph.length < 60000) return ph; netPrepPhoto(); return NET_PH.src === ph ? NET_PH.small : ''; }
// les doigts rejoués ont des numéros >= 1000 : pas de capture de pointeur pour eux
for (const k of ['setPointerCapture', 'releasePointerCapture']) { const f = Element.prototype[k]; if (f) Element.prototype[k] = function (id) { if (id >= 1000) return; return f.call(this, id); }; }
{ const f = Element.prototype.hasPointerCapture; if (f) Element.prototype.hasPointerCapture = function (id) { return id >= 1000 ? true : f.call(this, id); }; }
function netReset() {
  netPrepPhoto();
  if (NET.pc) try { NET.pc.close(); } catch (e) {}
  if (NET.stream) try { NET.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
  if (NET.topic) rtLeave(NET.topic);
  clearInterval(NET.helloT); clearTimeout(NET.waitT); clearInterval(NET.pingT);
  Object.assign(NET, { code: '', role: '', d: null, topic: '', pc: null, ctl: null, inp: null, peer: '', peerCid: '', seats: null, turn: -1, pend: [], remote: false, guestInfo: null, stream: null, vSender: null, aSender: null, start: null,
    data: false, g: null, handlers: [], queue: [], off: 0, rttv: 0, pings: [], kind: '', co: null });
  NET.blocked.clear(); NET.ids.clear(); duoAiOnly = false;
  $('jdw-duo').classList.remove('net-guest', 'net-host', 'net-video', 'net-flip', 'net-single');
  $('jdw-net-stage').hidden = true; const v = $('jdw-net-video'); try { v.pause(); } catch (e) {} v.srcObject = null;
}
function netEnd(notify, msg) {
  if (!NET.role) return;
  if (NET.kind === 'coop') return coopNetEnd(notify, msg);
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
  if (NET.kind === 'coop') return coopRenderList();
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
  if (NET.kind === 'coop') return coopShare();
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
  if (NET.kind === 'coop') return coopNetHostStart();
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
  if (NET.kind === 'coop') return coopCtlHost(m);
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
  if (DUO.d.local === false) return;   // (ex. ping-pong) chacun a tout l'écran (sa vue depuis sa raquette) : le jeu gère lui-même ses doigts
  if (DUO.d.netAnywhere && NET.data) return;   // (toupies, bolides) en mode données, chacun ne pilote que SON objet : on peut toucher partout
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
    // coop : la partie doit démarrer en 30 s (sinon on le dit, au lieu d'attendre pour toujours)
    if (NET.kind === 'coop') { clearTimeout(NET.waitT); NET.waitT = setTimeout(() => { if (NET.pc === pc && NET.kind === 'coop' && !NET.start) { iceReport('Coop en ligne avec ' + (NET.peer || '?'), pc, 'pas de départ'); netEnd(true, 'La partie avec ' + (NET.peer || 'ton copain') + " n'a pas pu démarrer (réseau)."); } }, 30000); }
  } catch (e) { netEnd(true, 'Impossible de rejoindre le duel.'); reportError('Rejoindre un duel : ' + e.message, e.stack, { quiet: true }); }
}
function netGuestHello() {
  // horloge commune : quelques allers-retours rapides, puis un toutes les 2 s
  clearInterval(NET.pingT); let n = 0;
  const ping = () => netCtl({ h: 'ping', t: performance.now() });
  ping(); NET.pingT = setInterval(() => { ping(); if (++n === 6) { clearInterval(NET.pingT); NET.pingT = setInterval(ping, 2000); } }, 200);
  // ma tête (si elle est petite) et mon nom, pour que l'hôte me dessine dans le jeu
  netCtl(Object.assign({ h: 'me', name: cleanName(profile.name), photo: netMyPhoto() }, NET.kind === 'coop' ? { v: BUILD, coop: 1 } : {}));
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
  if (NET.kind === 'coop') return coopCtlGuest(m);
  if (m.h === 'start') { netGuestShow(m); return; }
  if (!NET.start) return;
  if (m.h === 'say') { duoSay(m.text, m.o || {}); return; }
  if (m.h === 'pills') {
    DUO.scores = Array.isArray(m.s) ? m.s.slice(0, 2) : DUO.scores; DUO.over = false; duoPills(m.p);
    if (NET.data && (m.p === 0 || m.p === 1)) {   // mode données : les sons sont joués ici (pas de son envoyé par l'hôte)
      sting('point', 0.55, false);
      if (duoMatchPt(DUO.d, DUO.scores, m.p) && !DUO.mp) { DUO.mp = true; setTimeout(() => { sting('match', 0.6); if (duoMusicId(DUO.d)) setMusic(duoMusicId(DUO.d), 'intense'); }, 700); }
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

/* ================= Applis natives (appli Android 1.8+) : Pégase en vraie appli ================= */
// Dans l'appli Android 1.8 et suivantes (window.JDWAndroid : android-apktool/java/Natif.java), la tuile d'un jeu de NATIVE_APPS ouvre
// l'appli native quand elle est installée et à jour. Sinon la feuille #jdw-natif la télécharge (DownloadManager d'Android : continue si on
// quitte la borne), vérifie son empreinte SHA-256, puis Android demande « Installer ? » une seule fois ; les mises à jour suivantes passent
// sans question sur Android 12+ (c'est la borne qui l'a installée). Fiche publiée à côté de la page de téléchargement :
// telecharger/<id>.json = { pkg, versionCode, versionName, size, sha256, url, cert, minSdk, abi, open }. Pas de fiche (404), navigateur,
// iPhone, appli < 1.8, téléphone incompatible : la version web du jeu, inchangée. Essais : ?natif=web force la version web sur l'appareil,
// ?natif=auto revient au fonctionnement normal. Plus tard : un jeton de session court dans l'adresse pegase://open (compte de la borne).
const NATIVE_APPS = { pegase: 'telecharger/pegase.json' };
// jeux qui ont leur HUB dans la borne (Pégase, 1.19.9) : la tuile ouvre toujours le hub ; c'est sa carte « Android » qui installe /
// met à jour / ouvre l'appli (api.natif, CONTRACT.md Ajout 9), avec la même feuille #jdw-natif
const NATIVE_HUB = new Set(['pegase']);
const NAT = { b: null, g: null, info: null, inst: null, kind: '', ui: '', ev: null, open: false, raf: 0, spd: [], busy: false, go: '', later: '',
  confirmAt: 0, keepT: 0, readyToast: '', party: '', hub: false, subs: new Set() };
NAT.b = (() => { try { const b = window.JDWAndroid; return b && typeof b.api === 'function' && b.api() >= 1 ? b : null; } catch (e) { return null; } })();
(() => { try { const q = new URLSearchParams(location.search).get('natif'); if (q === 'web' || q === 'auto') store.set('jdw.natif.mode', q); } catch (e) {} })();
const natJ = s => { try { return typeof s === 'string' && s ? JSON.parse(s) : null; } catch (e) { return null; } };
const natMo = n => { n = +n || 0; return n >= 1e9 ? (n / 1e9).toFixed(1).replace('.', ',') + ' Go' : Math.max(1, Math.round(n / 1e6)) + ' Mo'; };
const natSha = i => String((i && i.sha256) || '').toLowerCase();
const NAT_FLOW = /^(download|verify|ready|prepare|install|confirm)$/;
function nativeFor(g) { return !!(NAT.b && g && NATIVE_APPS[g.id] && store.get('jdw.natif.mode', 'auto') !== 'web'); }
function nativeOk(i) {
  return !!(i && typeof i === 'object' && /^[a-zA-Z]\w*(\.[a-zA-Z]\w*)+$/.test(i.pkg || '') && +i.versionCode > 0 && /^[0-9a-f]{64}$/i.test(i.sha256 || '')
    && +i.size > 0 && /^https?:\/\//.test(i.url || ''));
}
// la fiche telecharger/<id>.json, gardée sur l'appareil (sans réseau, on sait quand même ouvrir l'appli installée) ; 404 = fiche retirée
async function nativeInfo(id) {
  const key = 'jdw.natif.' + id; let info = null, gone = false;
  try {
    const base = new URL(ROOT + NATIVE_APPS[id], location.href);
    const ctl = typeof AbortController === 'function' ? new AbortController() : null, to = ctl ? setTimeout(() => ctl.abort(), 6000) : 0;
    const r = await fetch(base.href + '?t=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
    clearTimeout(to);
    if (r.status === 404) gone = true;
    else if (r.ok) { info = await r.json(); if (info && info.url) info.url = new URL(info.url, base).href; }
  } catch (e) {}
  if (gone) { store.set(key, null); return null; }
  if (nativeOk(info)) { store.set(key, info); return info; }
  info = store.get(key, null);
  return nativeOk(info) ? info : null;
}
function nativeDevice() { try { return natJ(NAT.b.device()) || {}; } catch (e) { return {}; } }
function nativeFits(info) {
  const d = nativeDevice();
  if (+d.sdk && +d.sdk < (+info.minSdk || 24)) return false;
  return !(info.abi && Array.isArray(d.abis) && d.abis.length && !d.abis.includes(info.abi));
}
function nativeInstalled(info) { try { return natJ(NAT.b.appInstalled(info.pkg)); } catch (e) { return null; } }
function nativeJob() { try { return natJ(NAT.b.installState()) || { state: 'idle' }; } catch (e) { return { state: 'idle' }; } }
const nativeCertOff = (inst, info) => !!(inst && info.cert && inst.cert && String(inst.cert).toLowerCase() !== String(info.cert).toLowerCase());

// toucher la tuile : ouvrir l'appli, ou la feuille (installer / mettre à jour / reprendre), ou la version web
// hub = true : appelé par la carte « Android » du hub du jeu (api.natif.open) : pas de repli vers la page du jeu (on y est déjà)
async function nativeOpen(g, hub) {
  if (NAT.busy || !NAT.b) return false;
  NAT.busy = true;
  const tl = tiles.find(t => t.g === g); if (tl) tl.el.classList.add('tile-busy');
  let info = null;
  try { info = await nativeInfo(g.id); } catch (e) {}
  NAT.busy = false; if (tl) tl.el.classList.remove('tile-busy');
  if (!info || !nativeFits(info)) { if (!hub) openGame(g, true); return false; }   // pas (encore) d'appli pour ce téléphone : la version de la borne
  NAT.g = g; NAT.info = info; NAT.hub = !!hub;
  const inst = nativeInstalled(info), job = nativeJob();
  nativeChips();
  if (job.pkg === info.pkg && job.sha === natSha(info) && NAT_FLOW.test(job.state)) { nativeSheet(inst ? 'update' : 'install', inst, job); return true; }   // déjà en route : on reprend
  if (nativeCertOff(inst, info)) { nativeSheet('replace', inst); return true; }
  if (inst && +inst.versionCode >= +info.versionCode) { nativeLaunch(); return true; }
  nativeSheet(inst ? 'update' : 'install', inst);
  return true;
}
// api.natif (CONTRACT.md Ajout 9) : où en est l'appli native de ce jeu sur cet appareil, pour la carte « Android » du hub
const natPlat = () => { const u = navigator.userAgent || ''; return NAT.b || /Android/i.test(u) ? 'android' : /iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && (navigator.maxTouchPoints || 0) > 1) ? 'ios' : 'desktop'; };
async function nativeStatus(g, fresh) {
  const m = (navigator.userAgent || '').match(/BorneArcade\/(\d+)/), plat = natPlat();
  const o = { state: 'none', plat, app: m ? +m[1] : 0, bridge: !!NAT.b, versionName: '', size: 0, minSdk: 0, installed: '', page: new URL(ROOT + 'telecharger/', location.href).href };
  let info = store.get('jdw.natif.' + g.id, null);
  if (fresh || !nativeOk(info)) { try { info = await nativeInfo(g.id); } catch (e) { info = null; } }
  if (!nativeOk(info)) return o;
  Object.assign(o, { versionName: String(info.versionName || ''), size: +info.size || 0, minSdk: +info.minSdk || 0 });
  if (plat !== 'android') { o.state = plat; return o; }
  if (!NAT.b) { o.state = o.app ? 'oldapp' : 'browser'; return o; }
  if (store.get('jdw.natif.mode', 'auto') === 'web') { o.state = 'off'; return o; }
  if (!nativeFits(info)) { o.state = 'unfit'; return o; }
  const inst = nativeInstalled(info), job = nativeJob();
  if (inst) o.installed = String(inst.versionName || '');
  o.state = job.pkg === info.pkg && job.sha === natSha(info) && NAT_FLOW.test(job.state) ? 'busy'
    : nativeCertOff(inst, info) ? 'replace' : inst && +inst.versionCode >= +info.versionCode ? 'play' : inst ? 'update' : 'install';
  if (o.state === 'busy') { o.done = +job.done || 0; o.total = +job.total || +info.size || 0; o.step = job.state; }
  return o;
}
function natNotify() { for (const f of NAT.subs) { try { f(); } catch (e) {} } }
// appli de la borne 1.9 (pont api 2) : ouvrir l'appli native CONNECTÉE au compte de la borne. Billet pg_link_make (usage unique, 60 s,
// seul son SHA-256 est gardé par le serveur) passé à l'appli dans l'EXTRA Android « fr.bornearcade.link » (openAppWith), JAMAIS dans
// l'adresse pegase:// ; l'appli l'échange contre sa propre session (Edge Function pegase-redeem). Rend { ok } ou { ok: false, why } :
// old (pont < 2 : le hub montre le code à taper), guest, install (pas installée / pas à jour : la feuille habituelle), make (billet refusé,
// err), open (Android n'a pas pu l'ouvrir).
const natApi = () => { try { return NAT.b ? +NAT.b.api() || 0 : 0; } catch (e) { return 0; } };
async function nativeOpenLinked(g) {
  if (natApi() < 2 || typeof NAT.b.openAppWith !== 'function' || store.get('jdw.natif.mode', 'auto') === 'web') return { ok: false, why: 'old' };
  if (isGuest() || !profile.name) return { ok: false, why: 'guest' };
  let info = null; try { info = await nativeInfo(g.id); } catch (e) {}
  const inst = info ? nativeInstalled(info) : null;
  if (!info || !inst || +inst.versionCode < +info.versionCode || nativeCertOff(inst, info)) return { ok: false, why: 'install' };
  let r = null;
  // billet LONG (64 hexa, 60 s) : depuis la 1.19.18 le défaut du serveur est le code court à taper
  try { r = await rpc('pg_link_make', { p_code: CODE(), p_name: profile.name, p_long: true }, { quiet: true }); } catch (e) { return { ok: false, why: 'make', err: e }; }
  const row = Array.isArray(r) ? r[0] : r, c = row && typeof row.r_code === 'string' ? row.r_code.trim().toLowerCase() : '';
  if (!/^[0-9a-f]{64}$/.test(c)) return { ok: false, why: 'make', err: new Error('réponse') };
  let ok = false;
  try { ok = !!NAT.b.openAppWith(info.pkg, (info.open || 'pegase://open') + '?from=borne&v=' + encodeURIComponent(window.JDW_VERSION || ''), c); } catch (e) {}
  return ok ? { ok: true } : { ok: false, why: 'open' };
}
// voix de l'avatar par le téléphone (appli 1.9, Voix.java) : speak(texte) → numéro de phrase ('' = pas de voix française) ; évènements
// { state: 'tts', ev: init | start | word (start, end = positions dans le texte) | done | stop | error } ; listen() → 'ok' | 'busy' | 'none' ;
// évènements { state: 'stt', ev: ready (mode ondevice | offline-pref) | begin | end | partial | result (words, answer oui | non | '') | error (err) }
const NATV = { subs: new Set() };
function nativeVoice() {
  if (natApi() < 2 || typeof NAT.b.speak !== 'function') return undefined;
  const b = NAT.b, call = (f, ...a) => { try { return b[f](...a); } catch (e) { return null; } };
  return {
    api: natApi(),   // niveau du pont (2 = appli 1.9) : le hub le note dans son journal d'écoute
    canSpeak: () => !!call('canSpeak'), speak: (t) => String(call('speak', String(t || '').slice(0, 600)) || ''), stopSpeak: () => { call('stopSpeak'); },
    canListen: () => !!call('canListen'), listen: () => String(call('listen') || 'none'), stopListen: () => { call('stopListen'); },
    onEvent: (fn) => { if (typeof fn !== 'function') return () => {}; NATV.subs.add(fn); return () => NATV.subs.delete(fn); }
  };
}
function nativeApi(g) {
  return {
    status: (fresh) => nativeStatus(g, !!fresh),
    open: () => nativeOpen(g, true),
    openLinked: () => nativeOpenLinked(g),
    linkable: () => natApi() >= 2 && store.get('jdw.natif.mode', 'auto') !== 'web',   // la borne sait ouvrir l'appli déjà connectée
    voice: nativeVoice(),
    onChange: (fn) => { if (typeof fn !== 'function') return () => {}; NAT.subs.add(fn); return () => NAT.subs.delete(fn); }
  };
}
function nativeLaunch() {
  const i = NAT.info; let ok = false;
  try { ok = !!(i && NAT.b.openApp(i.pkg, (i.open || 'pegase://open') + '?from=borne&v=' + encodeURIComponent(window.JDW_VERSION || ''))); } catch (e) {}
  if (!ok) { nativeSheet('broken', NAT.inst); return false; }
  if (NAT.open) nativeClose(true);
  return true;
}
function nativeSheet(kind, inst, job) {
  const g = NAT.g, i = NAT.info, card = $('jdw-natif').querySelector('.natif-card');
  NAT.kind = kind; NAT.inst = inst || null; NAT.spd = []; NAT.confirmAt = 0;
  card.style.setProperty('--acc', g.accent || COLORS.amber);
  $('jdw-natif-mk-t').textContent = g.title;
  if (!NAT.open) { NAT.open = true; openSheet('jdw-natif'); nativeHero(); }
  NAT.keepT = 0; nativeKeep();
  if (job) { nativeRender(job); nativeGo(); return; }
  if (kind === 'replace' || kind === 'broken') { nativeRender({ state: kind }); return; }
  const d = nativeDevice(), need = +i.size * 2 + 150e6;
  if (+d.free > 0 && +d.free < need) { nativeRender({ state: 'error', err: 'space', need, free: +d.free }); return; }
  if (kind === 'update') { nativeRender({ state: 'update', metered: !!d.metered }); return; }
  if (d.metered) { nativeRender({ state: 'data' }); return; }
  nativeGo();   // en Wi-Fi : ça part tout de suite
}
// la feuille ouverte est retenue 30 min : si Android relance la borne (ex. après le réglage « sources inconnues »), elle revient toute seule
function nativeKeep() { const t = Date.now(); if (NAT.g && t - NAT.keepT > 10000) { NAT.keepT = t; store.set('jdw.natif.open', { id: NAT.g.id, t }); } }
function nativeGo() {
  const i = NAT.info; if (!i) return;
  let r = 'ok';
  try { r = NAT.b.downloadAndInstall(i.url, i.sha256, +i.size, i.pkg, i.title || NAT.g.title); } catch (e) { r = 'bridge'; }
  if (r !== 'ok') { nativeRender({ state: 'error', err: 'fiche', msg: String(r) }); return; }
  if (!NAT_FLOW.test(NAT.ui)) nativeRender({ state: 'download', done: 0, total: +i.size, dl: 1 });
}
function nativeClose(silent) {
  if (!NAT.open) return;
  NAT.open = false; cancelAnimationFrame(NAT.raf); closeSheet('jdw-natif'); store.set('jdw.natif.open', null);
  setTimeout(natNotify, 0);
  if (/^(download|verify|ready|prepare)$/.test(NAT.ui)) {
    try { NAT.b.background(); } catch (e) {}   // le téléchargement continue, mais Android ne posera pas sa question sans la feuille
    if (!silent && NAT.g) toastCheer(NAT.g.title + ' continue de se télécharger en fond', null, true);
  }
  NAT.ui = '';
}
// vitesse et temps restant (sur les 5 dernières secondes)
function nativeSpeed(done, tot) {
  const t = performance.now(), s = NAT.spd;
  if (s.length && done < s[s.length - 1][1]) s.length = 0;
  s.push([t, done]); while (s.length > 2 && t - s[0][0] > 5000) s.shift();
  if (s.length < 2 || t - s[0][0] < 1500) return '';
  const v = (done - s[0][1]) / ((t - s[0][0]) / 1000); if (!(v > 2000)) return '';
  const left = (tot - done) / v, mo = v / 1e6;
  return ' · ' + (mo >= 10 ? Math.round(mo) : mo.toFixed(1).replace('.', ',')) + ' Mo/s · ' + (left < 60 ? 'encore ' + Math.max(1, Math.round(left)) + ' s' : 'encore ~' + Math.round(left / 60) + ' min');
}
function nativeErr(ev) {
  const T = NAT.g.title, R = (h, sub, go, goTxt, web) => ({ h, sub, go: go || 'retry', goTxt: goTxt || 'Réessayer', web: web !== false });
  switch (ev.err) {
    case 'net': return R('Le téléchargement s\'est arrêté', 'La connexion a lâché en route. On recommence ?');
    case 'missing': return R(T + ' n\'est pas encore en ligne', 'Le fichier de l\'appli n\'est pas (encore) publié. Réessaie un peu plus tard.');
    case 'space': return R('Pas assez de place', T + ' a besoin de ' + natMo(ev.need) + ' libres sur le téléphone (il en reste ' + natMo(ev.free) + '). Fais un peu de place (vidéos, photos…) puis réessaie.', 'dl');
    case 'storage': return R('Pas assez de place', 'Android n\'a pas pu enregistrer ' + T + ' : fais un peu de place sur le téléphone, puis réessaie.');
    case 'sha': case 'invalid': return R('Fichier abîmé', 'Le fichier reçu n\'est pas le bon (téléchargement abîmé) : on le reprend depuis le début.');
    case 'blocked': return R('Installation bloquée', 'Le téléphone bloque les applis venues d\'ailleurs que le Play Store. Sur Samsung : Paramètres › Sécurité et confidentialité › Blocage automatique, à couper le temps d\'installer.');
    case 'conflict': return R('Une autre version est installée', 'Une version de ' + T + ' faite autrement est déjà sur le téléphone : désinstalle-la, puis la vraie s\'installe.', 'rm', 'Désinstaller l\'ancienne');
    case 'incompatible': return R('Pas pour ce téléphone', 'Android dit que cette version de ' + T + ' ne marche pas sur ce téléphone. La version de la borne, elle, marche !', 'web', 'Jouer à la version de la borne', false);
    case 'dm': return R('Téléchargements désactivés', 'Le « Gestionnaire de téléchargement » d\'Android est désactivé : réactive-le dans Paramètres › Applications, puis réessaie.');
    case 'fiche': return R('Petit souci de notre côté', 'La fiche de l\'appli ' + T + ' n\'est pas bonne. En attendant, joue à la version de la borne.', 'web', 'Jouer à la version de la borne', false);
    default: return R('L\'installation n\'a pas abouti', 'Android n\'a pas installé ' + T + '. On réessaie ?');
  }
}
const NAT_STEP = { download: 0, verify: 1, ready: 2, prepare: 2, install: 2, confirm: 2, done: 3 };
function nativeRender(ev) {
  const g = NAT.g, i = NAT.info; if (!g || !i || !NAT.open) return;
  const st = ev.state, upd = NAT.kind === 'update', T = g.title, vn = i.versionName ? ' ' + i.versionName : '';
  const card = $('jdw-natif').querySelector('.natif-card');
  NAT.ui = st; NAT.ev = ev; nativeKeep();
  let h = '', sub = '', msg = '', bad = false, pct = -1, meta = '', indet = false, paused = false;
  let go = '', goTxt = '', later = 'close', laterTxt = 'Plus tard', perm = false, ask = false, web = false, stop = false;
  switch (st) {
    case 'data': h = T + ' en vraie appli'; sub = 'Tu es sur les données mobiles et l\'appli pèse ' + natMo(i.size) + ' : le Wi-Fi, c\'est mieux.';
      go = 'dl'; goTxt = 'Télécharger quand même'; later = 'wifi'; laterTxt = 'J\'attendrai le Wi-Fi'; web = true; break;
    case 'update': h = T + vn + ' est arrivé !'; sub = 'Mise à jour de ' + natMo(i.size) + (ev.metered ? ' (tu es sur les données mobiles)' : '') + ', puis ' + T + ' s\'ouvre comme d\'habitude.';
      go = 'dl'; goTxt = 'Mettre à jour'; later = 'old'; laterTxt = 'Jouer'; break;
    case 'replace': h = 'Une ancienne version est là'; sub = 'Ce téléphone a une version d\'essai de ' + T + ' qu\'Android refuse de remplacer. Désinstalle-la (ses réglages d\'essai partiront) : la vraie s\'installe juste après.';
      go = 'rm'; goTxt = 'Désinstaller l\'ancienne'; break;
    case 'broken': h = T + ' ne s\'ouvre pas'; sub = 'L\'appli est sur le téléphone mais Android ne la lance pas. On la réinstalle ?'; go = 'dl'; goTxt = 'Réinstaller'; web = true; break;
    case 'download': {
      h = upd ? 'Mise à jour de ' + T + '…' : T + ' s\'installe…';
      sub = upd ? 'Version' + vn + ' · ' + natMo(i.size) : 'Une seule fois : ensuite, ' + T + (NATIVE_HUB.has(g.id) ? ' s\'ouvre d\'un toucher sur « Jouer ».' : ' s\'ouvre directement depuis sa tuile.');
      const tot = +ev.total || +i.size, done = Math.min(+ev.done || 0, tot);
      pct = tot ? done / tot : 0;
      if (+ev.dl === 4) { paused = true; meta = +ev.reason === 3 ? 'En attente du Wi-Fi…' : +ev.reason === 2 ? 'En attente du réseau…' : 'Nouvel essai dans un instant…'; }
      else if (+ev.dl === 1 && !done) meta = 'Ça démarre…';
      else meta = natMo(done) + ' / ' + natMo(tot) + nativeSpeed(done, tot);
      perm = ev.perm === false; stop = true; laterTxt = 'Fermer'; break;
    }
    case 'verify': h = upd ? 'Mise à jour de ' + T + '…' : T + ' s\'installe…'; sub = 'On vérifie que le fichier est intact…';
      pct = +ev.total ? +ev.done / +ev.total : 1; meta = 'Vérification'; perm = ev.perm === false; laterTxt = 'Fermer'; break;
    case 'ready': h = 'Plus qu\'une étape !'; pct = 1; meta = 'Téléchargé ✓';
      if (ev.perm === false) { perm = true; sub = 'Android doit d\'abord autoriser la borne à installer des applis (une seule fois).'; }
      else { sub = T + ' est téléchargé et vérifié.'; go = 'retry'; goTxt = upd ? 'Mettre à jour' : 'Installer'; }
      break;
    case 'prepare': h = 'Installation…'; sub = 'On prépare l\'installation…'; pct = +ev.total ? +ev.done / +ev.total : 0; meta = 'Préparation'; laterTxt = 'Fermer'; break;
    case 'install': h = 'Installation…'; sub = 'Android installe ' + T + '…'; indet = true; meta = upd ? 'Mise à jour en cours' : 'Installation en cours'; laterTxt = 'Fermer'; break;
    case 'confirm': h = 'À toi de toucher !'; ask = true; laterTxt = 'Fermer'; if (!NAT.confirmAt) NAT.confirmAt = Date.now(); break;
    case 'done': h = upd ? T + ' est à jour !' : T + ' est installé !'; sub = NATIVE_HUB.has(g.id) ? 'Désormais, « Jouer » ouvre directement l\'appli (ici, ou son icône sur le téléphone).' : 'Désormais, sa tuile ouvre directement l\'appli.'; go = 'play'; goTxt = 'Jouer à ' + T; laterTxt = 'Fermer'; break;
    case 'cancel': h = 'Installation annulée'; sub = 'Pas de souci : ' + T + ' est déjà téléchargé, il ne reste qu\'à l\'installer.'; go = 'retry'; goTxt = upd ? 'Mettre à jour' : 'Installer'; web = !upd; break;
    case 'error': { const e = nativeErr(ev); h = e.h; sub = e.sub; go = e.go; goTxt = e.goTxt; web = e.web && !upd; bad = true; break; }
    default: return;
  }
  if (upd && NAT.inst && /^(error|cancel)$/.test(st)) { later = 'old'; laterTxt = 'Jouer'; }   // mise à jour ratée : on joue avec la version installée
  if (NAT.hub) { web = false; if (go === 'web') go = ''; }   // feuille ouverte depuis le hub du jeu : on y est déjà
  card.dataset.step = st;
  $('jdw-natif-eyebrow').textContent = (upd ? 'Mise à jour · ' : 'Appli Android · ') + natMo(i.size);
  $('jdw-natif-h').textContent = h;
  $('jdw-natif-sub').textContent = sub; $('jdw-natif-sub').hidden = !sub; $('jdw-natif-sub').classList.toggle('bad', bad);
  const prog = $('jdw-natif-prog');
  prog.hidden = !(pct >= 0 || indet); prog.classList.toggle('indet', indet); prog.classList.toggle('paused', paused);
  if (pct >= 0) { const p = Math.max(0, Math.min(1, pct)); $('jdw-natif-fill').style.setProperty('--p', (p * 100).toFixed(1) + '%'); $('jdw-natif-pct').textContent = Math.floor(p * 100) + ' %'; }
  else $('jdw-natif-pct').textContent = '';
  $('jdw-natif-info').textContent = meta;
  const at = NAT_STEP[st], steps = $('jdw-natif-steps');
  steps.hidden = at === undefined;
  steps.querySelectorAll('li').forEach((li, n) => { li.classList.toggle('ok', n < at); li.classList.toggle('on', n === at); });
  $('jdw-natif-perm').hidden = !perm;
  $('jdw-natif-perm-t').textContent = st === 'download' || st === 'verify' ? 'Pendant ce temps : autorise la borne' : 'Une seule fois : autorise la borne';
  $('jdw-natif-ask').hidden = !ask;
  if (ask) {
    const w = upd ? 'Mettre à jour' : 'Installer';
    $('jdw-natif-asktxt').textContent = ''; $('jdw-natif-asktxt').append('Android te demande : touche ', Object.assign(document.createElement('b'), { textContent: '« ' + w + ' »' }), '.');
    $('jdw-natif-mk-q').textContent = upd ? 'Voulez-vous installer une mise à jour de cette application ?' : 'Voulez-vous installer cette application ?';
    $('jdw-natif-mk-b').textContent = w;
    const late = Date.now() - NAT.confirmAt > 8000; $('jdw-natif-again').hidden = !late;
    if (!late) { clearTimeout(NAT.againT); NAT.againT = setTimeout(() => { if (NAT.open && NAT.ui === 'confirm') $('jdw-natif-again').hidden = false; }, 8200 - (Date.now() - NAT.confirmAt)); }
  } else NAT.confirmAt = 0;
  const m = $('jdw-natif-msg'); m.hidden = !msg; m.textContent = msg;
  NAT.go = go; NAT.later = later;
  const gb = $('jdw-natif-go'); gb.hidden = !go; gb.textContent = goTxt;
  $('jdw-natif-later').textContent = laterTxt;
  $('jdw-natif-web').hidden = !web; $('jdw-natif-stop').hidden = !stop;
  card.querySelector('.natif-foot').classList.toggle('empty', !web && !stop);
  if (st === 'done' && NAT.party !== natSha(i)) { NAT.party = natSha(i); nativeConfetti(); try { sting('win', 0.7); } catch (e) {} }
}
function nativeConfetti() {
  const box = $('jdw-natif').querySelector('.natif-confetti'), C = ['#ffd34d', '#ffb46a', '#ff6fa8', '#5ef0ff', '#4cc36a', '#fff3c4'];
  box.textContent = '';
  for (let n = 0; n < 28; n++) {
    const e = document.createElement('i');
    e.style.cssText = '--x:' + (3 + shellRand() * 94).toFixed(1) + '%;--c:' + C[n % C.length] + ';--dx:' + Math.round(shellRand() * 90 - 45) + 'px;--r:' + Math.round(shellRand() * 720 - 360) + 'deg;--w:' + (shellRand() * 0.45).toFixed(2) + 's';
    box.appendChild(e);
  }
}
// le décor du jeu (son aperçu de tuile) en grand en haut de la feuille
function nativeHero() {
  const c = $('jdw-natif-cv'), g = NAT.g; let last = 0;
  cancelAnimationFrame(NAT.raf);
  const step = ts => {
    if (!NAT.open) return;
    NAT.raf = requestAnimationFrame(step);
    if (ts - last < 32 || document.hidden) return;
    last = ts;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d'); ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    try { g.preview(ctx, w, h, ts / 1000); } catch (e) { ctx.fillStyle = '#1d1838'; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
  };
  NAT.raf = requestAnimationFrame(step);
}
// la tuile dit « 📲 Appli » quand l'appli est installée, « Mise à jour » quand une nouvelle version attend
function nativeChips() {
  if (!NAT.b) return;
  for (const t of tiles) {
    if (!NATIVE_APPS[t.g.id]) continue;
    const info = store.get('jdw.natif.' + t.g.id, null), inst = nativeOk(info) && store.get('jdw.natif.mode', 'auto') !== 'web' ? nativeInstalled(info) : null;
    let c = t.el.querySelector('.tile-natif');
    if (!inst) { if (c) c.hidden = true; continue; }
    if (!c) { c = document.createElement('span'); c.className = 'tile-natif'; (t.el.querySelector('.tile-img') || t.el).appendChild(c); }
    const maj = +inst.versionCode < +info.versionCode;
    c.hidden = false; c.classList.toggle('maj', maj); c.textContent = maj ? 'Mise à jour' : '📲 Appli';
  }
}
// nouvelles de l'appli Android (Natif.java) : progression, écran d'Android, fin, erreurs, retour dans la borne (resumed)
window.JDWAndroidEvent = ev => {
  try {
    if (!ev || typeof ev !== 'object') return;
    if (ev.state === 'tts' || ev.state === 'stt') { for (const f of NATV.subs) { try { f(ev); } catch (e) {} } return; }   // voix (1.9) : jamais vers la feuille d'installation
    if (ev.resumed) nativeChips();
    if (ev.resumed || /^(done|idle|cancel|error|ready)$/.test(ev.state || '')) setTimeout(natNotify, 0);   // la carte du hub se remet à jour
    const i = NAT.info;
    if (!i) return;
    if (NAT.open && NAT.ui === 'replace') { if (ev.resumed && !nativeInstalled(i)) { NAT.kind = 'install'; nativeGo(); } return; }   // ancienne version partie : la vraie arrive
    if ((ev.pkg && ev.pkg !== i.pkg) || (ev.sha && ev.sha !== natSha(i))) return;
    if (ev.state === 'openfail') { if (NAT.g) nativeSheet('broken', NAT.inst); return; }
    if (ev.state === 'settingsfail') { if (NAT.open) { const m = $('jdw-natif-msg'); m.hidden = false; m.textContent = 'Ouvre toi-même Paramètres › Applications › Borne d\'arcade › Installer des applis inconnues.'; } return; }
    if (ev.state === 'done') nativeChips();
    if (!NAT.open) {
      if (ev.state === 'ready' && !ev.auto && NAT.readyToast !== natSha(i) && NAT.g) { NAT.readyToast = natSha(i); toastCheer(NAT.g.title + ' est prêt : touche sa tuile !', null, true); }
      return;
    }
    if (ev.state === 'idle') { if (NAT_FLOW.test(NAT.ui)) nativeClose(true); return; }                                 // tout a été annulé
    if (/^(data|update|broken)$/.test(NAT.ui) && (ev.resumed || !NAT_FLOW.test(ev.state))) return;                       // une question est posée
    nativeRender(ev);
  } catch (e) { reportError('Appli native : ' + e.message, e.stack, { quiet: true }); }
};
$('jdw-natif-go').addEventListener('click', () => {
  const a = NAT.go, i = NAT.info; if (!i) return;
  try { Audio.ensure(); } catch (e) {}
  if (a === 'dl') nativeGo();
  else if (a === 'retry') { const j = nativeJob(); if (j.state === 'idle' || j.sha !== natSha(i)) nativeGo(); else { try { NAT.b.retryInstall(); } catch (e) {} } }
  else if (a === 'play') nativeLaunch();
  else if (a === 'rm') { try { NAT.b.uninstall(i.pkg); } catch (e) {} }
  else if (a === 'web') { const g = NAT.g; nativeClose(true); if (g) openGame(g, true); }
});
$('jdw-natif-later').addEventListener('click', () => {
  if (NAT.later === 'old') { nativeLaunch(); nativeClose(true); return; }   // mise à jour plus tard : l'appli installée s'ouvre
  if (NAT.later === 'wifi') { nativeClose(true); if (NAT.g) toastCheer('D\'accord : touche ' + NAT.g.title + ' en Wi-Fi', null, true); return; }
  nativeClose();
});
$('jdw-natif-perm-go').addEventListener('click', () => { try { NAT.b.openInstallSettings(); } catch (e) {} });
$('jdw-natif-again').addEventListener('click', () => { NAT.confirmAt = Date.now(); $('jdw-natif-again').hidden = true; try { NAT.b.retryInstall(); } catch (e) {} });
$('jdw-natif-web').addEventListener('click', () => { const g = NAT.g; nativeClose(true); if (g) openGame(g, true); });
$('jdw-natif-stop').addEventListener('click', () => { try { NAT.b.cancelInstall(); } catch (e) {} nativeClose(true); });
$('jdw-natif').addEventListener('click', e => { if (e.target === $('jdw-natif')) nativeClose(); });
// au démarrage de la borne (appli 1.8+) : étiquettes des tuiles, fiche relue en douce, feuille rouverte si une installation était en route
// (le localStorage de la WebView peut perdre ses dernières écritures si Android tue la borne : l'état gardé par l'appli fait foi —
// auto = la feuille était ouverte, t = dernier changement)
function nativeBoot() {
  if (!NAT.b) return;
  nativeChips();
  for (const id of Object.keys(NATIVE_APPS)) if (gameById(id)) nativeInfo(id).then(nativeChips).catch(() => {});
  const o = store.get('jdw.natif.open', null), j = nativeJob();
  const id = (o && o.id) || Object.keys(NATIVE_APPS).find(k => { const i = store.get('jdw.natif.' + k, null); return i && i.pkg === j.pkg; }) || Object.keys(NATIVE_APPS).find(k => gameById(k));
  const g = id && gameById(id), now = Date.now();
  const wanted = (o && now - (+o.t || 0) < 30 * 60e3) || (j.auto && now - (+j.t || 0) < 6 * 3600e3);
  if (g && wanted && NAT_FLOW.test(j.state)) setTimeout(() => { if (!NAT.open) nativeOpen(g); }, 700);
  else if (o) store.set('jdw.natif.open', null);
}

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
    celebrate: (text, name) => { if (current && current.seq === seq) toastCheer(text, name); },
    profilePhoto: { info: gamePhotoInfo, set: (data, scope) => gameSetPhoto(data, scope) },   // Pégase : l'avatar en photo de profil
    pegase: g.id === 'pegase' ? pegaseApi() : undefined,                                     // Pégase (hub) : copains, garde-robe sur le serveur
    natif: NATIVE_APPS[g.id] ? nativeApi(g) : undefined,                                    // appli native (Android 1.8+) : carte « Android » du hub (Ajout 9)
    pad: PAD_DOM.has(g.id) ? undefined : padApi({ intro: () => { if (current && current.seq === seq) padIntro(g, null, true); } }),   // manettes (Ajout 10) : toutes pour le joueur
    rhythm: rhythmApi(() => !!current && current.seq === seq),   // jeu de rythme : son morceau à lui, calé sur la partie (Ajout 11)
    gameOver(score) {
      if (!current || current.seq !== seq || current.over) return;
      current.over = true;
      try { if (api.pad) api.pad.rumble('over'); } catch (e) {}
      const sc = Math.max(0, Math.floor(+score || 0));
      setTimeout(() => { if (current && current.seq === seq) showEnd(sc); }, 900);
    }
  };
  current = { game: g, root, seq, over: false, inst: null, lvBase: lvBest(profile.name, g.id), pad: api.pad };
  recReset(); setTimeout(recLine, 50);
  musicBaseLevel(0.8); MUS.override = false; setMusic(g.id);
  try { current.inst = g.mount(root, api) || {}; } catch (e) { current.inst = {}; reportError('Lancement de ' + g.id + ' : ' + e.message, e.stack); }
  setWhere(g.id);
  if (LANDSCAPE.has(g.id)) fsTip();   // iPhone dans Safari : astuce « Sur l'écran d'accueil » (une seule fois)
  if (!PAD_DOM.has(g.id)) padIntro(g);
}
function unmountGame() {
  if (!current) return;
  castEndAll();
  const { game, root, inst } = current;
  padClose(current.pad); padPauseClose(false); padIntroHide(); quitAskHide();
  try { inst && inst.destroy && inst.destroy(); } catch (e) {}
  if (RHY.src || RHY.t0 != null) rhythmStop(0.3);
  if (game.external) root.hidden = true; else root.remove();
  current = null;
  $('jdw-cheer').hidden = true; $('jdw-rescue').hidden = true;
}
const LANDSCAPE = new Set(['pleingaz', 'canards', 'rouleaux', 'neon']);
const portraitMQ = matchMedia('(orientation: portrait) and (max-width: 900px)');
let waitRotate = null;
function openGame(g, web) {
  if (!web && nativeFor(g) && !NATIVE_HUB.has(g.id)) { nativeOpen(g); return; }   // appli Android 1.8+ : jeu en vraie appli (section « Applis natives ») ; Pégase : par son hub
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
  try { coopReset(); } catch (e) {}
  $('jdw-end').hidden = true; $('jdw-play').hidden = true; $('jdw-lib').hidden = false;
  setWhere('menu'); refreshAll(); musicBaseLevel(1); MUS.override = false; setMusic('accueil');
  fsLeave();
  if (siteNew) setTimeout(maybeReload, 800);
}
// Quitter en pleine partie : le score en cours compte comme une fin de partie (record enregistré s'il est battu)
function quitGame() {
  padPauseClose(false);
  if (current && current.coop) { coopQuit(); return; }
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
/* ---------- « Quitter la partie ? » (#jdw-quitask) ----------
   Un toucher par mégarde sur ✕ (en haut, là où pose le pouce, surtout en paysage où ✕ est dans le coin), le retour d'Android ou le B de
   la manette hors du jeu ne font plus sortir d'une partie EN COURS : le jeu se met en pause et on demande « Quitter la partie ? »
   (« Continuer » en grand et choisi d'avance : Entrée, Échap, A sur le halo doré, toucher à côté ; « Quitter » plus petit, en rouge).
   Coop : la pause est commune (le copain voit « X a mis la pause ») et on prévient « Ton copain X restera seul ». Hors partie
   (écran de fin, « tourne ton téléphone », hub de Pégase) : ✕ quitte tout de suite, comme avant. Les cartes Pause gardent leur Quitter. */
const QA = { open: false, coop: false, was: false };
function quitInGame() {
  if ($('jdw-play').hidden || !current || waitRotate) return false;
  if (current.coop) return !COOP.over && $('jdw-coopend').hidden;
  if (current.over || !current.inst || PAD_DOM.has(current.game.id) || current.game.noScore) return false;
  return $('jdw-end').hidden;
}
function quitAsk() {
  if (QA.open) return;
  if (!quitInGame()) { quitGame(); return; }
  QA.open = true; QA.coop = !!current.coop;
  padIntroHide(); $('jdw-soundmenu').hidden = true; $('jdw-mute').setAttribute('aria-expanded', 'false');
  const sub = $('jdw-quitask-sub');
  if (QA.coop) {
    QA.was = !!COOP.paused;
    if (!COOP.paused) coopPause('me');
    $('jdw-coop-pause').hidden = true;
    sub.textContent = COOP.mode === 'net' ? 'Ton copain ' + dispName(COOP.mate) + ' restera seul : la partie s\'arrêtera pour vous deux.' : 'La partie avec le robot s\'arrêtera.';
  } else {
    QA.was = false;
    if (PADP.open) { PADP.open = false; $('jdw-padpause').hidden = true; }   // déjà en pause (Start) : on reste en pause
    else { try { const inst = current.inst; if (inst.pause) inst.pause(); else padKey('p'); } catch (e) {} }
    musicBaseLevel(0.4);
    let sc = 0; try { sc = Math.max(0, Math.floor(+current.inst.currentScore() || 0)); } catch (e) {}
    sub.textContent = sc > 0 ? 'Ta partie est en pause. Si tu quittes, ton score de ' + fmt(sc) + ' compte.' : 'Ta partie est en pause.';
  }
  try { if (current.pad) current.pad.flush(); } catch (e) {}
  $('jdw-quitask').style.setProperty('--acc', (QA.coop ? COOP.e && COOP.e.accent : current.game.accent) || COLORS.amber);
  $('jdw-quitask').hidden = false;
  setTimeout(() => { if (!QA.open) return; $('jdw-quitask-stay').focus({ preventScroll: true }); if (PADJ) PADJ.autoFocus(); }, 40);
}
function quitAskHide() { if (!QA.open) return false; QA.open = false; $('jdw-quitask').hidden = true; if (PADJ) PADJ.blur(true); return true; }
function quitAskClose(go) {
  if (!quitAskHide()) return;
  if (go) { quitGame(); return; }   // (coop : coopQuit, l'hôte ou l'invité prévient le copain)
  if (!current) return;
  if (QA.coop) { if (COOP.over) return; if (QA.was) $('jdw-coop-pause').hidden = !COOP.paused; else coopResume('me'); return; }
  musicBaseLevel(0.8);
  try { if (current.pad) current.pad.flush(); } catch (e) {}   // le A sur « Continuer » n'arrive pas au jeu
  try { const inst = current.inst; if (inst && !current.over) { if (inst.resume) inst.resume(); else padKey('p'); } } catch (e) {}
}
$('jdw-back').addEventListener('click', e => { e.preventDefault(); quitAsk(); });
$('jdw-quitask-stay').addEventListener('click', () => quitAskClose(false));
$('jdw-quitask-quit').addEventListener('click', () => quitAskClose(true));
$('jdw-quitask').addEventListener('click', e => { if (e.target === $('jdw-quitask')) quitAskClose(false); });   // toucher à côté = continuer
// clavier : rien n'arrive au jeu pendant la question ; Entrée / Espace = le bouton choisi (Continuer d'avance), Échap = Continuer, flèches / Tab = changer
for (const t of ['keydown', 'keyup']) addEventListener(t, e => {
  if (!QA.open) return;
  e.stopImmediatePropagation();
  if (t === 'keyup') return;
  const stay = $('jdw-quitask-stay'), go = $('jdw-quitask-quit'), onGo = document.activeElement === go;
  if (e.key === 'Tab' || /^Arrow/.test(e.key)) { e.preventDefault(); (onGo ? stay : go).focus({ preventScroll: true }); return; }
  e.preventDefault();
  if (e.repeat) return;
  if (e.key === 'Escape' || e.key === 'Backspace') quitAskClose(false);
  else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') quitAskClose(onGo);
}, true);
$('jdw-tolib').addEventListener('click', backToLibrary);
$('jdw-again').addEventListener('click', () => { flushPending(); if (!current || current.coop) return; const g = current.game; unmountGame(); $('jdw-end').hidden = true; Audio.ensure(); mountGame(g); });
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
// dans le geste même : openGame, openDuo, duel en ligne (netCreate chez l'hôte, netJoin chez l'invité). Les jeux en paysage verrouillent
// ensuite l'écran à l'horizontale
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
  if (current && current.coop && !$('jdw-play').hidden) { coopRecLine(el); return; }
  if (!current || $('jdw-play').hidden || !$('jdw-end').hidden || isGuest() || current.game.noScore) { el.hidden = true; return; }   // invité : pas de classement ; noScore : page sans score (hub de Pégase)
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
  if (!(lv >= 1) || isGuest()) return;
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
  quitAskHide();
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
    s = 'Tu y entres avec ton joueur ' + me + ' : classement, chat, duels et parties à deux avec les copains de la salle.';
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
  },
  // Magic Force (games/magic.js, jeu 3D) : le donjon du mage, 6 salles par monde (4 salles de combat, le MINI-BOSS dans la 5e, le BOSS dans
  // la 6e), 6 mondes TOUS DIFFÉRENTS (la Crypte oubliée, les Forges ardentes, les Grottes de glace, le Jardin maudit, la Tour du sorcier, la
  // Salle du trône) : 36 salles, puis la grande victoire (plus de Tour II). Le jeu ne fournit que worlds / worldOf / drawWorldIcon : la carte
  // est dessinée ICI (fonctions mf… plus bas) : chaque salle vue de dessus (dalles, murs, torches, décor de la salle), une porte entre deux
  // salles, une grande arche entre deux mondes ; médaillons des salles et des mini-boss, les six boss (le Gardien de pierre, Braise, Givre,
  // le Vieux Chêne, le Grand Œil, le Seigneur des ombres — couronné : le dernier), le mage au départ.
  magic: {
    theme: 'magic', word: 'Salle', tierGap: 200, majorGap: 330, tierAt: 0.5, step: 176, nodeSize: 58, bossSize: 70, bgDpr: 1.6, lazy: true,
    game() { const G = window.JDW_GAMES && window.JDW_GAMES.magic; return G && Array.isArray(G.worlds) && G.worlds.length && typeof G.worldOf === 'function' ? G : null; },
    nw() { const G = this.game(); return G ? G.worlds.length : 6; },
    per() { const G = this.game(); return (G && G.levelsPerWorld) || 6; },
    count() { return this.nw() * this.per(); },      // 36 salles : la partie s'arrête après le 6e boss (plus de tour)
    wo(lv) {
      const G = this.game();
      if (G) { try { const o = G.worldOf(lv); if (o && o.world) return o; } catch (e) {} }
      const per = this.per(), nw = this.nw(), i = Math.min(nw * per, Math.max(1, lv)) - 1, wi = Math.floor(i / per);
      return { w: wi, n: wi + 1, tour: 0, stage: i % per, boss: i % per === per - 1, mini: per > 3 && i % per === per - 2, world: null };
    },
    level(lv) {
      const wo = this.wo(lv), D = wo.world;
      return { lv, tier: wo.tour * this.nw() + wo.w, w: wo.w, tour: wo.tour, stage: wo.stage, boss: !!wo.boss, mini: !!wo.mini, wid: D ? D.id : '',
        kicker: 'Salle ' + lv + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : ''), name: D && D.rooms && D.rooms[wo.stage] ? D.rooms[wo.stage] : 'Salle ' + lv,
        lines: [mfLine(wo)].filter(Boolean), acc: D ? D.colors.accent : '#9b7bff' };
    },
    short(lv) { const wo = this.wo(lv); return 'Salle ' + lv + (wo.world ? ' · ' + wo.world.name : '') + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : ''); },
    boss(lv) {
      const wo = this.wo(lv), D = wo.world; if (!wo.boss || !D || !D.boss) return null;
      return { lv, bk: D.boss.key, wid: D.id, name: D.boss.name, final: wo.w === this.nw() - 1,
        kicker: (wo.tour ? 'Tour ' + mapRoman(wo.tour) + ' · ' : '') + 'Fin ' + mfDe(D.name) };
    },
    tier(t) {
      const G = this.game(), nw = this.nw(), w = t % nw, tour = Math.floor(t / nw), D = G ? G.worlds[w] : null;
      return { kicker: (tour ? 'Tour ' + mapRoman(tour) + ' · ' : '') + 'Monde ' + (w + 1), title: D ? D.name : 'Monde ' + (w + 1),
        icon: G && typeof G.drawWorldIcon === 'function' ? (x, r) => G.drawWorldIcon(x, w + 1, 0, 0, r) : null, emoji: D ? D.emoji : '',
        sub: D && D.boss ? (D.rooms ? D.rooms.length + ' salles · ' : '') + 'Boss : ' + mfArt(D.boss.name) : '',
        acc: D ? D.colors.accent : '#9b7bff', acc2: D ? D.colors.accent2 : '#ffd36a', w, tour,
        major: w === 0 && tour > 0, majorTitle: 'Tour ' + mapRoman(tour), majorSub: 'Le portail ramène au début du donjon, en plus fort !' };
    },
    stops(L) { return mfStops(L, this); },
    paint(x, L, W, y0, h) { mfPaint(x, L, W, y0, h, this); },
    node(x, info, size, P) { mfNode(x, info, size, P, this); },
    bossArt(x, bi, size, P) { mfBoss(x, bi, size, P, this); },
    startArt(x, P) { mfMage(x, P); },
    warm(L, bgDpr, dpr) { mfWarm(L, bgDpr, dpr, this); },
    start: { title: 'Départ', sub: 'Le mage entre dans le donjon' },
    get cap() { return { title: 'Le royaume est sauvé !', sub: 'Après le Seigneur des ombres : la grande victoire' }; }
  },
  // Smoothie Samouraï (games/smoothie.js) : 6 mondes de 3 niveaux (le Verger, la Plage, le Dojo, le Marché de nuit, le Volcan, le Cosmos),
  // le 3e niveau = le fruit géant du monde, puis le Tour II, III… plus rapide. Décor de chaque monde (le même que dans le jeu), médaillons
  // (le fruit du niveau, entier ou coupé), boss (le fruit géant et sa parure) et sabre du départ : le jeu (JDW_GAMES.smoothie.mapArt).
  smoothie: {
    theme: 'smoothie', word: 'Niveau', tierGap: 150, majorGap: 250, tierAt: 0.55, step: 150, nodeSize: 56, bossSize: 64, bgDpr: 1.6, lazy: true,
    count: max => Math.min(180, Math.max(18, Math.ceil((max + 2) / 18) * 18)),
    game() { const G = window.JDW_GAMES && window.JDW_GAMES.smoothie; return G && Array.isArray(G.worlds) && G.worldOf && G.mapArt ? G : null; },
    wo(lv) { const G = this.game(); return G ? G.worldOf(lv) : { w: Math.floor((lv - 1) / 3) % 6, tour: Math.floor((lv - 1) / 18), stage: (lv - 1) % 3, boss: (lv - 1) % 3 === 2, world: null }; },
    level(lv) {
      const G = this.game(), wo = this.wo(lv), D = wo.world, m = G ? G.mapArt.level(lv) : null;
      return { lv, tier: wo.tour * 6 + wo.w, w: wo.w, tour: wo.tour, stage: wo.stage, boss: !!wo.boss,
        kicker: 'Niveau ' + lv + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : ''), name: m ? m.name : 'Niveau ' + lv,
        lines: m && m.line ? [m.line] : [], acc: D ? D.colors.accent : '#ff5a8a' };
    },
    short(lv) { const wo = this.wo(lv); return 'Niveau ' + lv + (wo.world ? ' · ' + wo.world.name : '') + (wo.tour ? ' · Tour ' + mapRoman(wo.tour) : ''); },
    boss(lv) {
      const wo = this.wo(lv); if (!wo.boss) return null;
      const D = wo.world;
      return { lv, bk: D ? D.boss.key : 'roi', name: (D ? D.boss.name : 'Le fruit géant') + (wo.tour ? ' ' + mapRoman(wo.tour) : ''), final: wo.w === 5,
        kicker: (wo.tour ? 'Tour ' + mapRoman(wo.tour) + ' · ' : '') + 'Fin du monde ' + (wo.w + 1) };
    },
    tier(t) {
      const G = this.game(), w = t % 6, tour = Math.floor(t / 6), D = G ? G.worlds[w] : null;
      return { kicker: (tour ? 'Tour ' + mapRoman(tour) + ' · ' : '') + 'Monde ' + (w + 1) + (D ? ' · ' + D.when : ''), title: D ? D.name : 'Monde ' + (w + 1),
        icon: G && G.drawWorldIcon ? (x, r) => G.drawWorldIcon(x, w + 1, 0, 0, r) : null, emoji: D ? D.emoji : '',
        sub: D ? D.tag + '. Boss : ' + D.boss.name.replace(/^./, c => c.toLowerCase()) + '.' : '',
        acc: D ? D.colors.accent : '#ff5a8a', acc2: D ? D.colors.accent2 : '#ffd34d', w, tour,
        major: w === 0 && tour > 0, majorTitle: 'Tour ' + mapRoman(tour), majorSub: 'Les 6 mondes reviennent, encore plus vite !' };
    },
    stops(L) { const G = this.game(); return G ? G.mapArt.stops(L) : [[L.H, '#ffb98a'], [0, '#05030f']]; },
    paint(x, L, W, y0, h) { const G = this.game(); if (G) G.mapArt.paint(x, L, W, y0, h); },
    node(x, info, size, P) { const G = this.game(); if (G) G.mapArt.node(x, info, size, P); },
    bossArt(x, bi, size, P) { const G = this.game(); if (G) G.mapArt.boss(x, bi, size, P); },
    startArt(x, P) { const G = this.game(); if (G && G.mapArt.start) G.mapArt.start(x, P); },
    warm(L, bgDpr, dpr) { const G = this.game(); if (G && G.mapArt.warm) G.mapArt.warm(L, bgDpr, dpr, { node: this.nodeSize, boss: this.bossSize }); },
    start: { title: 'Départ', sub: 'Le samouraï sort son sabre' },
    cap: { title: 'Le festin continue…', sub: 'Un nouveau tour tous les 18 niveaux, toujours plus vite' }
  }
};

// ---------------------------------------------------------------------------------------------------------------------------------
// Magic Force : la carte du donjon, dessinée par la bibliothèque (MAP_DEFS.magic ; le jeu 3D n'a pas de dessin 2D à prêter). Vue de
// dessus, comme la caméra du jeu : dalles hexagonales, murs de pierre, torches ; chaque salle a son décor (6 salles par monde : 4 salles
// de combat, la salle du MINI-BOSS, la salle du BOSS) dans la Crypte oubliée, les Forges ardentes, les Grottes de glace (torches
// bleues, cristaux, givre), le Jardin maudit (mousse, champignons qui luisent, mare aux crapauds, ruches), la Tour du sorcier (grimoires,
// boules de cristal, fenêtres sur les étoiles, laboratoire) et la Salle du trône (tapis rouge, banquet, trésors, le trône) ; une porte
// (herse levée, chevrons dorés) entre deux salles, une arche à braseros entre deux mondes ; tout en haut, le royaume sauvé. Médaillons des salles et des mini-boss (anneau rouge à pointes), boss et mage : en code aussi.
// Un monde que la carte ne connaît pas encore prend ses couleurs dans JDW_GAMES.magic.worlds.
// ---------------------------------------------------------------------------------------------------------------------------------
const MF_T = Math.PI * 2;
const MF_LINES = {
  crypte: ['Les squelettes sortent de terre !', 'Les morts se relèvent des tombeaux', 'Chut… des squelettes dorment ici', 'Des grimoires partout', '', 'Le Gardien de pierre se réveille'],
  forge: ['La lave coule dans les forges !', 'Démons et diablotins de feu', 'Le métal en fusion coule à flots', 'Épées, haches et boucliers', '', 'Braise crache le feu du volcan'],
  glace: ['Il fait très, très froid…', 'Gare aux stalactites !', 'Des cristaux qui brillent', 'Le lac gelé craque sous tes pieds', '', 'Givre a trois têtes glacées'],
  jardin: ['Les champignons brillent dans le noir…', 'Des champignons géants partout', 'Les crapauds dorés bondissent', 'Bzzz… les bourdons cuirassés', '', 'Le Vieux Chêne se réveille'],
  tour: ['La tour flotte parmi les étoiles !', 'Des milliers de grimoires', 'Une lunette pour voir les étoiles', 'Des potions qui bouillonnent', '', 'Le Grand Œil voit tout'],
  trone: ['Le dernier combat !', 'Un banquet pour des géants', 'Des montagnes d’or', 'La garde du Seigneur', '', 'Le Seigneur des ombres sur son trône']
};
const MF_BOSS_SHORT = { golem: 'Le Gardien', dragon: 'Braise', hydre: 'Givre', ent: 'Le Vieux Chêne', oeil: 'Le Grand Œil', seigneur: 'Le Seigneur' };
const mfArt = (s) => String(s).replace(/^L(es|e|a) /, 'l$1 ').replace(/^L’|^L'/, 'l’');
const mfDe = (s) => { s = String(s); return /^Les /.test(s) ? 'des ' + s.slice(4) : /^Le /.test(s) ? 'du ' + s.slice(3) : /^La /.test(s) ? 'de la ' + s.slice(3) : /^L[’']/.test(s) ? 'de l’' + s.slice(2) : 'de ' + s; };
function mfLine(wo) {
  const D = wo.world; if (!D) return '';
  if (wo.mini && D.mini) return '⚔ Mini-boss : ' + mfArt(D.mini.name);
  if (wo.tour) return wo.boss ? '☠ ' + ((D.boss && MF_BOSS_SHORT[D.boss.key]) || D.boss.name) + ' revient, plus fort' : wo.stage === 0 ? '✦ Plus de monstres, points ×1,5' : '';
  const L = MF_LINES[D.id], t = L && L[wo.stage] ? L[wo.stage] : wo.boss ? D.boss.name + ' t’attend' : wo.stage === 0 ? D.news : '';
  return t ? (wo.boss ? '☠ ' : '✦ ') + t : '';
}
const mfHash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// les couleurs d'un monde : la crypte et les forges sont réglées à la main, les mondes à venir prennent les couleurs du jeu
const MF_FIRE = ['#fff6c8', '#ffcf4a', '#ff7a1f', 'rgba(255,90,20,0)'];
const MF_STYLE = {
  crypte: { floor: ['#ab9a83', '#9f8f79', '#b6a58d', '#958673'], grout: '#2b2530', wall: '#96909e', wall2: '#6a6474', wallDk: '#26222e', face: '#433d4d',
    void0: '#06040c', void1: '#1d1534', light: '#ffae52', dark: 'rgba(14,8,30,0.46)', kind: 'stone', flame: MF_FIRE },
  forge: { floor: ['#6c4335', '#603b2f', '#774b3b', '#56342a'], grout: '#150705', wall: '#7c4d3d', wall2: '#55322a', wallDk: '#1c0906', face: '#3a1c14',
    void0: '#0b0302', void1: '#2e0c05', light: '#ff8a3d', dark: 'rgba(34,8,2,0.40)', kind: 'lava', flame: MF_FIRE },
  glace: { floor: ['#9fbccd', '#93b1c3', '#acc8d8', '#89a7b9'], grout: '#1a2b3c', wall: '#b4d0e2', wall2: '#7896ae', wallDk: '#162536', face: '#34506a',
    void0: '#02070c', void1: '#0b2232', light: '#8fd8ff', dark: 'rgba(6,22,40,0.42)', kind: 'ice', flame: ['#ffffff', '#c8f4ff', '#4fb8ff', 'rgba(40,140,255,0)'] },
  jardin: { floor: ['#8e9a7c', '#839070', '#99a687', '#788568'], grout: '#1e2a18', wall: '#7d8f6a', wall2: '#56664a', wallDk: '#18220f', face: '#33402a',
    void0: '#020805', void1: '#0c2414', light: '#b8ff70', dark: 'rgba(6,20,8,0.42)', kind: 'swamp', flame: ['#f2ffd8', '#b8ff70', '#50d040', 'rgba(60,200,60,0)'] },
  tour: { floor: ['#9a96b0', '#8e8aa6', '#a6a2bc', '#84809c'], grout: '#1c1830', wall: '#7e78b4', wall2: '#544e8a', wallDk: '#141030', face: '#322c5a',
    void0: '#03020a', void1: '#160e34', light: '#c8a0ff', dark: 'rgba(14,8,40,0.42)', kind: 'stars', flame: ['#f8eeff', '#d0a8ff', '#8a50ff', 'rgba(140,80,255,0)'] },
  trone: { floor: ['#cdb48e', '#c1a882', '#d8c09a', '#b49c78'], grout: '#3a1a14', wall: '#8e3a3a', wall2: '#5e2224', wallDk: '#200608', face: '#40121a',
    void0: '#06010a', void1: '#22061e', light: '#ffc860', dark: 'rgba(30,6,10,0.40)', kind: 'shadow', flame: MF_FIRE }
};
function mfStyle(wid, def) {
  if (MF_STYLE[wid]) return MF_STYLE[wid];
  const G = def && def.game(), D = G ? G.worlds.find((d) => d.id === wid) : null, c = D ? D.colors : { accent: '#9b7bff', dark: '#0a0618', light: '#2a1a57' };
  const f = mixHex(c.light, '#a0a0a0', 0.5);
  return MF_STYLE[wid] = { floor: [f, mixHex(f, '#000000', 0.08), mixHex(f, '#ffffff', 0.07), mixHex(f, '#000000', 0.14)], grout: mixHex(c.dark, '#000000', 0.3),
    wall: mixHex(c.light, '#b0b0b0', 0.5), wall2: mixHex(c.light, '#606060', 0.4), wallDk: c.dark, face: mixHex(c.dark, '#808080', 0.25), void0: mixHex(c.dark, '#000000', 0.4), void1: c.dark,
    light: c.accent, dark: rgbaHex(c.dark, 0.42), kind: 'stone' };
}
function mfGeo(MW) { const wide = MW >= 600, RW = wide ? Math.min(MW - 56, 780) : MW, x0 = Math.round((MW - RW) / 2); return { x0, x1: x0 + RW, wt: wide ? 22 : 14, wide }; }
// où passe le chemin (courbes de la bibliothèque : M a C (a.x, mi) (b.x, mi) b) à la hauteur y → x
function mfPathX(L, y) {
  const pts = [L.start];
  for (const n of L.nodes) { pts.push(n); if (n.boss) pts.push(n.boss); }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (y > a.y || y < b.y) continue;
    const my = (a.y + b.y) / 2;
    let lo = 0, hi = 1;
    for (let k = 0; k < 22; k++) { const t = (lo + hi) / 2, u = 1 - t, yy = a.y * u * u * u + 3 * my * u * u * t + 3 * my * u * t * t + b.y * t * t * t; if (yy > y) lo = t; else hi = t; }
    const t = (lo + hi) / 2, u = 1 - t;
    return a.x * u * u * u + 3 * a.x * u * u * t + 3 * b.x * u * t * t + b.x * t * t * t;
  }
  return L.W / 2;
}
// une salle par niveau : du mur (ou de l'arche) du dessous au mur du dessus
function mfBands(L, def) {
  const N = L.nodes, out = [];
  const gateY = (nd) => { const t = L.tiers.find((q) => q.t === nd.info.tier); return t ? (t.T.major ? t.y + 214 : t.y + 74) : nd.y + 120; };
  for (let k = 0; k < N.length; k++) {
    const nd = N[k], st = nd.info.stage, nx = N[k + 1];
    const bot = k === 0 ? L.H : st === 0 ? gateY(nd) : (N[k - 1].y + nd.y) / 2;
    const top = !nx ? 0 : nx.info.stage === 0 ? gateY(nx) : (nd.y + nx.y) / 2;
    const entry = k === 0 ? 'start' : st === 0 ? (nd.info.w === 0 && nd.info.tour > 0 ? 'portal' : 'gate') : 'door';
    out.push({ k, nd, info: nd.info, wid: nd.info.wid, stage: st, tour: nd.info.tour, top, bot, entry, last: !nx });
  }
  return out;
}
function mfStops(L, def) {
  const st = [];
  for (const b of mfBands(L, def)) { const Y = mfStyle(b.wid, def); st.push([b.bot - 1, mixHex(Y.floor[3], '#000000', 0.35)], [b.top + 1, mixHex(Y.floor[0], '#000000', 0.3)]); }
  st.push([L.H, '#2a2430'], [0, '#05030a']);
  return st;
}
// ---- les dalles hexagonales du sol (chaque dalle sa nuance, un liseré clair en haut à gauche, les joints sombres) ----
function mfFloor(x, Y, gx0, gx1, top, bot) {
  // les dalles : une bande de 6 rangées dessinée une fois par monde (et par taille), posée autant de fois qu'il faut (rapide)
  const R = 21, hh = R * Math.sqrt(3), H6 = 6 * hh, k = Math.max(1, Math.min(2, Math.abs(x.getTransform().a) || 1));
  const st = mfFloorStrip(Y, Math.ceil(gx1) + 40, k);
  const sx = Math.max(0, Math.floor(gx0)), sw = Math.min(st.width / k, Math.ceil(gx1)) - sx;      // seulement entre les murs (sur PC, le vide reste noir)
  for (let y = Math.floor(top / H6) * H6; y < bot; y += H6) x.drawImage(st, sx * k, 0, sw * k, st.height, sx, y, sw, H6);
}
const MF_STRIP = new Map();
function mfFloorStrip(Y, w, k) {
  const key = Y.floor.join() + '|' + Math.ceil(w / 64) + '|' + k.toFixed(2);
  let cv = MF_STRIP.get(key);
  if (cv) return cv;
  if (MF_STRIP.size > 8) MF_STRIP.delete(MF_STRIP.keys().next().value);
  const R = 21, hw = R * 1.5, hh = R * Math.sqrt(3), H6 = 6 * hh, W = Math.ceil(w / 64) * 64;
  cv = document.createElement('canvas'); cv.width = Math.ceil(W * k); cv.height = Math.ceil(H6 * k);
  const x = cv.getContext('2d'); x.scale(k, k);
  const hex = (cx, cy, r) => { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); };
  const cells = [];
  for (let c = -1; c <= Math.ceil(W / hw) + 1; c++) for (let r = -1; r <= 6; r++) { const rr = ((r % 6) + 6) % 6; cells.push([c * hw, r * hh + (c & 1 ? hh / 2 : 0), Math.floor(mfHash(c * 7 + 3, rr * 13 + 1) * Y.floor.length), mfHash(c * 3 + 11, rr * 5 + 2)]); }
  for (let i = 0; i < Y.floor.length; i++) { x.fillStyle = Y.floor[i]; x.beginPath(); for (const q of cells) if (q[2] === i) hex(q[0], q[1], R); x.fill(); }
  x.save(); x.translate(1.3, 1.3); x.strokeStyle = 'rgba(255,240,220,0.16)'; x.lineWidth = 1.4; x.beginPath(); for (const q of cells) hex(q[0], q[1], R - 1); x.stroke(); x.restore();
  x.strokeStyle = Y.grout; x.lineWidth = 2.6; x.beginPath(); for (const q of cells) hex(q[0], q[1], R); x.stroke();
  x.fillStyle = 'rgba(0,0,0,0.10)';      // usure : quelques taches
  for (const q of cells) { const h = q[3]; if (h < 0.18) { x.beginPath(); x.ellipse(q[0] + (h - 0.09) * 60, q[1] + (h * 7 % 1 - 0.5) * 10, 5 + h * 20, 3 + h * 10, h * 6, 0, MF_T); x.fill(); } }
  MF_STRIP.set(key, cv);
  return cv;
}
// ---- un mur vu de dessus : la crête en blocs de pierre, l'ombre sur le sol ----
function mfWallV(x, Y, wx, top, bot, w, side) {
  // un mur de côté vu de dessus : la crête en blocs (lumière en haut), la face intérieure sombre, l'ombre sur le sol
  const inner = side < 0 ? wx + w : wx;
  const sg = x.createLinearGradient(inner, 0, inner - side * 40, 0); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = sg; x.fillRect(side < 0 ? inner : inner - 40, top, 40, bot - top);
  x.fillStyle = Y.face; x.fillRect(side < 0 ? inner : inner - 6, top, 6, bot - top);      // la face intérieure
  x.fillStyle = Y.wallDk; x.fillRect(wx, top, w, bot - top);
  const bh = 24;
  for (let y = Math.floor(top / bh) * bh; y < bot; y += bh) {
    const row = Math.round(y / bh), sh = mfHash(row, wx | 0);
    x.fillStyle = mixHex(Y.wall, Y.wall2, 0.2 + sh * 0.5); x.fillRect(wx + 1, y + 1, w - 2, bh - 2);
    x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(wx + 1, y + 1, w - 2, 2.2);
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(wx + 1, y + bh - 4, w - 2, 3);
    if (row & 1) { x.fillStyle = Y.wallDk; x.fillRect(wx + w / 2 - 0.6, y, 1.2, bh); }
  }
}
function mfWallH(x, Y, x0, x1, y, th, gaps) {
  // un mur entre deux salles, vu de dessus et un peu de face (comme la caméra du jeu) : la crête en blocs, la face avant, son ombre ;
  // gaps = [[gx0, gx1], …] les ouvertures
  const segs = []; let cur = x0;
  for (const g of gaps.slice().sort((a, b) => a[0] - b[0])) { if (g[0] > cur) segs.push([cur, g[0]]); cur = Math.max(cur, g[1]); }
  if (cur < x1) segs.push([cur, x1]);
  const fh = Math.round(th * 0.55), top = y - th / 2, fy = y + th / 2;
  const sg = x.createLinearGradient(0, fy + fh, 0, fy + fh + 22); sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  const fg = x.createLinearGradient(0, fy, 0, fy + fh); fg.addColorStop(0, Y.face); fg.addColorStop(1, mixHex(Y.face, '#000000', 0.45));
  for (const [a, b] of segs) {
    x.fillStyle = sg; x.fillRect(a, fy + fh, b - a, 22);
    x.fillStyle = fg; x.fillRect(a, fy, b - a, fh);      // la face avant
    x.fillStyle = 'rgba(0,0,0,0.35)'; for (let bx = a + 17; bx < b; bx += 34) x.fillRect(bx, fy, 1.2, fh);
    x.fillStyle = Y.wallDk; x.fillRect(a, top, b - a, th);
    const bw = 34;
    for (let bx = a - ((a % bw) + bw) % bw; bx < b; bx += bw) {
      const sh = mfHash(Math.round(bx / bw), Math.round(y)), l = Math.max(a, bx + 1), r = Math.min(b, bx + bw - 1);
      if (r <= l) continue;
      x.fillStyle = mixHex(Y.wall, Y.wall2, 0.15 + sh * 0.5); x.fillRect(l, top + 1, r - l, th - 2);
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(l, top + 1, r - l, 2.2);
      x.fillStyle = 'rgba(0,0,0,0.16)'; x.fillRect(l, fy - 4, r - l, 3);
    }
  }
}
// ---- la lumière : torche murale, brasero, lueurs ----
function mfGlow(x, cx, cy, r, col, a) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, rgbaHex(col, a)); g.addColorStop(0.45, rgbaHex(col, a * 0.38)); g.addColorStop(1, rgbaHex(col, 0)); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); }
function mfFlame(x, cx, cy, s, pal) {
  const P = pal || MF_FIRE, g = x.createRadialGradient(cx, cy + s * 0.2, 0, cx, cy, s * 1.1); g.addColorStop(0, P[0]); g.addColorStop(0.35, P[1]); g.addColorStop(0.75, P[2]); g.addColorStop(1, P[3]);
  x.fillStyle = g; x.beginPath(); x.moveTo(cx, cy - s * 1.25); x.bezierCurveTo(cx + s * 0.75, cy - s * 0.35, cx + s * 0.62, cy + s * 0.55, cx, cy + s * 0.6);
  x.bezierCurveTo(cx - s * 0.62, cy + s * 0.55, cx - s * 0.75, cy - s * 0.35, cx, cy - s * 1.25); x.fill();
}
function mfTorch(x, Y, cx, cy, side, lit) {
  // une torche murale : le support (avec le mur), puis la flamme et sa lumière (orange, ou bleue dans les grottes de glace)
  const fx = cx + side * 12;
  if (!lit) { x.fillStyle = '#2a2026'; x.fillRect(Math.min(cx, fx), cy - 2, 12, 4); x.fillStyle = '#4a3a30'; x.beginPath(); x.ellipse(fx, cy, 4.4, 3.4, 0, 0, MF_T); x.fill(); return; }
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, fx + side * 8, cy, 135, Y.light, 0.5); mfGlow(x, fx, cy - 4, 22, Y.kind === 'ice' ? '#e8fbff' : '#fff0c0', 0.55); x.restore();
  mfFlame(x, fx, cy - 4, 7.5, Y.flame);
}
function mfBrazier(x, Y, cx, cy, s) {
  const ice = Y.kind === 'ice', C = ice ? ['#ffffff', '#8fe0ff', '#2a6fb0'] : ['#fff3b0', '#ffb03a', '#c2400f'];
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx, cy, s * 9, Y.light, 0.4); x.restore();
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(cx + s * 0.4, cy + s * 0.6, s * 1.5, s * 1.2, 0, 0, MF_T); x.fill();
  x.fillStyle = '#3a3036'; x.beginPath(); x.arc(cx, cy, s * 1.3, 0, MF_T); x.fill();
  x.strokeStyle = ice ? '#9ab4c8' : '#7a6a60'; x.lineWidth = s * 0.22; x.beginPath(); x.arc(cx, cy, s * 1.2, 0, MF_T); x.stroke();
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, s); g.addColorStop(0, C[0]); g.addColorStop(0.5, C[1]); g.addColorStop(1, C[2]);
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, s, 0, MF_T); x.fill();
  mfFlame(x, cx, cy - s * 0.4, s * 0.9, Y.flame);
}
// ---- décor ----
function mfBarrel(x, cx, cy, r) {
  x.fillStyle = 'rgba(0,0,0,0.38)'; x.beginPath(); x.ellipse(cx + r * 0.3, cy + r * 0.35, r * 1.05, r * 0.95, 0, 0, MF_T); x.fill();
  const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r); g.addColorStop(0, '#c08a52'); g.addColorStop(1, '#5e3519');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, MF_T); x.fill();
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, MF_T); x.clip();
  x.strokeStyle = 'rgba(50,24,8,0.55)'; x.lineWidth = 1; x.beginPath(); for (let i = -2; i <= 2; i++) { x.moveTo(cx + i * r * 0.38, cy - r); x.lineTo(cx + i * r * 0.38, cy + r); } x.stroke();
  x.restore();
  x.strokeStyle = '#2c2420'; x.lineWidth = r * 0.16; x.beginPath(); x.arc(cx, cy, r * 0.9, 0, MF_T); x.stroke();
  x.lineWidth = r * 0.1; x.beginPath(); x.arc(cx, cy, r * 0.5, 0, MF_T); x.stroke();
  x.fillStyle = 'rgba(255,230,190,0.25)'; x.beginPath(); x.ellipse(cx - r * 0.35, cy - r * 0.38, r * 0.32, r * 0.18, -0.6, 0, MF_T); x.fill();
}
function mfTable(x, cx, cy, w, h) {
  x.fillStyle = 'rgba(0,0,0,0.38)'; x.fillRect(cx - w / 2 + 6, cy - h / 2 + 7, w, h);
  const g = x.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); g.addColorStop(0, '#9a6236'); g.addColorStop(1, '#6a3e1e');
  x.fillStyle = g; mapRect(x, cx - w / 2, cy - h / 2, w, h, 4); x.fill();
  x.strokeStyle = 'rgba(40,18,6,0.5)'; x.lineWidth = 1; x.beginPath(); for (let i = 1; i < 4; i++) { x.moveTo(cx - w / 2 + 3, cy - h / 2 + i * h / 4); x.lineTo(cx + w / 2 - 3, cy - h / 2 + i * h / 4); } x.stroke();
  x.strokeStyle = '#3a200c'; x.lineWidth = 1.6; mapRect(x, cx - w / 2, cy - h / 2, w, h, 4); x.stroke();
  for (let i = 0; i < 3; i++) {      // assiettes, gobelet
    const px = cx - w / 2 + w * (0.2 + i * 0.3), py = cy + (i & 1 ? -h * 0.18 : h * 0.16);
    x.fillStyle = '#d8d2c8'; x.beginPath(); x.arc(px, py, h * 0.2, 0, MF_T); x.fill(); x.fillStyle = '#b8b0a4'; x.beginPath(); x.arc(px, py, h * 0.12, 0, MF_T); x.fill();
  }
  x.fillStyle = '#3aa86a'; x.beginPath(); x.ellipse(cx + w * 0.38, cy - h * 0.2, h * 0.09, h * 0.2, 0.5, 0, MF_T); x.fill();
}
function mfBanner(x, bx, by, side, col) {      // bannière accrochée au mur (rouge et blanc, comme dans la Salle des gardes)
  const w = 15, h = 50, l = side < 0 ? bx : bx - w;
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(l + side * 4, by + 4, w, h);
  x.fillStyle = col; x.beginPath(); x.moveTo(l, by); x.lineTo(l + w, by); x.lineTo(l + w, by + h); x.lineTo(l + w / 2, by + h - 7); x.lineTo(l, by + h); x.closePath(); x.fill();
  x.fillStyle = '#f2ebe0'; x.fillRect(l + w * 0.36, by, w * 0.28, h - 6);
  x.fillStyle = '#c9a046'; x.fillRect(l - 2, by - 2, w + 4, 3);
}
function mfSkull(x, cx, cy, s, eye) {
  x.fillStyle = '#e9e0cc'; x.beginPath(); x.ellipse(cx, cy - s * 0.12, s * 0.5, s * 0.46, 0, 0, MF_T); x.fill();
  mapRect(x, cx - s * 0.28, cy + s * 0.12, s * 0.56, s * 0.3, s * 0.08); x.fill();
  x.fillStyle = '#1a1026'; x.beginPath(); x.ellipse(cx - s * 0.19, cy - s * 0.08, s * 0.13, s * 0.15, 0, 0, MF_T); x.ellipse(cx + s * 0.19, cy - s * 0.08, s * 0.13, s * 0.15, 0, 0, MF_T); x.fill();
  x.beginPath(); x.moveTo(cx, cy + s * 0.06); x.lineTo(cx - s * 0.05, cy + s * 0.15); x.lineTo(cx + s * 0.05, cy + s * 0.15); x.closePath(); x.fill();
  x.fillRect(cx - s * 0.16, cy + s * 0.3, s * 0.05, s * 0.1); x.fillRect(cx - s * 0.025, cy + s * 0.3, s * 0.05, s * 0.1); x.fillRect(cx + s * 0.11, cy + s * 0.3, s * 0.05, s * 0.1);
  if (eye) { x.fillStyle = eye; x.beginPath(); x.arc(cx - s * 0.19, cy - s * 0.07, s * 0.05, 0, MF_T); x.arc(cx + s * 0.19, cy - s * 0.07, s * 0.05, 0, MF_T); x.fill(); }
}
function mfBone(x, cx, cy, len, rot) {
  x.save(); x.translate(cx, cy); x.rotate(rot);
  x.fillStyle = '#ddd3bc'; x.fillRect(-len / 2, -1.6, len, 3.2);
  for (const e of [-len / 2, len / 2]) { x.beginPath(); x.arc(e, -1.8, 2.2, 0, MF_T); x.arc(e, 1.8, 2.2, 0, MF_T); x.fill(); }
  x.restore();
}
function mfTomb(x, cx, cy, w, h, rot) {
  x.save(); x.translate(cx, cy); x.rotate(rot);
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(-w / 2 + 5, -h / 2 + 6, w, h);
  const g = x.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#a9a3ad'); g.addColorStop(1, '#6e6874');
  x.fillStyle = g; mapRect(x, -w / 2, -h / 2, w, h, 5); x.fill();
  x.strokeStyle = '#3a3440'; x.lineWidth = 1.4; x.stroke();
  x.fillStyle = 'rgba(40,34,48,0.75)'; x.fillRect(-w * 0.07, -h * 0.34, w * 0.14, h * 0.6); x.fillRect(-w * 0.26, -h * 0.18, w * 0.52, w * 0.13);
  x.fillStyle = 'rgba(80,120,60,0.45)'; x.beginPath(); x.ellipse(w * 0.28, h * 0.36, w * 0.18, h * 0.08, 0.3, 0, MF_T); x.fill();
  x.restore();
}
function mfCobweb(x, cx, cy, s, dx, dy) {
  x.save(); x.strokeStyle = 'rgba(230,230,240,0.32)'; x.lineWidth = 0.9;
  for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + dx * Math.cos(a) * s, cy + dy * Math.sin(a) * s); x.stroke(); }
  for (let k = 1; k <= 3; k++) { const rr = s * k / 3.4; x.beginPath(); for (let i = 0; i <= 4; i++) { const a = (i / 4) * Math.PI / 2; x[i ? 'lineTo' : 'moveTo'](cx + dx * Math.cos(a) * rr, cy + dy * Math.sin(a) * rr); } x.stroke(); }
  x.restore();
}
function mfCandles(x, Y, cx, cy) {
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx, cy, 46, Y.light, 0.3); x.restore();
  for (const [dx, dy, h] of [[-5, 2, 9], [3, -2, 12], [7, 4, 7]]) {
    x.fillStyle = '#efe6d2'; x.fillRect(cx + dx - 2, cy + dy - h, 4, h);
    mfFlame(x, cx + dx, cy + dy - h - 2.5, 2.4, Y.flame);
  }
}
// cercle de runes au sol (l'Antre du Gardien en bleu, le Nid du dragon en rouge, le portail en vert)
function mfRunes(x, cx, cy, R, col, a) {
  // cercle de runes au sol (l'Antre du Gardien en bleu, le Nid du dragon en rouge, le portail en vert) : un trait large et doux
  // puis un trait fin et vif (une lueur sans « shadowBlur », bien plus rapide)
  const draw = () => {
    x.beginPath(); x.arc(cx, cy, R, 0, MF_T); x.moveTo(cx + R * 0.8, cy); x.arc(cx, cy, R * 0.8, 0, MF_T);
    for (let k = 0; k <= 5; k++) { const ang = -Math.PI / 2 + k * 4 * Math.PI / 5; x[k ? 'lineTo' : 'moveTo'](cx + Math.cos(ang) * R * 0.8, cy + Math.sin(ang) * R * 0.8); }
    for (let k = 0; k < 18; k++) {
      const ang = k * MF_T / 18, rx = cx + Math.cos(ang) * R * 0.9, ry = cy + Math.sin(ang) * R * 0.9, s = R * 0.05, h = mfHash(k, 7), ca = Math.cos(ang + Math.PI / 2), sa = Math.sin(ang + Math.PI / 2);
      const P = (u, v) => [rx + u * ca - v * sa, ry + u * sa + v * ca];
      let q = P(-s, -s); x.moveTo(q[0], q[1]); q = P(h < 0.5 ? s : 0, s); x.lineTo(q[0], q[1]);
      if (h > 0.3) { q = P(s, -s); x.moveTo(q[0], q[1]); q = P(-s * 0.2, 0); x.lineTo(q[0], q[1]); }
      if (h > 0.66) { q = P(-s, s * 0.2); x.moveTo(q[0], q[1]); q = P(s, s * 0.2); x.lineTo(q[0], q[1]); }
    }
  };
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx, cy, R * 1.5, col, 0.22 * a);
  x.lineCap = 'round'; x.lineJoin = 'round';
  draw(); x.strokeStyle = rgbaHex(col, 0.22 * a); x.lineWidth = 7; x.stroke();
  x.strokeStyle = rgbaHex(col, 0.9 * a); x.lineWidth = 1.8; x.stroke();
  x.restore();
}
function mfLavaBand(x, x0, x1, y, th, R) {      // une rivière de lave qui traverse la salle
  const wav = (X, k) => y + k * th / 2 + Math.sin(X * 0.035 + k * 1.7) * 5 + Math.sin(X * 0.011 - k) * 4;
  x.save();
  x.globalCompositeOperation = 'lighter'; mfGlow(x, (x0 + x1) / 2, y, Math.max(140, (x1 - x0) * 0.6), '#ff6a20', 0.35); x.globalCompositeOperation = 'source-over';
  x.beginPath(); x.moveTo(x0, wav(x0, -1)); for (let X = x0; X <= x1 + 8; X += 8) x.lineTo(X, wav(X, -1)); for (let X = x1 + 8; X >= x0 - 8; X -= 8) x.lineTo(X, wav(X, 1)); x.closePath();
  const g = x.createLinearGradient(0, y - th / 2, 0, y + th / 2); g.addColorStop(0, '#c2300c'); g.addColorStop(0.3, '#ff8a1f'); g.addColorStop(0.5, '#ffe27a'); g.addColorStop(0.7, '#ff8a1f'); g.addColorStop(1, '#b0280a');
  x.fillStyle = g; x.fill();
  x.save(); x.clip();
  x.fillStyle = 'rgba(60,14,4,0.55)';      // la croûte qui flotte
  for (let i = 0; i < (x1 - x0) / 26; i++) { const cx = x0 + R() * (x1 - x0), cy = y + (R() - 0.5) * th * 0.7; x.beginPath(); x.ellipse(cx, cy, 6 + R() * 12, 2.5 + R() * 4, R() * 0.6 - 0.3, 0, MF_T); x.fill(); }
  x.restore();
  x.strokeStyle = '#2a0c04'; x.lineWidth = 3; for (const k of [-1, 1]) { x.beginPath(); for (let X = x0; X <= x1 + 8; X += 8) x[X === x0 ? 'moveTo' : 'lineTo'](X, wav(X, k)); x.stroke(); }
  x.restore();
}
function mfBridge(x, cx, y, len, w) {
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(cx - w / 2 + 5, y - len / 2 + 5, w, len);
  x.fillStyle = '#7a6a5e'; x.fillRect(cx - w / 2, y - len / 2, w, len);
  for (let i = 0; i < len / 12; i++) { x.fillStyle = mixHex('#8e7e70', '#5e5048', mfHash(i, cx | 0)); x.fillRect(cx - w / 2 + 3, y - len / 2 + i * 12 + 1, w - 6, 10); }
  x.fillStyle = '#4a3c34'; x.fillRect(cx - w / 2 - 3, y - len / 2, 5, len); x.fillRect(cx + w / 2 - 2, y - len / 2, 5, len);
}
function mfAnvil(x, cx, cy, s) {
  x.fillStyle = 'rgba(0,0,0,0.42)'; x.beginPath(); x.ellipse(cx + 5, cy + 6, s * 1.25, s * 0.6, 0, 0, MF_T); x.fill();
  x.fillStyle = '#2c2a30';
  x.beginPath(); x.moveTo(cx - s * 1.2, cy - s * 0.3); x.lineTo(cx + s * 0.7, cy - s * 0.3); x.quadraticCurveTo(cx + s * 1.3, cy - s * 0.25, cx + s * 1.35, cy); x.lineTo(cx + s * 0.7, cy + s * 0.12);
  x.lineTo(cx + s * 0.5, cy + s * 0.5); x.lineTo(cx - s * 0.6, cy + s * 0.5); x.lineTo(cx - s * 0.75, cy + s * 0.12); x.lineTo(cx - s * 1.2, cy + s * 0.05); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(cx - s * 1.1, cy - s * 0.28, s * 1.8, s * 0.08);
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx - s * 0.2, cy - s * 0.35, s * 1.1, '#ff8a2a', 0.55); x.restore();
  x.fillStyle = '#ffb04a'; mapRect(x, cx - s * 0.45, cy - s * 0.45, s * 0.6, s * 0.16, s * 0.05); x.fill();
}
function mfLavaPool(x, cx, cy, rx, ry, R) {
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx, cy, Math.max(rx, ry) * 1.9, '#ff6a20', 0.4); x.restore();
  x.beginPath(); for (let k = 0; k < 14; k++) { const a = k * MF_T / 14, q = 0.82 + R() * 0.3; x[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q); } x.closePath();
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry)); g.addColorStop(0, '#fff0a0'); g.addColorStop(0.4, '#ffa02a'); g.addColorStop(1, '#b8300c');
  x.fillStyle = g; x.fill(); x.strokeStyle = '#2a0c04'; x.lineWidth = 3; x.stroke();
}
function mfPillar(x, Y, cx, cy, r) {
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.beginPath(); x.ellipse(cx + r * 0.4, cy + r * 0.5, r * 1.1, r, 0, 0, MF_T); x.fill();
  mapHex(x, cx, cy, r * 1.08, Math.PI / 8); x.fillStyle = Y.wallDk; x.fill();
  const g = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, Y.wall); g.addColorStop(1, Y.wall2);
  mapHex(x, cx, cy, r, Math.PI / 8); x.fillStyle = g; x.fill();
  x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 1.2; mapHex(x, cx, cy, r * 0.62, Math.PI / 8); x.stroke();
}
function mfEmbers(x, x0, x1, top, bot, n, R) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const px = x0 + R() * (x1 - x0), py = top + R() * (bot - top), s = 0.8 + R() * 1.8; x.fillStyle = rgbaHex(R() < 0.5 ? '#ffb04a' : '#ff6a2a', 0.5 + R() * 0.4); x.fillRect(px, py, s, s); }
  x.restore();
}
function mfDust(x, x0, x1, top, bot, n, R) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const px = x0 + R() * (x1 - x0), py = top + R() * (bot - top); x.fillStyle = 'rgba(255,236,200,' + (0.12 + R() * 0.25).toFixed(2) + ')'; x.beginPath(); x.arc(px, py, 0.8 + R() * 1.4, 0, MF_T); x.fill(); }
  x.restore();
}
// ---- décor des nouvelles salles : le Dortoir, la Bibliothèque, la Salle d'armes, les Fonderies, l'Armurerie, la Salle du Seigneur, et les
// Grottes de glace (la rivière gelée, les stalactites, les cristaux, le lac gelé, la tanière du yéti, le cœur de glace) ----
function mfBed(x, cx, cy, w, h, rot) {      // un lit de pierre (le dortoir des squelettes) : paillasse, couverture, un crâne sur l'oreiller
  x.save(); x.translate(cx, cy); x.rotate(rot || 0);
  x.fillStyle = 'rgba(0,0,0,0.38)'; x.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
  x.fillStyle = '#6e6874'; mapRect(x, -w / 2, -h / 2, w, h, 3); x.fill();
  x.fillStyle = '#c9b48a'; mapRect(x, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 2); x.fill();
  x.fillStyle = '#7a2a2a'; mapRect(x, -w / 2 + 3, -h / 2 + h * 0.42, w - 6, h * 0.55, 2); x.fill();
  x.strokeStyle = 'rgba(40,10,10,0.45)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-w / 2 + 3, -h / 2 + h * 0.5); x.lineTo(w / 2 - 3, -h / 2 + h * 0.5); x.stroke();
  mfSkull(x, 0, -h / 2 + h * 0.2, Math.min(w, h) * 0.32, null);
  x.restore();
}
function mfShelf(x, cx, cy, len, thick, vertical, R) {      // une étagère pleine de livres le long d'un mur
  x.save(); x.translate(cx, cy); if (vertical) x.rotate(Math.PI / 2);
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(-len / 2 + 3, -thick / 2 + 4, len, thick);
  x.fillStyle = '#4a2c18'; x.fillRect(-len / 2, -thick / 2, len, thick);
  const cols = ['#b83a3a', '#2f6fb3', '#3f8f4f', '#c99a2e', '#6a4aa8', '#d8d0c0'];
  for (let px = -len / 2 + 2; px < len / 2 - 3;) { const bw = 3 + Math.floor(R() * 3); x.fillStyle = cols[Math.floor(R() * cols.length)]; x.fillRect(px, -thick / 2 + 2, bw, thick - 4); x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(px, -thick / 2 + 2, bw, 1.5); px += bw + 0.8; }
  x.restore();
}
function mfBook(x, cx, cy, s, rot, Y) {      // un grimoire ouvert, ses runes qui brillent
  x.save(); x.translate(cx, cy); x.rotate(rot || 0);
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(-s + 2, -s * 0.62 + 3, s * 2, s * 1.3);
  x.fillStyle = '#5a2a1a'; mapRect(x, -s - 1.5, -s * 0.66, s * 2 + 3, s * 1.32, 2); x.fill();
  x.fillStyle = '#efe4c8'; mapRect(x, -s, -s * 0.6, s * 0.97, s * 1.2, 1.5); x.fill(); mapRect(x, s * 0.03, -s * 0.6, s * 0.97, s * 1.2, 1.5); x.fill();
  x.strokeStyle = 'rgba(80,60,40,0.55)'; x.lineWidth = 0.8; x.beginPath(); for (let k = 0; k < 4; k++) { const ly = -s * 0.38 + k * s * 0.24; x.moveTo(-s * 0.85, ly); x.lineTo(-s * 0.15, ly); x.moveTo(s * 0.18, ly); x.lineTo(s * 0.85, ly); } x.stroke();
  x.restore();
}
function mfRack(x, cx, cy, len, rot) {      // un râtelier : épées, lances et haches posées contre le mur (rot : PI/2 mur de gauche, -PI/2 mur de droite)
  x.save(); x.translate(cx, cy); x.rotate(rot || 0);
  x.fillStyle = 'rgba(0,0,0,0.38)'; x.fillRect(-len / 2 + 3, 2, len, 8);
  x.fillStyle = '#5a3a20'; x.fillRect(-len / 2, -2, len, 5);
  for (let k = 0, px = -len / 2 + 7; px < len / 2 - 4; k++, px += 11) {
    if (k % 3 === 2) { x.fillStyle = '#6a4a2a'; x.fillRect(px - 1, -16, 2.2, 24); x.fillStyle = '#b8c0cc'; x.beginPath(); x.moveTo(px, -22); x.lineTo(px + 3.5, -14); x.lineTo(px - 3.5, -14); x.closePath(); x.fill(); }
    else if (k % 3 === 1) { x.fillStyle = '#6a4a2a'; x.fillRect(px - 1, -12, 2.2, 22); x.fillStyle = '#9aa4b2'; x.beginPath(); x.moveTo(px + 1, -14); x.quadraticCurveTo(px + 9, -11, px + 1, -5); x.closePath(); x.fill(); }
    else { x.fillStyle = '#d8dee8'; x.fillRect(px - 1.4, -18, 2.8, 20); x.fillStyle = '#c99a2e'; x.fillRect(px - 4, 1, 8, 2); x.fillStyle = '#4a2c18'; x.fillRect(px - 1, 3, 2, 5); }
  }
  x.restore();
}
function mfShieldW(x, cx, cy, r, col, emblem) {      // un bouclier rond (bord de fer, umbo, emblème)
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.arc(cx + 2, cy + 3, r, 0, MF_T); x.fill();
  const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r); g.addColorStop(0, mixHex(col, '#ffffff', 0.25)); g.addColorStop(1, mixHex(col, '#000000', 0.35));
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, MF_T); x.fill();
  x.strokeStyle = '#8a929e'; x.lineWidth = r * 0.16; x.beginPath(); x.arc(cx, cy, r * 0.92, 0, MF_T); x.stroke();
  if (emblem) { x.strokeStyle = emblem; x.lineWidth = r * 0.14; x.beginPath(); x.moveTo(cx, cy - r * 0.6); x.lineTo(cx, cy + r * 0.6); x.moveTo(cx - r * 0.6, cy); x.lineTo(cx + r * 0.6, cy); x.stroke(); }
  x.fillStyle = '#c8ccd4'; x.beginPath(); x.arc(cx, cy, r * 0.22, 0, MF_T); x.fill();
}
function mfCrucible(x, cx, cy, r) {      // un creuset plein de métal en fusion, qui coule dans un moule (dans la couche qui brille)
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.beginPath(); x.ellipse(cx + 4, cy + 5, r * 1.2, r, 0, 0, MF_T); x.fill();
  x.fillStyle = '#2c2a30'; x.beginPath(); x.arc(cx, cy, r * 1.15, 0, MF_T); x.fill();
  x.strokeStyle = '#5a5866'; x.lineWidth = r * 0.18; x.beginPath(); x.arc(cx, cy, r * 1.05, 0, MF_T); x.stroke();
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx, cy, r * 3.2, '#ff8a2a', 0.5); x.restore();
  const g = x.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r * 0.85); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.45, '#ffb03a'); g.addColorStop(1, '#c2400f');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r * 0.85, 0, MF_T); x.fill();
  // la coulée vers le moule
  const mx = cx + r * 2.4, my = cy + r * 0.6;
  x.strokeStyle = '#ffb03a'; x.lineWidth = r * 0.28; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx + r * 0.8, cy + r * 0.1); x.quadraticCurveTo(cx + r * 1.7, cy + r * 0.1, mx - r * 0.5, my); x.stroke();
  x.fillStyle = '#3a3036'; mapRect(x, mx - r * 0.6, my - r * 0.4, r * 1.6, r * 0.9, 2); x.fill();
  x.fillStyle = '#ffcf6a'; mapRect(x, mx - r * 0.45, my - r * 0.26, r * 1.3, r * 0.6, 1.5); x.fill();
}
function mfIngots(x, cx, cy, s) {
  for (const [dx, dy] of [[-s, 0], [0, 0], [s, 0], [-s / 2, -s * 0.55], [s / 2, -s * 0.55]]) {
    x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(cx + dx - s * 0.45 + 2, cy + dy - s * 0.22 + 2, s * 0.9, s * 0.44);
    x.fillStyle = '#d89a2a'; mapRect(x, cx + dx - s * 0.45, cy + dy - s * 0.22, s * 0.9, s * 0.44, 1.5); x.fill();
    x.fillStyle = 'rgba(255,240,180,0.6)'; x.fillRect(cx + dx - s * 0.38, cy + dy - s * 0.18, s * 0.76, s * 0.1);
  }
}
function mfIceBand(x, x0, x1, y, th, R) {      // la rivière gelée : glace bleue, fissures blanches, plaques de glace
  const wav = (X, k) => y + k * th / 2 + Math.sin(X * 0.03 + k * 1.3) * 4 + Math.sin(X * 0.012 - k) * 3;
  x.save();
  x.beginPath(); x.moveTo(x0, wav(x0, -1)); for (let X = x0; X <= x1 + 8; X += 8) x.lineTo(X, wav(X, -1)); for (let X = x1 + 8; X >= x0 - 8; X -= 8) x.lineTo(X, wav(X, 1)); x.closePath();
  const g = x.createLinearGradient(0, y - th / 2, 0, y + th / 2); g.addColorStop(0, '#d8f4ff'); g.addColorStop(0.35, '#7fc8ea'); g.addColorStop(0.7, '#3e8ab8'); g.addColorStop(1, '#bfe8fa');
  x.fillStyle = g; x.fill();
  x.save(); x.clip();
  x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 1.2;
  for (let i = 0; i < (x1 - x0) / 34; i++) { let px = x0 + R() * (x1 - x0), py = y + (R() - 0.5) * th * 0.7; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (R() - 0.3) * 16; py += (R() - 0.5) * 10; x.lineTo(px, py); } x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < (x1 - x0) / 60; i++) { x.beginPath(); x.ellipse(x0 + R() * (x1 - x0), y + (R() - 0.5) * th * 0.5, 10 + R() * 16, 4 + R() * 5, R() - 0.5, 0, MF_T); x.fill(); }
  x.restore();
  x.strokeStyle = '#f2fcff'; x.lineWidth = 3; for (const k of [-1, 1]) { x.beginPath(); for (let X = x0; X <= x1 + 8; X += 8) x[X === x0 ? 'moveTo' : 'lineTo'](X, wav(X, k)); x.stroke(); }
  x.restore();
}
function mfIceSpikes(x, cx, cy, s) {      // un bouquet de stalagmites de glace vu de dessus
  x.fillStyle = 'rgba(0,10,30,0.35)'; x.beginPath(); x.ellipse(cx + s * 0.25, cy + s * 0.3, s * 0.95, s * 0.8, 0, 0, MF_T); x.fill();
  for (let k = 0; k < 5; k++) {
    const a = k * MF_T / 5 + 0.3, d = k ? s * 0.42 : 0, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d, r = k ? s * 0.42 : s * 0.55;
    x.beginPath(); for (let i = 0; i < 6; i++) { const b = i * Math.PI / 3 + a; x[i ? 'lineTo' : 'moveTo'](px + Math.cos(b) * r, py + Math.sin(b) * r); } x.closePath();
    const g = x.createLinearGradient(px - r, py - r, px + r, py + r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#a8e4ff'); g.addColorStop(1, '#4a90c0');
    x.fillStyle = g; x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 0.8; x.beginPath(); for (let i = 0; i < 6; i += 2) { const b = i * Math.PI / 3 + a; x.moveTo(px, py); x.lineTo(px + Math.cos(b) * r, py + Math.sin(b) * r); } x.stroke();
  }
}
function mfCrystals(x, cx, cy, s, col) {      // des cristaux qui brillent (dans la couche lumineuse)
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx, cy, s * 3, col, 0.4); x.restore();
  for (const [a, l, w] of [[-2.2, 1.25, 0.32], [-1.6, 1.6, 0.4], [-0.95, 1.15, 0.3], [-0.4, 0.85, 0.26], [-2.8, 0.8, 0.24]]) {
    x.save(); x.translate(cx, cy); x.rotate(a + Math.PI / 2);
    const L = s * l, W = s * w;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(-W, -L * 0.25); x.lineTo(-W * 0.8, -L * 0.85); x.lineTo(0, -L); x.lineTo(W * 0.8, -L * 0.85); x.lineTo(W, -L * 0.25); x.closePath();
    const g = x.createLinearGradient(-W, 0, W, 0); g.addColorStop(0, mixHex(col, '#ffffff', 0.7)); g.addColorStop(0.5, col); g.addColorStop(1, mixHex(col, '#000000', 0.35));
    x.fillStyle = g; x.fill(); x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 0.9; x.beginPath(); x.moveTo(0, -L * 0.1); x.lineTo(0, -L * 0.92); x.stroke();
    x.restore();
  }
}
function mfFrozenLake(x, cx, cy, rx, ry, R) {      // le lac gelé : la glace, ses fissures, la neige sur le bord
  x.fillStyle = 'rgba(255,255,255,0.75)'; x.beginPath(); x.ellipse(cx, cy, rx + 9, ry + 7, 0, 0, MF_T); x.fill();
  const g = x.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 0, cx, cy, Math.max(rx, ry)); g.addColorStop(0, '#d8f4ff'); g.addColorStop(0.55, '#6fb8de'); g.addColorStop(1, '#2a6a9a');
  x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, MF_T); x.fill();
  x.save(); x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, MF_T); x.clip();
  x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 1.3;
  for (let i = 0; i < 7; i++) { let px = cx + (R() - 0.5) * rx, py = cy + (R() - 0.5) * ry, a = R() * MF_T; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { a += (R() - 0.5) * 1.2; px += Math.cos(a) * 14; py += Math.sin(a) * 9; x.lineTo(px, py); } x.stroke(); }
  x.fillStyle = 'rgba(10,40,70,0.35)'; x.beginPath(); x.ellipse(cx + rx * 0.3, cy + ry * 0.25, 9, 3.5, 0.4, 0, MF_T); x.fill();      // l'ombre d'un poisson sous la glace
  x.restore();
}
function mfSnow(x, cx, cy, r) {
  x.fillStyle = 'rgba(30,60,100,0.25)'; x.beginPath(); x.ellipse(cx + r * 0.3, cy + r * 0.35, r * 1.1, r * 0.8, 0, 0, MF_T); x.fill();
  x.fillStyle = '#f4fbff'; x.beginPath(); x.arc(cx, cy, r * 0.7, 0, MF_T); x.arc(cx + r * 0.55, cy + r * 0.15, r * 0.5, 0, MF_T); x.arc(cx - r * 0.5, cy + r * 0.2, r * 0.45, 0, MF_T); x.fill();
  x.fillStyle = 'rgba(160,210,240,0.5)'; x.beginPath(); x.ellipse(cx + r * 0.2, cy + r * 0.38, r * 0.6, r * 0.18, 0, 0, MF_T); x.fill();
}
function mfFur(x, cx, cy, w, h, rot) {      // une peau de bête blanche étalée par terre (la tanière du yéti) : le corps, quatre pattes, la tête
  x.save(); x.translate(cx, cy); x.rotate(rot || 0);
  const hw = w / 2, hh = h / 2, parts = [[0, 0, hw * 0.78, hh * 0.72, 0], [hw * 0.9, 0, hw * 0.24, hh * 0.36, 0]];
  for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push([px * hw * 0.52, py * hh * 0.8, hw * 0.14, hh * 0.34, px * py * 0.6]);
  x.fillStyle = 'rgba(10,30,50,0.28)'; x.beginPath(); x.ellipse(4, 5, hw * 1.02, hh * 0.98, 0, 0, MF_T); x.fill();
  for (const [col, d] of [['#93a9bc', 1.6], ['#eef4f9', 0]]) { x.fillStyle = col; for (const [px, py, rx, ry, an] of parts) { x.beginPath(); x.ellipse(px, py, rx + d, ry + d, an, 0, MF_T); x.fill(); } }
  x.fillStyle = 'rgba(160,190,212,0.45)'; x.beginPath(); x.ellipse(-hw * 0.05, 0, hw * 0.42, hh * 0.3, 0, 0, MF_T); x.fill();
  x.fillStyle = '#d4e0ea'; for (const sg of [-1, 1]) { x.beginPath(); x.arc(hw * 0.98, sg * hh * 0.3, hh * 0.12, 0, MF_T); x.fill(); }
  x.fillStyle = '#3a4a5a'; x.beginPath(); x.ellipse(hw * 1.1, 0, hw * 0.035, hh * 0.08, 0, 0, MF_T); x.fill();
  x.restore();
}
function mfArmor(x, cx, cy, s) {      // une armure sur son socle, vue de dessus : les épaulières, le casque à visière, le panache rouge
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(cx + 3, cy + 4, s * 1.3, s * 1.1, 0, 0, MF_T); x.fill();
  x.fillStyle = '#3a3440'; x.beginPath(); x.arc(cx, cy, s * 1.15, 0, MF_T); x.fill();
  x.strokeStyle = '#5a5464'; x.lineWidth = 1.5; x.stroke();
  const g = x.createLinearGradient(cx - s, cy - s, cx + s, cy + s); g.addColorStop(0, '#e8eef6'); g.addColorStop(0.5, '#9aa4b4'); g.addColorStop(1, '#4a5260');
  x.fillStyle = g; x.strokeStyle = '#1c2028'; x.lineWidth = 1;
  x.beginPath(); x.ellipse(cx, cy + s * 0.12, s * 1.05, s * 0.52, 0, 0, MF_T); x.fill(); x.stroke();
  x.beginPath(); x.arc(cx, cy - s * 0.04, s * 0.5, 0, MF_T); x.fill(); x.stroke();
  x.lineWidth = 1.4; x.beginPath(); x.moveTo(cx - s * 0.3, cy + s * 0.08); x.lineTo(cx + s * 0.3, cy + s * 0.08); x.stroke();
  x.strokeStyle = '#c0242c'; x.lineWidth = s * 0.22; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, cy - s * 0.4); x.quadraticCurveTo(cx + s * 0.12, cy - s * 0.9, cx - s * 0.22, cy - s * 1.2); x.stroke();
}
function mfFrost(x, x0, x1, top, bot, n, R) {      // des flocons qui scintillent
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const px = x0 + R() * (x1 - x0), py = top + R() * (bot - top), r = 0.8 + R() * 1.6; x.fillStyle = 'rgba(230,248,255,' + (0.25 + R() * 0.45).toFixed(2) + ')'; x.beginPath(); x.arc(px, py, r, 0, MF_T); x.fill(); if (R() < 0.15) { x.fillRect(px - 3, py - 0.4, 6, 0.8); x.fillRect(px - 0.4, py - 3, 0.8, 6); } }
  x.restore();
}
// ---- une salle ----
function mfRoom(x, L, MW, b, def) {
  const Y = mfStyle(b.wid, def), G = mfGeo(MW), R = mapRng(b.k * 977 + 31), top = b.top, bot = b.bot, i0 = G.x0 + G.wt, i1 = G.x1 - G.wt;
  const pathAt = (y) => mfPathX(L, y), away = (y) => (pathAt(y) < MW / 2 ? 1 : -1);      // le côté où le chemin ne passe pas
  const free = (px, py, d) => Math.abs(px - pathAt(py)) > d;
  const lit = [];      // ce qui brille (lave, runes, flammes, cristaux) : dessiné après l'ombre de la salle
  const H = bot - top, at = (f) => top + H * f, side = (py, d) => { const sd = away(py); return MW / 2 + sd * Math.min(MW * 0.27, d || 150); };
  if (G.wide) {      // le vide autour du donjon
    const g = x.createLinearGradient(0, top, 0, bot); g.addColorStop(0, Y.void1); g.addColorStop(1, Y.void0);
    x.fillStyle = g; x.fillRect(0, top, G.x0, H); x.fillRect(G.x1, top, MW - G.x1, H);
    for (const [a, z] of [[G.x0, G.x0 - 44], [G.x1, G.x1 + 44]]) { const sg = x.createLinearGradient(a, 0, z, 0); sg.addColorStop(0, 'rgba(0,0,0,0.6)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = sg; x.fillRect(Math.min(a, z), top, 44, H); }
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < H * MW / 9000; i++) { const px = R() < 0.5 ? R() * G.x0 : G.x1 + R() * (MW - G.x1), py = top + R() * H; x.fillStyle = Y.kind === 'lava' ? 'rgba(255,120,40,' + (0.2 + R() * 0.5).toFixed(2) + ')' : Y.kind === 'ice' ? 'rgba(190,235,255,' + (0.2 + R() * 0.5).toFixed(2) + ')' : Y.kind === 'swamp' ? 'rgba(210,255,120,' + (0.2 + R() * 0.6).toFixed(2) + ')' : Y.kind === 'stars' ? 'rgba(255,255,255,' + (0.25 + R() * 0.7).toFixed(2) + ')' : Y.kind === 'shadow' ? 'rgba(220,110,255,' + (0.2 + R() * 0.5).toFixed(2) + ')' : 'rgba(210,200,255,' + (0.15 + R() * 0.5).toFixed(2) + ')'; x.fillRect(px, py, 1.3, 1.3); }
    x.restore();
  }
  mfFloor(x, Y, i0, i1, top, bot);
  const id = b.wid + ':' + b.stage, cy = (top + bot) / 2, nd = b.nd, bossY = nd.boss ? nd.boss.y : null;
  const lsd = Math.abs(nd.x - MW / 2) < (L.A || 100) * 0.3 ? (nd.lv % 2 ? 1 : -1) : nd.x < MW / 2 ? 1 : -1;      // l'étiquette : à droite (1) ou à gauche (-1)
  const lw = Math.max(110, Math.min(250, lsd > 0 ? MW - 10 - (nd.x + 40) : nd.x - 50)), lx0 = lsd > 0 ? nd.x + 40 : nd.x - 40 - lw;
  const hid = (px, py, r) => px + r > lx0 - 6 && px - r < lx0 + lw + 6 && py + r > nd.y - 46 && py - r < nd.y + 46;
  const spots = (cands, d, r, n) => cands.filter(([px, py]) => px - r > i0 + 4 && px + r < i1 - 4 && free(px, py, d) && !hid(px, py, r)).slice(0, n);
  try {
    if (id === 'crypte:0') {      // la Salle des gardes : le plancher rouge, la grande table, les tonneaux, les bannières
      const ty = at(0.62), tx = side(ty), pw = Math.min(170, (i1 - i0) * 0.46), ph = Math.min(120, H * 0.36);
      x.fillStyle = '#5a2a1c'; x.fillRect(tx - pw / 2 - 3, ty - ph / 2 - 3, pw + 6, ph + 6);
      for (let k = 0; k < ph / 11; k++) { x.fillStyle = mixHex('#a4482e', '#7e3420', mfHash(k, b.k)); x.fillRect(tx - pw / 2, ty - ph / 2 + k * 11 + 0.6, pw, 10); }
      x.strokeStyle = 'rgba(30,8,4,0.4)'; x.lineWidth = 1; x.beginPath(); for (let k = 0; k < ph / 11; k++) { const off = (k * 37) % 60; for (let px = tx - pw / 2 + off; px < tx + pw / 2; px += 60) { x.moveTo(px, ty - ph / 2 + k * 11); x.lineTo(px, ty - ph / 2 + k * 11 + 11); } } x.stroke();
      mfTable(x, tx, ty, Math.min(110, MW * 0.28), 34);
      for (const [dx, dy, r] of [[0.0, 0.2, 12], [0.06, 0.3, 9], [-0.04, 0.88, 11]]) { const by = at(dy), s2 = away(by); mfBarrel(x, (s2 > 0 ? i1 - 24 : i0 + 24) - s2 * dx * MW, by, r); }
      mfBanner(x, i0, at(0.3), -1, '#c0302c'); mfBanner(x, i1, at(0.55), 1, '#c0302c');
    } else if (id === 'crypte:1') {      // les Catacombes : les tombeaux, les os, les toiles d'araignée, les bougies
      for (let j = 0; j < 4; j++) { const ty = at(0.2 + j * 0.2), sd = j & 1 ? 1 : -1, px = pathAt(ty), tx = sd > 0 ? Math.max(px + 52, i1 - 46) : Math.min(px - 52, i0 + 46); if (tx > i0 + 18 && tx < i1 - 18) mfTomb(x, tx, ty, 30, 46, (R() - 0.5) * 0.3); }
      for (let j = 0; j < 6; j++) { const py = top + R() * H, px = i0 + 20 + R() * (i1 - i0 - 40); if (free(px, py, 40)) mfBone(x, px, py, 9 + R() * 6, R() * 3); }
      mfSkull(x, i1 - 30, at(0.82), 11, null); mfSkull(x, i0 + 34, at(0.12), 9, null);
      mfCobweb(x, i0, top + 4, 46, 1, 1); mfCobweb(x, i1, bot - 4, 40, -1, -1);
      lit.push(() => { mfCandles(x, Y, i0 + 22, at(0.55)); mfCandles(x, Y, i1 - 24, at(0.3)); });
    } else if (id === 'crypte:2') {      // le Dortoir : des lits de pierre le long des murs, un squelette dans chacun
      for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) { const py = at(0.2 + j * 0.3), px = sd < 0 ? i0 + 24 : i1 - 24; if (free(px, py, 50)) mfBed(x, px, py, 30, 50, 0); }
      for (let j = 0; j < 3; j++) { const py = top + R() * H, px = i0 + 60 + R() * (i1 - i0 - 120); if (free(px, py, 40)) mfBone(x, px, py, 9 + R() * 5, R() * 3); }
      mfCobweb(x, i1, top + 4, 40, -1, 1);
      lit.push(() => mfCandles(x, Y, side(at(0.5), 120), at(0.5)));
    } else if (id === 'crypte:3') {      // la Bibliothèque : les étagères de livres, un pupitre et son grimoire, des livres par terre
      for (const sd of [-1, 1]) mfShelf(x, sd < 0 ? i0 + 12 : i1 - 12, cy, H - 22, 22, true, R);
      const len = Math.min(130, (i1 - i0) * 0.26);
      for (const sd of [-1, 1]) for (const fy of [0.26, 0.76]) { const py = at(fy), px = sd < 0 ? i0 + 22 + len / 2 : i1 - 22 - len / 2; if (Math.abs(px - pathAt(py)) > len / 2 + 30) mfShelf(x, px, py, len, 18, false, R); }
      const tb = spots([[MW / 2 - away(cy) * 120, at(0.5)], [MW / 2 + away(cy) * 170, at(0.5)], [i0 + 120, at(0.5)], [i1 - 120, at(0.5)]], 80, 50, 1)[0];
      if (tb) mfTable(x, tb[0], tb[1], 76, 32);
      for (let j = 0; j < 7; j++) { const py = top + 16 + R() * (H - 32), px = i0 + 40 + R() * (i1 - i0 - 80); if (free(px, py, 36)) mfBook(x, px, py, 6, R() * 3, Y); }
      lit.push(() => { if (!tb) return; x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, tb[0], tb[1] - 4, 50, '#b48cff', 0.5); x.restore(); mfBook(x, tb[0] - 8, tb[1] - 2, 10, 0.1, Y); mfCandles(x, Y, tb[0] + 26, tb[1] - 6); });
    } else if (id === 'crypte:4') {      // la Salle d'armes (le Chevalier des os) : les râteliers, les boucliers, la bannière
      for (const sd of [-1, 1]) mfRack(x, sd < 0 ? i0 + 10 : i1 - 10, cy, H * 0.46, sd < 0 ? Math.PI / 2 : -Math.PI / 2);
      for (const sd of [-1, 1]) mfShieldW(x, sd < 0 ? i0 + 20 : i1 - 20, at(sd < 0 ? 0.16 : 0.84), 11, sd < 0 ? '#9a2a2a' : '#3a5a9a', '#e8d6a0');
      for (const p of spots([[i0 + 72, at(0.3)], [i1 - 72, at(0.7)], [i0 + 72, at(0.72)], [i1 - 72, at(0.28)], [MW / 2 + 160, at(0.5)], [MW / 2 - 160, at(0.5)]], 44, 24, 2)) mfArmor(x, p[0], p[1], 12);
      mfBanner(x, i0, at(0.6), -1, '#3a3a5a'); mfBanner(x, i1, at(0.4), 1, '#3a3a5a');
      lit.push(() => { const p = spots([[MW / 2 + away(cy) * 150, at(0.22)], [MW / 2 - away(cy) * 150, at(0.8)], [i0 + 40, at(0.86)]], 40, 20, 1)[0]; if (p) mfCandles(x, Y, p[0], p[1]); });
    } else if (id === 'crypte:5') {      // l'Antre du Gardien : le cercle de runes bleu sous le boss, les piliers
      for (const [fx, fy] of [[0.12, 0.28], [0.88, 0.28], [0.12, 0.8], [0.88, 0.8]]) { const px = G.x0 + (G.x1 - G.x0) * fx, py = at(fy); if (free(px, py, 46)) mfPillar(x, Y, px, py, 15); }
      lit.push(() => { if (bossY != null) mfRunes(x, nd.boss.x, bossY, Math.min(84, MW * 0.21), '#6fd8ff', 1); mfCandles(x, Y, MW / 2 + away(cy) * Math.min(MW * 0.3, 160), cy + 30); });
    } else if (id === 'forge:0') {      // le Pont de lave : la rivière de lave (entre la porte et la salle) et son pont de pierre
      const room = Math.max(40, nd.y - top), ly = nd.y - room * 0.55, th = Math.min(40, room * 0.42), px = pathAt(ly);
      lit.push(() => { mfLavaBand(x, i0, i1, ly, th, R); mfBridge(x, px, ly, th + 26, 44); mfEmbers(x, i0, i1, top, bot, 40, R); });
    } else if (id === 'forge:1') {      // la Grande Forge : les enclumes, les rigoles de lave le long des murs, les braises
      for (const fy of [0.3, 0.72]) { const py = at(fy); mfAnvil(x, side(py), py, 15); }
      lit.push(() => {
        for (const sd of [-1, 1]) {
          const lx = sd < 0 ? i0 + 12 : i1 - 12;
          x.save(); x.globalCompositeOperation = 'lighter'; const gg = x.createLinearGradient(lx - sd * 46, 0, lx, 0); gg.addColorStop(0, 'rgba(255,100,30,0)'); gg.addColorStop(1, 'rgba(255,120,40,0.5)'); x.fillStyle = gg; x.fillRect(Math.min(lx, lx - sd * 46), top, 46, H); x.restore();
          x.fillStyle = '#1c0906'; x.fillRect(lx - 7, top, 14, H);
          const g2 = x.createLinearGradient(lx - 5, 0, lx + 5, 0); g2.addColorStop(0, '#c2300c'); g2.addColorStop(0.5, '#ffe08a'); g2.addColorStop(1, '#c2300c'); x.fillStyle = g2; x.fillRect(lx - 5, top, 10, H);
        }
        for (const fy of [0.3, 0.72]) { const py = at(fy), ax = side(py); x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, ax - 3, py - 5, 34, '#ff8a2a', 0.5); x.restore(); x.fillStyle = '#ffcf6a'; mapRect(x, ax - 7, py - 7, 9, 2.6, 1); x.fill(); }
        mfEmbers(x, i0, i1, top, bot, 50, R);
      });
    } else if (id === 'forge:2') {      // les Fonderies : les creusets, le métal qui coule dans les moules, les lingots
      const p1 = at(0.32), p2 = at(0.74), x1 = side(p1, 140), x2 = side(p2, 140);
      mfIngots(x, x1 + 10, p1 + 36, 9); mfIngots(x, x2 + 10, p2 - 30, 8);
      lit.push(() => { mfCrucible(x, x1 - 20, p1, 13); mfCrucible(x, x2 - 20, p2, 13); mfEmbers(x, i0, i1, top, bot, 40, R); });
    } else if (id === 'forge:3') {      // l'Armurerie : râteliers d'armes, boucliers aux murs, une enclume
      for (const sd of [-1, 1]) mfRack(x, sd < 0 ? i0 + 10 : i1 - 10, cy, H - 40, sd < 0 ? Math.PI / 2 : -Math.PI / 2);
      for (let j = 0; j < 3; j++) { const py = at(0.2 + j * 0.3), px = side(py, 120); if (free(px, py, 40)) mfShieldW(x, px, py, 12, ['#7a1a10', '#3a3a44', '#8a5a1a'][j], '#ffb04a'); }
      lit.push(() => mfEmbers(x, i0, i1, top, bot, 24, R));
    } else if (id === 'forge:4') {      // la Salle du Seigneur (le Seigneur des braises) : le tapis rouge, les braseros, la lave sous les grilles
      const cx0 = pathAt(cy);
      x.fillStyle = '#5a0c0c'; x.fillRect(cx0 - 26, top, 52, H); x.fillStyle = '#8a1a14'; x.fillRect(cx0 - 22, top, 44, H); x.fillStyle = '#c99a2e'; x.fillRect(cx0 - 22, top, 3, H); x.fillRect(cx0 + 19, top, 3, H);
      lit.push(() => { for (const [fx, fy] of [[0.18, 0.25], [0.82, 0.25], [0.18, 0.78], [0.82, 0.78]]) { const px = G.x0 + (G.x1 - G.x0) * fx, py = at(fy); if (free(px, py, 50)) mfBrazier(x, Y, px, py, 8); } mfEmbers(x, i0, i1, top, bot, 40, R); });
    } else if (id === 'forge:5') {      // le Nid du dragon : le cercle de runes rouge, les mares de lave, les os
      for (let j = 0; j < 5; j++) { const py = top + R() * H, px = i0 + 20 + R() * (i1 - i0 - 40); if (free(px, py, 46)) mfBone(x, px, py, 10 + R() * 6, R() * 3); }
      lit.push(() => {
        if (bossY != null) mfRunes(x, nd.boss.x, bossY, Math.min(86, MW * 0.21), '#ff5a2a', 1);
        mfLavaPool(x, i0 + 40, at(0.22), 34, 22, R); mfLavaPool(x, i1 - 44, at(0.78), 38, 24, R);
        mfEmbers(x, i0, i1, top, bot, 40, R);
      });
    } else if (id === 'glace:0') {      // la Rivière gelée : la rivière de glace qui traverse la salle, la neige sur les bords
      const room = Math.max(40, nd.y - top), ly = nd.y - room * 0.55, th = Math.min(42, room * 0.45);
      mfIceBand(x, i0, i1, ly, th, R);
      for (let j = 0; j < 4; j++) { const py = top + R() * H, px = j & 1 ? i0 + 26 + R() * 30 : i1 - 26 - R() * 30; if (free(px, py, 40) && Math.abs(py - ly) > th) mfSnow(x, px, py, 10 + R() * 6); }
    } else if (id === 'glace:1') {      // les Stalactites : des bouquets de glace partout, des glaçons le long des murs
      for (let j = 0; j < 8; j++) { const py = at(0.1 + j * 0.115), px = j & 1 ? i0 + 30 + R() * (G.wide ? 150 : 50) : i1 - 30 - R() * (G.wide ? 150 : 50); if (free(px, py, 50)) mfIceSpikes(x, px, py, 14 + R() * 7); }
      x.fillStyle = 'rgba(225,246,255,0.85)'; for (let j = 0; j < 14; j++) { const py = top + 10 + R() * (H - 20), px = i0 + 20 + R() * (i1 - i0 - 40), a = R() * MF_T, l = 4 + R() * 6; if (!free(px, py, 30)) continue; x.beginPath(); x.moveTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.lineTo(px + Math.cos(a + 2.4) * l * 0.4, py + Math.sin(a + 2.4) * l * 0.4); x.lineTo(px + Math.cos(a - 2.4) * l * 0.4, py + Math.sin(a - 2.4) * l * 0.4); x.closePath(); x.fill(); }
      x.fillStyle = '#e8f8ff'; for (const sd of [-1, 1]) for (let y = top + 8; y < bot; y += 15 + R() * 10) { const wx = sd < 0 ? i0 : i1, l = 6 + R() * 10; x.beginPath(); x.moveTo(wx, y - 4); x.lineTo(wx - sd * l, y); x.lineTo(wx, y + 4); x.closePath(); x.fill(); }
    } else if (id === 'glace:2') {      // la Salle des cristaux : de grands cristaux qui brillent
      lit.push(() => { for (const [fx, fy, s2] of [[0.16, 0.25, 15], [0.84, 0.3, 13], [0.2, 0.78, 12], [0.8, 0.8, 16]]) { const px = G.x0 + (G.x1 - G.x0) * fx, py = at(fy); if (free(px, py, 50)) mfCrystals(x, px, py, s2, fx < 0.5 ? '#8fe9ff' : '#c8a8ff'); } });
    } else if (id === 'glace:3') {      // le Lac gelé : un grand lac de glace au milieu de la salle
      mfFrozenLake(x, (i0 + i1) / 2, cy, Math.min((i1 - i0) * 0.43, 330), Math.min(H * 0.34, 64), R);
      for (let j = 0; j < 3; j++) { const py = top + R() * H, px = j & 1 ? i0 + 24 : i1 - 24; if (free(px, py, 40)) mfSnow(x, px, py, 9 + R() * 5); }
    } else if (id === 'glace:4') {      // la Tanière du Yéti (le Yéti géant) : peaux de bête, os, tas de neige, grosses traces de pas
      for (const p of spots([[i0 + 70, at(0.28)], [i1 - 70, at(0.74)], [i0 + 70, at(0.74)], [i1 - 70, at(0.28)], [MW / 2 + 170, at(0.5)], [MW / 2 - 170, at(0.5)]], 56, 30, 2)) mfFur(x, p[0], p[1], 70, 44, (R() - 0.5) * 0.7);
      for (let j = 0; j < 5; j++) { const py = top + R() * H, px = i0 + 20 + R() * (i1 - i0 - 40); if (free(px, py, 40)) mfBone(x, px, py, 10 + R() * 6, R() * 3); }
      x.fillStyle = 'rgba(40,70,100,0.3)'; for (let j = 0; j < 6; j++) { const py = bot - 20 - j * (H - 30) / 6, px = pathAt(py) + (j & 1 ? 22 : -22); x.beginPath(); x.ellipse(px, py, 6, 9, 0, 0, MF_T); x.fill(); for (let t = -1; t <= 1; t++) { x.beginPath(); x.arc(px + t * 4, py - 11, 2.2, 0, MF_T); x.fill(); } }
      for (const sd of [-1, 1]) mfSnow(x, sd < 0 ? i0 + 22 : i1 - 22, at(sd < 0 ? 0.15 : 0.85), 13);
    } else if (id === 'glace:5') {      // le Cœur de glace : le cercle de runes de glace sous Givre, les piliers de glace, les cristaux
      for (const [fx, fy] of [[0.12, 0.28], [0.88, 0.28], [0.12, 0.8], [0.88, 0.8]]) { const px = G.x0 + (G.x1 - G.x0) * fx, py = at(fy); if (free(px, py, 46)) mfPillar(x, Y, px, py, 15); }
      lit.push(() => { if (bossY != null) mfRunes(x, nd.boss.x, bossY, Math.min(86, MW * 0.21), '#9fe8ff', 1); const py = at(0.55), px = side(py, 160); if (free(px, py, 50)) mfCrystals(x, px, py, 12, '#8fe9ff'); });
    } else if (id === 'jardin:0') {      // le Sentier moussu : buissons le long des murs, champignons qui luisent
      for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) { const py = at(0.18 + j * 0.32), px = sd < 0 ? i0 + 26 : i1 - 26; if (free(px, py, 40)) mfBush(x, px, py, 15, R); }
      lit.push(() => { for (const p of spots([[i0 + 80, at(0.3)], [i1 - 80, at(0.66)], [MW / 2 + 150, at(0.84)], [MW / 2 - 150, at(0.16)]], 40, 16, 3)) mfMushroom(x, p[0], p[1], 12, ['#46e6c8', '#b070ff', '#ffd060'][Math.floor(R() * 3)]); });
    } else if (id === 'jardin:1') {      // la Serre aux champignons : des champignons géants de toutes les couleurs
      const cand = []; for (let j = 0; j < 8; j++) cand.push([j & 1 ? i0 + 40 + R() * 110 : i1 - 40 - R() * 110, at(0.1 + j * 0.11)]);
      lit.push(() => { spots(cand, 46, 18, 6).forEach((p, k) => mfMushroom(x, p[0], p[1], 11 + (k % 3) * 4, ['#46e6c8', '#b070ff', '#ffd060', '#ff7ab8'][k % 4])); });
      for (const sd of [-1, 1]) mfBush(x, sd < 0 ? i0 + 24 : i1 - 24, at(sd < 0 ? 0.86 : 0.14), 14, R);
    } else if (id === 'jardin:2') {      // le Bassin aux crapauds : une mare et ses nénuphars, des buissons
      const py = at(0.45), px = side(py, 170);
      if (free(px, py, 90)) mfLilyPond(x, px, py, Math.min(110, (i1 - i0) * 0.26), Math.min(52, H * 0.22), R);
      for (const sd of [-1, 1]) for (let j = 0; j < 2; j++) { const yy = at(0.2 + j * 0.6), xx = sd < 0 ? i0 + 26 : i1 - 26; if (free(xx, yy, 40)) mfBush(x, xx, yy, 14, R); }
      lit.push(() => { const p = spots([[i1 - 70, at(0.8)], [i0 + 70, at(0.2)]], 40, 14, 1)[0]; if (p) mfMushroom(x, p[0], p[1], 10, '#46e6c8'); });
    } else if (id === 'jardin:3') {      // la Ruche : deux grosses ruches dorées, des abeilles, des fleurs
      for (const p of spots([[i0 + 60, at(0.28)], [i1 - 60, at(0.72)], [i0 + 60, at(0.72)], [i1 - 60, at(0.28)]], 50, 24, 2)) mfHive(x, p[0], p[1], 20);
      for (let j = 0; j < 4; j++) { const py = top + R() * H, px = j & 1 ? i0 + 24 : i1 - 24; if (free(px, py, 40)) mfBush(x, px, py, 12, R); }
    } else if (id === 'jardin:4') {      // le Cercle des champignons (le Roi Champignon) : un rond de champignons autour de la salle
      lit.push(() => { const cx0 = (i0 + i1) / 2, rx = Math.min((i1 - i0) * 0.4, 260), ry = H * 0.36; for (let k = 0; k < 12; k++) { const a = k * MF_T / 12, px = cx0 + Math.cos(a) * rx, py = cy + Math.sin(a) * ry; if (free(px, py, 36)) mfMushroom(x, px, py, 9 + (k % 2) * 3, k % 3 ? '#46e6c8' : '#ffd060'); } });
    } else if (id === 'jardin:5') {      // le Bosquet du Vieux Chêne : le cercle de runes vert sous le boss, de grands buissons, des champignons
      for (const [fx, fy] of [[0.12, 0.25], [0.88, 0.25], [0.12, 0.8], [0.88, 0.8]]) { const px = G.x0 + (G.x1 - G.x0) * fx, py = at(fy); if (free(px, py, 46)) mfBush(x, px, py, 20, R); }
      lit.push(() => { if (bossY != null) mfRunes(x, nd.boss.x, bossY, Math.min(86, MW * 0.21), '#8cff50', 1); for (const p of spots([[i0 + 60, at(0.5)], [i1 - 60, at(0.5)]], 40, 14, 2)) mfMushroom(x, p[0], p[1], 12, '#b070ff'); });
    } else if (id === 'tour:0') {      // l'Escalier des étoiles : étagères, boules de cristal, une fenêtre ouverte sur les étoiles
      for (const sd of [-1, 1]) mfShelf(x, sd < 0 ? i0 + 12 : i1 - 12, cy, H * 0.5, 20, true, R);
      const w = spots([[MW / 2 + away(at(0.3)) * 150, at(0.3)], [MW / 2 - away(at(0.7)) * 150, at(0.7)]], 70, 40, 1)[0]; if (w) mfStarWindow(x, w[0], w[1], 70, 46, R);
      lit.push(() => { for (const p of spots([[i0 + 50, at(0.18)], [i1 - 50, at(0.82)], [i1 - 50, at(0.2)]], 40, 14, 2)) mfOrb(x, p[0], p[1], 10, '#c890ff'); });
    } else if (id === 'tour:1') {      // la Salle des grimoires : étagères pleines, un pupitre et son grimoire, des livres par terre
      for (const sd of [-1, 1]) mfShelf(x, sd < 0 ? i0 + 12 : i1 - 12, cy, H - 22, 22, true, R);
      const tb = spots([[MW / 2 - away(cy) * 120, at(0.5)], [MW / 2 + away(cy) * 170, at(0.5)], [i0 + 120, at(0.5)], [i1 - 120, at(0.5)]], 80, 50, 1)[0];
      if (tb) mfTable(x, tb[0], tb[1], 76, 32);
      for (let j = 0; j < 8; j++) { const py = top + 16 + R() * (H - 32), px = i0 + 40 + R() * (i1 - i0 - 80); if (free(px, py, 36)) mfBook(x, px, py, 6, R() * 3, Y); }
      lit.push(() => { if (!tb) return; x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, tb[0], tb[1] - 4, 50, '#7fe6ff', 0.5); x.restore(); mfBook(x, tb[0] - 8, tb[1] - 2, 10, 0.1, Y); mfCandles(x, Y, tb[0] + 26, tb[1] - 6); });
    } else if (id === 'tour:2') {      // l'Observatoire : la grande lunette, deux trous sur le ciel étoilé
      for (const p of spots([[i0 + 90, at(0.3)], [i1 - 90, at(0.7)], [i0 + 90, at(0.72)]], 70, 46, 2)) mfStarWindow(x, p[0], p[1], 64, 44, R);
      const tp = spots([[i1 - 80, at(0.3)], [i0 + 80, at(0.7)], [MW / 2 + 160, at(0.5)]], 60, 30, 1)[0]; if (tp) mfTelescope(x, tp[0], tp[1], 22, -0.6);
      lit.push(() => { for (const p of spots([[i0 + 34, at(0.1)], [i1 - 34, at(0.9)]], 30, 12, 2)) mfOrb(x, p[0], p[1], 9, '#7fe6ff'); });
    } else if (id === 'tour:3') {      // le Laboratoire : tables de fioles, le chaudron qui bouillonne, étagères
      for (const sd of [-1, 1]) mfShelf(x, sd < 0 ? i0 + 12 : i1 - 12, at(sd < 0 ? 0.3 : 0.7), H * 0.4, 20, true, R);
      lit.push(() => { for (const p of spots([[i0 + 90, at(0.25)], [i1 - 90, at(0.75)], [i0 + 90, at(0.75)]], 60, 40, 2)) mfPotions(x, p[0], p[1], 18, R); const c = spots([[MW / 2 + away(cy) * 170, cy], [MW / 2 - away(cy) * 170, cy]], 60, 24, 1)[0]; if (c) mfCauldron(x, c[0], c[1], 16); });
    } else if (id === 'tour:4') {      // le Dojo des ombres (le Maître ninja) : les tapis de paille, les râteliers, les cristaux
      const tw = Math.min(240, (i1 - i0) * 0.5), th = Math.min(120, H * 0.5); mfTatami(x, pathAt(cy), cy, tw, th);
      for (const sd of [-1, 1]) mfRack(x, sd < 0 ? i0 + 10 : i1 - 10, cy, H * 0.46, sd < 0 ? Math.PI / 2 : -Math.PI / 2);
      lit.push(() => { for (const [fx, fy] of [[0.15, 0.2], [0.85, 0.82]]) { const px = G.x0 + (G.x1 - G.x0) * fx, py = at(fy); if (free(px, py, 40)) mfCrystals(x, px, py, 12, '#c890ff'); } });
    } else if (id === 'tour:5') {      // le Sommet de l'Œil : le cercle de runes violet, les cristaux, les boules de cristal
      for (const [fx, fy] of [[0.12, 0.28], [0.88, 0.28], [0.12, 0.8], [0.88, 0.8]]) { const px = G.x0 + (G.x1 - G.x0) * fx, py = at(fy); if (free(px, py, 46)) mfPillar(x, Y, px, py, 15); }
      lit.push(() => { if (bossY != null) mfRunes(x, nd.boss.x, bossY, Math.min(86, MW * 0.21), '#c890ff', 1); for (const p of spots([[i0 + 60, at(0.5)], [i1 - 60, at(0.55)]], 40, 14, 2)) mfCrystals(x, p[0], p[1], 12, '#c890ff'); });
    } else if (id === 'trone:0') {      // le Grand Couloir : le tapis rouge, les colonnes, les bannières d'or
      mfCarpet(x, pathAt(cy), top, bot, 46);
      for (const [fx, fy] of [[0.14, 0.25], [0.86, 0.25], [0.14, 0.75], [0.86, 0.75]]) { const px = G.x0 + (G.x1 - G.x0) * fx, py = at(fy); if (free(px, py, 46)) mfPillar(x, Y, px, py, 14); }
      mfBanner(x, i0, at(0.4), -1, '#e8b83a'); mfBanner(x, i1, at(0.6), 1, '#c0302c');
    } else if (id === 'trone:1') {      // la Salle des banquets : les grandes tables, le tapis, les bougies
      mfCarpet(x, pathAt(cy), top, bot, 40);
      const fw = Math.min(150, (i1 - i0) * 0.32);
      for (const p of spots([[i0 + 20 + fw / 2, at(0.3)], [i1 - 20 - fw / 2, at(0.7)], [i0 + 20 + fw / 2, at(0.72)], [i1 - 20 - fw / 2, at(0.28)]], fw / 2 + 30, 20, 3)) mfFeast(x, p[0], p[1], fw, 30, R);
      lit.push(() => { const p = spots([[MW / 2 + away(cy) * 120, at(0.5)], [i0 + 40, at(0.5)]], 40, 12, 1)[0]; if (p) mfCandles(x, Y, p[0], p[1]); });
    } else if (id === 'trone:2') {      // la Galerie des trésors : tas d'or, boucliers aux murs, un rubis
      lit.push(() => { for (const p of spots([[i0 + 60, at(0.25)], [i1 - 60, at(0.7)], [i0 + 60, at(0.75)], [i1 - 60, at(0.25)], [MW / 2 + 160, at(0.5)]], 50, 22, 3)) mfCoins(x, p[0], p[1], 16, R); });
      for (const sd of [-1, 1]) mfShieldW(x, sd < 0 ? i0 + 20 : i1 - 20, at(sd < 0 ? 0.5 : 0.45), 11, sd < 0 ? '#8a1424' : '#2a3a8a', '#e8b83a');
    } else if (id === 'trone:3') {      // la Garde royale : armures, râteliers, bannières
      for (const sd of [-1, 1]) mfRack(x, sd < 0 ? i0 + 10 : i1 - 10, cy, H * 0.5, sd < 0 ? Math.PI / 2 : -Math.PI / 2);
      for (const p of spots([[i0 + 72, at(0.3)], [i1 - 72, at(0.7)], [i0 + 72, at(0.72)], [i1 - 72, at(0.28)]], 44, 24, 3)) mfArmor(x, p[0], p[1], 12);
      mfBanner(x, i0, at(0.2), -1, '#e8b83a'); mfBanner(x, i1, at(0.8), 1, '#e8b83a');
    } else if (id === 'trone:4') {      // la Salle du capitaine (le Capitaine de la garde) : le tapis, les braseros, les boucliers
      mfCarpet(x, pathAt(cy), top, bot, 44);
      for (const sd of [-1, 1]) mfShieldW(x, sd < 0 ? i0 + 20 : i1 - 20, at(sd < 0 ? 0.3 : 0.7), 11, '#2a4aa8', '#ffd34d');
      lit.push(() => { for (const [fx, fy] of [[0.18, 0.25], [0.82, 0.25], [0.18, 0.78], [0.82, 0.78]]) { const px = G.x0 + (G.x1 - G.x0) * fx, py = at(fy); if (free(px, py, 50)) mfBrazier(x, Y, px, py, 8); } });
    } else if (id === 'trone:5') {      // le Trône des ombres : le tapis jusqu'au trône, le cercle de runes violet, les braseros
      const tx = pathAt(top + 50); mfCarpet(x, tx, top + 40, bot, 46);
      lit.push(() => { mfThrone(x, tx, top + 44, 20); if (bossY != null) mfRunes(x, nd.boss.x, bossY, Math.min(86, MW * 0.21), '#c050ff', 1); for (const [fx, fy] of [[0.15, 0.3], [0.85, 0.3], [0.15, 0.8], [0.85, 0.8]]) { const px = G.x0 + (G.x1 - G.x0) * fx, py = at(fy); if (free(px, py, 50)) mfBrazier(x, Y, px, py, 8); } });
    } else {      // un monde que la carte ne connaît pas encore : tonneaux et bougies
      mfBarrel(x, i0 + 26, at(0.3), 11); mfBarrel(x, i1 - 26, at(0.7), 11);
      lit.push(() => mfCandles(x, Y, i1 - 30, at(0.25)));
    }
  } catch (e) { /* un décor raté ne casse rien */ }
  if (G.wide) {      // sur un grand écran, de quoi meubler les côtés (tonneaux, piliers ; enclumes et lave dans les forges ; neige dans les grottes)
    for (const sd of [-1, 1]) for (let j = 0; j < 2; j++) {
      const py = top + H * (0.28 + j * 0.44 + (R() - 0.5) * 0.1), px = sd < 0 ? i0 + 40 + R() * 60 : i1 - 40 - R() * 60;
      if (!free(px, py, 120)) continue;
      if (Y.kind === 'lava') { if (R() < 0.5) lit.push(() => mfLavaPool(x, px, py, 26, 16, R)); else mfAnvil(x, px, py, 13); }
      else if (Y.kind === 'ice') { if (R() < 0.5) mfSnow(x, px, py, 12); else mfIceSpikes(x, px, py, 12); }
      else if (R() < 0.45) { mfBarrel(x, px, py, 11); mfBarrel(x, px + sd * -18, py + 14, 9); }
      else mfPillar(x, Y, px, py, 14);
    }
  }
  // l'ombre de la salle (plus sombre le long des murs), les murs, puis tout ce qui brille
  x.fillStyle = Y.dark; x.fillRect(i0, top, i1 - i0, H);
  for (const [a, z] of [[i0, i0 + 80], [i1, i1 - 80]]) { const g = x.createLinearGradient(a, 0, z, 0); g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(Math.min(a, z), top, 80, H); }
  mfWallV(x, Y, G.x0, top, bot, G.wt, -1); mfWallV(x, Y, G.x1 - G.wt, top, bot, G.wt, 1);
  if (Y.kind === 'ice') { x.fillStyle = 'rgba(235,250,255,0.55)'; x.fillRect(G.x0, top, G.wt, 2); for (const wx of [G.x0 + 2, G.x1 - G.wt + 2]) for (let y = top + 6; y < bot; y += 24) x.fillRect(wx, y, G.wt - 4, 2.5); }      // le givre sur les murs
  const torches = [];
  for (let y = bot - 80, j = 0; y > top + 50; y -= 190, j++) { const sd = (b.k + j) & 1 ? 1 : -1; torches.push([sd < 0 ? G.x0 + G.wt : G.x1 - G.wt, y, sd < 0 ? 1 : -1]); }
  for (const t of torches) mfTorch(x, Y, t[0], t[1], t[2], false);
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, nd.x, nd.y, G.wide ? 220 : 160, Y.light, 0.13); x.restore();
  for (const f of lit) { try { f(); } catch (e) { /* */ } }
  for (const t of torches) mfTorch(x, Y, t[0], t[1], t[2], true);
  if (Y.kind === 'ice') mfFrost(x, i0, i1, top, bot, H / 9, R);
  else if (Y.kind !== 'lava') mfDust(x, i0, i1, top, bot, H / 22, R);
}
// ---- entre deux salles : la porte (herse levée, lumière dorée, chevrons vers la salle suivante) ----
function mfDoor(x, L, MW, b, def) {
  // entre deux salles : une porte ouverte (herse levée), la lumière dorée et les chevrons vers la salle suivante (comme dans le jeu)
  const Y = mfStyle(b.wid, def), G = mfGeo(MW), y = b.bot, th = Math.round(G.wt * 1.25), px = mfPathX(L, y), gw = 70;
  const g0 = Math.max(G.x0 + G.wt + 10, px - gw / 2), g1 = Math.min(G.x1 - G.wt - 10, px + gw / 2);
  mfWallH(x, Y, G.x0, G.x1, y, th, [[g0, g1]]);
  x.fillStyle = '#1e1a24'; x.fillRect(g0, y - th / 2, g1 - g0, 5);      // la herse levée : la barre et ses pointes
  for (let gx = g0 + 5; gx < g1 - 2; gx += 8) { x.beginPath(); x.moveTo(gx - 2, y - th / 2 + 5); x.lineTo(gx, y - th / 2 + 10); x.lineTo(gx + 2, y - th / 2 + 5); x.closePath(); x.fill(); }
  for (const ex of [g0 - 6, g1 + 6]) {      // les montants de la porte
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(ex - 5, y + th / 2, 14, 18);
    x.fillStyle = Y.wallDk; x.fillRect(ex - 8, y - th / 2 - 6, 16, th + 12);
    const pg = x.createLinearGradient(ex - 7, 0, ex + 7, 0); pg.addColorStop(0, mixHex(Y.wall, '#ffffff', 0.25)); pg.addColorStop(1, Y.wall2);
    x.fillStyle = pg; x.fillRect(ex - 7, y - th / 2 - 5, 14, th + 10);
  }
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, (g0 + g1) / 2, y - 4, 90, '#ffd36a', 0.45); x.restore();
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  for (let i = 0; i < 2; i++) {
    const cy = y - th / 2 - 18 - i * 16, cx = mfPathX(L, cy); x.globalAlpha = 0.9 - i * 0.3;
    x.beginPath(); x.moveTo(cx - 17, cy + 7); x.lineTo(cx, cy - 4); x.lineTo(cx + 17, cy + 7);
    x.strokeStyle = 'rgba(255,176,48,0.35)'; x.lineWidth = 8; x.stroke(); x.strokeStyle = '#ffd36a'; x.lineWidth = 3.4; x.stroke();
  }
  x.restore();
}
// ---- entre deux mondes : une grande arche, deux braseros, l'escalier ----
function mfGate(x, L, MW, b, def) {
  // entre deux mondes : un grand mur, une arche avec ses marches, deux braseros aux couleurs du monde qui commence
  const Y = mfStyle(b.wid, def), G = mfGeo(MW), y = b.bot, th = Math.round(G.wt * 2), px = mfPathX(L, y), gw = 100;
  const g0 = Math.max(G.x0 + G.wt + 16, px - gw / 2), g1 = Math.min(G.x1 - G.wt - 16, px + gw / 2);
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, (g0 + g1) / 2, y - 26, 170, Y.light, 0.4); x.restore();
  mfWallH(x, Y, G.x0, G.x1, y, th, [[g0, g1]]);
  for (let s = 0; s < 4; s++) { const sy = y + th / 2 - (s + 1) * th / 4; x.fillStyle = mixHex(Y.wall, '#000000', 0.12 + s * 0.12); x.fillRect(g0, sy, g1 - g0, th / 4 - 1.2); x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(g0, sy, g1 - g0, 1.4); }
  for (const ex of [g0 - 9, g1 + 9]) {
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(ex - 7, y + th / 2, 18, 22);
    x.fillStyle = Y.wallDk; x.fillRect(ex - 10, y - th / 2 - 9, 20, th + 18);
    const pg = x.createLinearGradient(ex - 9, 0, ex + 9, 0); pg.addColorStop(0, mixHex(Y.wall, '#ffffff', 0.3)); pg.addColorStop(1, Y.wall2);
    x.fillStyle = pg; x.fillRect(ex - 9, y - th / 2 - 8, 18, th + 16);
    x.fillStyle = mixHex(Y.wall, '#ffffff', 0.4); x.fillRect(ex - 11, y - th / 2 - 11, 22, 5);
  }
  mfBrazier(x, Y, g0 - 30, y + th / 2 + 20, 7.5); mfBrazier(x, Y, g1 + 30, y + th / 2 + 20, 7.5);
}
// ---- au début d'un tour : le portail vert (cercle de runes, tourbillon de lumière) ----
function mfPortal(x, L, MW, b, def) {
  const y = b.bot, px = mfPathX(L, y), R = Math.min(78, MW * 0.2);
  mfRunes(x, px, y, R, '#5cff94', 1);
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    x.strokeStyle = rgbaHex(k & 1 ? '#c8ffd8' : '#6fff9a', 0.55); x.lineWidth = 3 - k * 0.4; x.beginPath();
    for (let i = 0; i <= 40; i++) { const u = i / 40, a = k * Math.PI / 2 + u * 4.2, r = R * 0.72 * (1 - u * 0.9); x[i ? 'lineTo' : 'moveTo'](px + Math.cos(a) * r, y + Math.sin(a) * r); }
    x.stroke();
  }
  mfGlow(x, px, y, R * 0.55, '#d8ffe4', 0.6);
  x.restore();
}
// ---- le départ : l'entrée du donjon (l'escalier qui remonte de dehors) ----
function mfEntrance(x, L, MW, b, def) {
  const Y = mfStyle(b.wid, def), G = mfGeo(MW), y = L.H - 26, px = L.start.x, gw = 120;
  mfWallH(x, Y, G.x0, G.x1, y, 30, [[px - gw / 2, px + gw / 2]]);
  for (let s = 0; s < 3; s++) { x.fillStyle = mixHex(Y.wall, '#000000', 0.1 + s * 0.15); x.fillRect(px - gw / 2, y - 15 + s * 10, gw, 9); }
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, px, y + 10, 90, '#9fd8ff', 0.3); x.restore();
}
function mfPaint(x, L, MW, y0, h, def) {
  const B = mfBands(L, def);
  x.save(); x.translate(0, -y0);
  for (const b of B) {
    if (b.top > y0 + h + 4 || b.bot < y0 - 4) continue;
    x.save(); x.beginPath(); x.rect(0, b.top - 1, MW, b.bot - b.top + 2); x.clip();
    try { mfRoom(x, L, MW, b, def); } catch (e) { /* */ }
    x.restore();
  }
  for (const b of B) {      // portes, arches, portail, entrée : par-dessus les salles
    if (b.bot - 140 > y0 + h || b.bot + 140 < y0) continue;
    try { if (b.entry === 'door') mfDoor(x, L, MW, b, def); else if (b.entry === 'gate') mfGate(x, L, MW, b, def); else if (b.entry === 'portal') mfPortal(x, L, MW, b, def); else mfEntrance(x, L, MW, b, def); } catch (e) { /* */ }
  }
  // tout en haut : un mur et sa herse baissée (la suite du donjon reste à découvrir), le noir au-dessus
  const lb = B.length ? B[B.length - 1] : null;
  if (lb && L.capY != null) {
    const yW = L.capY + 66, G = mfGeo(MW), Y = mfStyle(lb.wid, def), px = lb.nd.boss ? lb.nd.boss.x : lb.nd.x;
    if (yW - 200 < y0 + h) {
      const g = x.createLinearGradient(0, yW - 150, 0, yW); g.addColorStop(0, 'rgba(5,3,10,0.97)'); g.addColorStop(1, 'rgba(5,3,10,0.55)');
      x.fillStyle = 'rgba(5,3,10,0.97)'; x.fillRect(0, y0, MW, Math.max(0, yW - 150 - y0)); x.fillStyle = g; x.fillRect(0, yW - 150, MW, 150);
      try {
        mfWallH(x, Y, G.x0, G.x1, yW, Math.round(G.wt * 1.4), [[px - 34, px + 34]]);
        x.fillStyle = '#100c16'; x.fillRect(px - 34, yW - G.wt * 0.7, 68, G.wt * 1.4);
        x.fillStyle = '#4a4452'; for (let gx = px - 30; gx <= px + 30; gx += 8) x.fillRect(gx - 1.2, yW - G.wt * 0.7, 2.4, G.wt * 1.4 + 6);      // la herse baissée
        x.fillRect(px - 34, yW - 2, 68, 3);
        for (const ex of [px - 40, px + 40]) { x.fillStyle = Y.wallDk; x.fillRect(ex - 7, yW - G.wt * 0.7 - 5, 14, G.wt * 1.4 + 10); x.fillStyle = mixHex(Y.wall, '#ffffff', 0.15); x.fillRect(ex - 6, yW - G.wt * 0.7 - 4, 12, G.wt * 1.4 + 8); }
        x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, px, yW - 30, 70, '#9b7bff', 0.25); x.restore();
      } catch (e) { /* */ }
    }
  }
  x.restore();
}

// ---- les médaillons : un disque de pierre à rivets, l'emblème de la salle au milieu ----
const MF_MED = new Map();
function mfMedImg(key, P, dpr, paint) {
  let cv = MF_MED.get(key);
  if (cv) return cv;
  if (MF_MED.size > 80) MF_MED.delete(MF_MED.keys().next().value);
  cv = document.createElement('canvas'); cv.width = cv.height = Math.max(1, Math.round(P * dpr));
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  try { paint(g); } catch (e) { /* */ }
  MF_MED.set(key, cv);
  return cv;
}
function mfNode(x, info, size, P, def) {
  const dpr = x.canvas.width / P, key = 'n' + (info.wid || '?') + info.stage + '|' + size + '|' + P + '|' + dpr.toFixed(2);
  x.drawImage(mfMedImg(key, P, dpr, (g) => mfNodePaint(g, info, size, P, def)), 0, 0, P, P);
}
function mfDisc(x, cx, cy, r, Y, acc, mini) {      // le disque de pierre : anneau gris (rouge et cloutée pour un mini-boss), rivets, fond sombre teinté du monde
  mapGlow(x, cx, cy, r + 11, mini ? '#ff4a5a' : acc, mini ? 0.6 : 0.5);
  if (mini) {      // les pointes de la couronne du mini-boss
    x.fillStyle = '#7a1420';
    for (let k = 0; k < 12; k++) { const a = k * MF_T / 12 - Math.PI / 2; x.beginPath(); x.moveTo(cx + Math.cos(a - 0.16) * (r - 1), cy + Math.sin(a - 0.16) * (r - 1)); x.lineTo(cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6)); x.lineTo(cx + Math.cos(a + 0.16) * (r - 1), cy + Math.sin(a + 0.16) * (r - 1)); x.closePath(); x.fill(); }
  }
  const rim = x.createLinearGradient(0, cy - r, 0, cy + r); rim.addColorStop(0, mini ? '#e05a64' : mixHex(Y.wall, '#ffffff', 0.25)); rim.addColorStop(1, mini ? '#6a1018' : Y.wall2);
  x.fillStyle = rim; x.beginPath(); x.arc(cx, cy, r, 0, MF_T); x.fill();
  x.strokeStyle = mini ? '#2a0408' : Y.wallDk; x.lineWidth = 1.4; x.stroke();
  for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4, rx = cx + Math.cos(a) * (r - 3.2), ry = cy + Math.sin(a) * (r - 3.2); x.fillStyle = mini ? '#2a0408' : Y.wallDk; x.beginPath(); x.arc(rx, ry, 1.7, 0, MF_T); x.fill(); x.fillStyle = 'rgba(255,255,255,0.45)'; x.beginPath(); x.arc(rx - 0.5, ry - 0.5, 0.7, 0, MF_T); x.fill(); }
  const ri = r * 0.78, bg = x.createRadialGradient(cx, cy - ri * 0.3, ri * 0.1, cx, cy, ri);
  bg.addColorStop(0, mixHex(Y.void1, mini ? '#ff4a5a' : acc, 0.28)); bg.addColorStop(1, Y.void0);
  x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, ri, 0, MF_T); x.fill();
  return ri;
}
function mfNodePaint(x, info, size, P, def) {
  const Y = mfStyle(info.wid, def), cx = P / 2, cy = P / 2, r = size / 2, acc = info.acc || Y.light, mini = !!info.mini;
  const ri = mfDisc(x, cx, cy, r, Y, acc, mini), s = ri;
  x.save(); x.beginPath(); x.arc(cx, cy, ri, 0, MF_T); x.clip(); x.translate(cx, cy);
  const id = info.wid + ':' + info.stage;
  if (id === 'crypte:0') {      // deux épées croisées et un crâne : la Salle des gardes
    for (const sg of [-1, 1]) {
      x.save(); x.rotate(sg * 0.72);
      const bl = x.createLinearGradient(-s * 0.08, 0, s * 0.08, 0); bl.addColorStop(0, '#9aa6b4'); bl.addColorStop(0.5, '#f4f8fc'); bl.addColorStop(1, '#8a96a4');
      x.fillStyle = bl; x.beginPath(); x.moveTo(-s * 0.07, s * 0.42); x.lineTo(-s * 0.07, -s * 0.62); x.lineTo(0, -s * 0.78); x.lineTo(s * 0.07, -s * 0.62); x.lineTo(s * 0.07, s * 0.42); x.closePath(); x.fill();
      x.strokeStyle = '#3a3440'; x.lineWidth = 0.8; x.stroke();
      x.fillStyle = '#ffcf4a'; x.fillRect(-s * 0.24, s * 0.4, s * 0.48, s * 0.09); x.fillStyle = '#6a3e1e'; x.fillRect(-s * 0.05, s * 0.49, s * 0.1, s * 0.22); x.fillStyle = '#ffcf4a'; x.beginPath(); x.arc(0, s * 0.74, s * 0.07, 0, MF_T); x.fill();
      x.restore();
    }
    mfSkull(x, 0, s * 0.05, s * 0.78, '#ffb04a');
  } else if (id === 'crypte:1') {      // la tombe et la main qui sort de terre : les Catacombes
    x.fillStyle = '#2a1c14'; x.fillRect(-s, s * 0.42, s * 2, s);
    const g = x.createLinearGradient(0, -s * 0.7, 0, s * 0.5); g.addColorStop(0, '#b4aeb8'); g.addColorStop(1, '#6e6874');
    x.fillStyle = g; x.beginPath(); x.moveTo(-s * 0.42, s * 0.48); x.lineTo(-s * 0.42, -s * 0.3); x.arc(0, -s * 0.3, s * 0.42, Math.PI, 0); x.lineTo(s * 0.42, s * 0.48); x.closePath(); x.fill();
    x.strokeStyle = '#3a3440'; x.lineWidth = 1; x.stroke();
    x.fillStyle = 'rgba(40,34,48,0.8)'; x.fillRect(-s * 0.06, -s * 0.48, s * 0.12, s * 0.5); x.fillRect(-s * 0.2, -s * 0.34, s * 0.4, s * 0.1);
    x.fillStyle = '#e9e0cc';
    x.save(); x.translate(-s * 0.48, s * 0.46); x.fillRect(-s * 0.05, -s * 0.22, s * 0.1, s * 0.24);
    for (let k = 0; k < 4; k++) { x.save(); x.translate(-s * 0.08 + k * s * 0.055, -s * 0.24); x.rotate(-0.35 + k * 0.22); x.fillRect(-s * 0.018, -s * 0.16, s * 0.036, s * 0.16); x.restore(); }
    x.restore();
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, s * 0.56, s * 0.1, s * 0.5, '#ffb04a', 0.6); x.restore();
    x.fillStyle = '#efe6d2'; x.fillRect(s * 0.5, s * 0.12, s * 0.12, s * 0.32); mfFlame(x, s * 0.56, s * 0.06, s * 0.09);
  } else if (id === 'crypte:2') {      // le squelette qui dort dans son lit : le Dortoir
    x.fillStyle = '#5e5864'; mapRect(x, -s * 0.85, -s * 0.2, s * 1.7, s * 0.95, s * 0.1); x.fill();
    x.fillStyle = '#c9b48a'; mapRect(x, -s * 0.78, -s * 0.14, s * 1.56, s * 0.82, s * 0.08); x.fill();
    x.fillStyle = '#7a2a2a'; mapRect(x, -s * 0.2, -s * 0.16, s * 0.98, s * 0.86, s * 0.08); x.fill();
    x.strokeStyle = 'rgba(40,10,10,0.5)'; x.lineWidth = 1; x.beginPath(); for (let k = 1; k < 4; k++) { x.moveTo(-s * 0.2 + k * s * 0.24, -s * 0.14); x.lineTo(-s * 0.2 + k * s * 0.24, s * 0.68); } x.stroke();
    mfSkull(x, -s * 0.48, s * 0.2, s * 0.62, null);
    x.fillStyle = '#d8e4ff'; x.font = '700 ' + (s * 0.36).toFixed(1) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('z', -s * 0.05, -s * 0.42); x.font = '700 ' + (s * 0.28).toFixed(1) + 'px sans-serif'; x.fillText('z', s * 0.22, -s * 0.62);
  } else if (id === 'crypte:3') {      // le grimoire ouvert et ses runes violettes : la Bibliothèque
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, -s * 0.05, s * 0.9, '#b48cff', 0.55); x.restore();
    x.save(); x.rotate(-0.12); mfBook(x, 0, s * 0.12, s * 0.6, 0, Y); x.restore();
    x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = '#d8c0ff'; x.lineWidth = 1.4; x.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const px = -s * 0.36 + k * s * 0.36, py = -s * 0.45 - (k & 1) * s * 0.14; x.beginPath(); x.moveTo(px - s * 0.08, py); x.lineTo(px + s * 0.08, py - s * 0.08); x.moveTo(px, py - s * 0.1); x.lineTo(px, py + s * 0.08); x.stroke(); }
    x.restore();
  } else if (id === 'crypte:4') {      // le Chevalier des os (mini-boss)
    mfKnight(x, s);
  } else if (id === 'crypte:5') {      // le cercle de runes bleu : l'Antre du Gardien
    mfRunes(x, 0, 0, s * 0.82, '#6fd8ff', 1);
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, 0, s * 0.5, '#bff2ff', 0.7); x.restore();
  } else if (id === 'forge:0') {      // le pont de pierre au-dessus de la lave
    const lg = x.createLinearGradient(0, s * 0.1, 0, s); lg.addColorStop(0, '#ffe27a'); lg.addColorStop(0.4, '#ff8a1f'); lg.addColorStop(1, '#a8280a');
    x.fillStyle = lg; x.beginPath(); x.moveTo(-s, s * 0.2); for (let X = -s; X <= s; X += s / 8) x.lineTo(X, s * 0.2 + Math.sin(X / s * 7) * s * 0.05); x.lineTo(s, s); x.lineTo(-s, s); x.closePath(); x.fill();
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, s * 0.4, s * 0.9, '#ff6a20', 0.5); x.restore();
    x.fillStyle = '#6e5e54'; x.beginPath(); x.moveTo(-s, -s * 0.05); x.lineTo(s, -s * 0.05); x.lineTo(s, s * 0.55); x.lineTo(s * 0.55, s * 0.55); x.quadraticCurveTo(0, -s * 0.05, -s * 0.55, s * 0.55); x.lineTo(-s, s * 0.55); x.closePath(); x.fill();
    x.strokeStyle = '#3a2c26'; x.lineWidth = 1; x.stroke();
    x.fillStyle = '#8e7e72'; x.fillRect(-s, -s * 0.16, s * 2, s * 0.13);
    x.strokeStyle = 'rgba(40,28,22,0.6)'; x.beginPath(); for (let X = -s; X < s; X += s * 0.28) { x.moveTo(X, -s * 0.16); x.lineTo(X, -s * 0.03); } x.stroke();
  } else if (id === 'forge:1') {      // l'enclume, le marteau et les étincelles : la Grande Forge
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, s * 0.55, s * 1.1, '#ff6a20', 0.55); x.restore();
    const an = () => { x.beginPath(); x.moveTo(-s * 0.8, -s * 0.02); x.lineTo(s * 0.42, -s * 0.02); x.quadraticCurveTo(s * 0.86, 0, s * 0.9, s * 0.16); x.lineTo(s * 0.42, s * 0.2);
      x.lineTo(s * 0.32, s * 0.42); x.lineTo(s * 0.46, s * 0.6); x.lineTo(-s * 0.46, s * 0.6); x.lineTo(-s * 0.32, s * 0.42); x.lineTo(-s * 0.42, s * 0.2); x.lineTo(-s * 0.8, s * 0.14); x.closePath(); };
    const ag = x.createLinearGradient(0, -s * 0.05, 0, s * 0.6); ag.addColorStop(0, '#9a98a6'); ag.addColorStop(0.3, '#55535e'); ag.addColorStop(1, '#2a2830');
    an(); x.fillStyle = ag; x.fill(); x.strokeStyle = '#141218'; x.lineWidth = 1.1; x.stroke();
    x.fillStyle = 'rgba(255,170,90,0.55)'; x.fillRect(-s * 0.76, -s * 0.02, s * 1.2, s * 0.05);
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, -s * 0.1, -s * 0.1, s * 0.42, '#ffb03a', 0.9); x.restore();
    x.fillStyle = '#ffe9a0'; mapRect(x, -s * 0.32, -s * 0.11, s * 0.42, s * 0.1, s * 0.03); x.fill();
    x.save(); x.translate(s * 0.34, -s * 0.46); x.rotate(-0.75);
    x.fillStyle = '#8a5a32'; x.fillRect(-s * 0.045, -s * 0.02, s * 0.09, s * 0.62);
    const hg = x.createLinearGradient(0, -s * 0.18, 0, 0); hg.addColorStop(0, '#c8c6d2'); hg.addColorStop(1, '#5a5866'); x.fillStyle = hg; mapRect(x, -s * 0.24, -s * 0.18, s * 0.48, s * 0.18, s * 0.03); x.fill();
    x.strokeStyle = '#141218'; x.lineWidth = 1; x.stroke();
    x.restore();
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 9; k++) { const a = -Math.PI * (0.15 + 0.7 * mfHash(k, 3)), d = s * (0.18 + 0.4 * mfHash(k, 5)); x.fillStyle = k & 1 ? '#ffd36a' : '#ff8a2a'; x.beginPath(); x.arc(-s * 0.12 + Math.cos(a) * d, -s * 0.05 + Math.sin(a) * d, s * 0.035, 0, MF_T); x.fill(); }
    x.restore();
  } else if (id === 'forge:2') {      // le creuset penché qui verse le métal en fusion dans le moule : les Fonderies
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, s * 0.1, s * 0.5, s * 0.95, '#ff8a2a', 0.7); x.restore();
    x.fillStyle = '#26242c'; mapRect(x, -s * 0.62, s * 0.3, s * 1.24, s * 0.42, s * 0.06); x.fill(); x.strokeStyle = '#0c0a10'; x.lineWidth = 1; x.stroke();
    const mg = x.createLinearGradient(0, s * 0.36, 0, s * 0.62); mg.addColorStop(0, '#fff3b0'); mg.addColorStop(0.5, '#ffb03a'); mg.addColorStop(1, '#d8541a');
    x.fillStyle = mg; mapRect(x, -s * 0.52, s * 0.37, s * 1.04, s * 0.26, s * 0.04); x.fill();
    x.lineCap = 'round'; x.strokeStyle = '#ffb03a'; x.lineWidth = s * 0.14; x.beginPath(); x.moveTo(s * 0.14, -s * 0.4); x.quadraticCurveTo(s * 0.24, -s * 0.1, s * 0.12, s * 0.38); x.stroke();
    x.strokeStyle = '#fff6c8'; x.lineWidth = s * 0.05; x.stroke();
    x.save(); x.translate(-s * 0.28, -s * 0.36); x.rotate(0.6);
    x.fillStyle = '#4a4652'; x.beginPath(); x.moveTo(-s * 0.32, -s * 0.28); x.lineTo(s * 0.32, -s * 0.28); x.lineTo(s * 0.24, s * 0.3); x.quadraticCurveTo(0, s * 0.38, -s * 0.24, s * 0.3); x.closePath(); x.fill();
    x.strokeStyle = '#141218'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(-s * 0.26, -s * 0.2, s * 0.08, s * 0.42);
    const cg = x.createRadialGradient(0, -s * 0.28, 0, 0, -s * 0.28, s * 0.34); cg.addColorStop(0, '#fff6c8'); cg.addColorStop(0.6, '#ffb03a'); cg.addColorStop(1, '#d8541a');
    x.fillStyle = cg; x.beginPath(); x.ellipse(0, -s * 0.28, s * 0.32, s * 0.09, 0, 0, MF_T); x.fill();
    x.restore();
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 7; k++) { const a = -Math.PI * (0.1 + 0.8 * mfHash(k, 7)), d = s * (0.22 + 0.35 * mfHash(k, 9)); x.fillStyle = k & 1 ? '#ffd36a' : '#ff8a2a'; x.beginPath(); x.arc(s * 0.12 + Math.cos(a) * d, s * 0.34 + Math.sin(a) * d * 0.6, s * 0.035, 0, MF_T); x.fill(); }
    x.restore();
  } else if (id === 'forge:3') {      // le bouclier et les deux haches croisées : l'Armurerie
    for (const sg of [-1, 1]) {
      x.save(); x.rotate(sg * 0.68);
      x.fillStyle = '#7a4a26'; x.fillRect(-s * 0.05, -s * 0.85, s * 0.1, s * 1.6);
      x.fillStyle = '#b8c0cc'; x.beginPath(); x.moveTo(s * 0.05, -s * 0.78); x.quadraticCurveTo(s * 0.5, -s * 0.66, s * 0.42, -s * 0.32); x.lineTo(s * 0.05, -s * 0.42); x.closePath(); x.fill();
      x.strokeStyle = '#3a3440'; x.lineWidth = 0.9; x.stroke();
      x.restore();
    }
    mfShieldW(x, 0, s * 0.08, s * 0.5, '#7a1a10', '#ffb04a');
  } else if (id === 'forge:4') {      // le Seigneur des braises (mini-boss)
    mfLord(x, s);
  } else if (id === 'forge:5') {      // l'œuf du dragon dans les braises : le Nid du dragon
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, s * 0.4, s, '#ff6a20', 0.6); x.restore();
    for (let k = 0; k < 7; k++) { const a = Math.PI * (0.05 + k / 7.5); mfFlame(x, Math.cos(a) * s * 0.55, s * 0.5 - Math.sin(a) * s * 0.1, s * 0.16); }
    const eg = x.createRadialGradient(-s * 0.15, -s * 0.25, s * 0.05, 0, 0, s * 0.6); eg.addColorStop(0, '#ffb07a'); eg.addColorStop(0.55, '#d8452a'); eg.addColorStop(1, '#6a1408');
    x.fillStyle = eg; x.beginPath(); x.ellipse(0, -s * 0.02, s * 0.36, s * 0.5, 0, 0, MF_T); x.fill();
    x.strokeStyle = 'rgba(80,14,4,0.6)'; x.lineWidth = 1;
    for (let rr = -2; rr <= 2; rr++) for (let cc = -1; cc <= 1; cc++) { x.beginPath(); x.arc(cc * s * 0.18 + (rr & 1) * s * 0.09, rr * s * 0.17, s * 0.09, 0.2, Math.PI - 0.2); x.stroke(); }
    x.fillStyle = 'rgba(255,240,220,0.35)'; x.beginPath(); x.ellipse(-s * 0.14, -s * 0.24, s * 0.08, s * 0.14, -0.3, 0, MF_T); x.fill();
    x.fillStyle = '#2a1410'; for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(-s * 0.5 + k * s * 0.25, s * 0.56, s * 0.16, s * 0.08, 0, 0, MF_T); x.fill(); }
  } else if (id === 'glace:0') {      // la rivière gelée : plaques de glace sur l'eau sombre
    const wg = x.createLinearGradient(0, -s, 0, s); wg.addColorStop(0, '#0e3a5a'); wg.addColorStop(1, '#062236'); x.fillStyle = wg; x.fillRect(-s, -s, s * 2, s * 2);
    for (const [px, py, rx, ry, a] of [[-0.35, -0.3, 0.42, 0.24, 0.2], [0.35, -0.05, 0.38, 0.22, -0.3], [-0.2, 0.42, 0.5, 0.2, 0.1], [0.55, 0.55, 0.25, 0.14, 0.5]]) {
      x.fillStyle = '#e8f8ff'; x.beginPath(); x.ellipse(px * s, py * s, rx * s, ry * s, a, 0, MF_T); x.fill();
      x.fillStyle = '#a8dcf4'; x.beginPath(); x.ellipse(px * s + s * 0.03, py * s + s * 0.04, rx * s * 0.8, ry * s * 0.6, a, 0, MF_T); x.fill();
    }
    x.strokeStyle = 'rgba(160,220,255,0.6)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-s, s * 0.12); x.quadraticCurveTo(-s * 0.4, 0, 0, s * 0.15); x.quadraticCurveTo(s * 0.4, s * 0.3, s, s * 0.18); x.stroke();
  } else if (id === 'glace:1') {      // les stalactites qui pendent
    const g = x.createLinearGradient(0, -s, 0, s); g.addColorStop(0, '#1a3a54'); g.addColorStop(1, '#0a1a2a'); x.fillStyle = g; x.fillRect(-s, -s, s * 2, s * 2);
    x.fillStyle = '#cfe9f6'; x.fillRect(-s, -s, s * 2, s * 0.3);
    for (const [px, l, w] of [[-0.62, 0.9, 0.16], [-0.32, 1.35, 0.2], [0.0, 1.05, 0.17], [0.3, 1.5, 0.22], [0.6, 0.85, 0.15]]) {
      const gg = x.createLinearGradient(px * s - w * s, 0, px * s + w * s, 0); gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.5, '#a8e4ff'); gg.addColorStop(1, '#5a9cc8');
      x.fillStyle = gg; x.beginPath(); x.moveTo(px * s - w * s, -s * 0.72); x.lineTo(px * s + w * s, -s * 0.72); x.lineTo(px * s, -s * 0.72 + l * s); x.closePath(); x.fill();
    }
    x.fillStyle = 'rgba(200,240,255,0.9)'; x.beginPath(); x.arc(s * 0.3, s * 0.88, s * 0.05, 0, MF_T); x.fill();
  } else if (id === 'glace:2') {      // les cristaux qui brillent
    x.save(); x.translate(0, s * 0.52); mfCrystals(x, 0, 0, s * 0.8, '#8fe9ff'); x.restore();
    x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = '#e8fbff';
    for (const [px, py, q] of [[-0.62, -0.42, 0.06], [0.58, -0.55, 0.05], [0.66, 0.1, 0.04], [-0.5, 0.3, 0.035]]) { x.beginPath(); x.moveTo(px * s, (py - q * 2) * s); x.lineTo((px + q * 0.5) * s, py * s); x.lineTo(px * s, (py + q * 2) * s); x.lineTo((px - q * 0.5) * s, py * s); x.closePath(); x.fill(); x.beginPath(); x.moveTo((px - q * 2) * s, py * s); x.lineTo(px * s, (py - q * 0.5) * s); x.lineTo((px + q * 2) * s, py * s); x.lineTo(px * s, (py + q * 0.5) * s); x.closePath(); x.fill(); }
    x.restore();
  } else if (id === 'glace:3') {      // le lac gelé et ses fissures
    mfFrozenLake(x, 0, s * 0.05, s * 0.85, s * 0.62, mapRng(17));
  } else if (id === 'glace:4') {      // le Yéti géant (mini-boss)
    mfYeti(x, s);
  } else if (id === 'glace:5') {      // le cœur de glace qui bat
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, 0, s, '#8fe9ff', 0.7); x.restore();
    mfIceHeart(x, 0, s * 0.05, s * 0.62);
  } else if (id === 'jardin:0') {      // le sentier de pierres plates dans la mousse, un petit champignon
    x.fillStyle = '#2e5a24'; x.fillRect(-s, -s, s * 2, s * 2);
    x.fillStyle = 'rgba(120,200,80,0.35)'; for (let k = 0; k < 12; k++) { x.beginPath(); x.arc(-s + mfHash(k, 1) * s * 2, -s + mfHash(k, 2) * s * 2, s * 0.12, 0, MF_T); x.fill(); }
    for (const [px, py, rx] of [[-0.1, 0.62, 0.26], [0.18, 0.18, 0.24], [-0.12, -0.26, 0.22], [0.14, -0.66, 0.2]]) { x.fillStyle = '#a8a294'; x.beginPath(); x.ellipse(px * s, py * s, rx * s, rx * s * 0.7, 0.3, 0, MF_T); x.fill(); x.fillStyle = 'rgba(255,255,255,0.25)'; x.beginPath(); x.ellipse(px * s - rx * s * 0.2, py * s - rx * s * 0.2, rx * s * 0.5, rx * s * 0.3, 0.3, 0, MF_T); x.fill(); }
    mfMushroom(x, -s * 0.56, s * 0.1, s * 0.2, '#46e6c8'); mfMushroom(x, s * 0.58, s * 0.4, s * 0.16, '#ffd060');
  } else if (id === 'jardin:1') {      // le champignon géant qui luit
    x.fillStyle = '#1a3a1e'; x.fillRect(-s, -s, s * 2, s * 2);
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, -s * 0.2, s * 0.9, '#46e6c8', 0.6); x.restore();
    x.fillStyle = '#efe2c4'; x.beginPath(); x.moveTo(-s * 0.16, -s * 0.05); x.lineTo(-s * 0.22, s * 0.75); x.lineTo(s * 0.22, s * 0.75); x.lineTo(s * 0.16, -s * 0.05); x.closePath(); x.fill();
    const g = x.createLinearGradient(0, -s * 0.7, 0, 0); g.addColorStop(0, '#9ffff0'); g.addColorStop(1, '#1ea890');
    x.fillStyle = g; x.beginPath(); x.moveTo(-s * 0.75, 0); x.bezierCurveTo(-s * 0.75, -s * 0.85, s * 0.75, -s * 0.85, s * 0.75, 0); x.closePath(); x.fill();
    x.fillStyle = '#ffffff'; for (const [px, py, r] of [[-0.35, -0.25, 0.1], [0.1, -0.45, 0.09], [0.42, -0.18, 0.08]]) { x.beginPath(); x.arc(px * s, py * s, r * s, 0, MF_T); x.fill(); }
  } else if (id === 'jardin:2') {      // le crapaud doré sur son nénuphar
    x.fillStyle = '#123828'; x.fillRect(-s, -s, s * 2, s * 2);
    x.fillStyle = '#4e9a34'; x.beginPath(); x.moveTo(0, s * 0.2); x.arc(0, s * 0.2, s * 0.75, 0.3, MF_T - 0.2); x.closePath(); x.fill();
    x.fillStyle = '#f2c22a'; x.beginPath(); x.ellipse(0, s * 0.05, s * 0.5, s * 0.38, 0, 0, MF_T); x.fill(); x.strokeStyle = '#6a4a08'; x.lineWidth = 1; x.stroke();
    for (const sg of [-1, 1]) { x.fillStyle = '#f2c22a'; x.beginPath(); x.arc(sg * s * 0.28, -s * 0.28, s * 0.16, 0, MF_T); x.fill(); x.stroke(); x.fillStyle = '#1a1028'; x.beginPath(); x.arc(sg * s * 0.28, -s * 0.28, s * 0.07, 0, MF_T); x.fill(); }
    x.fillStyle = '#1a1028'; for (const [px, py] of [[-0.2, 0.1], [0.18, 0.2], [0.05, -0.05]]) { x.beginPath(); x.arc(px * s, py * s, s * 0.05, 0, MF_T); x.fill(); }
    x.strokeStyle = '#6a4a08'; x.lineWidth = 1.4; x.beginPath(); x.arc(0, -s * 0.02, s * 0.22, 0.4, Math.PI - 0.4); x.stroke();
  } else if (id === 'jardin:3') {      // la ruche et l'abeille
    x.fillStyle = '#2a4a1e'; x.fillRect(-s, -s, s * 2, s * 2);
    for (let k = 0; k < 5; k++) { x.fillStyle = k & 1 ? '#d8a02a' : '#f2c44a'; x.beginPath(); x.ellipse(0, s * 0.45 - k * s * 0.22, s * (0.62 - k * 0.09), s * 0.14, 0, 0, MF_T); x.fill(); }
    x.fillStyle = '#3a2208'; x.beginPath(); x.arc(0, s * 0.38, s * 0.1, 0, MF_T); x.fill();
    x.save(); x.translate(s * 0.48, -s * 0.48); x.fillStyle = '#ffd23a'; x.beginPath(); x.ellipse(0, 0, s * 0.2, s * 0.14, 0.4, 0, MF_T); x.fill(); x.fillStyle = '#1a1208'; x.fillRect(-s * 0.04, -s * 0.13, s * 0.08, s * 0.26); x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.ellipse(-s * 0.04, -s * 0.18, s * 0.12, s * 0.06, -0.5, 0, MF_T); x.fill(); x.restore();
  } else if (id === 'jardin:4') {      // le Roi Champignon (mini-boss)
    mfMushKing(x, s);
  } else if (id === 'jardin:5') {      // le cercle de runes vert sous le Vieux Chêne
    mfRunes(x, 0, 0, s * 0.82, '#8cff50', 1);
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, 0, s * 0.5, '#d8ffb0', 0.7); x.restore();
    for (let k = 0; k < 6; k++) { const a = k * MF_T / 6; x.fillStyle = '#5aa83a'; x.beginPath(); x.ellipse(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3, s * 0.13, s * 0.07, a, 0, MF_T); x.fill(); }
  } else if (id === 'tour:0') {      // l'escalier en colimaçon parmi les étoiles
    x.fillStyle = '#0e0a28'; x.fillRect(-s, -s, s * 2, s * 2);
    x.fillStyle = '#ffffff'; for (let k = 0; k < 14; k++) { x.beginPath(); x.arc(-s + mfHash(k, 4) * s * 2, -s + mfHash(k, 6) * s * 2, s * (0.02 + 0.03 * mfHash(k, 8)), 0, MF_T); x.fill(); }
    for (let k = 0; k < 9; k++) { const a = k * 0.7 - 1, r0 = s * 0.18, r1 = s * 0.7; x.fillStyle = mixHex('#8a84c0', '#d8d4f0', k / 9); x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); x.lineTo(Math.cos(a + 0.62) * r1, Math.sin(a + 0.62) * r1); x.lineTo(Math.cos(a + 0.62) * r0, Math.sin(a + 0.62) * r0); x.closePath(); x.fill(); }
    x.fillStyle = '#4a4470'; x.beginPath(); x.arc(0, 0, s * 0.18, 0, MF_T); x.fill();
  } else if (id === 'tour:1') {      // le grimoire ouvert aux runes bleues
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, -s * 0.05, s * 0.9, '#7fe6ff', 0.55); x.restore();
    x.save(); x.rotate(-0.12); mfBook(x, 0, s * 0.12, s * 0.6, 0, Y); x.restore();
    x.fillStyle = '#5a3a8a'; mapRect(x, -s * 0.7, s * 0.52, s * 1.4, s * 0.14, s * 0.03); x.fill(); x.fillStyle = '#2a5a8a'; mapRect(x, -s * 0.6, s * 0.66, s * 1.2, s * 0.14, s * 0.03); x.fill();
  } else if (id === 'tour:2') {      // la lunette et la lune
    x.fillStyle = '#0e0a28'; x.fillRect(-s, -s, s * 2, s * 2);
    x.fillStyle = '#ffffff'; for (let k = 0; k < 10; k++) { x.beginPath(); x.arc(-s + mfHash(k, 3) * s * 2, -s + mfHash(k, 5) * s, s * 0.03, 0, MF_T); x.fill(); }
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, -s * 0.38, -s * 0.42, s * 0.5, '#fff2c0', 0.6); x.restore();
    x.fillStyle = '#fff2c0'; x.beginPath(); x.arc(-s * 0.38, -s * 0.42, s * 0.26, 0, MF_T); x.fill(); x.fillStyle = '#0e0a28'; x.beginPath(); x.arc(-s * 0.26, -s * 0.5, s * 0.22, 0, MF_T); x.fill();
    mfTelescope(x, s * 0.12, s * 0.38, s * 0.42, -0.65);
  } else if (id === 'tour:3') {      // la fiole qui bouillonne
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, s * 0.2, s * 0.85, '#7aff5a', 0.6); x.restore();
    x.fillStyle = 'rgba(220,240,255,0.35)'; x.beginPath(); x.moveTo(-s * 0.14, -s * 0.62); x.lineTo(-s * 0.14, -s * 0.2); x.lineTo(-s * 0.55, s * 0.55); x.quadraticCurveTo(0, s * 0.82, s * 0.55, s * 0.55); x.lineTo(s * 0.14, -s * 0.2); x.lineTo(s * 0.14, -s * 0.62); x.closePath(); x.fill();
    x.strokeStyle = '#e8f4ff'; x.lineWidth = 1.4; x.stroke();
    const g = x.createLinearGradient(0, 0, 0, s * 0.7); g.addColorStop(0, '#c8ff70'); g.addColorStop(1, '#2aa83a');
    x.fillStyle = g; x.beginPath(); x.moveTo(-s * 0.4, s * 0.25); x.lineTo(-s * 0.55, s * 0.55); x.quadraticCurveTo(0, s * 0.8, s * 0.55, s * 0.55); x.lineTo(s * 0.4, s * 0.25); x.closePath(); x.fill();
    x.fillStyle = '#e8ffd0'; for (const [px, py, r] of [[-0.1, 0.05, 0.07], [0.12, -0.2, 0.05], [0, -0.42, 0.04], [0.2, 0.4, 0.06]]) { x.beginPath(); x.arc(px * s, py * s, r * s, 0, MF_T); x.fill(); }
    x.fillStyle = '#8a5a32'; x.fillRect(-s * 0.17, -s * 0.74, s * 0.34, s * 0.12);
  } else if (id === 'tour:4') {      // le Maître ninja (mini-boss)
    mfNinja(x, s);
  } else if (id === 'tour:5') {      // l'œil d'or au milieu des runes
    mfRunes(x, 0, 0, s * 0.82, '#c890ff', 1);
    x.fillStyle = '#fff4c0'; x.beginPath(); x.moveTo(-s * 0.5, 0); x.quadraticCurveTo(0, -s * 0.42, s * 0.5, 0); x.quadraticCurveTo(0, s * 0.42, -s * 0.5, 0); x.closePath(); x.fill();
    x.fillStyle = '#ffb020'; x.beginPath(); x.arc(0, 0, s * 0.19, 0, MF_T); x.fill(); x.fillStyle = '#1a0830'; x.beginPath(); x.ellipse(0, 0, s * 0.05, s * 0.15, 0, 0, MF_T); x.fill();
  } else if (id === 'trone:0') {      // le tapis rouge entre deux colonnes, les bannières d'or
    x.fillStyle = '#cdb48e'; x.fillRect(-s, -s, s * 2, s * 2);
    x.fillStyle = '#8a1424'; x.fillRect(-s * 0.26, -s, s * 0.52, s * 2); x.fillStyle = '#e8b83a'; x.fillRect(-s * 0.26, -s, s * 0.05, s * 2); x.fillRect(s * 0.21, -s, s * 0.05, s * 2);
    for (const sg of [-1, 1]) { x.fillStyle = '#7a2a2a'; x.beginPath(); x.arc(sg * s * 0.62, -s * 0.2, s * 0.16, 0, MF_T); x.fill(); x.fillStyle = '#e8b83a'; x.fillRect(sg * s * 0.62 - s * 0.12, s * 0.15, s * 0.24, s * 0.5); x.beginPath(); x.moveTo(sg * s * 0.62 - s * 0.12, s * 0.65); x.lineTo(sg * s * 0.62, s * 0.52); x.lineTo(sg * s * 0.62 + s * 0.12, s * 0.65); x.closePath(); x.fillStyle = '#cdb48e'; x.fill(); }
  } else if (id === 'trone:1') {      // le poulet rôti et la coupe d'or
    x.fillStyle = '#f2ece0'; x.beginPath(); x.arc(0, s * 0.1, s * 0.62, 0, MF_T); x.fill(); x.strokeStyle = '#c8c0b0'; x.lineWidth = 1.5; x.stroke();
    const g = x.createRadialGradient(-s * 0.1, -s * 0.05, s * 0.05, 0, s * 0.1, s * 0.45); g.addColorStop(0, '#f2a050'); g.addColorStop(1, '#a8501a');
    x.fillStyle = g; x.beginPath(); x.ellipse(-s * 0.05, s * 0.12, s * 0.4, s * 0.3, -0.2, 0, MF_T); x.fill();
    x.fillStyle = '#f2e6d0'; for (const sg of [-1, 1]) { x.save(); x.translate(s * 0.3, s * 0.12 + sg * s * 0.14); x.rotate(sg * 0.4); x.fillRect(0, -s * 0.04, s * 0.22, s * 0.08); x.beginPath(); x.arc(s * 0.22, 0, s * 0.06, 0, MF_T); x.fill(); x.restore(); }
    x.fillStyle = '#e8b83a'; x.beginPath(); x.moveTo(s * 0.4, -s * 0.72); x.lineTo(s * 0.74, -s * 0.72); x.lineTo(s * 0.62, -s * 0.42); x.lineTo(s * 0.52, -s * 0.42); x.closePath(); x.fill(); x.fillStyle = '#8a1a2a'; x.beginPath(); x.ellipse(s * 0.57, -s * 0.7, s * 0.15, s * 0.04, 0, 0, MF_T); x.fill();
  } else if (id === 'trone:2') {      // le tas d'or et le rubis
    mfCoins(x, 0, s * 0.15, s * 0.7, mapRng(29));
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, -s * 0.3, s * 0.4, '#ff4a6a', 0.7); x.restore();
    x.fillStyle = '#e8204a'; x.beginPath(); x.moveTo(0, -s * 0.62); x.lineTo(s * 0.26, -s * 0.36); x.lineTo(0, -s * 0.06); x.lineTo(-s * 0.26, -s * 0.36); x.closePath(); x.fill(); x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.moveTo(0, -s * 0.58); x.lineTo(s * 0.12, -s * 0.38); x.lineTo(-s * 0.1, -s * 0.38); x.closePath(); x.fill();
  } else if (id === 'trone:3') {      // les deux lances croisées et le bouclier à la couronne
    for (const sg of [-1, 1]) { x.save(); x.rotate(sg * 0.7); x.fillStyle = '#7a4a26'; x.fillRect(-s * 0.035, -s * 0.85, s * 0.07, s * 1.6); x.fillStyle = '#d8dee8'; x.beginPath(); x.moveTo(0, -s * 0.98); x.lineTo(s * 0.1, -s * 0.72); x.lineTo(-s * 0.1, -s * 0.72); x.closePath(); x.fill(); x.restore(); }
    mfShieldW(x, 0, s * 0.08, s * 0.48, '#8a1424', '#e8b83a');
    x.fillStyle = '#ffd34d'; x.beginPath(); x.moveTo(-s * 0.2, s * 0.14); x.lineTo(-s * 0.2, -s * 0.06); x.lineTo(-s * 0.1, s * 0.04); x.lineTo(0, -s * 0.12); x.lineTo(s * 0.1, s * 0.04); x.lineTo(s * 0.2, -s * 0.06); x.lineTo(s * 0.2, s * 0.14); x.closePath(); x.fill();
  } else if (id === 'trone:4') {      // le Capitaine de la garde (mini-boss)
    mfCaptain(x, s);
  } else if (id === 'trone:5') {      // le trône des ombres
    x.fillStyle = '#1a0620'; x.fillRect(-s, -s, s * 2, s * 2);
    x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, -s * 0.1, s * 0.9, '#c050ff', 0.6); x.restore();
    x.fillStyle = '#4a1a2a'; mapRect(x, -s * 0.42, -s * 0.72, s * 0.84, s * 1.2, s * 0.06); x.fill();
    x.fillStyle = '#e8b83a'; for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(k * s * 0.17 - s * 0.07, -s * 0.72); x.lineTo(k * s * 0.17, -s * (0.92 + (2 - Math.abs(k)) * 0.05)); x.lineTo(k * s * 0.17 + s * 0.07, -s * 0.72); x.closePath(); x.fill(); }
    x.fillStyle = '#a81424'; mapRect(x, -s * 0.3, -s * 0.55, s * 0.6, s * 0.6, s * 0.05); x.fill();
    x.fillStyle = '#4a1a2a'; mapRect(x, -s * 0.62, s * 0.05, s * 1.24, s * 0.5, s * 0.06); x.fill(); x.fillStyle = '#a81424'; mapRect(x, -s * 0.42, s * 0.1, s * 0.84, s * 0.32, s * 0.04); x.fill();
    x.fillStyle = '#e8b83a'; x.fillRect(-s * 0.66, s * 0.48, s * 1.32, s * 0.08);
  } else {      // un monde à venir : son emblème, dessiné par le jeu
    const G = def && def.game(); if (G && G.drawWorldIcon) G.drawWorldIcon(x, (info.w | 0) + 1, 0, 0, s * 0.9);
  }
  x.restore();
  x.strokeStyle = rgbaHex(mini ? '#ff6a7a' : acc, 0.85); x.lineWidth = 1.6; x.beginPath(); x.arc(cx, cy, ri, 0, MF_T); x.stroke();
}
// ---- les boss : le Gardien de pierre (golem aux veines bleues), Braise le dragon, Givre l’hydre des glaces (trois têtes) ----
function mfBoss(x, bi, size, P, def) {
  const dpr = x.canvas.width / P, key = 'b' + (bi.bk || '?') + (bi.final ? 'F' : '') + '|' + size + '|' + P + '|' + dpr.toFixed(2);
  x.drawImage(mfMedImg(key, P, dpr, (g) => mfBossPaint(g, bi, size, P, def)), 0, 0, P, P);
}
function mfBossPaint(x, bi, size, P, def) {
  const golem = bi.bk === 'golem', dragon = bi.bk === 'dragon', hydre = bi.bk === 'hydre', BC = { ent: '#8cff50', oeil: '#c890ff', seigneur: '#ff6a2a' }, col = golem ? '#6fd8ff' : dragon ? '#ff6a2a' : hydre ? '#8fe9ff' : BC[bi.bk] || (bi.acc || '#9b7bff'), Y = mfStyle(bi.wid, def);
  const cx = P / 2, cy = P / 2 + 2, r = size / 2, gold = bi.final;
  mapGlow(x, cx, cy, r + 17, gold ? '#ffb22e' : col, 0.6);
  x.fillStyle = gold ? '#a87a1c' : '#2c2834'; x.beginPath(); x.arc(cx, cy, r + 7, 0, MF_T); x.fill();
  const rim = x.createLinearGradient(0, cy - r - 6, 0, cy + r + 6); rim.addColorStop(0, gold ? '#ffe9a0' : '#8e8896'); rim.addColorStop(1, gold ? '#b8860b' : '#4a4452');
  x.fillStyle = rim; x.beginPath(); x.arc(cx, cy, r + 5.5, 0, MF_T); x.fill();
  x.save(); x.strokeStyle = gold ? '#fff6c8' : col; x.lineWidth = 1.3; x.shadowColor = col; x.shadowBlur = 5 * dpr2(x);
  for (let k = 0; k < 12; k++) { const a = k * MF_T / 12, rx = cx + Math.cos(a) * (r + 2.6), ry = cy + Math.sin(a) * (r + 2.6); x.save(); x.translate(rx, ry); x.rotate(a + Math.PI / 2); x.beginPath(); x.moveTo(-1.6, -1.6); x.lineTo(1.6, 1.6); if (k & 1) { x.moveTo(1.6, -1.6); x.lineTo(0, 0); } x.stroke(); x.restore(); }
  x.restore();
  const bg = x.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
  bg.addColorStop(0, golem ? '#1f3a5a' : dragon ? '#5a1608' : hydre ? '#1c4a6a' : mixHex(Y.void1, col, 0.3)); bg.addColorStop(1, golem ? '#060c18' : dragon ? '#140402' : hydre ? '#030c16' : Y.void0);
  x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, r, 0, MF_T); x.fill();
  x.save(); x.beginPath(); x.arc(cx, cy, r - 1, 0, MF_T); x.clip(); x.translate(cx, cy);
  if (golem) mfGolem(x, r); else if (dragon) mfDragon(x, r); else if (hydre) mfHydra(x, r);
  else if (bi.bk === 'ent') mfEnt(x, r); else if (bi.bk === 'oeil') mfEye(x, r); else if (bi.bk === 'seigneur') mfDemonLord(x, r);
  else { const G = def && def.game(); if (G && G.drawWorldIcon) G.drawWorldIcon(x, 1, 0, 0, r * 0.8); }
  x.restore();
  x.strokeStyle = gold ? '#ffd34d' : col; x.lineWidth = 2.2; x.beginPath(); x.arc(cx, cy, r - 0.5, 0, MF_T); x.stroke();
}
function dpr2(x) { return Math.abs(x.getTransform().a) || 1; }
function mfGolem(x, r) {
  // le Gardien de pierre : un géant de roches (épaules, tête taillée à la hache, arcade lourde), des yeux et des veines bleus qui brillent
  const rock = (pts, k, cx0, cy0) => {
    x.beginPath(); pts.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0] * r, p[1] * r)); x.closePath();
    const g = x.createLinearGradient(cx0 * r - r * 0.5, cy0 * r - r * 0.5, cx0 * r + r * 0.5, cy0 * r + r * 0.6);
    g.addColorStop(0, mixHex('#9aa6b8', '#ffffff', k)); g.addColorStop(0.55, '#5f6b7e'); g.addColorStop(1, '#2c3442');
    x.fillStyle = g; x.fill(); x.strokeStyle = '#141a26'; x.lineWidth = 1.3; x.stroke();
  };
  rock([[-1.05, 0.42], [-0.72, 0.22], [-0.38, 0.3], [-0.3, 0.62], [-0.42, 1.05], [-1.05, 1.05]], 0.06, -0.7, 0.62);      // épaule gauche
  rock([[1.05, 0.4], [0.7, 0.2], [0.36, 0.3], [0.3, 0.64], [0.44, 1.05], [1.05, 1.05]], 0, 0.7, 0.62);      // épaule droite
  rock([[-0.42, 0.5], [0.42, 0.5], [0.5, 1.05], [-0.5, 1.05]], 0, 0, 0.78);      // le torse
  rock([[-0.5, -0.5], [-0.2, -0.72], [0.26, -0.7], [0.54, -0.46], [0.58, 0.02], [0.46, 0.38], [0.14, 0.52], [-0.18, 0.52], [-0.48, 0.36], [-0.6, 0.0]], 0.16, -0.05, -0.15);      // la tête
  x.fillStyle = '#2c3444'; x.beginPath(); x.moveTo(-0.6 * r, -0.2 * r); x.lineTo(0.6 * r, -0.24 * r); x.lineTo(0.5 * r, -0.04 * r); x.lineTo(0.1 * r, -0.08 * r); x.lineTo(-0.1 * r, -0.04 * r); x.lineTo(-0.52 * r, -0.02 * r); x.closePath(); x.fill();      // l'arcade
  x.fillStyle = '#0c1018'; x.beginPath(); x.ellipse(-0.24 * r, 0.03 * r, 0.17 * r, 0.08 * r, 0.1, 0, MF_T); x.ellipse(0.24 * r, 0.03 * r, 0.17 * r, 0.08 * r, -0.1, 0, MF_T); x.fill();
  x.fillStyle = '#141a24'; x.beginPath(); x.moveTo(-0.26 * r, 0.3 * r); x.lineTo(0.26 * r, 0.28 * r); x.lineTo(0.18 * r, 0.38 * r); x.lineTo(-0.2 * r, 0.39 * r); x.closePath(); x.fill();      // la bouche
  x.save(); x.globalCompositeOperation = 'lighter';
  for (const ex of [-0.24, 0.24]) { mapGlow(x, ex * r, 0.03 * r, 0.36 * r, '#6fd8ff', 0.9); x.fillStyle = '#eafcff'; x.beginPath(); x.ellipse(ex * r, 0.03 * r, 0.12 * r, 0.035 * r, 0, 0, MF_T); x.fill(); }
  mapGlow(x, 0, 0.33 * r, 0.22 * r, '#6fd8ff', 0.35);
  x.strokeStyle = 'rgba(140,235,255,0.95)'; x.lineWidth = 1.5; x.lineJoin = 'round'; x.shadowColor = '#6fd8ff'; x.shadowBlur = 7 * dpr2(x);
  const vein = (pts) => { x.beginPath(); pts.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0] * r, p[1] * r)); x.stroke(); };
  vein([[-0.36, -0.6], [-0.26, -0.44], [-0.34, -0.3]]); vein([[0.1, -0.68], [0.18, -0.5], [0.34, -0.42], [0.4, -0.3]]); vein([[0.46, 0.2], [0.3, 0.3]]);
  vein([[-0.86, 0.46], [-0.7, 0.62], [-0.76, 0.84], [-0.62, 1]]); vein([[0.8, 0.44], [0.66, 0.6], [0.74, 0.8]]); vein([[-0.08, 0.6], [0.06, 0.76], [-0.02, 0.98]]);
  x.restore();
  x.fillStyle = 'rgba(96,150,80,0.7)'; x.beginPath(); x.ellipse(0.06 * r, -0.66 * r, 0.24 * r, 0.06 * r, 0.05, 0, MF_T); x.ellipse(-0.8 * r, 0.34 * r, 0.16 * r, 0.05 * r, -0.4, 0, MF_T); x.fill();
}
function mfDragon(x, r) {
  // Braise : tête de profil (vers la gauche), cornes, œil jaune, petite flamme
  x.save();
  x.globalCompositeOperation = 'lighter'; mapGlow(x, -r * 0.62, r * 0.28, r * 0.6, '#ff8a2a', 0.8); x.globalCompositeOperation = 'source-over';
  mfFlame(x, -r * 0.78, r * 0.3, r * 0.2);
  const sk = x.createLinearGradient(0, -r * 0.6, 0, r * 0.8); sk.addColorStop(0, '#ff7a3a'); sk.addColorStop(0.55, '#d0391c'); sk.addColorStop(1, '#7a160a');
  // le cou et l'arrière de la tête
  x.fillStyle = sk; x.beginPath(); x.moveTo(r * 0.2, -r * 0.42); x.quadraticCurveTo(r * 0.75, -r * 0.3, r * 0.85, r * 0.2); x.lineTo(r * 1.05, r * 1.05); x.lineTo(r * 0.1, r * 1.05); x.quadraticCurveTo(r * 0.25, r * 0.45, -r * 0.05, r * 0.32); x.closePath(); x.fill();
  // les piques du cou
  x.fillStyle = '#ffcf6a'; for (let k = 0; k < 4; k++) { const t = k / 4, px = r * (0.42 + t * 0.42), py = -r * 0.36 + t * r * 0.9; x.beginPath(); x.moveTo(px, py); x.lineTo(px + r * 0.2, py - r * 0.04); x.lineTo(px + r * 0.06, py + r * 0.12); x.closePath(); x.fill(); }
  // la tête et le museau
  x.fillStyle = sk; x.beginPath(); x.moveTo(r * 0.36, -r * 0.4); x.quadraticCurveTo(-r * 0.05, -r * 0.5, -r * 0.42, -r * 0.18); x.lineTo(-r * 0.84, -r * 0.02);
  x.quadraticCurveTo(-r * 0.92, r * 0.1, -r * 0.8, r * 0.16); x.lineTo(-r * 0.42, r * 0.18); x.lineTo(-r * 0.66, r * 0.34); x.quadraticCurveTo(-r * 0.2, r * 0.46, r * 0.18, r * 0.3); x.quadraticCurveTo(r * 0.5, r * 0.1, r * 0.36, -r * 0.4); x.closePath(); x.fill();
  x.strokeStyle = '#4a0c04'; x.lineWidth = 1.3; x.stroke();
  // le dessous clair de la mâchoire
  x.fillStyle = 'rgba(255,190,110,0.55)'; x.beginPath(); x.moveTo(-r * 0.62, r * 0.32); x.quadraticCurveTo(-r * 0.2, r * 0.42, r * 0.14, r * 0.28); x.lineTo(r * 0.06, r * 0.22); x.quadraticCurveTo(-r * 0.25, r * 0.3, -r * 0.5, r * 0.24); x.closePath(); x.fill();
  // les crocs
  x.fillStyle = '#fff4e0'; for (const fx of [-0.72, -0.56]) { x.beginPath(); x.moveTo(r * fx, r * 0.17); x.lineTo(r * (fx + 0.06), r * 0.17); x.lineTo(r * (fx + 0.03), r * 0.27); x.closePath(); x.fill(); }
  // les cornes
  const hg = x.createLinearGradient(r * 0.1, -r * 0.4, r * 0.9, -r * 0.95); hg.addColorStop(0, '#f2e2c4'); hg.addColorStop(1, '#9a8060');
  x.fillStyle = hg;
  x.beginPath(); x.moveTo(r * 0.02, -r * 0.42); x.quadraticCurveTo(r * 0.3, -r * 0.95, r * 0.82, -r * 0.92); x.quadraticCurveTo(r * 0.36, -r * 0.7, r * 0.22, -r * 0.36); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(r * 0.26, -r * 0.36); x.quadraticCurveTo(r * 0.62, -r * 0.62, r * 0.98, -r * 0.48); x.quadraticCurveTo(r * 0.6, -r * 0.4, r * 0.38, -r * 0.22); x.closePath(); x.fill();
  // la narine, l'arcade, l'œil
  x.fillStyle = '#3a0804'; x.beginPath(); x.ellipse(-r * 0.74, -r * 0.03, r * 0.05, r * 0.03, -0.3, 0, MF_T); x.fill();
  x.fillStyle = '#7a160a'; x.beginPath(); x.moveTo(-r * 0.2, -r * 0.3); x.quadraticCurveTo(r * 0.0, -r * 0.42, r * 0.16, -r * 0.3); x.lineTo(r * 0.12, -r * 0.24); x.quadraticCurveTo(-r * 0.02, -r * 0.32, -r * 0.18, -r * 0.24); x.closePath(); x.fill();
  x.globalCompositeOperation = 'lighter'; mapGlow(x, -r * 0.02, -r * 0.17, r * 0.22, '#ffd23a', 0.8); x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#ffd23a'; x.beginPath(); x.ellipse(-r * 0.02, -r * 0.17, r * 0.1, r * 0.065, -0.2, 0, MF_T); x.fill();
  x.fillStyle = '#2a0a04'; x.beginPath(); x.ellipse(-r * 0.01, -r * 0.17, r * 0.022, r * 0.06, 0, 0, MF_T); x.fill();
  // la fumée qui sort de la narine
  x.fillStyle = 'rgba(80,60,60,0.35)'; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(-r * 0.86 - k * r * 0.08, -r * 0.14 - k * r * 0.14, r * (0.06 + k * 0.03), 0, MF_T); x.fill(); }
  x.restore();
}
// ---- les mini-boss (dans le médaillon de leur salle) et Givre, l'hydre des glaces ----
function mfKnight(x, s) {      // le Chevalier des os : un crâne sous un heaume, le panache rouge, les épaulières d'acier
  const ag = x.createLinearGradient(0, s * 0.45, 0, s); ag.addColorStop(0, '#dfe5ee'); ag.addColorStop(0.5, '#8a94a4'); ag.addColorStop(1, '#4a5260');
  x.fillStyle = ag; x.beginPath(); x.moveTo(-s, s); x.quadraticCurveTo(-s * 0.95, s * 0.5, -s * 0.42, s * 0.52); x.quadraticCurveTo(0, s * 0.68, s * 0.42, s * 0.52); x.quadraticCurveTo(s * 0.95, s * 0.5, s, s); x.closePath(); x.fill();
  x.strokeStyle = '#1c2028'; x.lineWidth = 1.2; x.stroke();
  x.strokeStyle = 'rgba(28,32,40,0.6)'; x.lineWidth = 1; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * s * 0.42, s * 0.56); x.quadraticCurveTo(sg * s * 0.72, s * 0.62, sg * s * 0.86, s * 0.9); x.stroke(); }
  x.fillStyle = '#ffcf4a'; for (const sg of [-1, 1]) { x.beginPath(); x.arc(sg * s * 0.62, s * 0.66, s * 0.045, 0, MF_T); x.fill(); }
  x.fillStyle = '#c0242c'; x.beginPath(); x.moveTo(-s * 0.05, -s * 0.62); x.bezierCurveTo(s * 0.2, -s * 1.0, s * 0.62, -s * 0.9, s * 0.72, -s * 0.5); x.bezierCurveTo(s * 0.45, -s * 0.66, s * 0.2, -s * 0.6, s * 0.08, -s * 0.48); x.closePath(); x.fill();
  mfSkull(x, 0, s * 0.12, s * 0.9, '#ff6a3a');
  const hg = x.createLinearGradient(-s * 0.55, -s * 0.6, s * 0.55, 0); hg.addColorStop(0, '#d8dee8'); hg.addColorStop(0.5, '#8a94a4'); hg.addColorStop(1, '#4a5260');
  x.fillStyle = hg; x.beginPath(); x.moveTo(-s * 0.56, s * 0.0); x.lineTo(-s * 0.56, -s * 0.28); x.quadraticCurveTo(-s * 0.55, -s * 0.7, 0, -s * 0.72); x.quadraticCurveTo(s * 0.55, -s * 0.7, s * 0.56, -s * 0.28); x.lineTo(s * 0.56, s * 0.0);
  x.lineTo(s * 0.4, s * 0.0); x.lineTo(s * 0.4, -s * 0.12); x.lineTo(-s * 0.4, -s * 0.12); x.lineTo(-s * 0.4, s * 0.0); x.closePath(); x.fill();
  x.strokeStyle = '#1c2028'; x.lineWidth = 1.2; x.stroke();
  x.fillStyle = '#2a3040'; x.fillRect(-s * 0.04, -s * 0.7, s * 0.08, s * 0.58);
  x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.ellipse(-s * 0.26, -s * 0.5, s * 0.14, s * 0.06, -0.5, 0, MF_T); x.fill();
}
function mfLord(x, s) {      // le Seigneur des braises : un démon rouge, cornes recourbées, yeux jaunes, couronne de flammes
  x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, -s * 0.55, s * 0.8, '#ff8a2a', 0.8); x.restore();
  for (let k = -2; k <= 2; k++) mfFlame(x, k * s * 0.2, -s * 0.62 - (2 - Math.abs(k)) * s * 0.06, s * 0.17);
  const hg = x.createLinearGradient(0, -s * 0.6, 0, -s * 0.1); hg.addColorStop(0, '#f2e2c4'); hg.addColorStop(1, '#8a6a4a'); x.fillStyle = hg;
  for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * s * 0.3, -s * 0.3); x.quadraticCurveTo(sg * s * 0.95, -s * 0.5, sg * s * 0.78, -s * 0.95); x.quadraticCurveTo(sg * s * 0.7, -s * 0.55, sg * s * 0.42, -s * 0.18); x.closePath(); x.fill(); }
  const fg = x.createRadialGradient(-s * 0.15, -s * 0.25, s * 0.05, 0, 0, s * 0.62); fg.addColorStop(0, '#ff6a4a'); fg.addColorStop(0.6, '#b8261a'); fg.addColorStop(1, '#5a0a08');
  x.fillStyle = fg; x.beginPath(); x.moveTo(-s * 0.42, -s * 0.3); x.quadraticCurveTo(0, -s * 0.52, s * 0.42, -s * 0.3); x.quadraticCurveTo(s * 0.55, s * 0.15, s * 0.22, s * 0.52); x.quadraticCurveTo(0, s * 0.66, -s * 0.22, s * 0.52); x.quadraticCurveTo(-s * 0.55, s * 0.15, -s * 0.42, -s * 0.3); x.closePath(); x.fill();
  x.strokeStyle = '#2a0404'; x.lineWidth = 1.2; x.stroke();
  x.fillStyle = '#3a0606'; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * s * 0.36, -s * 0.12); x.lineTo(sg * s * 0.06, -s * 0.02); x.lineTo(sg * s * 0.08, s * 0.06); x.lineTo(sg * s * 0.34, -s * 0.02); x.closePath(); x.fill(); }
  x.save(); x.globalCompositeOperation = 'lighter'; for (const sg of [-1, 1]) mapGlow(x, sg * s * 0.2, s * 0.08, s * 0.2, '#ffd23a', 0.9); x.restore();
  x.fillStyle = '#ffe680'; for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(sg * s * 0.2, s * 0.08, s * 0.09, s * 0.05, sg * 0.3, 0, MF_T); x.fill(); }
  x.fillStyle = '#2a0404'; x.beginPath(); x.moveTo(-s * 0.2, s * 0.3); x.quadraticCurveTo(0, s * 0.42, s * 0.2, s * 0.3); x.quadraticCurveTo(0, s * 0.36, -s * 0.2, s * 0.3); x.fill();
  x.fillStyle = '#fff4e0'; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * s * 0.14, s * 0.31); x.lineTo(sg * s * 0.08, s * 0.32); x.lineTo(sg * s * 0.11, s * 0.42); x.closePath(); x.fill(); }
}
function mfYeti(x, s) {      // le Yéti géant : une grosse tête de fourrure blanche, le visage bleu, les crocs
  x.fillStyle = '#f2f6fa'; x.beginPath();
  for (let k = 0; k < 30; k++) { const a = k * MF_T / 30, rr = s * (k & 1 ? 0.78 : 0.9); x[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr * 0.95 + s * 0.05); }
  x.closePath(); x.fill();
  x.fillStyle = 'rgba(150,180,205,0.5)'; x.beginPath(); x.ellipse(0, s * 0.42, s * 0.62, s * 0.34, 0, 0, MF_T); x.fill();
  const fg = x.createLinearGradient(0, -s * 0.3, 0, s * 0.45); fg.addColorStop(0, '#7ab6e0'); fg.addColorStop(1, '#3a78b0');
  x.fillStyle = fg; x.beginPath(); x.moveTo(-s * 0.42, -s * 0.18); x.quadraticCurveTo(0, -s * 0.42, s * 0.42, -s * 0.18); x.quadraticCurveTo(s * 0.5, s * 0.28, 0, s * 0.46); x.quadraticCurveTo(-s * 0.5, s * 0.28, -s * 0.42, -s * 0.18); x.closePath(); x.fill();
  x.fillStyle = '#f2f6fa'; x.beginPath(); for (let k = 0; k < 9; k++) { const px = -s * 0.44 + k * s * 0.11; x.lineTo(px, -s * 0.2 + (k & 1 ? s * 0.1 : 0)); } x.lineTo(s * 0.44, -s * 0.34); x.lineTo(-s * 0.44, -s * 0.34); x.closePath(); x.fill();
  x.fillStyle = '#0a1a2a'; for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(sg * s * 0.17, -s * 0.03, s * 0.07, s * 0.06, 0, 0, MF_T); x.fill(); }
  x.fillStyle = '#e0f6ff'; for (const sg of [-1, 1]) { x.beginPath(); x.arc(sg * s * 0.15, -s * 0.05, s * 0.02, 0, MF_T); x.fill(); }
  x.fillStyle = '#1a2a3a'; x.beginPath(); x.ellipse(0, s * 0.27, s * 0.24, s * 0.12, 0, 0, MF_T); x.fill();
  x.fillStyle = '#ffffff'; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * s * 0.18, s * 0.2); x.lineTo(sg * s * 0.1, s * 0.2); x.lineTo(sg * s * 0.14, s * 0.34); x.closePath(); x.fill(); }
  x.fillStyle = '#d8e8f4'; x.beginPath(); x.moveTo(-s * 0.08, s * 0.36); x.lineTo(s * 0.08, s * 0.36); x.lineTo(0, s * 0.27); x.closePath(); x.fill();
}
function mfHydra(x, r) {      // Givre, l'hydre des glaces : un corps de glace, trois longs cous, trois têtes de dragon (cornes de glace, yeux bleus qui brillent, crocs)
  x.save();
  x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, -r * 0.2, r, '#8fe9ff', 0.3); x.globalCompositeOperation = 'source-over';
  const skin = (y0, y1) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#d6f4ff'); g.addColorStop(0.45, '#6cb8e2'); g.addColorStop(1, '#2a5c8c'); return g; };
  const OUT = '#0c2640';
  // le corps (en bas) et ses écailles
  x.fillStyle = skin(r * 0.45, r * 1.1); x.beginPath(); x.ellipse(0, r * 0.95, r * 0.78, r * 0.5, 0, 0, MF_T); x.fill(); x.strokeStyle = OUT; x.lineWidth = r * 0.04; x.stroke();
  x.strokeStyle = 'rgba(12,38,64,0.45)'; x.lineWidth = r * 0.025;
  for (let k = -3; k <= 3; k++) { x.beginPath(); x.arc(k * r * 0.18, r * 0.72 + Math.abs(k) * r * 0.03, r * 0.1, 0.1, Math.PI - 0.1); x.stroke(); }
  // les cous : contour sombre, peau, ventre clair
  x.lineCap = 'round';
  for (const [ax, ay, cx2, cy2, ex, ey] of [[-r * 0.2, r * 0.7, -r * 0.62, r * 0.45, -r * 0.42, 0], [r * 0.2, r * 0.7, r * 0.62, r * 0.45, r * 0.42, 0], [0, r * 0.62, r * 0.12, r * 0.15, 0, -r * 0.3]]) {
    x.beginPath(); x.moveTo(ax, ay); x.quadraticCurveTo(cx2, cy2, ex, ey);
    x.strokeStyle = OUT; x.lineWidth = r * 0.27; x.stroke();
    x.strokeStyle = '#4f9ccc'; x.lineWidth = r * 0.2; x.stroke();
    x.strokeStyle = 'rgba(220,246,255,0.75)'; x.lineWidth = r * 0.07; x.stroke();
  }
  // une tête de profil (dir : -1 regarde à gauche, 1 à droite), le museau relevé, la gueule ouverte
  const side = (hx, hy, dir) => {
    const u = r * 0.44;
    x.save(); x.translate(hx, hy); x.scale(dir, 1); x.rotate(-0.35);
    x.fillStyle = '#eafcff'; x.strokeStyle = OUT; x.lineWidth = r * 0.025; x.lineJoin = 'round';
    for (const [bx, by, tx, ty] of [[-0.15, -0.3, -0.75, -0.75], [-0.3, -0.12, -0.9, -0.3]]) { x.beginPath(); x.moveTo(bx * u, by * u - 0.08 * u); x.lineTo(tx * u, ty * u); x.lineTo(bx * u + 0.12 * u, by * u + 0.06 * u); x.closePath(); x.fill(); x.stroke(); }
    x.fillStyle = '#2f6a9a'; x.beginPath(); x.moveTo(-0.1 * u, 0.12 * u); x.lineTo(0.8 * u, 0.42 * u); x.lineTo(0.74 * u, 0.52 * u); x.quadraticCurveTo(0.2 * u, 0.46 * u, -0.15 * u, 0.3 * u); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#081a2c'; x.beginPath(); x.moveTo(0.05 * u, 0.1 * u); x.lineTo(0.95 * u, 0.12 * u); x.lineTo(0.8 * u, 0.42 * u); x.closePath(); x.fill();
    x.fillStyle = '#ffffff';
    for (const fx of [0.4, 0.68]) { x.beginPath(); x.moveTo(fx * u, 0.12 * u); x.lineTo((fx + 0.09) * u, 0.12 * u); x.lineTo((fx + 0.035) * u, 0.29 * u); x.closePath(); x.fill(); }
    x.beginPath(); x.moveTo(0.5 * u, 0.37 * u); x.lineTo(0.6 * u, 0.39 * u); x.lineTo(0.55 * u, 0.23 * u); x.closePath(); x.fill();
    x.fillStyle = skin(-0.45 * u, 0.2 * u); x.beginPath();
    x.moveTo(-0.38 * u, 0.12 * u); x.quadraticCurveTo(-0.45 * u, -0.35 * u, -0.05 * u, -0.42 * u); x.quadraticCurveTo(0.3 * u, -0.45 * u, 0.5 * u, -0.22 * u);
    x.lineTo(0.98 * u, -0.06 * u); x.quadraticCurveTo(1.06 * u, 0.04 * u, 0.95 * u, 0.12 * u); x.lineTo(0.05 * u, 0.12 * u); x.quadraticCurveTo(-0.2 * u, 0.2 * u, -0.38 * u, 0.12 * u); x.closePath(); x.fill(); x.stroke();
    x.globalCompositeOperation = 'lighter'; mapGlow(x, 0.22 * u, -0.17 * u, 0.32 * u, '#8ff4ff', 0.9); x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#eaffff'; x.beginPath(); x.ellipse(0.22 * u, -0.17 * u, 0.13 * u, 0.08 * u, -0.25, 0, MF_T); x.fill();
    x.fillStyle = '#0a2236'; x.beginPath(); x.ellipse(0.24 * u, -0.17 * u, 0.03 * u, 0.07 * u, 0, 0, MF_T); x.fill();
    x.strokeStyle = OUT; x.lineWidth = r * 0.04; x.beginPath(); x.moveTo(0.04 * u, -0.31 * u); x.lineTo(0.42 * u, -0.25 * u); x.stroke();
    x.fillStyle = '#0a2236'; x.beginPath(); x.ellipse(0.88 * u, -0.04 * u, 0.045 * u, 0.028 * u, 0, 0, MF_T); x.fill();
    x.restore();
  };
  // la tête du milieu, de face : grandes cornes, yeux fendus, crocs
  const front = (hx, hy) => {
    const u = r * 0.5;
    x.save(); x.translate(hx, hy); x.lineJoin = 'round';
    x.fillStyle = '#eafcff'; x.strokeStyle = OUT; x.lineWidth = r * 0.025;
    for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * 0.22 * u, -0.38 * u); x.quadraticCurveTo(sg * 0.5 * u, -0.62 * u, sg * 0.62 * u, -0.85 * u); x.quadraticCurveTo(sg * 0.52 * u, -0.55 * u, sg * 0.42 * u, -0.3 * u); x.closePath(); x.fill(); x.stroke(); }
    x.fillStyle = skin(-0.45 * u, 0.6 * u); x.beginPath();
    x.moveTo(-0.42 * u, -0.3 * u); x.quadraticCurveTo(0, -0.52 * u, 0.42 * u, -0.3 * u); x.quadraticCurveTo(0.56 * u, 0, 0.3 * u, 0.3 * u);
    x.lineTo(0.2 * u, 0.62 * u); x.quadraticCurveTo(0, 0.72 * u, -0.2 * u, 0.62 * u); x.lineTo(-0.3 * u, 0.3 * u); x.quadraticCurveTo(-0.56 * u, 0, -0.42 * u, -0.3 * u); x.closePath(); x.fill(); x.stroke();
    x.globalCompositeOperation = 'lighter'; for (const sg of [-1, 1]) mapGlow(x, sg * 0.22 * u, -0.08 * u, 0.3 * u, '#8ff4ff', 0.9); x.globalCompositeOperation = 'source-over';
    for (const sg of [-1, 1]) { x.fillStyle = '#eaffff'; x.beginPath(); x.ellipse(sg * 0.22 * u, -0.08 * u, 0.13 * u, 0.07 * u, sg * 0.35, 0, MF_T); x.fill(); x.fillStyle = '#0a2236'; x.beginPath(); x.ellipse(sg * 0.22 * u, -0.08 * u, 0.03 * u, 0.06 * u, 0, 0, MF_T); x.fill(); }
    x.strokeStyle = OUT; x.lineWidth = r * 0.04; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * 0.07 * u, -0.17 * u); x.lineTo(sg * 0.38 * u, -0.25 * u); x.stroke(); }
    x.fillStyle = '#0a2236'; for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(sg * 0.08 * u, 0.48 * u, 0.04 * u, 0.028 * u, 0, 0, MF_T); x.fill(); }
    x.fillStyle = '#ffffff'; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * 0.09 * u, 0.6 * u); x.lineTo(sg * 0.2 * u, 0.58 * u); x.lineTo(sg * 0.14 * u, 0.82 * u); x.closePath(); x.fill(); }
    x.restore();
  };
  side(-r * 0.4, -r * 0.05, -1); side(r * 0.4, -r * 0.05, 1);
  front(0, -r * 0.42);
  x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(230,250,255,0.85)';
  for (const [px, py, q] of [[-0.78, -0.55, 0.035], [0.8, -0.5, 0.03], [-0.3, -0.86, 0.025], [0.66, 0.28, 0.025], [-0.72, 0.3, 0.02]]) { x.beginPath(); x.arc(px * r, py * r, q * r, 0, MF_T); x.fill(); }
  x.restore();
}
function mfIceHeart(x, cx, cy, s) {      // un cœur de glace taillé, qui brille
  x.beginPath(); x.moveTo(cx, cy + s * 0.9); x.bezierCurveTo(cx - s * 1.2, cy + s * 0.1, cx - s * 0.75, cy - s * 0.85, cx, cy - s * 0.35); x.bezierCurveTo(cx + s * 0.75, cy - s * 0.85, cx + s * 1.2, cy + s * 0.1, cx, cy + s * 0.9); x.closePath();
  const g = x.createLinearGradient(cx - s, cy - s, cx + s, cy + s); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#8fe0ff'); g.addColorStop(1, '#2a7ab8');
  x.fillStyle = g; x.fill(); x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 1.2; x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx, cy - s * 0.35); x.lineTo(cx - s * 0.3, cy + s * 0.15); x.lineTo(cx, cy + s * 0.9); x.moveTo(cx - s * 0.3, cy + s * 0.15); x.lineTo(cx - s * 0.75, cy - s * 0.2); x.moveTo(cx, cy - s * 0.35); x.lineTo(cx + s * 0.35, cy + s * 0.1); x.lineTo(cx, cy + s * 0.9); x.stroke();
}
// ---- mondes 4 à 6 (étape C) : le Jardin maudit, la Tour du sorcier, la Salle du trône ----
function mfMushroom(x, cx, cy, s, col) {      // un champignon géant vu de dessus : le chapeau qui luit, ses pois blancs
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx, cy, s * 2.6, col, 0.45); x.restore();
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(cx + s * 0.2, cy + s * 0.3, s, s * 0.8, 0, 0, MF_T); x.fill();
  const g = x.createRadialGradient(cx - s * 0.3, cy - s * 0.35, s * 0.1, cx, cy, s); g.addColorStop(0, mixHex(col, '#ffffff', 0.55)); g.addColorStop(0.6, col); g.addColorStop(1, mixHex(col, '#000000', 0.45));
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, s, 0, MF_T); x.fill(); x.strokeStyle = mixHex(col, '#000000', 0.6); x.lineWidth = 1; x.stroke();
  x.fillStyle = 'rgba(255,250,235,0.92)';
  for (const [a, d, r] of [[0.4, 0.5, 0.17], [2.2, 0.55, 0.14], [3.9, 0.45, 0.16], [5.3, 0.62, 0.11], [1.2, 0.15, 0.1]]) { x.beginPath(); x.arc(cx + Math.cos(a) * d * s, cy + Math.sin(a) * d * s, r * s, 0, MF_T); x.fill(); }
}
function mfBush(x, cx, cy, s, R) {      // un buisson rond (quelques boules de feuilles, des fleurs roses et jaunes)
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(cx + s * 0.25, cy + s * 0.35, s * 1.1, s * 0.8, 0, 0, MF_T); x.fill();
  for (let k = 0; k < 5; k++) {
    const a = k * 1.3 + R() * 0.5, d = k ? s * 0.45 : 0, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d, r = s * (k ? 0.55 : 0.7);
    const g = x.createRadialGradient(px - r * 0.3, py - r * 0.35, r * 0.1, px, py, r); g.addColorStop(0, '#7ad060'); g.addColorStop(0.7, '#3a8a3a'); g.addColorStop(1, '#1e4a22');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, MF_T); x.fill();
  }
  for (let k = 0; k < 4; k++) { const a = R() * MF_T, d = R() * s * 0.7; x.fillStyle = k & 1 ? '#ff8ad8' : '#ffe070'; x.beginPath(); x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s * 0.1, 0, MF_T); x.fill(); }
}
function mfLilyPond(x, cx, cy, rx, ry, R) {      // une mare sombre, des nénuphars, une fleur rose
  x.fillStyle = '#16301e'; x.beginPath(); x.ellipse(cx, cy, rx + 5, ry + 5, 0, 0, MF_T); x.fill();
  const g = x.createRadialGradient(cx, cy - ry * 0.3, 2, cx, cy, Math.max(rx, ry)); g.addColorStop(0, '#2a6a52'); g.addColorStop(1, '#0a2418');
  x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, MF_T); x.fill();
  for (let k = 0; k < 6; k++) {
    const a = R() * MF_T, d = R() * 0.7, px = cx + Math.cos(a) * rx * d, py = cy + Math.sin(a) * ry * d, r = 6 + R() * 7, n = R() * MF_T;
    x.fillStyle = k & 1 ? '#5aa83a' : '#3e8a2e'; x.beginPath(); x.moveTo(px, py); x.arc(px, py, r, n + 0.35, n + MF_T - 0.05); x.closePath(); x.fill();
    if (k === 2) { x.fillStyle = '#ff9ad8'; x.beginPath(); x.arc(px, py, 3.2, 0, MF_T); x.fill(); x.fillStyle = '#ffe680'; x.beginPath(); x.arc(px, py, 1.3, 0, MF_T); x.fill(); }
  }
}
function mfHive(x, cx, cy, s) {      // une ruche dorée vue de dessus (des anneaux de paille) et ses abeilles
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(cx + s * 0.2, cy + s * 0.3, s, s * 0.8, 0, 0, MF_T); x.fill();
  for (let k = 4; k >= 0; k--) { x.fillStyle = k & 1 ? '#d8a02a' : '#f2c44a'; x.beginPath(); x.arc(cx, cy, s * (0.3 + k * 0.17), 0, MF_T); x.fill(); }
  x.fillStyle = '#3a2208'; x.beginPath(); x.arc(cx, cy + s * 0.55, s * 0.16, 0, MF_T); x.fill();
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4, px = cx + Math.cos(a) * s * 1.3, py = cy + Math.sin(a) * s * 1.2; x.fillStyle = '#ffd23a'; x.beginPath(); x.ellipse(px, py, s * 0.16, s * 0.11, a, 0, MF_T); x.fill(); x.fillStyle = '#1a1208'; x.fillRect(px - s * 0.03, py - s * 0.1, s * 0.06, s * 0.2); x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.ellipse(px, py - s * 0.14, s * 0.12, s * 0.06, 0, 0, MF_T); x.fill(); }
}
function mfOrb(x, cx, cy, s, col) {      // une boule de cristal sur son socle (elle brille)
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(cx + s * 0.2, cy + s * 0.3, s * 1.05, s * 0.85, 0, 0, MF_T); x.fill();
  x.fillStyle = '#4a4470'; x.beginPath(); x.arc(cx, cy, s, 0, MF_T); x.fill(); x.fillStyle = '#6a64a0'; x.beginPath(); x.arc(cx, cy, s * 0.82, 0, MF_T); x.fill();
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx, cy, s * 3, col, 0.55); x.restore();
  const g = x.createRadialGradient(cx - s * 0.2, cy - s * 0.25, 1, cx, cy, s * 0.62); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, mixHex(col, '#ffffff', 0.4)); g.addColorStop(1, col);
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, s * 0.62, 0, MF_T); x.fill();
}
function mfStarWindow(x, cx, cy, w, h, R) {      // un trou ouvert sur le ciel étoilé (la Tour flotte dans la nuit)
  x.fillStyle = '#0a0820'; x.fillRect(cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8);
  const g = x.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2); g.addColorStop(0, '#1a0e3a'); g.addColorStop(0.5, '#2a1458'); g.addColorStop(1, '#0a1a3a');
  x.fillStyle = g; x.fillRect(cx - w / 2, cy - h / 2, w, h);
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let k = 0; k < w * h / 160; k++) { const px = cx - w / 2 + R() * w, py = cy - h / 2 + R() * h, r = R() < 0.15 ? 1.5 : 0.8; x.fillStyle = 'rgba(255,255,255,' + (0.4 + R() * 0.6).toFixed(2) + ')'; x.beginPath(); x.arc(px, py, r, 0, MF_T); x.fill(); }
  mfGlow(x, cx, cy, Math.max(w, h) * 0.7, '#8a6aff', 0.25);
  x.restore();
}
function mfTelescope(x, cx, cy, s, rot) {      // la lunette de l'observatoire sur son trépied
  x.save(); x.translate(cx, cy); x.rotate(rot);
  x.strokeStyle = '#4a3220'; x.lineWidth = s * 0.14; x.lineCap = 'round'; x.beginPath(); for (const a of [0.6, 2.7, 4.6]) { x.moveTo(0, 0); x.lineTo(Math.cos(a) * s * 0.9, Math.sin(a) * s * 0.9); } x.stroke();
  const g = x.createLinearGradient(0, -s * 0.2, 0, s * 0.2); g.addColorStop(0, '#f2d27a'); g.addColorStop(1, '#a8781e');
  x.fillStyle = g; x.beginPath(); x.moveTo(-s * 1.2, -s * 0.16); x.lineTo(s * 1.1, -s * 0.26); x.lineTo(s * 1.1, s * 0.26); x.lineTo(-s * 1.2, s * 0.16); x.closePath(); x.fill();
  x.strokeStyle = '#5a3a10'; x.lineWidth = 1; x.stroke();
  x.fillStyle = '#9fe0ff'; x.beginPath(); x.ellipse(s * 1.1, 0, s * 0.08, s * 0.24, 0, 0, MF_T); x.fill();
  x.restore();
}
function mfPotions(x, cx, cy, s, R) {      // une table d'alchimiste : fioles de couleurs (elles brillent un peu)
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(cx - s * 1.5 + 4, cy - s * 0.6 + 5, s * 3, s * 1.2);
  x.fillStyle = '#5a3a2a'; mapRect(x, cx - s * 1.5, cy - s * 0.6, s * 3, s * 1.2, 3); x.fill(); x.strokeStyle = '#2a1a10'; x.lineWidth = 1; x.stroke();
  for (let k = 0; k < 5; k++) { const px = cx - s * 1.15 + k * s * 0.58, py = cy + (k & 1 ? s * 0.18 : -s * 0.15), c = ['#9cff60', '#ff6ad8', '#6ad8ff', '#ffd060', '#b070ff'][k];
    x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, px, py, s * 0.6, c, 0.4); x.restore();
    x.fillStyle = c; x.beginPath(); x.arc(px, py, s * 0.2, 0, MF_T); x.fill(); x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.arc(px - s * 0.06, py - s * 0.07, s * 0.06, 0, MF_T); x.fill(); }
}
function mfCauldron(x, cx, cy, s) {      // un chaudron qui bouillonne (vert)
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(cx + s * 0.2, cy + s * 0.25, s * 1.1, s * 0.9, 0, 0, MF_T); x.fill();
  x.fillStyle = '#26242c'; x.beginPath(); x.arc(cx, cy, s, 0, MF_T); x.fill(); x.strokeStyle = '#4a4652'; x.lineWidth = s * 0.14; x.stroke();
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx, cy, s * 2.4, '#7aff5a', 0.5); x.restore();
  const g = x.createRadialGradient(cx, cy, 1, cx, cy, s * 0.8); g.addColorStop(0, '#e6ffb0'); g.addColorStop(1, '#3ac83a');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, s * 0.78, 0, MF_T); x.fill();
  x.fillStyle = 'rgba(240,255,210,0.8)'; for (const [a, d, r] of [[0.5, 0.4, 0.14], [2.5, 0.3, 0.1], [4.2, 0.45, 0.12]]) { x.beginPath(); x.arc(cx + Math.cos(a) * d * s, cy + Math.sin(a) * d * s, r * s, 0, MF_T); x.fill(); }
}
function mfTatami(x, cx, cy, w, h) {      // les tapis de paille du dojo
  for (let k = 0; k < 2; k++) {
    const px = cx - w / 2 + k * w / 2 + 2, pw = w / 2 - 4;
    x.fillStyle = '#c8b46a'; x.fillRect(px, cy - h / 2, pw, h); x.strokeStyle = '#3a4a2a'; x.lineWidth = 3; x.strokeRect(px + 1.5, cy - h / 2 + 1.5, pw - 3, h - 3);
    x.strokeStyle = 'rgba(120,100,40,0.35)'; x.lineWidth = 1; x.beginPath(); for (let y = cy - h / 2 + 6; y < cy + h / 2; y += 5) { x.moveTo(px + 3, y); x.lineTo(px + pw - 3, y); } x.stroke();
  }
}
function mfCarpet(x, cx, y0, y1, w) {      // le tapis rouge bordé d'or
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(cx - w / 2 + 3, y0, w, y1 - y0);
  x.fillStyle = '#8a1424'; x.fillRect(cx - w / 2, y0, w, y1 - y0);
  x.fillStyle = '#e8b83a'; x.fillRect(cx - w / 2, y0, 3, y1 - y0); x.fillRect(cx + w / 2 - 3, y0, 3, y1 - y0);
  x.fillStyle = 'rgba(232,184,58,0.7)'; for (let y = y0 + 30; y < y1 - 10; y += 60) { x.beginPath(); x.moveTo(cx, y - 7); x.lineTo(cx + 6, y); x.lineTo(cx, y + 7); x.lineTo(cx - 6, y); x.closePath(); x.fill(); }
}
function mfFeast(x, cx, cy, w, h, R) {      // la table du banquet : nappe blanche, assiettes, poulets rôtis, coupes
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(cx - w / 2 + 4, cy - h / 2 + 5, w, h);
  x.fillStyle = '#6a3a22'; mapRect(x, cx - w / 2, cy - h / 2, w, h, 3); x.fill();
  x.fillStyle = '#f2ece0'; mapRect(x, cx - w / 2 + 4, cy - h / 2 + 3, w - 8, h - 6, 2); x.fill();
  for (let k = 0; k < Math.floor(w / 30); k++) {
    const px = cx - w / 2 + 16 + k * 30, py = cy + (k & 1 ? 4 : -4);
    x.fillStyle = '#d8d4e0'; x.beginPath(); x.arc(px, py, 7, 0, MF_T); x.fill();
    if (k % 3 === 1) { x.fillStyle = '#b8642a'; x.beginPath(); x.ellipse(px, py, 5.5, 4, 0.3, 0, MF_T); x.fill(); x.fillStyle = '#f2e6d0'; x.fillRect(px + 3, py - 1, 4, 2); }
    else if (k % 3 === 2) { x.fillStyle = '#e8b83a'; x.beginPath(); x.arc(px, py, 3.2, 0, MF_T); x.fill(); x.fillStyle = '#8a1a2a'; x.beginPath(); x.arc(px, py, 2, 0, MF_T); x.fill(); }
    else { x.fillStyle = R() < 0.5 ? '#ff6a4a' : '#9cdc4a'; x.beginPath(); x.arc(px - 1.5, py, 2.4, 0, MF_T); x.arc(px + 2, py + 1, 2.2, 0, MF_T); x.fill(); }
  }
}
function mfCoins(x, cx, cy, s, R) {      // un tas de pièces d'or (et un rubis)
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx, cy, s * 2.2, '#ffc84a', 0.35); x.restore();
  for (let k = 0; k < 14; k++) { const a = R() * MF_T, d = R() * s * 0.8, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.8; x.fillStyle = k & 1 ? '#ffd860' : '#e8b030'; x.beginPath(); x.ellipse(px, py, s * 0.24, s * 0.18, 0, 0, MF_T); x.fill(); x.strokeStyle = '#8a5a10'; x.lineWidth = 0.8; x.stroke(); }
  x.fillStyle = '#e8204a'; x.beginPath(); x.moveTo(cx, cy - s * 0.3); x.lineTo(cx + s * 0.2, cy - s * 0.08); x.lineTo(cx, cy + s * 0.12); x.lineTo(cx - s * 0.2, cy - s * 0.08); x.closePath(); x.fill();
}
function mfThrone(x, cx, cy, s) {      // le trône du Seigneur des ombres vu de dessus : marbre sombre, coussin rouge, pointes d'or
  x.save(); x.globalCompositeOperation = 'lighter'; mfGlow(x, cx, cy, s * 3, '#b050ff', 0.45); x.restore();
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(cx - s * 1.3 + 4, cy - s * 0.9 + 5, s * 2.6, s * 1.9);
  x.fillStyle = '#2a1018'; mapRect(x, cx - s * 1.4, cy - s * 0.95, s * 2.8, s * 1.9, 4); x.fill();
  x.fillStyle = '#4a1a2a'; mapRect(x, cx - s, cy - s * 0.5, s * 2, s * 1.2, 3); x.fill();
  x.fillStyle = '#a81424'; mapRect(x, cx - s * 0.7, cy - s * 0.25, s * 1.4, s * 0.8, 3); x.fill();
  x.fillStyle = '#e8b83a'; x.fillRect(cx - s * 1.1, cy - s * 0.9, s * 2.2, s * 0.32);
  for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(cx + k * s * 0.42 - s * 0.14, cy - s * 0.9); x.lineTo(cx + k * s * 0.42, cy - s * (1.25 + (2 - Math.abs(k)) * 0.12)); x.lineTo(cx + k * s * 0.42 + s * 0.14, cy - s * 0.9); x.closePath(); x.fill(); }
}
// les emblèmes des mini-boss et des boss des mondes 4 à 6
function mfMushKing(x, s) {      // le Roi Champignon : un chapeau rouge à pois, des yeux ronds, la couronne d'or
  x.fillStyle = '#f2e6c8'; x.beginPath(); x.ellipse(0, s * 0.42, s * 0.42, s * 0.5, 0, 0, MF_T); x.fill();
  x.fillStyle = '#1a1028'; for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(sg * s * 0.15, s * 0.36, s * 0.07, s * 0.1, 0, 0, MF_T); x.fill(); }
  x.fillStyle = '#ffffff'; for (const sg of [-1, 1]) { x.beginPath(); x.arc(sg * s * 0.13, s * 0.33, s * 0.025, 0, MF_T); x.fill(); }
  const g = x.createRadialGradient(-s * 0.2, -s * 0.35, s * 0.1, 0, -s * 0.1, s * 0.85); g.addColorStop(0, '#ff8a7a'); g.addColorStop(0.6, '#d8302a'); g.addColorStop(1, '#7a1010');
  x.fillStyle = g; x.beginPath(); x.moveTo(-s * 0.86, s * 0.12); x.bezierCurveTo(-s * 0.9, -s * 0.72, s * 0.9, -s * 0.72, s * 0.86, s * 0.12); x.quadraticCurveTo(0, s * 0.26, -s * 0.86, s * 0.12); x.fill();
  x.strokeStyle = '#3a0808'; x.lineWidth = 1.1; x.stroke();
  x.fillStyle = '#fff8ec'; for (const [px, py, r] of [[-0.45, -0.12, 0.13], [0.1, -0.38, 0.12], [0.5, -0.08, 0.11], [-0.12, -0.08, 0.08]]) { x.beginPath(); x.arc(px * s, py * s, r * s, 0, MF_T); x.fill(); }
  x.fillStyle = '#ffd34d'; x.beginPath(); x.moveTo(-s * 0.3, -s * 0.5); x.lineTo(-s * 0.3, -s * 0.78); x.lineTo(-s * 0.15, -s * 0.62); x.lineTo(0, -s * 0.86); x.lineTo(s * 0.15, -s * 0.62); x.lineTo(s * 0.3, -s * 0.78); x.lineTo(s * 0.3, -s * 0.5); x.closePath(); x.fill();
  x.strokeStyle = '#8a5a10'; x.lineWidth = 1; x.stroke();
}
function mfNinja(x, s) {      // le Maître ninja : la cagoule noire, les yeux, le bandeau rouge, deux sabres
  for (const sg of [-1, 1]) { x.save(); x.rotate(sg * 0.8); x.fillStyle = '#c8ccd8'; x.fillRect(-s * 0.035, -s * 0.95, s * 0.07, s * 1.2); x.fillStyle = '#3a2a1a'; x.fillRect(-s * 0.05, s * 0.25, s * 0.1, s * 0.4); x.restore(); }
  const g = x.createRadialGradient(-s * 0.15, -s * 0.2, s * 0.1, 0, 0, s * 0.7); g.addColorStop(0, '#4a4658'); g.addColorStop(1, '#141218');
  x.fillStyle = g; x.beginPath(); x.arc(0, s * 0.05, s * 0.62, 0, MF_T); x.fill();
  x.fillStyle = '#c8202a'; x.fillRect(-s * 0.62, -s * 0.28, s * 1.24, s * 0.14); x.beginPath(); x.moveTo(s * 0.5, -s * 0.24); x.lineTo(s * 0.92, -s * 0.46); x.lineTo(s * 0.86, -s * 0.18); x.closePath(); x.fill();
  x.fillStyle = '#f2c9a0'; mapRect(x, -s * 0.42, -s * 0.06, s * 0.84, s * 0.24, s * 0.08); x.fill();
  x.fillStyle = '#1a1028'; for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(sg * s * 0.18, s * 0.06, s * 0.09, s * 0.06, 0, 0, MF_T); x.fill(); }
  x.fillStyle = '#ffffff'; for (const sg of [-1, 1]) { x.beginPath(); x.arc(sg * s * 0.16, s * 0.04, s * 0.025, 0, MF_T); x.fill(); }
}
function mfCaptain(x, s) {      // le Capitaine de la garde : tête d'oiseau-dragon bleu, bec jaune, chéchia rouge
  const g = x.createRadialGradient(-s * 0.15, -s * 0.15, s * 0.1, 0, s * 0.05, s * 0.7); g.addColorStop(0, '#7ab0ff'); g.addColorStop(1, '#2a4aa8');
  x.fillStyle = '#2a4aa8'; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * s * 0.4, -s * 0.2); x.lineTo(sg * s * 0.82, -s * 0.62); x.lineTo(sg * s * 0.58, -s * 0.06); x.closePath(); x.fill(); }
  x.fillStyle = g; x.beginPath(); x.arc(0, s * 0.08, s * 0.6, 0, MF_T); x.fill(); x.strokeStyle = '#121a40'; x.lineWidth = 1; x.stroke();
  x.fillStyle = '#ffd34d'; x.beginPath(); x.moveTo(-s * 0.2, s * 0.26); x.quadraticCurveTo(0, s * 0.62, s * 0.2, s * 0.26); x.closePath(); x.fill();
  x.fillStyle = '#ffffff'; for (const sg of [-1, 1]) { x.beginPath(); x.arc(sg * s * 0.2, s * 0.02, s * 0.12, 0, MF_T); x.fill(); }
  x.fillStyle = '#1a1028'; for (const sg of [-1, 1]) { x.beginPath(); x.arc(sg * s * 0.18, s * 0.04, s * 0.06, 0, MF_T); x.fill(); }
  x.fillStyle = '#c8202a'; x.beginPath(); x.moveTo(-s * 0.26, -s * 0.42); x.lineTo(-s * 0.2, -s * 0.8); x.lineTo(s * 0.2, -s * 0.8); x.lineTo(s * 0.26, -s * 0.42); x.closePath(); x.fill();
  x.fillStyle = '#1a1028'; x.beginPath(); x.moveTo(0, -s * 0.8); x.quadraticCurveTo(s * 0.32, -s * 0.78, s * 0.3, -s * 0.5); x.lineWidth = 2; x.strokeStyle = '#1a1028'; x.stroke();
  x.fillStyle = '#ffd34d'; x.beginPath(); x.arc(s * 0.3, -s * 0.48, s * 0.05, 0, MF_T); x.fill();
}
function mfEnt(x, r) {      // le Vieux Chêne : un visage d'écorce, la couronne de feuilles, des yeux d'ambre, de la mousse
  for (let k = 0; k < 9; k++) { const a = Math.PI + k * Math.PI / 8, px = Math.cos(a) * r * 0.62, py = -r * 0.25 + Math.sin(a) * r * 0.5; x.fillStyle = k & 1 ? '#3e8a2e' : '#5aa83a'; x.beginPath(); x.arc(px, py, r * 0.32, 0, MF_T); x.fill(); }
  const g = x.createLinearGradient(-r * 0.5, 0, r * 0.5, 0); g.addColorStop(0, '#4a2e18'); g.addColorStop(0.5, '#8a5a32'); g.addColorStop(1, '#3e2614');
  x.fillStyle = g; x.beginPath(); x.moveTo(-r * 0.46, -r * 0.3); x.quadraticCurveTo(0, -r * 0.5, r * 0.46, -r * 0.3); x.lineTo(r * 0.52, r); x.lineTo(-r * 0.52, r); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(30,16,6,0.6)'; x.lineWidth = 1.2; x.beginPath(); for (const px of [-0.3, -0.1, 0.15, 0.34]) { x.moveTo(px * r, -r * 0.3); x.quadraticCurveTo(px * r + r * 0.06, r * 0.3, px * r - r * 0.04, r); } x.stroke();
  x.fillStyle = '#2a1608'; for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(sg * r * 0.2, -r * 0.05, r * 0.13, r * 0.09, sg * 0.25, 0, MF_T); x.fill(); }
  x.save(); x.globalCompositeOperation = 'lighter'; for (const sg of [-1, 1]) mapGlow(x, sg * r * 0.2, -r * 0.05, r * 0.2, '#ffb030', 0.95); x.restore();
  x.fillStyle = '#ffd060'; for (const sg of [-1, 1]) { x.beginPath(); x.arc(sg * r * 0.2, -r * 0.05, r * 0.05, 0, MF_T); x.fill(); }
  x.fillStyle = '#1a0c04'; x.beginPath(); x.ellipse(0, r * 0.3, r * 0.2, r * 0.1, 0, 0, MF_T); x.fill();
  x.fillStyle = '#6ac04a'; for (const [px, py, rr] of [[-0.42, 0.5, 0.12], [0.4, 0.22, 0.1], [-0.15, 0.7, 0.09], [0.3, 0.75, 0.11]]) { x.beginPath(); x.arc(px * r, py * r, rr * r, 0, MF_T); x.fill(); }
}
function mfEye(x, r) {      // le Grand Œil : un corps violet, un grand œil d'or au milieu, des petits yeux, les dents, la lanterne
  x.strokeStyle = '#3a2060'; x.lineWidth = r * 0.06; x.beginPath(); x.moveTo(0, -r * 0.55); x.quadraticCurveTo(r * 0.2, -r * 0.95, r * 0.5, -r * 0.82); x.stroke();
  x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, r * 0.52, -r * 0.8, r * 0.25, '#ffe080', 0.9); x.restore();
  x.fillStyle = '#ffe9a0'; x.beginPath(); x.arc(r * 0.52, -r * 0.8, r * 0.08, 0, MF_T); x.fill();
  const g = x.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 0.8); g.addColorStop(0, '#b080e8'); g.addColorStop(0.6, '#6a3aa8'); g.addColorStop(1, '#2a1048');
  x.fillStyle = g; x.beginPath(); x.ellipse(0, r * 0.05, r * 0.78, r * 0.68, 0, 0, MF_T); x.fill(); x.strokeStyle = '#1a0830'; x.lineWidth = 1.2; x.stroke();
  for (const [px, py, rr] of [[-0.5, -0.25, 0.1], [0.52, -0.2, 0.09], [-0.42, 0.22, 0.08], [0.46, 0.25, 0.085]]) { x.fillStyle = '#ffe680'; x.beginPath(); x.arc(px * r, py * r, rr * r, 0, MF_T); x.fill(); x.fillStyle = '#1a0830'; x.beginPath(); x.arc(px * r, py * r, rr * r * 0.45, 0, MF_T); x.fill(); }
  x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, 0, -r * 0.08, r * 0.45, '#ffd040', 0.7); x.restore();
  x.fillStyle = '#fff4c0'; x.beginPath(); x.arc(0, -r * 0.08, r * 0.26, 0, MF_T); x.fill();
  x.fillStyle = '#ffb020'; x.beginPath(); x.arc(0, -r * 0.08, r * 0.17, 0, MF_T); x.fill();
  x.fillStyle = '#1a0830'; x.beginPath(); x.ellipse(0, -r * 0.08, r * 0.05, r * 0.14, 0, 0, MF_T); x.fill();
  x.fillStyle = '#2a0a20'; x.beginPath(); x.ellipse(0, r * 0.42, r * 0.36, r * 0.12, 0, 0, MF_T); x.fill();
  x.fillStyle = '#fff4e0'; for (let k = -3; k <= 3; k++) { x.beginPath(); x.moveTo(k * r * 0.09 - r * 0.035, r * 0.33); x.lineTo(k * r * 0.09 + r * 0.035, r * 0.33); x.lineTo(k * r * 0.09, r * 0.43); x.closePath(); x.fill(); }
}
function mfDemonLord(x, r) {      // le Seigneur des ombres : ailes sombres, cornes, yeux de braise, l'épée de feu
  x.fillStyle = '#2a0c30'; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * r * 0.2, r * 0.1); x.lineTo(sg * r * 0.95, -r * 0.7); x.lineTo(sg * r * 0.8, -r * 0.2); x.lineTo(sg * r * 0.98, -r * 0.1); x.lineTo(sg * r * 0.7, r * 0.15); x.lineTo(sg * r * 0.85, r * 0.4); x.lineTo(sg * r * 0.3, r * 0.5); x.closePath(); x.fill(); }
  x.save(); x.rotate(0.55); const sg2 = x.createLinearGradient(0, -r, 0, r * 0.4); sg2.addColorStop(0, '#fff2a0'); sg2.addColorStop(0.5, '#ff8a2a'); sg2.addColorStop(1, '#a82a0a');
  x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, r * 0.05, -r * 0.4, r * 0.5, '#ff6a20', 0.6); x.restore();
  x.fillStyle = sg2; x.beginPath(); x.moveTo(-r * 0.05, r * 0.4); x.lineTo(-r * 0.05, -r * 0.8); x.lineTo(r * 0.05, -r * 0.95); x.lineTo(r * 0.14, -r * 0.8); x.lineTo(r * 0.14, r * 0.4); x.closePath(); x.fill(); x.restore();
  const hg = x.createLinearGradient(0, -r * 0.6, 0, -r * 0.1); hg.addColorStop(0, '#f2e2c4'); hg.addColorStop(1, '#7a5a3a'); x.fillStyle = hg;
  for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * r * 0.24, -r * 0.32); x.quadraticCurveTo(sg * r * 0.7, -r * 0.42, sg * r * 0.56, -r * 0.88); x.quadraticCurveTo(sg * r * 0.5, -r * 0.5, sg * r * 0.12, -r * 0.42); x.closePath(); x.fill(); }
  const fg = x.createRadialGradient(-r * 0.1, -r * 0.2, r * 0.05, 0, 0, r * 0.55); fg.addColorStop(0, '#8a3a7a'); fg.addColorStop(0.6, '#4a1442'); fg.addColorStop(1, '#1a0418');
  x.fillStyle = fg; x.beginPath(); x.moveTo(-r * 0.36, -r * 0.34); x.quadraticCurveTo(0, -r * 0.52, r * 0.36, -r * 0.34); x.quadraticCurveTo(r * 0.44, r * 0.12, r * 0.16, r * 0.46); x.quadraticCurveTo(0, r * 0.56, -r * 0.16, r * 0.46); x.quadraticCurveTo(-r * 0.44, r * 0.12, -r * 0.36, -r * 0.34); x.fill();
  x.strokeStyle = '#0a0008'; x.lineWidth = 1.2; x.stroke();
  x.save(); x.globalCompositeOperation = 'lighter'; for (const sg of [-1, 1]) mapGlow(x, sg * r * 0.16, -r * 0.06, r * 0.18, '#ff7a20', 0.95); x.restore();
  x.fillStyle = '#ffd060'; for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(sg * r * 0.16, -r * 0.06, r * 0.08, r * 0.04, sg * 0.35, 0, MF_T); x.fill(); }
  x.fillStyle = '#0a0008'; x.beginPath(); x.moveTo(-r * 0.16, r * 0.24); x.quadraticCurveTo(0, r * 0.34, r * 0.16, r * 0.24); x.quadraticCurveTo(0, r * 0.29, -r * 0.16, r * 0.24); x.fill();
}
// ---- le départ : le mage (grand chapeau violet à bande orange, cape rouge, bâton à boule verte) ----
function mfMage(x, P) {
  const s = P / 72, cx = P / 2, by = P * 0.92;
  x.save();
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(cx, by, 18 * s, 4.5 * s, 0, 0, MF_T); x.fill();
  // le bâton et sa boule verte
  x.strokeStyle = '#6a3e1e'; x.lineWidth = 2.4 * s; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx + 15 * s, by - 2 * s); x.lineTo(cx + 19 * s, by - 40 * s); x.stroke();
  x.save(); x.globalCompositeOperation = 'lighter'; mapGlow(x, cx + 19.5 * s, by - 43 * s, 13 * s, '#7dff9a', 0.85); x.restore();
  x.fillStyle = '#9dffb4'; x.beginPath(); x.arc(cx + 19.5 * s, by - 43 * s, 4 * s, 0, MF_T); x.fill();
  // la cape et la robe
  x.fillStyle = '#b8322a'; x.beginPath(); x.moveTo(cx - 12 * s, by - 26 * s); x.quadraticCurveTo(cx - 16 * s, by - 6 * s, cx - 14 * s, by - 2 * s); x.lineTo(cx + 14 * s, by - 2 * s); x.quadraticCurveTo(cx + 16 * s, by - 6 * s, cx + 12 * s, by - 26 * s); x.closePath(); x.fill();
  const rb = x.createLinearGradient(0, by - 30 * s, 0, by); rb.addColorStop(0, '#6a52d8'); rb.addColorStop(1, '#3a2a8a');
  x.fillStyle = rb; x.beginPath(); x.moveTo(cx - 8 * s, by - 28 * s); x.lineTo(cx - 12 * s, by - 2 * s); x.lineTo(cx + 12 * s, by - 2 * s); x.lineTo(cx + 8 * s, by - 28 * s); x.closePath(); x.fill();
  x.fillStyle = '#ffb04a'; x.fillRect(cx - 9.5 * s, by - 14 * s, 19 * s, 2.4 * s);
  x.fillStyle = '#f2c9a0'; x.beginPath(); x.arc(cx + 12.5 * s, by - 16 * s, 2.8 * s, 0, MF_T); x.fill();      // la main sur le bâton
  // la tête
  x.fillStyle = '#f6d2b0'; x.beginPath(); x.arc(cx, by - 33 * s, 8.5 * s, 0, MF_T); x.fill();
  x.fillStyle = '#2a1a14'; x.beginPath(); x.arc(cx - 3 * s, by - 33 * s, 1.3 * s, 0, MF_T); x.arc(cx + 3 * s, by - 33 * s, 1.3 * s, 0, MF_T); x.fill();
  x.fillStyle = 'rgba(255,120,120,0.45)'; x.beginPath(); x.arc(cx - 5.5 * s, by - 30 * s, 1.6 * s, 0, MF_T); x.arc(cx + 5.5 * s, by - 30 * s, 1.6 * s, 0, MF_T); x.fill();
  // le grand chapeau
  const hg = x.createLinearGradient(cx - 18 * s, 0, cx + 18 * s, 0); hg.addColorStop(0, '#3e4cc0'); hg.addColorStop(0.5, '#5a6ae6'); hg.addColorStop(1, '#3442a8');
  x.fillStyle = hg; x.beginPath(); x.ellipse(cx, by - 39 * s, 19 * s, 5.5 * s, 0, 0, MF_T); x.fill();
  x.beginPath(); x.moveTo(cx - 11 * s, by - 40 * s); x.quadraticCurveTo(cx - 6 * s, by - 58 * s, cx + 4 * s, by - 66 * s); x.quadraticCurveTo(cx + 10 * s, by - 68 * s, cx + 13 * s, by - 63 * s);
  x.quadraticCurveTo(cx + 6 * s, by - 60 * s, cx + 6 * s, by - 54 * s); x.quadraticCurveTo(cx + 9 * s, by - 46 * s, cx + 11 * s, by - 40 * s); x.closePath(); x.fill();
  x.fillStyle = '#ff8a30'; x.beginPath(); x.moveTo(cx - 11 * s, by - 40 * s); x.quadraticCurveTo(cx, by - 44 * s, cx + 11 * s, by - 40 * s); x.lineTo(cx + 10.5 * s, by - 44.5 * s); x.quadraticCurveTo(cx, by - 48 * s, cx - 10 * s, by - 44.5 * s); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.ellipse(cx - 7 * s, by - 41 * s, 6 * s, 1.6 * s, 0, 0, MF_T); x.fill();
  x.restore();
}
// ---- au calme sur l'accueil : les médaillons se préparent ----
function mfWarm(L, bgDpr, dpr, def) {
  if (!window.requestIdleCallback || !L) return;
  const jobs = [], seen = new Set(), ns = def.nodeSize || 58, bs = def.bossSize || 70, G = mfGeo(L.W), k = Math.max(1, Math.min(2, bgDpr || 1));
  for (const nd of L.nodes) { const wid = nd.info.wid; if (!seen.has('f' + wid)) { seen.add('f' + wid); jobs.push(() => mfFloorStrip(mfStyle(wid, def), Math.ceil(G.x1 - G.wt) + 40, k)); } }      // les dalles
  for (const nd of L.nodes) {
    const info = nd.info, P = ns + 24, key = 'n' + (info.wid || '?') + info.stage + '|' + ns + '|' + P + '|' + dpr.toFixed(2);
    if (!seen.has(key)) { seen.add(key); jobs.push(() => mfMedImg(key, P, dpr, (g) => mfNodePaint(g, info, ns, P, def))); }
    if (nd.boss) { const bi = nd.boss.bi, P2 = bs + 34, key2 = 'b' + (bi.bk || '?') + (bi.final ? 'F' : '') + '|' + bs + '|' + P2 + '|' + dpr.toFixed(2); if (!seen.has(key2)) { seen.add(key2); jobs.push(() => mfMedImg(key2, P2, dpr, (g) => mfBossPaint(g, bi, bs, P2, def))); } }
  }
  const step = () => { const j = jobs.shift(); if (!j) return; try { j(); } catch (e) { /* */ } requestIdleCallback(step, { timeout: 2500 }); };
  requestIdleCallback(step, { timeout: 2500 });
}

/* ---------- progression : appareil + serveur ---------- */
const PROG = { room: null, rows: [], at: 0, missing: false, loading: null, mine: {}, busy: false };
let progQ = store.get('jdw.progq', []); if (!Array.isArray(progQ)) progQ = [];
{ const pc = store.get('jdw.progcache', null); if (pc && room && pc.room === room.id && Array.isArray(pc.rows)) { PROG.room = pc.room; PROG.rows = pc.rows; } }   // dernière carte connue (PROG.at = 0 : rechargée dès que possible)
const lvKey = (name, gid) => (cleanName(name) || '?') + '|' + gid;
function lvBest(name, gid) { const all = store.get('jdw.bestlv', {}) || {}; return +all[lvKey(name, gid)] || 0; }
function lvSetBest(name, gid, lv) { const all = store.get('jdw.bestlv', {}) || {}; const k = lvKey(name, gid); if (lv > (+all[k] || 0)) { all[k] = lv; store.set('jdw.bestlv', all); } }
// en pleine partie : un nouveau record de niveau est gardé sur l'appareil et part en ligne (seulement quand il monte)
function progTick() {
  if (!current || !current.inst || current.over || current.coop || !current.inst.currentLevel || $('jdw-play').hidden) return;
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
// retour d'Android : un B de la manette vient peut-être de faire la même chose (manette.js) → une seule fois
window.JDW_BACK = () => (PADJ && PADJ.nativeBack()) ? true : jdwBack();
function jdwBack() {
  if (QA.open) { quitAskClose(false); return true; }   // « Quitter la partie ? » : retour = Continuer
  if (popCloseAll()) return true;
  if (PADP.open) { padPauseClose(true); return true; }
  if (NAT.open) { nativeClose(); return true; }
  if (!$('jdw-coopgo').hidden) { coopGoClose(); return true; }
  if (!$('jdw-coop-pause').hidden) { coopResume('me'); return true; }
  if (!$('jdw-coopend').hidden) { flushCoopPending(); coopToLib(); return true; }
  if (!$('jdw-net').hidden) { netEnd(true); return true; }
  if (!$('jdw-watch').hidden) { watchStop(); return true; }
  if (MAP.open) { closeMap(); return true; }
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
  if (!$('jdw-play').hidden) { quitAsk(); return true; }   // partie en cours (coop comprise) : pause + « Quitter la partie ? » ; sinon direct
  if (MODE !== 'classique' && !$('jdw-lib').hidden) { setMode('classique', true); return true; }   // les autres modes sont des pages : retour à la page normale
  return false;
}
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
// coop en ligne, regarder, pseudo, tête, cri) demande un compte : bandeau « Crée ton compte », fenêtre jdw-guestask.
let guestWas = null;
function guestSync() {
  const g = isGuest();
  $('jdw-lib').classList.toggle('guest', g); document.body.classList.toggle('jdw-guest', g);
  guestBar();
  if (g === guestWas) return;
  const first = guestWas === null; guestWas = g;
  if (g) {
    const t = roomTopic(); room = null; if (t) RT.topics.delete(t);       // la salle reste retenue sur l'appareil (jdw.room)
    rtClose(); RT.topics.clear(); smsTopicOn = null;
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
  if (MODE === 'duel') renderSeats(); else if (MODE === 'coop') renderCoop();
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
  'Coop en ligne': 'Joue avec un copain, chacun sur son téléphone : vos scores d\'équipe vont au classement.',
  'Ton joueur': 'Ton pseudo, ta tête détourée et ton cri, dans tous les jeux.',
  'Le classement': 'Tes records enregistrés, le classement de ta salle et le classement mondial.',
  'Les copains de Pégase': 'Vois les avatars de tes copains, qui est là en ce moment, et garde ton avatar sur ton compte.'
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
// musique (gardée par jouer/sw.js) ; salles, chat, duel en ligne, coop en ligne, regarder, classement en ligne : « Il faut du réseau ».
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
  try { if (MODE === 'coop') renderCoop(); if (duoTiles.length) refreshDuoTiles(); if (coopTiles.length) refreshCoopTiles(); } catch (e) {}
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
// au calme (bibliothèque affichée, en ligne, page visible) : un jeu peut préparer en arrière-plan ce qui rendra sa 1re ouverture immédiate
// (JDW_GAMES.<id>.warm, une fois par ouverture de la borne ; ex. Pégase installe d'avance la reconnaissance des mots du micro, 42 Mo,
// seulement en Wi-Fi, s'il y a de la place et de la mémoire). Réessayé au retour du réseau.
let gameWarmDone = false;
// 1.22 (Pégase pour tous) : Pégase (42 Mo de reconnaissance des mots) ne prépare d'avance que sur un appareil qui a déjà ouvert son hub
// (une clé jdw.pegase.* : onglet, avatar, mots…) ; sinon c'est le hub qui s'en charge à sa 1re ouverture.
function warmWanted(id) {
  if (id !== 'pegase') return true;
  try { for (let i = 0; i < localStorage.length; i++) if (/^jdw\.pegase\./.test(localStorage.key(i) || '')) return true; } catch (e) {}
  return false;
}
function gameWarm() {
  if (gameWarmDone || netOff() || document.hidden) return;
  if (!onLibrary()) { setTimeout(gameWarm, 20000); return; }                     // en partie : plus tard
  gameWarmDone = true;
  for (const g of GAMES) if (g && typeof g.warm === 'function' && warmWanted(g.id)) { try { Promise.resolve(g.warm({ root: ROOT })).catch(() => {}); } catch (e) {} }
}
setTimeout(gameWarm, 30000);
window.addEventListener('online', () => setTimeout(gameWarm, 15000));

/* ================= Démarrage ================= */
['jdw-guestask', 'jdw-inv', 'jdw-invshare', 'jdw-play', 'jdw-end', 'jdw-board', 'jdw-settings', 'jdw-welcome', 'jdw-photo', 'jdw-cheer', 'jdw-rooms', 'jdw-rotate', 'jdw-notifs', 'jdw-profiles', 'jdw-chat', 'jdw-cri', 'jdw-members', 'jdw-duo', 'jdw-seatpick', 'jdw-coopgo', 'jdw-coop-pause', 'jdw-coopend', 'jdw-watch', 'jdw-net', 'jdw-netinv', 'jdw-map', 'jdw-acct'].forEach(id => { if ($(id)) $(id).hidden = true; });
if ($('jdw-pg')) $('jdw-pg').hidden = true;
$('jdw-lib').hidden = false;
if (isGuest()) room = null;      // la salle reste retenue sur l'appareil (jdw.room) : elle revient avec le compte
syncOwnPlayer();
buildLibrary(); buildDuoLibrary(); buildCoopLibrary(); buildTabs(); syncMute(); refreshAll(); setMode(MODE);
requestAnimationFrame(previewLoop);
nativeBoot();                   // appli Android 1.8+ : Pégase en vraie appli (étiquette de la tuile, installation en route)
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
window.JDW_SHELL = { players, headsList, music: () => ({ id: MUS.id, mode: MUS.mode, track: MUS.track, on: MUS.on, vol: MUS.gain ? +MUS.gain.gain.value.toFixed(3) : null }), toast: toastCheer, game: () => current && current.inst, duo: () => DUO.inst, duoApi: () => DUO.api, coop: () => COOP };   // diagnostic (tests)
})();

// ---------- Compteur d'images par seconde (essai) : réglage « 📈 Images/s (essai) » du menu du son, retenu sur l'appareil (jdw.fps).
// Un jeu peut publier ses propres chiffres dans window.JDW_FPS = { fps, ms, px, niveau, t } (images DESSINÉES par le jeu, résolution, niveau) ;
// sinon on montre la cadence de l'écran vue par la page (requestAnimationFrame) et la pire image. Rien ne tourne quand c'est éteint.
(() => {
  const $ = (id) => document.getElementById(id);
  const box = document.createElement('div'); box.id = 'jdw-fps'; box.hidden = true; document.body.appendChild(box);
  const cb = $('jdw-sm-fps'); let on = false; try { on = localStorage.getItem('jdw.fps') === '1'; } catch (e) {}
  if (cb) { cb.checked = on; cb.addEventListener('change', () => { on = cb.checked; try { localStorage.setItem('jdw.fps', on ? '1' : '0'); } catch (e) {} tick0(); }); }
  let raf = 0, n = 0, t0 = 0, last = 0, worst = 0;
  const inGame = () => !$('jdw-play').hidden || !$('jdw-duo').hidden;
  function draw(now) {
    raf = 0; if (!on || !inGame() || document.hidden) { box.hidden = true; return; }
    if (last) { const d = now - last; if (d > worst) worst = d; } last = now; n++;
    if (!t0) t0 = now;
    if (now - t0 >= 500) {
      const g = window.JDW_FPS, fresh = g && g.t && performance.now() - g.t < 2000;
      const fps = fresh ? g.fps : n * 1000 / (now - t0);
      box.textContent = fresh
        ? Math.round(g.fps) + ' i/s · ' + (+g.ms).toFixed(1) + ' ms' + (g.px ? ' · ' + (+g.px).toFixed(2) + ' px' : '') + (g.niveau ? ' · ' + g.niveau : '')
        : 'écran ' + Math.round(fps) + ' i/s · pire ' + Math.round(worst) + ' ms';
      box.classList.toggle('slow', fps < 50 && fps >= 30); box.classList.toggle('bad', fps < 30);
      box.hidden = false; n = 0; t0 = now; worst = 0;
    }
    raf = requestAnimationFrame(draw);
  }
  function tick0() { if (on && !raf) { last = 0; t0 = 0; n = 0; worst = 0; raf = requestAnimationFrame(draw); } if (!on) box.hidden = true; }
  // relancé quand une partie s'ouvre (le menu du son est dans la barre de jeu) et quand la page revient au premier plan
  new MutationObserver(tick0).observe($('jdw-play'), { attributes: true, attributeFilter: ['hidden'] });
  if ($('jdw-duo')) new MutationObserver(tick0).observe($('jdw-duo'), { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('visibilitychange', tick0);
  tick0();
})();
