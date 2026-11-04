(() => {
'use strict';
// Trôn-e — jeu de l'Atelier des jeux (projet 9af84595, auteur REMS, 4 nov. 2026) : course de toilettes façon « Tron » à plusieurs.
// CE FICHIER N'EST QUE LE MODULE DE SECOURS de la borne : le vrai jeu est assets/jeux/trone/vN.js (chargé par atlModule, qui y recopie
// les clés absentes d'ici — dont live: true, le direct de la salle, CONTRACT.md Ajout 17). Sans fichier de version, on montre seulement
// un écran « ton jeu est en préparation », dessiné en néon comme le jeu.
const TAU = Math.PI * 2;
const FONT = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";

// la grille néon en perspective, des traînées de lumière qui filent, le trône qui flotte
function scene(ctx, w, h, t) {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#02030a'); g.addColorStop(0.55, '#061026'); g.addColorStop(1, '#0a0420');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const hz = h * 0.5, cx = w / 2;
  // halo de l'horizon
  const hg = ctx.createRadialGradient(cx, hz, 0, cx, hz, w * 0.7); hg.addColorStop(0, 'rgba(63,240,255,0.28)'); hg.addColorStop(1, 'rgba(63,240,255,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(0, hz, w, h - hz); ctx.clip();
  ctx.lineWidth = Math.max(1, h / 400); ctx.strokeStyle = 'rgba(63,240,255,0.55)'; ctx.shadowColor = '#3ff0ff'; ctx.shadowBlur = 8;
  for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(cx + i * w * 0.02, hz); ctx.lineTo(cx + i * w * 0.22, h); ctx.stroke(); }
  const off = (t * 0.6) % 1;
  for (let k = 0; k < 14; k++) { const p = Math.pow((k + off) / 14, 2.2), y = hz + p * (h - hz); ctx.globalAlpha = 0.15 + p * 0.7; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // deux traînées de lumière (cyan et orange) qui tournent à angle droit
  const tr = [['#3ff0ff', 0], ['#ff8a3a', 0.5]];
  for (const [col, ph] of tr) {
    const u = (t * 0.35 + ph) % 1, yb = hz + (h - hz) * (0.35 + 0.4 * ph);
    const x1 = w * (0.1 + 0.8 * u), x0 = Math.max(0, x1 - w * 0.35);
    ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.lineWidth = Math.max(2, h / 140);
    ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.lineTo(x1, yb - (h - hz) * 0.12 * (ph ? -1 : 1)); ctx.stroke();
  }
  ctx.restore();
  // le trône qui flotte au-dessus de l'horizon, avec son reflet
  const s = Math.min(w, h) * 0.2, fy = hz - s * 0.55 + Math.sin(t * 2) * s * 0.06;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = Math.round(s) + 'px system-ui, "Segoe UI Emoji", sans-serif';
  ctx.shadowColor = '#3ff0ff'; ctx.shadowBlur = s * 0.35; ctx.fillText('🚽', cx, fy);
  ctx.globalAlpha = 0.18; ctx.scale(1, -0.45); ctx.fillText('🚽', cx, -(hz + s * 0.55) / 0.45); ctx.restore();
}

function titre(ctx, w, h, sub) {
  const z = Math.min(w / 520, h / 420);
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 ' + Math.round(64 * z) + 'px ' + FONT; ctx.fillStyle = '#e9feff'; ctx.shadowColor = '#3ff0ff'; ctx.shadowBlur = 22 * z;
  ctx.fillText('TRÔN-E', w / 2, h * 0.16);
  if (sub) {
    ctx.font = '700 ' + Math.round(19 * z) + 'px ' + FONT;
    // bandeau sombre derrière le texte : les traînées de lumière passent dessous
    const bw = Math.min(w - 24, Math.max(...sub.map(l => ctx.measureText(l).width)) + 48 * z), bh = (sub.length * 30 + 22) * z, by = h * 0.8 - 26 * z;
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(2,6,20,0.78)'; ctx.strokeStyle = 'rgba(63,240,255,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect((w - bw) / 2, by, bw, bh, 14 * z); ctx.fill(); ctx.stroke();
    ctx.shadowColor = '#3ff0ff'; ctx.shadowBlur = 8 * z; ctx.fillStyle = '#bff8ff';
    sub.forEach((l, i) => ctx.fillText(l, w / 2, h * 0.8 + i * 30 * z));
  }
  ctx.restore();
}

function preview(ctx, w, h, t) { scene(ctx, w, h, t); titre(ctx, w, h, null); }

function mount(root, api) {
  let dead = false, raf = 0, t0 = 0, paused = false;
  root.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none';
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  let W = 1, H = 1, dpr = 1;
  function resize() {
    const r = root.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();
  function frame(now) {
    if (dead) return; raf = requestAnimationFrame(frame);
    if (!t0) t0 = now; if (paused) return;
    try { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); scene(ctx, W, H, (now - t0) / 1000); titre(ctx, W, H, ['Ton jeu est en préparation…', 'Reviens très vite pour la première course !']); } catch (e) { /* rien */ }
  }
  raf = requestAnimationFrame(frame);
  return {
    destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); root.innerHTML = ''; },
    currentScore() { return 0; },
    pause() { paused = true; },
    resume() { paused = false; }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.trone = {
  id: 'trone',
  title: 'Trôn-e',
  tagline: 'La course des trônes de lumière : le dernier en vie gagne la manche !',
  accent: '#3ff0ff',
  scoreLabel: 'points',
  orientation: 'les2',
  live: true,   // à plusieurs dans la salle : api.live (CONTRACT.md Ajout 17), aussi pour assets/jeux/trone/vN.js
  preview,
  mount,
  pad: { help: [['ls/dpad', 'Tourner']], intro: false }
};
})();
