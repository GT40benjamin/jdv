/* ---------- Branchement dans la bibliothèque « Jeux des WC » ---------- */
function pgPreview(c, w, h, t) {
  const fl = h - 22, sp = 70, off = (t * sp) % 120;
  c.fillStyle = COL.wall; c.fillRect(0, 0, w, h);
  // fenêtres en arc
  for (let x = -off * 0.5 - 40; x < w + 120; x += 120) {
    c.fillStyle = COL.wall_dk; c.fillRect(x + 18, 22, 64, 86);
    c.fillStyle = COL.sky; c.beginPath(); c.moveTo(x + 24, 104); c.lineTo(x + 24, 52); c.arc(x + 50, 52, 26, Math.PI, 0); c.lineTo(x + 76, 104); c.fill();
    c.fillStyle = COL.wall_dk; c.fillRect(x + 49, 26, 2, 78); c.fillRect(x + 24, 70, 52, 2);
  }
  // piliers
  for (let x = -off - 10; x < w + 120; x += 120) { c.fillStyle = COL.steel; c.fillRect(x, 0, 16, fl); c.fillStyle = COL.steel2; c.fillRect(x, 0, 3, fl); }
  // sol
  c.fillStyle = COL.floor; c.fillRect(0, fl, w, h - fl);
  c.save(); c.beginPath(); c.rect(0, fl, w, 5); c.clip(); c.fillStyle = COL.amber; c.fillRect(0, fl, w, 5);
  c.fillStyle = COL.night; for (let x = -((t * sp * 2) % 20) - 20; x < w + 20; x += 20) { c.beginPath(); c.moveTo(x, fl + 5); c.lineTo(x + 10, fl + 5); c.lineTo(x + 15, fl); c.lineTo(x + 5, fl); c.fill(); }
  c.restore();
  // pièces
  for (let i = 0; i < 8; i++) {
    const x = ((i * 26 - t * sp * 2) % (w + 60) + w + 60) % (w + 60) - 20, y = h * 0.32 + Math.sin(i * 0.7) * 10;
    const sx = Math.abs(Math.cos(t * 5 + i));
    c.fillStyle = COL.gold_dk; c.beginPath(); c.ellipse(x, y, 5 * sx + 1, 5, 0, 0, 7); c.fill();
    c.fillStyle = COL.gold; c.beginPath(); c.ellipse(x, y, 3.5 * sx + 0.6, 3.5, 0, 0, 7); c.fill();
  }
  // arc électrique
  const zx = w - ((t * sp * 2) % (w + 80)) + 40, zy = h * 0.62;
  c.strokeStyle = COL.volt; c.lineWidth = 2.5; c.beginPath(); c.moveTo(zx, zy - 22);
  for (let k = 1; k < 7; k++) c.lineTo(zx + (Math.random() - 0.5) * 6, zy - 22 + k * 44 / 7);
  c.lineTo(zx, zy + 22); c.stroke();
  c.fillStyle = COL.steel; for (const yy of [zy - 22, zy + 22]) { c.beginPath(); c.arc(zx, yy, 5, 0, 7); c.fill(); }
  // jet + pilote
  const px = w * 0.3, py = h * 0.5 + Math.sin(t * 2.2) * h * 0.14;
  c.save(); c.translate(px, py); c.rotate(Math.cos(t * 2.2) * -0.12); c.scale(1.25, 1.25);
  const f = 14 + Math.random() * 10;
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = COL.amber; c.beginPath(); c.moveTo(-28, 0.5); c.lineTo(-28, 8.5); c.lineTo(-28 - f, 4.5); c.fill();
  c.fillStyle = COL.gold; c.beginPath(); c.moveTo(-28, 2.5); c.lineTo(-28, 6.5); c.lineTo(-28 - f * 0.55, 4.5); c.fill();
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = COL.jacket; c.beginPath(); c.moveTo(-27, 1); c.lineTo(-17, 1); c.lineTo(-23, -13); c.lineTo(-30, -13); c.fill();
  if (PILOT.complete && PILOT.naturalWidth) c.drawImage(PG_PREVIEW_PILOT || PILOT, -15, -39, 30.7, 40);
  c.fillStyle = COL.ink; c.beginPath(); c.moveTo(-27, -1); c.lineTo(8, -3); c.quadraticCurveTo(24, -1, 30, 6);
  c.quadraticCurveTo(22, 12, 6, 12); c.lineTo(-25, 10); c.closePath(); c.fill();
  c.fillStyle = COL.jacket; c.fillRect(-26, 3.5, 51, 3);
  c.beginPath(); c.moveTo(-9, 8); c.lineTo(9, 8); c.lineTo(-1, 17); c.lineTo(-13, 17); c.fill();
  c.restore();
}
/* têtes des copains : pilote casqué, intro « Let's go », têtes volantes */
function pgPickHead() { return PG_HEADS.length ? PG_HEADS[Math.floor(Math.random() * PG_HEADS.length)].img : null; }
function pgHelmetize(img) {
  const W = 154, H = 200, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const r = (img.naturalWidth || img.width) / (img.naturalHeight || img.height) || 0.8;
  const hh = H * 0.9, hw = hh * r;
  x.drawImage(img, (W - hw) / 2, H - hh, hw, hh);
  x.save(); x.beginPath(); x.rect(0, 0, W, H * 0.42); x.clip();
  x.fillStyle = '#ff6b3d'; x.beginPath(); x.ellipse(W / 2, H * 0.42, W * 0.47, H * 0.38, 0, Math.PI, 0); x.fill();
  x.fillStyle = '#e9f0f3'; x.fillRect(W / 2 - 9, 0, 18, H * 0.42);
  x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(W * 0.34, H * 0.16, W * 0.12, H * 0.035, -0.3, 0, 7); x.fill();
  x.restore();
  x.fillStyle = '#c4482a'; x.fillRect(W * 0.03, H * 0.40, W * 0.94, H * 0.045);
  x.fillStyle = '#3a5568'; x.fillRect(W * 0.2, H * 0.31, W * 0.6, H * 0.04);
  for (const gx of [0.37, 0.63]) { x.fillStyle = '#22394a'; x.beginPath(); x.arc(W * gx, H * 0.33, W * 0.1, 0, 7); x.fill(); x.fillStyle = '#7fe3ff'; x.beginPath(); x.arc(W * gx, H * 0.33, W * 0.065, 0, 7); x.fill(); }
  for (const ex of [0.06, 0.94]) { x.fillStyle = '#c4482a'; x.beginPath(); x.arc(W * ex, H * 0.52, W * 0.09, 0, 7); x.fill(); x.fillStyle = '#3a5568'; x.beginPath(); x.arc(W * ex, H * 0.52, W * 0.05, 0, 7); x.fill(); }
  return c;
}
/* copains-boss : un boss sur deux (au moins) porte le grand visage d'un copain ;
   battu, il montre sa tête triste (sad) avec « Snif… NOM pleure ! » et un bonus en MÈTRES (le classement est en mètres),
   qui s'ajoute à la prime de boss normale */
const PG_BOSS_BONUS = 25;
function pgBossReset() { PG_BOSS_SAD = null; PG_BOSS_COUNT = 0; }
function pgBossHead() {
  if (!PG_HEADS.length) return null;
  PG_BOSS_COUNT++;
  if (PG_BOSS_COUNT % 2 === 0 && Math.random() < 0.5) return null;   // boss impairs : toujours ; pairs : 1 sur 2
  let pool = PG_HEADS.filter(h => h && h.img && h.name !== PG_BOSS_LAST);
  if (!pool.length) pool = PG_HEADS.filter(h => h && h.img);
  if (!pool.length) return null;
  const h = pool[Math.floor(Math.random() * pool.length)];
  PG_BOSS_LAST = h.name;
  return { name: String(h.name || 'Copain'), img: h.img, sad: h.sad || h.img, fakeSad: !h.sad };
}
function pgImgSize(img, hh) {
  const w = img.naturalWidth || img.width || 4, h = img.naturalHeight || img.height || 5;
  return [hh * w / h, hh];
}
// visage posé sur le corps du boss (repère local du boss, déjà translaté/tourné)
function pgDrawBossFace(b) {
  const f = b.friend, img = phase === 'bossDown' ? f.sad : f.img;
  const spot = b.type === 0 ? [-2, -4, 34] : b.type === 1 ? [-1, -6, 30] : b.type === 3 ? [10, -2, 29] : b.type === 4 ? [0, 0, 31] : [0, 0, 33];
  const [cx, cy, r] = spot;
  // hublot
  ctx.fillStyle = COL.night; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = phase === 'bossDown' ? COL.volt : COL.alarm; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  const angry = phase === 'boss' && b.atk < 0.35;
  const [iw, ih] = pgImgSize(img, r * 2.5);
  ctx.save(); ctx.translate(cx + (angry ? (Math.random() - 0.5) * 2 : 0), cy - r * 0.12);
  ctx.rotate(Math.sin(b.t * 3) * 0.06);
  ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
  ctx.restore();
}
function pgBossBeaten(b) {
  const f = b.friend;
  bonusM += PG_BOSS_BONUS;
  banner('Snif… · bonus +' + PG_BOSS_BONUS + ' m', f.name + ' pleure !', false, 1.8);
  PG_BOSS_SAD = { f, x: Math.min(b.x - 20, W - 90), y: b.y, t0: time };
  tone(392, 0.25, 'triangle', 0.06, 330); setTimeout(() => tone(330, 0.4, 'triangle', 0.06, 262), 260);
}
// gros plan sur la tête triste, qui monte doucement puis s'efface (avant le « Let's go »)
function pgDrawBossSad() {
  const s = PG_BOSS_SAD;
  if (!s) return;
  const t = time - s.t0, D = 1.8;
  if (t < 0 || t > D) { if (t > D) PG_BOSS_SAD = null; return; }
  const a = clamp(Math.min(t / 0.25, (D - t) / 0.3), 0, 1), pop = 0.6 + 0.4 * clamp(t / 0.3, 0, 1);
  const y = clamp(s.y, CEIL + 80, FLOOR - 80) - t * 14;
  const [iw, ih] = pgImgSize(s.f.sad, 104);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(s.x, y); ctx.scale(pop, pop);
  ctx.fillStyle = 'rgba(94,200,255,.18)'; ctx.beginPath(); ctx.arc(0, 0, 62, 0, 7); ctx.fill();
  ctx.rotate(Math.sin(t * 9) * 0.05);
  ctx.drawImage(s.f.sad, -iw / 2, -ih / 2, iw, ih);
  if (s.f.fakeSad) {   // pas de version triste : petites larmes dessinées
    ctx.fillStyle = '#5ec8ff';
    for (const k of [-1, 1]) {
      const tx = k * iw * 0.2, ty = ih * 0.02 + ((t * 40 + (k + 1) * 6) % 18);
      ctx.beginPath(); ctx.moveTo(tx, ty - 7); ctx.quadraticCurveTo(tx + 5, ty + 3, tx, ty + 6); ctx.quadraticCurveTo(tx - 5, ty + 3, tx, ty - 7); ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = a;
  label('Snif…', s.x, y - 66, 18, COL.volt);
  label('+' + PG_BOSS_BONUS + ' m', s.x, y + 66, 15, COL.gold);
  ctx.globalAlpha = 1;
}
window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.pleingaz = {
  id: 'pleingaz', title: 'Plein Gaz', accent: '#ffa630', scoreLabel: 'm', external: 'jdw-pg',
  tagline: "Pilote ton jet dans l'usine, esquive les obstacles et bats un boss à chaque niveau.",
  preview: pgPreview,
  setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
  mount(root, api) {
    PG_API = api; PG_ACTIVE = true;
    PG_HEADS = (api.heads && api.heads()) || [];
    PG_PILOT_IMG = api.player && api.player.img ? pgHelmetize(api.player.img) : null;
    muted = api.isMuted();
    resize(); last = performance.now(); acc = 0;
    start();
    if (master) master.gain.value = muted ? 0 : 0.5;
    return {
      destroy() {
        PG_ACTIVE = false; PG_API = null;
        holding = false; thrustPointer = null; setThrustSound(false);
        state = 'menu'; introT = 0;
        ['hud', 'paused', 'over', 'banner', 'menu'].forEach(id => { const el = $(id); if (el) el.hidden = true; });
      }
    };
  }
};
