/* ================= Manette (API Gamepad du navigateur) =================
   Couche commune de la borne : window.JDW_PAD (incluse par build2.py avant shell2.js ; les harnais de test la chargent aussi).
   - détection (branchement / débranchement), sorte de manette (Xbox, PlayStation, Nintendo, autre) et glyphes des boutons ;
   - lecture à chaque image (sticks avec zone morte ronde, gâchettes analogiques, croix), compteurs d'appuis ;
   - API des jeux : JDW_PAD.gameApi(opts) → api.pad (CONTRACT.md, « Ajout 10 : la manette ») ;
   - navigation de la borne (focus doré, A valider, B retour, gâchettes = onglets) : JDW_PAD.setup(hooks) par shell2.js ;
   - vibrations légères (réglage ⚙, jdw.padvib).
   Boutons (disposition « standard » du navigateur) : a (bas), b (droite), x (gauche), y (haut), lb, rb, lt, rt, select (Vue / Share),
   start (Menu / Options), ls, rs (clic des sticks), up, down, left, right (croix), home. « a » = le bouton du BAS (✕ sur PlayStation,
   B sur Nintendo : on garde la position, comme les jeux PC). */
(() => {
  'use strict';
  if (window.JDW_PAD) return;
  const BTN = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'select', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right', 'home'];
  const DEAD = 0.2, TRIG = 0.3;
  const now = () => performance.now();
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  // ---------- état ----------
  const S = {
    pads: new Map(),          // index du navigateur → { index, id, kind, order, held, cnt, ax, lt, rt, t }
    order: 0, raf: 0, last: 'none', lastKind: 'xbox', subs: new Set(), apis: new Set(), hooks: null,
    seen: !!store.get('jdw.padseen', false), vib: store.get('jdw.padvib', true) !== false,
    nav: { dir: '', next: 0, focus: null, sdir: '', scrollV: 0 }, backAt: 0, nativeBackAt: 0, log: []
  };
  const hasApi = () => typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';
  function kindOf(id) {
    id = String(id || '').toLowerCase();
    if (/045e|xbox|xinput|x-box|microsoft/.test(id)) return 'xbox';
    if (/054c|playstation|dualsense|dualshock|ps[345]|sony|wireless controller/.test(id)) return 'ps';
    if (/057e|nintendo|switch|joy-?con|pro controller/.test(id)) return 'nin';
    return 'gen';
  }
  const KIND_NAME = { xbox: 'Xbox', ps: 'PlayStation', nin: 'Nintendo', gen: '' };
  // ---------- glyphes ----------
  const LABEL = {
    xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', select: 'Vue', start: 'Menu', ls: 'L', rs: 'R', l3: 'L3', r3: 'R3' },
    gen: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', select: 'Select', start: 'Start', ls: 'L', rs: 'R', l3: 'L3', r3: 'R3' },
    ps: { a: '✕', b: '○', x: '□', y: '△', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', select: 'Share', start: 'Options', ls: 'L', rs: 'R', l3: 'L3', r3: 'R3' },
    nin: { a: 'B', b: 'A', x: 'Y', y: 'X', lb: 'L', rb: 'R', lt: 'ZL', rt: 'ZR', select: '−', start: '+', ls: 'L', rs: 'R', l3: 'L3', r3: 'R3' }
  };
  const FACE_COL = {
    xbox: { a: '#45c14a', b: '#ef4b42', x: '#3a8ff0', y: '#f5c330' },
    gen: { a: '#45c14a', b: '#ef4b42', x: '#3a8ff0', y: '#f5c330' },
    ps: { a: '#7fa8ff', b: '#ff6a6a', x: '#ff86d0', y: '#36d6a0' },
    nin: { a: '#e9f0f3', b: '#e9f0f3', x: '#e9f0f3', y: '#e9f0f3' }
  };
  const glyph = (btn, kind) => {
    kind = kind || S.lastKind; btn = btn === 'l3' ? 'ls' : btn === 'r3' ? 'rs' : btn;
    if (btn === 'dpad' || btn === 'up' || btn === 'down' || btn === 'left' || btn === 'right') return { dpad: '✚', up: '▲', down: '▼', left: '◀', right: '▶' }[btn];
    return (LABEL[kind] || LABEL.xbox)[btn] || String(btn).toUpperCase();
  };
  const NAMES = { ls: 'stick gauche', rs: 'stick droit', dpad: 'croix', l3: 'clic du stick gauche', r3: 'clic du stick droit' };
  // symboles PlayStation en SVG (nets partout, même sans police)
  const PS_SVG = {
    a: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    b: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="5.6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
    x: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.8" y="4.8" width="10.4" height="10.4" rx="1" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
    y: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.2L16 15H4z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/></svg>'
  };
  const STICK_SVG = l => '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/><circle cx="10" cy="10" r="5.2" fill="currentColor" opacity=".25"/><text x="10" y="13.6" text-anchor="middle" font-size="9.5" font-weight="700" fill="currentColor" font-family="system-ui,sans-serif">' + l + '</text></svg>';
  const DPAD_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.4 2.5h5.2v4.9h4.9v5.2h-4.9v4.9H7.4v-4.9H2.5V7.4h4.9z" fill="currentColor" opacity=".9"/></svg>';
  // une puce de glyphe (DOM) : <span class="pad-g" data-b="a" data-k="xbox">A</span>
  function chip(btn, kind) {
    kind = kind || S.lastKind;
    const el = document.createElement('span'); el.className = 'pad-g'; el.dataset.b = btn; el.dataset.k = kind;
    if (btn === 'ls' || btn === 'rs' || btn === 'l3' || btn === 'r3') { el.classList.add('pad-g-stick'); el.innerHTML = STICK_SVG(btn[0] === 'l' ? 'L' : 'R'); }
    else if (btn === 'dpad') { el.classList.add('pad-g-dpad'); el.innerHTML = DPAD_SVG; }
    else if (/^(a|b|x|y)$/.test(btn)) {
      el.classList.add('pad-g-face'); el.style.setProperty('--gc', FACE_COL[kind][btn]);
      if (kind === 'ps') el.innerHTML = PS_SVG[btn]; else el.textContent = glyph(btn, kind);
    } else { el.classList.add('pad-g-key'); el.textContent = glyph(btn, kind); }
    el.title = btn === 'ls' || btn === 'rs' || btn === 'dpad' ? NAMES[btn] : glyph(btn, kind);
    return el;
  }
  // « ls/dpad » = l'un OU l'autre ; « lt+rt » = les deux
  function chips(keys, kind) {
    const f = document.createDocumentFragment(); let first = true;
    for (const part of String(keys).split(/([/+])/)) {
      if (part === '/' || part === '+') { const s = document.createElement('span'); s.className = 'pad-g-sep'; s.textContent = part === '/' ? '/' : '+'; f.appendChild(s); continue; }
      if (!part) continue; f.appendChild(chip(part, kind)); first = false;
    }
    return f;
  }
  // liste des commandes d'un jeu (pad.help = [[touches, texte], …]) → <ul class="pad-help">
  function helpList(help, kind) {
    const ul = document.createElement('ul'); ul.className = 'pad-help';
    for (const row of help || []) {
      if (!row || !row[0]) continue;
      const li = document.createElement('li'); const k = document.createElement('span'); k.className = 'pad-help-k'; k.appendChild(chips(row[0], kind));
      const t = document.createElement('span'); t.className = 'pad-help-t'; t.textContent = row[1] || ''; li.append(k, t); ul.appendChild(li);
    }
    return ul;
  }
  // glyphe dessiné dans un canvas (aides et tutoriels des jeux) : centre (x, y), rayon r
  function drawGlyph(ctx, btn, x, y, r, kind) {
    kind = kind || S.lastKind; r = r || 11;
    ctx.save(); ctx.translate(x, y);
    const face = /^(a|b|x|y)$/.test(btn), col = face ? FACE_COL[kind][btn] : '#e9f0f3';
    if (btn === 'dpad') {
      ctx.fillStyle = 'rgba(11,20,28,.85)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#e9f0f3'; const a = r * 0.28, b = r * 0.78;
      ctx.fillRect(-a, -b, 2 * a, 2 * b); ctx.fillRect(-b, -a, 2 * b, 2 * a);
    } else if (btn === 'ls' || btn === 'rs') {
      ctx.fillStyle = 'rgba(11,20,28,.85)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(233,240,243,.7)'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 7); ctx.stroke();
      ctx.fillStyle = '#e9f0f3'; ctx.font = '700 ' + Math.round(r * 0.95) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(btn === 'ls' ? 'L' : 'R', 0, r * 0.06);
    } else if (face) {
      ctx.fillStyle = kind === 'ps' || kind === 'nin' ? 'rgba(11,20,28,.92)' : col; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.14); ctx.strokeStyle = kind === 'ps' || kind === 'nin' ? col : 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(0, 0, r - ctx.lineWidth / 2, 0, 7); ctx.stroke();
      if (kind === 'ps') {
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.4, r * 0.2); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const s = r * 0.42;
        ctx.beginPath();
        if (btn === 'a') { ctx.moveTo(-s, -s); ctx.lineTo(s, s); ctx.moveTo(s, -s); ctx.lineTo(-s, s); }
        else if (btn === 'b') ctx.arc(0, 0, s * 1.05, 0, 7);
        else if (btn === 'x') ctx.rect(-s, -s, 2 * s, 2 * s);
        else { ctx.moveTo(0, -s * 1.15); ctx.lineTo(s * 1.15, s * 0.85); ctx.lineTo(-s * 1.15, s * 0.85); ctx.closePath(); }
        ctx.stroke();
      } else {
        ctx.fillStyle = kind === 'nin' ? '#e9f0f3' : '#0b141c'; ctx.font = '800 ' + Math.round(r * 1.15) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(glyph(btn, kind), 0, r * 0.07);
      }
    } else {
      const t = glyph(btn, kind); ctx.font = '700 ' + Math.round(r * 0.9) + 'px system-ui,sans-serif';
      const w = Math.max(r * 2, ctx.measureText(t).width + r * 0.9), h = r * 1.6;
      ctx.fillStyle = 'rgba(11,20,28,.9)'; ctx.strokeStyle = 'rgba(233,240,243,.65)'; ctx.lineWidth = Math.max(1, r * 0.1);
      const rr = h * 0.35; ctx.beginPath(); ctx.moveTo(-w / 2 + rr, -h / 2); ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, rr); ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, rr); ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, rr); ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, rr); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e9f0f3'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, 0, r * 0.06);
    }
    ctx.restore();
  }
  // ---------- lecture des manettes ----------
  const dz = (x, y) => {
    const m = Math.hypot(x, y); if (m < DEAD) return [0, 0];
    const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m; return [x * k, y * k];
  };
  const bv = (gp, i) => { const b = gp.buttons[i]; return b ? (typeof b === 'object' ? (b.value || (b.pressed ? 1 : 0)) : +b) : 0; };
  const bp = (gp, i) => { const b = gp.buttons[i]; return !!b && (typeof b === 'object' ? (b.pressed || b.value > 0.5) : b > 0.5); };
  function readPad(gp, P) {
    const std = gp.mapping === 'standard' || gp.buttons.length >= 16;
    const ax = gp.axes || [];
    const [lx, ly] = dz(+ax[0] || 0, +ax[1] || 0), [rx, ry] = dz(+ax[2] || 0, +ax[3] || 0);
    const h = {};
    h.a = bp(gp, 0); h.b = bp(gp, 1); h.x = bp(gp, 2); h.y = bp(gp, 3); h.lb = bp(gp, 4); h.rb = bp(gp, 5);
    P.lt = Math.min(1, bv(gp, 6)); P.rt = Math.min(1, bv(gp, 7)); h.lt = P.lt > TRIG; h.rt = P.rt > TRIG;
    h.select = bp(gp, 8); h.start = bp(gp, 9); h.ls = bp(gp, 10); h.rs = bp(gp, 11);
    h.up = bp(gp, 12); h.down = bp(gp, 13); h.left = bp(gp, 14); h.right = bp(gp, 15); h.home = bp(gp, 16);
    if (!std && ax.length > 9 && !(h.up || h.down || h.left || h.right)) {   // vieille manette DirectInput : croix sur l'axe 9
      const v = +ax[9]; if (v >= -1.05 && v <= 1.05) { const k = Math.round((v + 1) / (2 / 7)); h.up = k === 0 || k === 1 || k === 7; h.right = k >= 1 && k <= 3; h.down = k >= 3 && k <= 5; h.left = k >= 5 && k <= 7; }
    }
    P.ax = [lx, ly, rx, ry];
    for (const b of BTN) { const was = !!P.held[b]; if (h[b] && !was) { P.cnt[b] = (P.cnt[b] || 0) + 1; P.t = now(); emit(P, b, true); } else if (!h[b] && was) emit(P, b, false); P.held[b] = h[b]; }
    if (Math.hypot(lx, ly) > 0.5 || Math.hypot(rx, ry) > 0.5) P.t = now();
  }
  function emit(P, btn, down) { if (down) used(P.kind); for (const f of S.subs) { try { f(P, btn, down); } catch (e) {} } }
  function used(kind) {
    S.lastKind = kind || S.lastKind;
    if (S.last !== 'pad') { S.last = 'pad'; bodyMode(); }
    else if (document.body && document.body.dataset.padk !== S.lastKind) bodyMode();
  }
  function bodyMode() {
    const b = document.body; if (!b) return;
    b.classList.toggle('jdw-pad', S.last === 'pad'); b.dataset.padk = S.lastKind;
    if (S.last !== 'pad') { const f = S.nav.focus; if (f) f.classList.remove('jdw-padfocus'); }
    else if (S.nav.focus && S.nav.focus.isConnected) S.nav.focus.classList.add('jdw-padfocus');
    if (S.hooks && S.hooks.onMode) { try { S.hooks.onMode(S.last); } catch (e) {} }
  }
  function sortedPads() { return [...S.pads.values()].sort((a, b) => a.order - b.order); }
  function poll() {
    S.raf = 0;
    if (!hasApi()) return;
    let list = []; try { list = [...navigator.getGamepads()]; } catch (e) {}
    const alive = new Set();
    for (const gp of list) {
      if (!gp || gp.connected === false) continue;
      alive.add(gp.index);
      let P = S.pads.get(gp.index);
      if (!P || P.id !== gp.id) { P = { index: gp.index, id: gp.id, kind: kindOf(gp.id), order: ++S.order, held: {}, cnt: {}, ax: [0, 0, 0, 0], lt: 0, rt: 0, t: 0, gp }; S.pads.set(gp.index, P); arrived(P); }
      P.gp = gp; readPad(gp, P);
    }
    for (const [i, P] of [...S.pads]) if (!alive.has(i)) { S.pads.delete(i); left(P); }
    if (S.hooks && !document.hidden) { try { navTick(); } catch (e) { if (S.hooks.error) S.hooks.error(e); } }
    if (S.pads.size) S.raf = requestAnimationFrame(poll);
  }
  function wake() { if (!S.raf && hasApi()) S.raf = requestAnimationFrame(poll); }
  function arrived(P) {
    if (!S.seen) { S.seen = true; store.set('jdw.padseen', true); }
    S.lastKind = P.kind; used(P.kind);
    const n = S.pads.size, nm = KIND_NAME[P.kind];
    toast('🎮 Manette' + (nm ? ' ' + nm : '') + ' connectée' + (n > 1 ? ' (joueur ' + n + ')' : ''), P.kind);
    if (S.hooks && S.hooks.onPads) { try { S.hooks.onPads(n); } catch (e) {} }
  }
  function left(P) {
    toast('🎮 Manette débranchée', P.kind, true);
    if (!S.pads.size) { S.last = 'none'; bodyMode(); }
    if (S.hooks && S.hooks.onPads) { try { S.hooks.onPads(S.pads.size, true); } catch (e) {} }
  }
  if (typeof addEventListener === 'function') {
    addEventListener('gamepadconnected', wake);
    addEventListener('gamepaddisconnected', () => { setTimeout(() => { wake(); if (!S.raf) poll(); }, 0); });
    // clavier, souris ou doigt : on quitte le mode manette (glyphes et focus doré cachés)
    const away = kind => e => { if (e && e.isTrusted === false) return; if (S.last === kind) return; if (S.last === 'pad' || S.last === 'none' || kind !== S.last) { S.last = kind; bodyMode(); } };
    addEventListener('keydown', away('kbd'), true);
    addEventListener('pointerdown', e => { if (e.isTrusted === false) return; away(e.pointerType === 'mouse' ? 'mouse' : 'touch')(e); }, true);
    addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    // certains navigateurs ne listent les manettes qu'après un appui : on regarde de temps en temps
    setInterval(() => { if (!S.raf && hasApi() && !document.hidden) { try { if ([...navigator.getGamepads()].some(g => g && g.connected !== false)) wake(); } catch (e) {} } }, 1000);
  }
  // ---------- petit message ----------
  let toastEl = null, toastT = 0;
  function toast(text, kind, quiet) {
    if (!document.body) return;
    if (S.hooks && S.hooks.toast) { try { if (S.hooks.toast(text, kind, quiet) === true) return; } catch (e) {} }
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'pad-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); }
    toastEl.textContent = text; toastEl.classList.toggle('quiet', !!quiet);
    toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2600);
  }
  // ---------- vibrations ----------
  const RUMBLE = { tick: [0, 0.22, 45], hit: [0.25, 0.45, 90], big: [0.55, 0.8, 200], win: [0.3, 0.6, 140, 3], over: [0.8, 0.95, 420], start: [0.15, 0.3, 70] };
  function rumblePad(P, what) {
    if (!S.vib || !P || !P.gp) return;
    let r = typeof what === 'string' ? RUMBLE[what] : Array.isArray(what) ? what : typeof what === 'number' ? [0.3, 0.5, what] : what && typeof what === 'object' ? [what.strong || 0, what.weak || 0, what.ms || 80] : null;
    if (!r) r = RUMBLE.hit;
    const go = () => {
      try {
        const gp = (navigator.getGamepads() || [])[P.index] || P.gp, va = gp && gp.vibrationActuator;
        if (va && va.playEffect) va.playEffect(va.type && va.type !== 'vibration' ? va.type : 'dual-rumble', { startDelay: 0, duration: Math.min(1000, r[2]), strongMagnitude: Math.min(1, r[0]), weakMagnitude: Math.min(1, r[1]) }).catch(() => {});
        else if (gp && gp.hapticActuators && gp.hapticActuators[0]) gp.hapticActuators[0].pulse(Math.max(r[0], r[1]), r[2]);
      } catch (e) {}
    };
    go(); for (let k = 1; k < (r[3] || 1); k++) setTimeout(go, k * (r[2] + 90));
  }
  // ---------- API des jeux (api.pad) ----------
  // opts : { slots(p) → [pads] (défaut : toutes les manettes pour p = 0), invert(p) → bool (joueur assis en face : sticks et croix
  // retournés dans le repère du jeu), players: 1 | 2 }
  function gameApi(opts) {
    opts = opts || {};
    const slotsFor = opts.slots || (p => (p || 0) === 0 ? sortedPads() : []);
    const inv = opts.invert || (() => false);
    let dead = false;
    const seen = new Map(), block = new Map(), subs = new Set();
    const key = (P, b) => P.index + ':' + P.id + ':' + b;
    // ce qui est déjà enfoncé au montage (ex. le A qui a lancé la partie) attend d'être relâché
    for (const P of S.pads.values()) for (const b of BTN) { seen.set(key(P, b), P.cnt[b] || 0); if (P.held[b]) block.set(key(P, b), true); }
    const held = (P, b) => { if (!P.held[b]) { block.delete(key(P, b)); return false; } return !block.get(key(P, b)); };
    const OFF = Object.freeze({ on: false, kind: '', lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, mx: 0, my: 0, held: Object.freeze({}) });
    const api = {
      get(p) {
        const L = dead ? [] : slotsFor(p || 0); if (!L.length) return OFF;
        const o = { on: true, kind: L[0].kind, lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, mx: 0, my: 0, held: {} };
        for (const P of L) {
          for (const b of BTN) if (b !== 'start' && b !== 'select' && b !== 'home' && held(P, b)) o.held[b] = true;
          const big = (a, b) => Math.abs(b) > Math.abs(a) ? b : a;
          o.lx = big(o.lx, P.ax[0]); o.ly = big(o.ly, P.ax[1]); o.rx = big(o.rx, P.ax[2]); o.ry = big(o.ry, P.ax[3]);
          o.lt = Math.max(o.lt, held(P, 'lt') || P.lt <= TRIG ? P.lt : 0); o.rt = Math.max(o.rt, held(P, 'rt') || P.rt <= TRIG ? P.rt : 0);
        }
        if (inv(p || 0)) { o.lx = -o.lx; o.ly = -o.ly; o.rx = -o.rx; o.ry = -o.ry; const h = o.held, u = h.up, l = h.left; h.up = h.down; h.down = u; h.left = h.right; h.right = l; }
        const dx = (o.held.right ? 1 : 0) - (o.held.left ? 1 : 0), dy = (o.held.down ? 1 : 0) - (o.held.up ? 1 : 0);
        if (dx || dy) { const m = Math.hypot(dx, dy); o.mx = dx / m; o.my = dy / m; } else { o.mx = o.lx; o.my = o.ly; }
        return o;
      },
      // appui (front montant) depuis le dernier appel, pour ce bouton et ce joueur (une seule fois par appui)
      pressed(btn, p) {
        if (dead) return false;
        let got = 0;   // nombre d'appuis depuis le dernier appel (0 = faux)
        const L = slotsFor(p || 0), b = inv(p || 0) ? ({ up: 'down', down: 'up', left: 'right', right: 'left' }[btn] || btn) : btn;
        for (const P of L) {
          const k = key(P, b), c = P.cnt[b] || 0, o = seen.get(k) || 0;
          if (block.get(k) && !P.held[b]) block.delete(k);   // relâché depuis (au cas où)
          if (c > o) { seen.set(k, c); if (!block.get(k)) got += c - o; }
        }
        return got;
      },
      // abonnement : fn(btn, p, down) à chaque appui / relâché (sauf start / select, gardés par la borne)
      on(fn) { if (typeof fn !== 'function') return () => {}; subs.add(fn); return () => subs.delete(fn); },
      count() { return dead ? 0 : S.pads.size; },
      any(p) { return !dead && slotsFor(p || 0).length > 0; },
      kind(p) { const L = slotsFor(p || 0); return (L[0] && L[0].kind) || S.lastKind; },
      glyph(btn, p) { return glyph(btn, api.kind(p)); },
      drawGlyph(ctx, btn, x, y, r, p) { drawGlyph(ctx, btn, x, y, r, api.kind(p)); },
      chip(btn, p) { return chips(btn, api.kind(p)); },
      active() { return !dead && S.last === 'pad' && S.pads.size > 0; },
      // oublie les appuis en attente et attend le relâché de ce qui est enfoncé (la borne l'appelle à la sortie de ses pauses)
      drain() { api.flush(); },
      flush() { for (const P of S.pads.values()) for (const b of BTN) { seen.set(key(P, b), P.cnt[b] || 0); if (P.held[b]) block.set(key(P, b), true); } },
      // le jeu est prêt (fin d'un chargement) : la borne montre alors ses commandes (enregistrement pad.intro: 'ready')
      showHelp() { if (!dead && opts.intro) { try { opts.intro(); } catch (e) {} } },
      rumble(what, p) { if (dead) return; const L = p === undefined || p === null ? (opts.players === 2 ? sortedPads() : slotsFor(0)) : slotsFor(p); for (const P of L) rumblePad(P, what); },
      close() { dead = true; subs.clear(); S.apis.delete(api); S.subs.delete(feed); }
    };
    const feed = (P, b, down) => {
      if (dead) return;
      if (!down && block.get(key(P, b))) { block.delete(key(P, b)); return; }   // bouton tenu au montage / à la reprise : libre une fois relâché
      if (!subs.size || b === 'start' || b === 'select' || b === 'home') return;
      if (block.get(key(P, b))) return;
      for (const p of [0, 1]) {
        if (!slotsFor(p).includes(P)) continue;
        const bb = inv(p) ? ({ up: 'down', down: 'up', left: 'right', right: 'left' }[b] || b) : b;
        for (const f of subs) { try { f(bb, p, down); } catch (e) {} }
      }
    };
    S.subs.add(feed); S.apis.add(api);
    wake();
    return api;
  }
  // ---------- navigation de la borne ----------
  const FOCUSABLE = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=menuitem], [role=menuitemcheckbox], [role=radio], [role=checkbox], [role=switch], [role=option], [tabindex]:not([tabindex="-1"])';
  const LAYERS = '.sheet, [role=dialog], [role=alertdialog], [role=menu], .gmap, .duo-pause, .duo-res, [data-pad-layer]';
  function shown(el) {
    if (!el || !el.isConnected || el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    const r = el.getClientRects(); if (!r.length) return false;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false;
    return true;
  }
  // la cible réelle : une case à cocher cachée dans son <label> → le label
  function target(el) { if (el.matches('input[type=checkbox], input[type=radio]')) { const l = el.closest('label'); if (l) return l; } return el; }
  function hitOk(el, r) {
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return null;   // hors de l'écran : on ne sait pas
    const pts = [[cx, cy], [r.left + Math.min(8, r.width / 3), cy], [r.right - Math.min(8, r.width / 3), cy], [cx, r.top + r.height * 0.2], [cx, r.bottom - r.height * 0.2]];
    let underBar = true;
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      const h = document.elementFromPoint(x, y); if (!h) continue;
      if (el === h || el.contains(h) || (h.contains(el) && !h.matches(LAYERS))) return true;
      if (h.closest(LAYERS) || h.matches('.sheet, .duo-pause, .coop-pause, .pad-pause')) underBar = false;
    }
    // seulement sous une barre de la page (en-tête collant, barre des modes) : on le garde, il viendra à l'écran
    return underBar ? null : false;
  }
  // la couche du dessus : la fenêtre ouverte la plus haute (vérifié au toucher : rien ne la recouvre)
  function topLayer() {
    let best = null, bz = -1;
    for (const el of document.querySelectorAll(LAYERS)) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect(); if (r.width < 20 || r.height < 20) continue;
      const card = el.querySelector('[role=dialog], .card') || el, cr = card.getBoundingClientRect();
      const x = Math.min(innerWidth - 2, Math.max(1, cr.left + cr.width / 2)), y = Math.min(innerHeight - 2, Math.max(1, cr.top + Math.min(cr.height / 2, 40)));
      const h = document.elementFromPoint(x, y); if (!h || !el.contains(h)) continue;
      let z = 0; for (let a = el; a && a !== document.body; a = a.parentElement) { const v = parseInt(getComputedStyle(a).zIndex, 10); if (v > z) z = v; }
      if (z >= bz) { bz = z; best = el; }
    }
    // une fenêtre dans une fenêtre : on garde la plus profonde qui contient le point
    return best;
  }
  function candidates(layer) {
    const root = layer || (S.hooks && S.hooks.base && S.hooks.base()) || document.body;
    const out = [], seenT = new Set();
    for (const el of root.querySelectorAll(FOCUSABLE)) {
      if (el.disabled || el.getAttribute('aria-disabled') === 'true' && !el.classList.contains('tile') || el.closest('[data-pad-skip]')) continue;
      const t = target(el); if (seenT.has(t)) continue;
      if (!shown(t)) continue;
      const r = t.getBoundingClientRect(); if (r.width < 6 || r.height < 6) continue;
      const h = hitOk(t, r); if (h === false) continue;
      seenT.add(t); out.push({ el, t, r });
    }
    return out;
  }
  function focusOn(c, scroll) {
    const old = S.nav.focus; if (old && old !== c.t) old.classList.remove('jdw-padfocus');
    S.nav.focus = c.t; S.nav.el = c.el;
    c.t.classList.add('jdw-padfocus');
    try { (c.el.matches('input[type=checkbox], input[type=radio]') ? c.el : c.t).focus({ preventScroll: true }); } catch (e) {}
    if (scroll !== false) {
      const r = c.t.getBoundingClientRect(), top = 64, bot = innerHeight - 78;
      if (r.top < top || r.bottom > bot) { try { c.t.scrollIntoView({ block: r.height > bot - top ? 'start' : 'center', inline: 'nearest', behavior: 'smooth' }); } catch (e) { c.t.scrollIntoView(); } }
    }
    if (S.hooks && S.hooks.onFocus) { try { S.hooks.onFocus(c.t); } catch (e) {} }
  }
  function current(cands) {
    const f = S.nav.focus; if (f && f.isConnected) { const c = cands.find(x => x.t === f); if (c) return c; }
    const a = document.activeElement; if (a && a !== document.body) { const c = cands.find(x => x.el === a || x.t === a); if (c) return c; }
    return null;
  }
  function pickDefault(layer, cands) {
    if (!cands.length) return null;
    let want = S.hooks && S.hooks.defaultFocus ? S.hooks.defaultFocus(layer, cands.map(c => c.t)) : null;
    if (want) { const c = cands.find(x => x.t === want || x.el === want); if (c) return c; }
    const pr = cands.find(c => c.el.matches('[data-pad-default], .btn-play:not(.btn-ghost), [aria-selected="true"]'));
    if (pr && layer) return pr;
    return cands.slice().sort((a, b) => (a.r.top - b.r.top) || (a.r.left - b.r.left))[0];
  }
  function move(dir) {
    const layer = topLayer(), cands = candidates(layer);
    if (!cands.length) return false;
    const cur = current(cands);
    if (!cur) { focusOn(pickDefault(layer, cands)); return true; }
    const a = cur.r, ac = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
    let best = null, bs = Infinity;
    for (const c of cands) {
      if (c === cur || c.t.contains(cur.t) || cur.t.contains(c.t)) continue;
      const b = c.r, bc = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      let along, ortho, ogap;
      if (dir === 'right' || dir === 'left') {
        const s = dir === 'right' ? 1 : -1;
        along = s > 0 ? b.left - a.right : a.left - b.right; const cd = (bc.x - ac.x) * s;
        if (cd <= 4) continue; if (along < -Math.min(a.width, b.width) * 0.5) continue;
        ogap = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom)); ortho = Math.abs(bc.y - ac.y);
        if (ogap > Math.max(24, cd)) continue;          // hors du cône de 45° : pas « à droite »
        along = Math.max(0, along) + cd * 0.15;
      } else {
        const s = dir === 'down' ? 1 : -1;
        along = s > 0 ? b.top - a.bottom : a.top - b.bottom; const cd = (bc.y - ac.y) * s;
        if (cd <= 4) continue; if (along < -Math.min(a.height, b.height) * 0.5) continue;
        ogap = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right)); ortho = Math.abs(bc.x - ac.x);
        if (ogap > Math.max(24, cd * 1.2)) continue;
        along = Math.max(0, along) + cd * 0.15;
      }
      const sc = along + ogap * 2.2 + ortho * 0.35;
      if (sc < bs) { bs = sc; best = c; }
    }
    log('move ' + dir + (best ? ' → ' + name(best.t) : ' : rien'));
    if (best) { focusOn(best); if (S.hooks && S.hooks.sound) S.hooks.sound('move'); return true; }
    // rien dans cette direction : on fait défiler la fenêtre (longues listes) puis on réessaie au prochain coup
    const sc = scroller(cur.t); if (sc && (dir === 'down' || dir === 'up')) { sc.scrollBy({ top: (dir === 'down' ? 1 : -1) * Math.round(sc.clientHeight * 0.4), behavior: 'smooth' }); return true; }
    if (S.hooks && S.hooks.sound) S.hooks.sound('edge');
    return false;
  }
  // petit journal de la navigation (essais : JDW_PAD._S.log)
  const name = el => el ? (el.id || (el.querySelector && el.querySelector('.tile-name') ? el.querySelector('.tile-name').textContent : '') || el.className || el.tagName).slice(0, 24) : '-';
  function log(t) { S.log.push(Math.round(now()) + ' ' + t); if (S.log.length > 40) S.log.shift(); }
  function scroller(el) {
    for (let a = el && el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a); if (/(auto|scroll)/.test(cs.overflowY) && a.scrollHeight > a.clientHeight + 4) return a;
    }
    return document.scrollingElement;
  }
  function activate() {
    const layer = topLayer(), cands = candidates(layer); let c = current(cands);
    if (!c) { c = pickDefault(layer, cands); if (c) focusOn(c); return; }
    const el = c.el;
    if (S.hooks && S.hooks.sound) S.hooks.sound('ok');
    if (el.matches('input[type=range]')) return;
    if (el.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea')) { try { el.focus(); el.click(); } catch (e) {} return; }
    if (el.matches('select')) { const o = el.options; if (o && o.length) { el.selectedIndex = (el.selectedIndex + 1) % o.length; el.dispatchEvent(new Event('change', { bubbles: true })); } return; }
    try { el.click(); } catch (e) {}
    // la fenêtre a pu se fermer / s'ouvrir : le focus suivra au prochain mouvement
    setTimeout(() => { if (S.nav.focus && !shown(S.nav.focus)) { S.nav.focus.classList.remove('jdw-padfocus'); S.nav.focus = null; autoFocus(); } }, 120);
  }
  // une fenêtre vient de s'ouvrir (ou le focus a disparu) : on pose le focus doré sur le bon bouton
  function autoFocus() {
    if (S.last !== 'pad') return;
    const layer = topLayer(), cands = candidates(layer); if (!cands.length) return;
    const cur = current(cands); if (cur) { if (!cur.t.classList.contains('jdw-padfocus')) focusOn(cur, false); return; }
    focusOn(pickDefault(layer, cands));
  }
  function adjust(dir) {   // curseur (input range) sous le focus : gauche / droite changent la valeur
    const el = S.nav.el; if (!el || !el.matches || !el.matches('input[type=range]')) return false;
    const st = +el.step || ((+el.max - +el.min) / 20) || 1, v = Math.max(+el.min, Math.min(+el.max, +el.value + (dir === 'right' ? 1 : -1) * st * 5));
    el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true;
  }
  function tabs(d) {
    const layer = topLayer(), root = layer || (S.hooks && S.hooks.base && S.hooks.base()) || document.body;
    const lists = [...root.querySelectorAll('[role=tablist]')].filter(shown);
    const f = S.nav.focus, inList = f && lists.find(l => l.contains(f));
    if (!inList && !layer && S.hooks && S.hooks.modes && S.hooks.modes(d)) { if (S.nav.focus) S.nav.focus.classList.remove('jdw-padfocus'); S.nav.focus = null; setTimeout(autoFocus, 120); return; }
    const L = inList || lists[0]; if (!L) { if (!layer && S.hooks && S.hooks.modes) S.hooks.modes(d); return; }
    const T = [...L.querySelectorAll('[role=tab]')].filter(t => shown(t) && !t.disabled && t.getAttribute('aria-disabled') !== 'true');
    if (!T.length) return;
    let i = T.findIndex(t => t.getAttribute('aria-selected') === 'true'); if (i < 0) i = 0;
    const n = T[(i + d + T.length) % T.length]; n.click();
    if (S.hooks && S.hooks.sound) S.hooks.sound('tab');
    setTimeout(() => { if (inList || shown(n)) focusOn({ el: n, t: n }, true); }, 60);
  }
  function navDir() {
    let dx = 0, dy = 0;
    for (const P of S.pads.values()) {
      if (P.held.left) dx = -1; else if (P.held.right) dx = 1;
      if (P.held.up) dy = -1; else if (P.held.down) dy = 1;
      if (!dx && !dy) { const [x, y] = P.ax; if (Math.hypot(x, y) > 0.55) { if (Math.abs(x) > Math.abs(y)) dx = Math.sign(x); else dy = Math.sign(y); } }
      if (dx || dy) break;
    }
    return dx ? (dx > 0 ? 'right' : 'left') : dy ? (dy > 0 ? 'down' : 'up') : '';
  }
  // presses vues par la navigation (compteurs propres, pour ne rien rater entre deux images)
  const navSeen = new Map();
  function navPressed(b) {
    let got = false;
    for (const P of S.pads.values()) { const k = P.index + ':' + P.id + ':' + b, c = P.cnt[b] || 0; if (c > (navSeen.get(k) || 0)) { navSeen.set(k, c); got = true; } }
    return got;
  }
  function navTick() {
    const H = S.hooks;
    const cap = H.capturing ? !!H.capturing() : false;
    const layer = cap ? topLayer() : null;
    const game = cap && !layer;               // un jeu tourne et aucune fenêtre n'est par-dessus : la manette est au jeu
    const start = navPressed('start'), select = navPressed('select');
    if (game && (start || select)) log('jeu : ' + (start ? 'start' : 'select'));
    const a = navPressed('a'), b = navPressed('b'), lb = navPressed('lb') || navPressed('lt'), rb = navPressed('rb') || navPressed('rt');
    const x = navPressed('x'), y = navPressed('y');
    if (game) {
      S.nav.dir = '';
      if (S.nav.focus) {   // pas de halo pendant le jeu, et plus de bouton de la borne sous le focus (Espace / Entrée vont au jeu)
        S.nav.focus.classList.remove('jdw-padfocus'); S.nav.focus = null;
        const ae = document.activeElement; if (ae && ae !== document.body && ae.matches && ae.matches(FOCUSABLE) && !ae.closest('.game-root, .duo-root, #jdw-pg')) { try { ae.blur(); } catch (e) {} }
      }
      if (start && H.start) H.start('start'); else if (select && H.start) H.start('select');
      return;
    }
    if (start && H.start && H.start('start', true)) return;
    if (select && H.select && H.select()) return;
    const t = now(), d = navDir();
    if (d) {
      if (d !== S.nav.dir) { S.nav.dir = d; S.nav.next = t + 380; if (!adjust(d)) move(d); }
      else if (t >= S.nav.next) { S.nav.next = t + 115; if (!adjust(d)) move(d); }
    } else S.nav.dir = '';
    if (a) { log('A sur ' + name(S.nav.focus)); activate(); }
    if (b) { const tb = Date.now(); if (tb - S.nativeBackAt > 400) { S.backAt = tb; if (H.back) H.back(); setTimeout(autoFocus, 160); } }
    if (lb) tabs(-1); else if (rb) tabs(1);
    if ((x || y) && H.button) { log((x ? 'X' : 'Y') + ' sur ' + name(S.nav.focus)); H.button(x ? 'x' : 'y', S.nav.focus); setTimeout(autoFocus, 200); }
    // stick droit : fait défiler la page ou la fenêtre
    let ry = 0; for (const P of S.pads.values()) if (Math.abs(P.ax[3]) > Math.abs(ry)) ry = P.ax[3];
    if (Math.abs(ry) > 0.15) { const sc = scroller(S.nav.focus || (layer || document.querySelector('#jdw-lib')) || document.body); if (sc) sc.scrollTop += ry * 18; }
    // focus perdu (fenêtre fermée, page changée) ou resté sous une fenêtre qui vient de s'ouvrir : on le repose tout seul en mode manette
    if (S.last === 'pad' && t - (S.nav.lastAuto || 0) > 220) {
      const f = S.nav.focus, L = f && f.isConnected && shown(f) ? topLayer() : null;
      if (!f || !f.isConnected || !shown(f) || (L && !L.contains(f))) { S.nav.lastAuto = t; if (f && L && !L.contains(f)) { f.classList.remove('jdw-padfocus'); S.nav.focus = null; } autoFocus(); }
      else S.nav.lastAuto = t;
    }
  }
  // ---------- montage par la bibliothèque ----------
  function setup(hooks) { S.hooks = hooks || {}; bodyMode(); wake(); }
  window.JDW_PAD = {
    BTN, glyph, chip, chips, helpList, drawGlyph, kindOf, gameApi, setup, toast, autoFocus, move, activate, tabs, topLayer,
    rumble(what) { for (const P of S.pads.values()) rumblePad(P, what); },
    pads: sortedPads,
    count: () => S.pads.size,
    seen: () => S.seen,
    active: () => S.last === 'pad' && S.pads.size > 0,
    mode: () => S.last,
    kind: () => S.lastKind,
    vibOn: () => S.vib,
    setVib(v) { S.vib = !!v; store.set('jdw.padvib', S.vib); if (S.vib) this.rumble('start'); },
    nativeBack() { const t = Date.now(); if (t - S.backAt < 400) return true; S.nativeBackAt = t; return false; },   // retour d'Android juste après le B : déjà fait
    blur(dom) { if (S.nav.focus) S.nav.focus.classList.remove('jdw-padfocus'); S.nav.focus = null; if (dom) { const ae = document.activeElement; if (ae && ae !== document.body && ae.blur) try { ae.blur(); } catch (e) {} } },
    focusEl(el) { if (el) focusOn({ el, t: target(el) }, true); },
    _S: S, _cands: () => candidates(topLayer()).map(c => c.t)
  };
})();
