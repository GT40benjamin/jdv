// Strike Monstres V5.2 (offerte) : la V4 (un geste n'importe où, PC et téléphone debout comme couché, physique renforcée, machine à quilles) +
// un lancer très en biais tombe dans la vraie rigole ronde et y roule jusqu'au bout sans toucher de quille ; plus d'aperçu de trajectoire :
// on vise au feeling. V5.1 : le geste se mesure à l'heure réelle de chaque échantillon (PC lent). V5.2 : la boule tenue se déplace librement, en arrière aussi. Moteur v5/moteur.bin ; menu, images et sons de la V3.
// Strike Monstres V2 — un jeu de l'Atelier (projet de COCOMOUTARDE), refait de zéro en vraie 3D : salle de bowling néon, piste vernie
// qui reflète, vraies quilles en 3D qui basculent, roulent et se cognent (physique maison), têtes de monstres qui grimacent en tombant,
// le bras du joueur et son geste de lancer, juke-box à 4 disques, bruit de la salle, têtes des copains de la salle sur une quille de temps en temps.
// Ce petit module dessine la vignette et charge le moteur (assets/jeux/strike/v5/moteur.bin : three.js r180, licence MIT, + le jeu, gzippé).
// Images des monstres : v2/tetes.bin ; vignette : v2/apercu.bin ; sons : v1/sons.bin ; musiques assets/music/strike-1..4.mp3. Une variable globale en plus : window.JDW_STRIKE.
(function () {
const WANT = "8cb077b9";
const ROOT = () => window.JDW_ROOT || '';

/* ---------- la vignette : deux images de la vraie scène 3D (la boule arrive sur les monstres, puis la cascade et « STRIKE ! ») ---------- */
const AP = {}; let AP_LOAD = null;
function chargerApercu() {
  if (AP_LOAD) return AP_LOAD;
  AP_LOAD = (async () => {
    const r = await fetch(ROOT() + 'assets/jeux/strike/v2/apercu.bin'); if (!r.ok) throw new Error('apercu');
    const b = new Uint8Array(await r.arrayBuffer()); if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'NOI1') throw new Error('apercu');
    const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24), idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n)));
    await Promise.all(idx.map(e => new Promise(res => { const im = new Image(); im.onload = () => { AP[e[0]] = im; res(); }; im.onerror = res; im.src = URL.createObjectURL(new Blob([b.subarray(8 + n + e[1], 8 + n + e[1] + e[2])], { type: 'image/webp' })); })));
  })();
  AP_LOAD.catch(() => { AP_LOAD = null; });
  return AP_LOAD;
}
function preview(ctx, w, h, t) {
  try {
    chargerApercu().catch(() => {});
    const cyc = t % 4, im = cyc < 1.9 ? AP.a : AP.b;
    if (!im) {
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a0b33'); g.addColorStop(1, '#07020f'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.font = '400 ' + Math.round(h * 0.16) + 'px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ff3fd0'; ctx.shadowColor = '#ff3fd0'; ctx.shadowBlur = 14; ctx.fillText('STRIKE MONSTRES', w / 2, h / 2); ctx.shadowBlur = 0; return;
    }
    const z = 1 + (cyc < 1.9 ? cyc : cyc - 1.9) * 0.025, s = Math.max(w / im.width, h / im.height) * z;
    ctx.drawImage(im, (w - im.width * s) / 2, (h - im.height * s) / 2, im.width * s, im.height * s);
    if (cyc >= 1.9) {
      const k = Math.min(1, (cyc - 1.9) / 0.25), fs = Math.round(h * 0.2 * (0.7 + 0.3 * k));
      ctx.save(); ctx.globalAlpha = k; ctx.font = '400 ' + fs + 'px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff3fd0'; ctx.shadowBlur = h * 0.08; ctx.fillStyle = '#ff3fd0'; ctx.fillText('STRIKE !', w / 2, h * 0.72); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.globalAlpha = k * 0.85; ctx.fillText('STRIKE !', w / 2, h * 0.72); ctx.restore();
    }
  } catch (e) { /* une vignette ne casse jamais la borne */ }
}

/* ---------- le moteur 3D ---------- */
let ENGINE = null;
async function octets(url, onProg, opt) {
  const r = await fetch(url, opt); if (!r.ok) throw new Error('moteur ' + r.status);
  const total = +(r.headers.get('content-length') || 0) || 220000;
  if (!r.body || !r.body.getReader) { const b = new Uint8Array(await r.arrayBuffer()); onProg(1); return b; }
  const rd = r.body.getReader(), parts = []; let got = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; onProg(Math.min(1, got / Math.max(total, got))); }
  const out = new Uint8Array(got); let k = 0; for (const p of parts) { out.set(p, k); k += p.length; } return out;
}
function loadEngine(onProg) {
  const frais = () => window.JDW_STRIKE && window.JDW_STRIKE.game && (window.JDW_STRIKE.build === WANT || /__SK_/.test(WANT));
  if (frais()) return Promise.resolve(window.JDW_STRIKE);
  if (ENGINE) return ENGINE;
  ENGINE = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const run = async (url, opt) => {
      window.JDW_STRIKE = undefined;
      const gz = await octets(url, onProg, opt);
      const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      await new Promise((res, rej) => { const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' })); s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); }; s.src = u; document.head.appendChild(s); });
      if (!window.JDW_STRIKE || !window.JDW_STRIKE.game) throw new Error('moteur absent');
    };
    await run(ROOT() + 'assets/jeux/strike/v5/moteur.bin');
    if (!frais()) await run(ROOT() + 'assets/jeux/strike/v5/moteur.bin?v=' + WANT + '-' + Date.now(), { cache: 'reload' });
    return window.JDW_STRIKE;
  })();
  ENGINE.catch(() => { ENGINE = null; });
  return ENGINE;
}

/* ---------- lancement : un écran d'attente néon tout de suite, puis le moteur prend la main ---------- */
function mount(root, api) {
  let inst = null, dead = false, paused = false;
  const FD = (api.fonts && api.fonts.display) || 'Impact', FB = (api.fonts && api.fonts.body) || 'sans-serif';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#2a0c55,#07020f 72%);color:#fff;font-family:' + FB;
  box.innerHTML = '<div style="font:400 40px ' + FD + ';color:#fff;text-shadow:0 0 8px #fff,0 0 22px #ff3fd0,0 0 44px #ff3fd0;text-align:center;line-height:1">STRIKE<br>MONSTRES</div>' +
    '<div style="margin-top:18px;width:min(320px,62vw);height:14px;border-radius:7px;background:#12051f;box-shadow:0 0 0 1.5px rgba(51,230,255,.6);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(90deg,#ff3fd0,#33e6ff);transition:width .2s"></u></div>' +
    '<div style="margin-top:10px;font:600 14px ' + FB + ';color:#cfb8ff">Les monstres se mettent en place…</div>';
  root.appendChild(box);
  const bar = box.querySelector('u');
  const fail = () => {
    if (dead) return;
    box.innerHTML = '<div style="max-width:340px;text-align:center;padding:20px"><div style="font:400 22px ' + FD + ';color:#ffe066;margin-bottom:8px">Oups !</div><div style="font:600 14px ' + FB + ';color:#cfb8ff;margin-bottom:14px">Ton appareil n\'arrive pas à charger ce jeu 3D.</div><button type="button" style="font:400 15px ' + FD + ';color:#12051f;background:#33e6ff;border:0;border-radius:12px;padding:10px 18px;cursor:pointer">Réessayer</button></div>';
    box.querySelector('button').addEventListener('click', () => { if (dead) return; root.innerHTML = ''; const n = mount(root, api); for (const k of ['destroy', 'pause', 'resume', 'currentScore', 'currentLevel']) proxy[k] = n[k]; Object.defineProperty(proxy, '_test', { get: () => n._test, configurable: true }); });
  };
  loadEngine(k => { bar.style.width = Math.round(k * 100) + '%'; }).then(SK => {
    if (dead) return;
    root.innerHTML = '';
    inst = SK.game(root, api, { dossier: ROOT() + 'assets/jeux/strike/' });
    if (paused && inst.pause) inst.pause();
  }).catch(() => fail());
  const proxy = {
    destroy() { dead = true; if (inst) inst.destroy(); root.innerHTML = ''; },
    pause() { paused = true; if (inst) inst.pause(); },
    resume() { paused = false; if (inst) inst.resume(); },
    currentScore() { return inst ? inst.currentScore() : 0; },
    currentLevel() { return inst ? inst.currentLevel() : 1; },
  };
  Object.defineProperty(proxy, '_test', { get: () => inst && inst._test, configurable: true });
  return proxy;
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.strike = {
  id: 'strike',
  title: 'Strike Monstres',
  tagline: 'Fais tomber les monstres-quilles !',
  accent: '#ff3fd0',
  scoreLabel: 'points',
  orientation: 'les2',
  fps: false,
  music: ['strike-1', 'strike-2', 'strike-3', 'strike-4', 'strike-5', 'strike-6', 'strike-7', 'strike-8'],
  menu: true,
  logo: 'logo.png', musicMenu: 'strike-menu', menuStyle: 'cartoon', accent2: '#33e6ff',
  // la scène derrière le menu : l'image de la salle (paysage ou portrait selon l'écran), nette, avec un lent travelling et les néons qui respirent
  demo(root) {
    const c = document.createElement('canvas'); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; root.appendChild(c);
    const x = c.getContext('2d'), im = {}; let on = true, t0 = performance.now();
    // les 3 images (16:9, couché très large, debout) dans un paquet NOI1 : v3/menu.bin
    fetch(ROOT() + 'assets/jeux/strike/v3/menu.bin').then(r => r.arrayBuffer()).then(ab => { const u = new Uint8Array(ab); if (String.fromCharCode(u[0], u[1], u[2], u[3]) !== 'NOI1') return;
      const n = u[4] | (u[5] << 8) | (u[6] << 16) | (u[7] << 24), idx = JSON.parse(new TextDecoder().decode(u.subarray(8, 8 + n)));
      for (const e of idx) { const i = new Image(); i.onload = () => { if (on) im[e[0]] = i; }; i.src = URL.createObjectURL(new Blob([u.subarray(8 + n + e[1], 8 + n + e[1] + e[2])], { type: 'image/webp' })); } }).catch(() => {});
    (function f(now) {
      if (!on) return; requestAnimationFrame(f);
      const r = root.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1), W = Math.max(1, Math.round(r.width * d)), H = Math.max(1, Math.round(r.height * d));
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const i = im[H > W * 1.05 ? 'menu9' : W > H * 1.95 ? 'menu21' : 'menu16'] || im.menu16 || im.menu9;   // téléphone couché : une image faite pour lui (quilles entre le logo et le bouton JOUER)
      x.fillStyle = '#07020f'; x.fillRect(0, 0, W, H); if (!i) return;
      const t = ((now || performance.now()) - t0) / 1000, z = 1.04 + 0.03 * Math.sin(t * 0.12), s = Math.max(W / i.width, H / i.height) * z;
      const yb = (H - i.height * s) / 2;   // les quilles au milieu : entre le logo (en haut) et le gros bouton JOUER (en bas)
      x.drawImage(i, (W - i.width * s) / 2 + Math.sin(t * 0.09) * W * 0.008, yb, i.width * s, i.height * s);
      x.globalAlpha = 0.08 + 0.05 * Math.sin(t * 2.2); x.fillStyle = '#ff3fd0'; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
    })();
    return { destroy() { on = false; c.remove(); } };
  },   // Ajout 27 : le menu principal standard de la borne (pas d'écran-titre à nous)
  howto: { pc: [['Souris : clique et pousse vers le haut', 'Lancer (plus vite = plus fort)'], ['Courbe ton geste', 'De l’effet'], ['Glisse d’abord sur le côté', 'Te placer'], ['← → · Espace (tenir, lâcher)', 'Te placer · l’élan puis le lancer'], ['J', 'Juke-box : disque suivant']],
    touch: [['Un geste vers le haut, n’importe où', 'Lancer (plus vite = plus fort)'], ['Courbe ton geste', 'De l’effet'], ['Glisse d’abord sur le côté', 'Te placer'], ['Touche le juke-box', 'Disque suivant']] },
  preview,
  mount,
  pad: { help: [['ls/dpad', 'Se placer · viser'], ['a', 'Tenir : élan · lâcher : lancer'], ['y', 'Juke-box : disque suivant']], intro: false }
};
})();
