// La roue du jour (dans « Gagner des crédits ») : même portée que gagner.js (rpc, GC, gcEl, gcBt…). Serveur : roue.sql.
// Le lot est tiré par le serveur ; le geste ne change que l'élan et la durée, la roue s'arrête d'elle-même sur le lot, sans correction visible.
const ROUE = { e: null, art: null, ouverte: null, vu: false };
const RN = 1080, RC = 540, RF = 425, RPAS = Math.PI * 2 / 12, RTAU = Math.PI * 2;
const ROUE_COUL = {
  norm: { 1: ['#3b2a8c', '#1b1050'], 2: ['#5c33ad', '#2d1863'], 5: ['#2f6fd6', '#132f78'], 10: ['#13a7c4', '#075068'], 25: ['#df3596', '#721556'], B: ['#16a085', '#07504e'], J: ['#ffeeaa', '#e89f06'] },
  or: { 1: ['#8a5614', '#4a2906'], 2: ['#b0701c', '#6a3f0c'], 5: ['#d8951f', '#855010'], 10: ['#f0b63a', '#9d650e'], 25: ['#ffd76e', '#b3760f'], B: ['#1b8a86', '#0a4347'], J: ['#fff3bf', '#e8a10d'] } };
const ROUE_TAILLE = { 1: .25, 2: .3, 5: .34, 10: .37, 25: .41, J: .46, B: .29 };
const ROUE_FICHE = { 1: 'p1', 2: 'p2', 5: 'p5', 10: 'p10', 25: 'p25', J: 'pJ', B: 'sachet' };
function roueArt() {
  if (ROUE.art) return ROUE.art;
  const I = {}, un = n => new Promise(ok => { const i = new Image(); i.decoding = 'async'; i.onload = () => { I[n] = i; ok(); }; i.onerror = () => ok(); i.src = ROOT + 'accueil/roue-' + n.toLowerCase() + '.webp'; });
  const pol = document.fonts ? document.fonts.load('40px Bungee').catch(() => {}) : null;
  return (ROUE.art = Promise.all(['p1', 'p2', 'p5', 'p10', 'p25', 'pJ', 'sachet', 'anneau', 'moyeu', 'fleche'].map(un).concat(pol)).then(() => I));
}
async function roueLire() {
  try { const e = await rpc('roue_etat', { p_name: gcNom() }, { quiet: true, quiet404: true }); ROUE.e = e; return e; } catch (x) { return null; }
}
function roueCadeauxDire(e) { for (const c of (e && e.cadeaux) || []) toastCheer('🎰 ' + dispName(c.de) + ' a gagné le jackpot : tu reçois ' + c.credits + ' 💎 !', c.de, true); }
async function roueCadeaux() { if (!gcPasCompte()) roueCadeauxDire(await roueLire()); }   // signal de la salle : ce qui compte vient du serveur
const roueSorteProchaine = e => e.gratuit ? 'gratuit' : (e.prochaine || 'pub');

function roueCalques(W, I, cases, or) {
  const k = W / RN, mk = () => { const c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d'); g.scale(k, k); return [c, g]; };
  const [rc, g] = mk(), COUL = or ? ROUE_COUL.or : ROUE_COUL.norm; g.translate(RC, RC);
  cases.forEach((v, i) => {
    const m = -Math.PI / 2 + i * RPAS, a0 = m - RPAS / 2, a1 = m + RPAS / 2, C = COUL[v] || COUL[1], gr = g.createRadialGradient(0, 0, 70, 0, 0, RF);
    gr.addColorStop(0, C[1]); gr.addColorStop(.62, C[0]); gr.addColorStop(1, C[1]); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, RF, a0, a1); g.closePath(); g.fillStyle = gr; g.fill();
    g.save(); g.clip(); g.globalAlpha = .1; g.strokeStyle = '#fff'; g.lineWidth = 1.4; for (let r = 120; r < RF; r += 17) { g.beginPath(); g.arc(0, 0, r, a0, a1); g.stroke(); }
    const re = g.createLinearGradient(Math.cos(a0) * RF, Math.sin(a0) * RF, Math.cos(a1) * RF, Math.sin(a1) * RF); re.addColorStop(0, 'rgba(255,255,255,.75)'); re.addColorStop(.5, 'rgba(255,255,255,0)'); g.globalAlpha = .34; g.fillStyle = re; g.fillRect(-RN, -RN, RN * 2, RN * 2); g.restore();
    g.strokeStyle = '#ffe29a'; g.lineWidth = 5; g.beginPath(); g.moveTo(Math.cos(a0) * 80, Math.sin(a0) * 80); g.lineTo(Math.cos(a0) * RF, Math.sin(a0) * RF); g.stroke();
    g.save(); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, RF - 4, a0 + .012, a1 - .012); g.closePath(); g.clip(); g.rotate(m); g.translate(RF * (v === 'B' ? .76 : v === 'J' ? .77 : .73), 0); g.rotate(Math.PI / 2);
    const im = I[ROUE_FICHE[v]]; if (im) { let w = RF * (ROUE_TAILLE[v] || .25), h = w * im.height / im.width; const hm = RF * (v === 'B' || v === 'J' ? .35 : .42); if (h > hm) { w *= hm / h; h = hm; } g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 20 * k; g.shadowOffsetY = 10 * k; g.drawImage(im, -w / 2, -h / 2, w, h); g.shadowColor = 'transparent'; }
    g.restore(); g.save(); g.rotate(m); g.lineJoin = 'round'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.strokeStyle = 'rgba(16,6,40,.92)';
    if (v === 'J' || v === 'B') { const t = v === 'J' ? 'JACKPOT' : 'BOOSTER'; g.translate(RF * .43, 0); g.font = '400 24px Bungee,Impact,sans-serif'; g.lineWidth = 7; g.strokeText(t, 0, 0); g.fillStyle = v === 'J' ? '#ffe9a0' : '#fff'; g.fillText(t, 0, 0); }
    else { g.translate(RF * .455, 0); g.rotate(Math.PI / 2); g.font = '400 ' + (+v >= 10 ? 44 : 50) + 'px Bungee,Impact,sans-serif'; g.lineWidth = 10; g.strokeText('+' + v, 0, 0); g.fillStyle = '#fff'; g.fillText('+' + v, 0, 0); }
    g.restore();
  });
  for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 - RPAS / 2 + i * RPAS, x = Math.cos(a) * (RF - 12), y = Math.sin(a) * (RF - 12), b = g.createRadialGradient(x - 3, y - 3, 1, x, y, 10); b.addColorStop(0, '#fff6c9'); b.addColorStop(.6, '#e0a630'); b.addColorStop(1, '#7d4e0a'); g.fillStyle = b; g.beginPath(); g.arc(x, y, 10, 0, RTAU); g.fill(); }
  const [fc, f] = mk(); if (I.anneau) f.drawImage(I.anneau, 0, 0, RN, RN); if (I.moyeu) f.drawImage(I.moyeu, RC - 118, RC - 118, 236, 236);
  const hc = document.createElement('canvas'), R = 58; hc.width = hc.height = R * 2; const h = hc.getContext('2d'), a = h.createRadialGradient(R, R, 1, R, R, R); a.addColorStop(0, '#fff'); a.addColorStop(.14, 'rgba(255,202,92,1)'); a.addColorStop(.42, 'rgba(255,202,92,.35)'); a.addColorStop(1, 'rgba(0,0,0,0)'); h.fillStyle = a; h.fillRect(0, 0, R * 2, R * 2);
  const lp = [0, 1, 2].map(ph => { const [c, g2] = mk(); g2.globalCompositeOperation = 'lighter'; for (let i = 0; i < 24; i++) { const a = (i + .5) / 24 * RTAU, on = (i + ph) % 3 === 0, s = on ? 92 : 52; g2.globalAlpha = on ? 1 : .22; g2.drawImage(hc, RC + Math.cos(a) * 465 - s / 2, RC + Math.sin(a) * 465 - s / 2, s, s); } return c; });
  return { rc, fc, lp, k };
}
const ROUE_NOM = { 1: '1 crédit', 2: '2 crédits', 5: '5 crédits', 10: '10 crédits', 25: '25 crédits', B: 'Booster Astrofaune', J: 'Jackpot' };
function roueChances(w) {
  const t = Object.values(w).reduce((a, b) => a + (+b || 0), 0) || 1;
  return ['1', '2', '5', '10', '25', 'B', 'J'].filter(k => w[k]).map(k => { const p = +w[k] / t; return [ROUE_NOM[k], p < .001 ? '1 sur ' + Math.round(1 / p).toLocaleString('fr-FR') : (Math.round(p * 10000) / 100).toLocaleString('fr-FR') + ' %']; });
}
function roueSerie(e, D) {
  const sj = e.serie_jours || 5, se = e.serie || 0, fait = e.gratuit ? se % sj : (se % sj || sj);
  D.textContent = ''; D.append(gcEl('b', '', se > 1 ? '🔥 Série de ' + se + ' jours' : '🔥 Ta série'));
  const P = gcEl('div', 'pts'); for (let i = 1; i <= sj; i++) { const x = gcEl('i', i <= fait ? 'ok' : i === fait + 1 && e.gratuit ? 'jr' : '', String(i)); P.appendChild(x); } D.append(P, gcEl('small', '', sj + ' jours d’affilée = un bonus de ' + (e.serie_credits || 0) + ' 💎'));
}

async function roueOuvrir(o) {
  o = o || {}; if (ROUE.ouverte) return;
  const e = (await roueLire()); if (!e || !e.actif) return false;
  const sorte = o.ticket ? roueSorteProchaine(Object.assign({}, e, { gratuit: false })) : 'gratuit', dore = sorte === 'or';
  if (!o.ticket && !e.gratuit && !o.voir) return false;
  const I = await roueArt();
  if (ROUE.ouverte) return;
  const V = gcEl('div', 'roue-voile' + (dore ? ' or' : '')); V.setAttribute('role', 'dialog'); V.setAttribute('aria-modal', 'true'); V.setAttribute('aria-label', 'La roue du jour');
  const Sc = gcEl('div', 'roue-scene'), Bo = gcEl('div', 'roue-roue'), Ca = document.createElement('canvas'); Bo.appendChild(Ca);
  const Dr = gcEl('div', 'roue-droite'), Ti = gcEl('h1'); Ti.append(dore ? 'La roue ' : 'Ton lancer ', gcEl('em', '', dore ? 'dorée' : 'du jour'));
  const Sou = gcEl('p', 's', dore ? 'Ta 3e pub du jour débloque la roue dorée.' : o.ticket ? 'Un lancer de plus, merci d’avoir regardé la pub.' : 'Gratuit, une fois par jour. Tu gagnes à tous les coups.');
  const Ge = gcEl('div', 'geste', 'Attrape la roue et lance-la !'), Pad = gcBt('roue-pad', '', () => lancerAuto()); Pad.append(gcEl('b', '', 'A'), ' Lancer');
  const Se = gcEl('div', 'serie'); roueSerie(e, Se); Dr.append(Ti, Sou, Ge, Pad, Se);
  const Pa = gcBt('roue-passer', o.popup ? 'Passer' : 'Fermer', () => fermer());
  Sc.append(Bo, Dr); V.append(Sc, Pa);
  let Ch = null; if (o.info) { const In = gcBt('roue-i', 'i', () => { Ch.hidden = !Ch.hidden; }); In.setAttribute('aria-label', 'Les chances'); Ch = gcEl('div', 'roue-ch'); Ch.hidden = true; Ch.appendChild(gcEl('b', '', 'Les chances')); for (const [a, b] of roueChances((e.chances || {})[sorte] || {})) { const l = gcEl('div'); l.append(gcEl('span', '', a), gcEl('i', '', b)); Ch.appendChild(l); } V.append(In, Ch); }
  document.body.appendChild(V);
  // ---- la roue
  const x = Ca.getContext('2d'); let L = null, cases = (e.cases || {})[sorte] || ['1'], W = 0;
  const taille = () => { const r = Bo.getBoundingClientRect(), n = Math.min(RN, Math.round(Math.max(r.width, 240) * Math.min(window.devicePixelRatio || 1, 2))); if (n !== W) { W = n; Ca.width = Ca.height = W; L = roueCalques(W, I, cases, dore); } };
  const res = () => taille(); addEventListener('resize', res); taille();
  let etat = 'repos', ang = -RPAS * 1.5 + Math.random() * .3, w = 0, plan = null, cran = 0, flap = 0, dernier = performance.now(), R = null, vivant = true, rep = 0, derTic = 0;
  const P = 3.2, W_MAX = 42, W_FAIBLE = 6, D_MIN = RTAU * 1.25;
  const essai = navigator.webdriver ? (window.__roue = { trace: [] }) : null;
  function planifie(a, v) {
    const off = (Math.random() - .5) * RPAS * .76, dir = v < 0 ? -1 : 1, V_ = Math.min(Math.abs(v), W_MAX), cible = -(R.case * RPAS + off); let reste = ((cible - a) * dir) % RTAU; if (reste < 0) reste += RTAU;
    if (V_ < W_FAIBLE) { const T = 3.4 + Math.random() * .5; let D = reste; while (D < D_MIN || V_ * T / D > 2.4) D += RTAU; plan = { a, D, T, dir, s: V_ * T / D, t0: dernier, m: 'h' }; }
    else { const T0 = 3 + 5 * Math.pow(V_ / W_MAX, .7), D0 = V_ * T0 / P; let D = reste; while (D < Math.max(D_MIN, D0 - Math.PI)) D += RTAU; plan = { a, D, T: D * P / V_, dir, t0: dernier, m: 'p' }; }
    etat = 'plan';
  }
  const herm = (u, v) => v * u + (10 - 6 * v) * u * u * u + (-15 + 8 * v) * u * u * u * u + (6 - 3 * v) * u * u * u * u * u;
  async function tirer() {
    for (let i = 0; i < 3 && vivant; i++) {
      try {
        const r = await rpc('roue_lancer', { p_name: gcNom(), p_pub: o.ticket || null }, { quiet: true });
        if (!vivant) return;
        if (!r || !r.ok) { Ge.textContent = 'Ce lancer n’est pas possible pour le moment.'; etat = 'panne'; w *= .5; return; }
        R = r; if (JSON.stringify(r.cases) !== JSON.stringify(cases)) { cases = r.cases; L = roueCalques(W, I, cases, dore); }
        if (essai) essai.r = r;
        if (etat === 'libre') planifie(ang, w);
        return;
      } catch (x_) { await new Promise(s => setTimeout(s, 700 * (i + 1))); }
    }
    if (vivant) { Ge.textContent = 'Pas de réseau : ton lancer n’est pas perdu, réessaie.'; etat = 'panne'; }
  }
  function dessine(n) {
    const t = n / 1000, dt = Math.min(.05, (n - dernier) / 1000); dernier = n;
    if (etat === 'libre') { ang += w * dt; w *= Math.exp(-.15 * dt); if (Math.abs(w) < 4) w = (w < 0 ? -4 : 4); }
    else if (etat === 'panne') { ang += w * dt; w *= Math.exp(-2.2 * dt); if (Math.abs(w) < .05) { w = 0; etat = 'repos'; Ge.textContent = 'Attrape la roue et lance-la !'; } }
    else if (etat === 'plan') { const u = Math.max(0, Math.min(1, (n - plan.t0) / (plan.T * 1000))), s = plan.m === 'p' ? 1 - Math.pow(1 - u, P) : herm(u, plan.s); ang = plan.a + plan.dir * plan.D * s; if (u >= 1) { etat = 'fin'; if (essai) essai.finAng = ang; setTimeout(gagne, 260); } }
    const k = Math.floor((ang + RPAS / 2) / RPAS); if (k !== cran) { flap = (k > cran ? 1 : -1) * .24; cran = k; if (!muted && n - derTic > 34) { derTic = n; try { Audio.tone(1300, .022, 'triangle', .05); } catch (y) {} } } flap *= .85;
    if (essai && (etat === 'libre' || etat === 'plan')) essai.trace.push([n, ang]);
    const K = L.k; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, W); x.setTransform(Math.cos(ang), Math.sin(ang), -Math.sin(ang), Math.cos(ang), W / 2, W / 2); x.drawImage(L.rc, -W / 2, -W / 2); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(L.fc, 0, 0);
    const vif = etat === 'plan' || etat === 'libre', m = Math.floor(t * (vif ? 12 : 4)); x.drawImage(L.lp[m % 3], 0, 0);
    if (I.fleche) { const lw = 112 * K, lh = lw * I.fleche.height / I.fleche.width; x.translate(W / 2, lh * .32 + 2 * K); x.rotate(flap); x.drawImage(I.fleche, -lw / 2, -lh * .32, lw, lh); x.setTransform(1, 0, 0, 1, 0, 0); }
    if (vivant) rep = requestAnimationFrame(dessine);
  }
  rep = requestAnimationFrame(dessine);
  // ---- la main : la roue suit le doigt ou la souris ; à la main levée, elle part avec la vitesse du geste
  let pris = 0, pts = [];
  const angle = ev => { const r = Bo.getBoundingClientRect(); return Math.atan2(ev.clientY - r.top - r.height / 2, ev.clientX - r.left - r.width / 2); };
  Bo.addEventListener('pointerdown', ev => { if (etat !== 'repos') return; try { Audio.ensure(); } catch (y) {} try { Bo.setPointerCapture(ev.pointerId); } catch (y) {} pris = angle(ev); pts = [[performance.now(), ang]]; Bo.classList.add('prise'); etat = 'main'; });
  Bo.addEventListener('pointermove', ev => { if (etat !== 'main') return; const a = angle(ev); let d = a - pris; if (d > Math.PI) d -= RTAU; if (d < -Math.PI) d += RTAU; pris = a; ang += d; pts.push([performance.now(), ang]); if (pts.length > 24) pts.shift(); });
  const lache = () => { if (etat !== 'main') return; Bo.classList.remove('prise'); const n = performance.now(), q = pts.filter(p => n - p[0] < 110); let v = 0; if (q.length > 1) { const a = q[0], b = q[q.length - 1]; v = (b[1] - a[1]) / Math.max(.016, (b[0] - a[0]) / 1000); } w = Math.abs(v) < 4 ? (v < 0 ? -4 : 4) : v; if (essai) essai.lacher = v; etat = 'libre'; Ge.textContent = 'Ça tourne…'; tirer(); };
  Bo.addEventListener('pointerup', lache); Bo.addEventListener('pointercancel', lache);
  function lancerAuto() { if (etat !== 'repos') return; try { Audio.ensure(); } catch (y) {} etat = 'libre'; w = 18 + Math.random() * 12; Ge.textContent = 'Ça tourne…'; tirer(); }
  const clavier = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); fermer(); } else if ((ev.key === 'Enter' || ev.key === ' ') && (document.activeElement === document.body || document.activeElement === Pad)) { ev.preventDefault(); lancerAuto(); } };
  document.addEventListener('keydown', clavier, true);
  function fermer() { if (etat === 'libre' || etat === 'plan') return true; vivant = false; cancelAnimationFrame(rep); removeEventListener('resize', res); document.removeEventListener('keydown', clavier, true); V.remove(); ROUE.ouverte = null; try { gcCarte(); if (GC.corps && document.getElementById('jdw-gc')) gcRecharger(); } catch (y) {} if (o.apres) o.apres(); return true; }
  ROUE.ouverte = fermer;
  async function gagne() {
    if (!vivant) return;
    const lot = R.lot, Fi = gcEl('div', 'roue-fin' + (lot === 'J' ? ' jp' : '')), Bx = gcEl('div', 'bx');
    if (lot === 'J') { Fi.appendChild(gcEl('div', 'rayons')); for (let i = 0; i < 46; i++) { const c = gcEl('i', 'piece'); c.style.cssText = '--x:' + Math.round(Math.random() * 100) + 'vw;--d:' + (1.6 + Math.random() * 2.1).toFixed(2) + 's;--r:' + Math.round(Math.random() * 720) + 'deg;animation-delay:' + (Math.random() * 1.4).toFixed(2) + 's'; Fi.appendChild(c); } }
    const im = I[ROUE_FICHE[lot]]; if (im) { const c = new Image(); c.src = im.src; c.alt = ''; c.className = 'im'; Bx.appendChild(c); }
    Bx.appendChild(gcEl('h2', '', lot === 'J' ? 'JACKPOT !' : lot === 'B' ? 'BOOSTER !' : '+' + R.credits + ' 💎'));
    if (lot === 'J') Bx.appendChild(gcEl('p', '', '+' + gcNb(R.credits) + ' crédits pour toi' + (R.copains ? ', et ' + R.gain_copain + ' 💎 pour chacun de tes ' + R.copains + ' copains !' : ' !')));
    else if (lot === 'B') Bx.appendChild(gcEl('p', '', 'Un booster Astrofaune à ouvrir'));
    if (R.bonus > 0) Bx.appendChild(gcEl('p', 'bonus', '🔥 Série de ' + R.serie + ' jours : +' + R.bonus + ' 💎'));
    if (R.test) Bx.appendChild(gcEl('p', 'bonus', '🧪 Essai : aucun crédit versé'));
    const e2 = await roueLire(), Act = gcEl('div', 'act'); Bx.appendChild(Act);
    if (lot === 'B' && R.booster && R.booster.cartes && window.AstroBooster) Act.appendChild(gcBt('roue-bt', 'Ouvrir mon booster', async () => { try { await window.AstroBooster.ouvrir({ base: ROOT + 'assets/astrobooster/', cartes: R.booster.cartes, collection: R.booster.collection || {}, zIndex: 2147483500 }); } catch (y) {} fermer(); }));
    else Act.appendChild(gcBt('roue-bt', 'Super !', () => fermer()));
    if (e2 && e2.pub_dispo) { const n = e2.pubs_max - e2.pubs_faites; Act.appendChild(gcBt('roue-bt b2', (e2.prochaine === 'or' ? '🎬 Une pub pour la roue dorée' : '🎬 Une pub pour relancer') + ' (' + n + ')', () => { fermer(); rouePub(); })); }
    Fi.appendChild(Bx); V.appendChild(Fi); try { Se.isConnected && e2 && roueSerie(e2, Se); } catch (y) {}
    if (R.solde != null) try { gcMajSolde(R.solde); } catch (y) {}
    if (!muted) try { const n_ = lot === 'J' ? [523, 659, 784, 1047, 1319, 1568] : [659, 880, 1047]; n_.forEach((f, i) => setTimeout(() => Audio.tone(f, .26, 'triangle', .13), i * (lot === 'J' ? 150 : 110))); } catch (y) {}
    try { if (navigator.vibrate) navigator.vibrate(lot === 'J' ? [90, 50, 90, 50, 220] : 40); } catch (y) {}
    if (lot === 'J' && !R.deja && !R.test) try { poke('roue'); } catch (y) {}
    const b0 = Act.querySelector('button'); if (b0) b0.focus({ preventScroll: true });
  }
  (document.body.classList.contains('jdw-pad') ? Pad : Pa).focus({ preventScroll: true });
  return true;
}
// une pub vue en entier donne un ticket, le serveur le vérifie avant de tirer
async function rouePub() {
  if (GC.busy) return; GC.busy = true; let t = null;
  try {
    t = await rpc('gc_pub_debut', { p_name: gcNom(), p_sorte: 'longue' });
    if (!t || !t.ok) { toastCheer(t && t.why === 'plafond' ? 'Tu as regardé toutes les pubs d’aujourd’hui.' : 'Pas de pub disponible pour le moment.', gcNom(), true); return; }
    const st = GC.st || await rpc('gc_etat', { p_name: gcNom() }, { quiet: true }), P = (st && st.pub) || {};
    let r; if (P.regie && !gcAppli()) { await gcChargerRegie(P.regie, P.test); r = await gcPubGoogle('longue'); } else if (P.test) r = await gcPubDemo(t); else r = 'aucune';
    if (r !== 'vue') { await rpc('gc_pub_annuler', { p_name: gcNom(), p_id: t.id }, { quiet: true }).catch(() => {}); return; }
    GC.busy = false; await roueOuvrir({ ticket: t.id });
  } catch (e) { if (t && t.id) rpc('gc_pub_annuler', { p_name: gcNom(), p_id: t.id }, { quiet: true }).catch(() => {}); }
  finally { GC.busy = false; }
}
// ---- dans « Gagner des crédits » : la grande bannière
const roueRendu0 = gcRendu;
gcRendu = function (C) {
  const r = roueRendu0.apply(this, arguments);
  (async () => {
    const e = await roueLire(); if (!e || !e.actif || !C.isConnected || GC.vue || C.querySelector('.roue-ban')) return;
    const b = gcBt('roue-ban' + (e.gratuit ? ' dispo' : ''), '', () => { if (ROUE.e && ROUE.e.gratuit) roueOuvrir({ info: true }); else if (ROUE.e && ROUE.e.pub_dispo) rouePub(); else roueOuvrir({ info: true, voir: true }); });
    const tx = gcEl('span', 'tx'); tx.append(gcEl('b', '', '🎡 La roue du jour'), gcEl('small', '', e.gratuit ? 'Ton lancer gratuit t’attend !' : e.pub_dispo ? 'Regarde une pub pour relancer (' + (e.pubs_max - e.pubs_faites) + ')' : 'Reviens demain pour ton prochain lancer'));
    const se = gcEl('span', 'se', '🔥 ' + (e.serie || 0)); b.append(tx, se); if (GC.cartes && GC.cartes.isConnected) GC.cartes.before(b); else C.prepend(b);
  })();
  return r;
};
const roueAdmin0 = gcSectionAdmin;
gcSectionAdmin = function () {
  const s = roueAdmin0.apply(this, arguments), B = gcEl('div', 'roue-adm'); s.appendChild(B);
  rpc('roue_admin_etat', { p_name: gcNom() }, { quiet: true, quiet404: true }).then(a => {
    if (!a) return; const g = a.gratuit || {}, p = a.pub || {}; B.append(gcEl('h4', '', '🎡 La roue · ' + a.mois), gcEl('p', 'gc-p', 'Distribués : ' + gcNb(a.donnes) + ' / ' + gcNb(a.plafond) + ' 💎 · jackpots : ' + a.jackpots), gcEl('p', 'gc-p', 'Gratuit : ' + g.lancers + ' lancers, ' + gcNb(g.credits) + ' 💎 · Pubs : ' + p.lancers + ' vues, ' + gcNb(p.credits) + ' 💎'));
    const f = gcEl('input', 'gc-in'); f.type = 'number'; f.min = '0'; f.placeholder = 'Revenu pubs du mois (centimes)'; if (a.revenu_centimes != null) f.value = a.revenu_centimes; const ok = gcBt('gc-bt gc-bt2', 'Enregistrer', () => rpc('roue_admin_revenu', { p_name: gcNom(), p_centimes: +f.value || 0 }, { quiet: true }).then(() => { ok.textContent = 'Enregistré ✓'; })); B.append(f, ok);
  }).catch(() => {});
  return s;
};
const roueBack0 = jdwBack;
jdwBack = function () { if (ROUE.ouverte) { ROUE.ouverte(); return true; } return roueBack0.apply(this, arguments); };
// ---- la fenêtre à l'ouverture : une fois par jour, seulement si le lancer gratuit est là, jamais par-dessus autre chose
const roueOccupee = () => invPending() || INV.busy || INV.bad || !$('jdw-play').hidden || document.body.classList.contains('atl-on') || !!document.querySelector('.sheet:not([hidden]), .gc-voile, .roue-voile');
async function roueDuJour(n) {
  n = n || 0; if (n > 30 || ROUE.vu || CADRE || !ONLINE || gcPasCompte()) return;
  if (netOff() || roueOccupee()) { setTimeout(() => roueDuJour(n + 1), 3000); return; }
  const e = await roueLire(); if (!e || !e.actif) return;
  roueCadeauxDire(e); if (!e.gratuit) return;
  const cle = 'jdw.roue.vue.' + gcNom(); if (store.get(cle, '') === e.jour) return;
  await roueArt(); if (roueOccupee()) { setTimeout(() => roueDuJour(n + 1), 3000); return; }
  ROUE.vu = true; store.set(cle, e.jour); roueOuvrir({ popup: true });
}
ouvApres(() => setTimeout(roueDuJour, 900));
