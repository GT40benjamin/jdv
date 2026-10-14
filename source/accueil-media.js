// Visuels de la page d'accueil publique, fabriqués UNIQUEMENT à partir des vignettes animées des jeux (preview()).
// Jamais de photo, jamais d'image de l'Asset Store (le cache de Galaxy Wars reste vide : planètes procédurales).
//   node source/accueil-media.js            → accueil/<id>.webm + accueil/<id>.webp + accueil/hero.webm/.webp + accueil/partage.jpg
//   ONLY=ilo,palet node source/accueil-media.js   → seulement ces jeux
// Besoins : Python (build2.py), Chrome, playwright-core dans ~/jdv-tools.
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('C:/Users/Benjamin/jdv-tools/node_modules/playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const REPO = path.resolve(__dirname, '..'), OUT = path.join(REPO, 'accueil');
const SOLO = ['ilo', 'magic', 'pleingaz', 'empilo', 'glouton', 'mouches', 'carreaux', 'rouleaux'];   // Bataille de Canards : retirée du mode Classique (« Canards : la guerre » reste en duel)
const DUO = ['trouve', 'palet', 'briques', 'boum', 'souris', 'spatial', 'mots', 'guerre'];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
// Vignettes 4:3 (comme les tuiles de la borne) : 320×240 logiques, rendues ×1.75 → 560×420.
const TILE = { w: 320, h: 240, dpr: 1.75, dur: 5, fade: 0.7, bps: 330000 };
const HERO = { w: 480, h: 270, dpr: 2, dur: 6, fade: 0.8, bps: 700000 };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jdv-accueil-'));
  execFileSync('python', [path.join(__dirname, 'build2.py'), path.join(tmp, 'art.html'), path.join(tmp, 'standalone.html')],
    { env: { ...process.env, PYTHONUTF8: '1' }, stdio: 'inherit' });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } }); // contexte neuf = localStorage vide
  // rien ne part vers le serveur ni vers les paquets chiffrés : seulement le fichier local
  await ctx.route(/^https?:/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  (erreur de la page ignorée) ' + String(e.message).slice(0, 100)));
  await page.goto('file:///' + path.join(tmp, 'standalone.html').replace(/\\/g, '/'));
  await page.waitForFunction(() => window.JDW_GAMES && window.JDW_DUOS && Object.keys(window.JDW_DUOS).length >= 8 && window.JDW_GAMES.pleingaz, null, { timeout: 30000 });
  // un jeu absent du build (ex. canards) : on charge son module directement
  for (const id of SOLO) if (id !== 'pleingaz' && !(await page.evaluate(i => !!window.JDW_GAMES[i], id)))
    await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'games', id + '.js'), 'utf8') });
  for (const id of DUO) if (!(await page.evaluate(i => !!window.JDW_DUOS[i], id)))
    await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'duos', id + '.js'), 'utf8') });
  const info = await page.evaluate(() => {
    // pas d'images de l'Asset Store : le cache de Galaxy Wars doit être vide
    const had = !!(window.JDW_ASSETS && window.JDW_ASSETS.cache && window.JDW_ASSETS.cache.ilo);
    if (window.JDW_ASSETS && window.JDW_ASSETS.cache) delete window.JDW_ASSETS.cache.ilo;
    const lib = document.getElementById('jdw-lib'); if (lib) lib.hidden = true; // coupe les vignettes de la borne (CPU)
    document.body.style.background = '#000';
    const pick = (o) => Object.fromEntries(Object.entries(o).map(([k, g]) => [k, { title: g.title, tagline: g.tagline, accent: g.accent }]));
    return { had, ls: localStorage.length, games: pick(window.JDW_GAMES), duos: pick(window.JDW_DUOS) };
  });
  console.log('cache ilo avant :', info.had ? 'PRÉSENT (vidé)' : 'vide', '· localStorage :', info.ls, 'clés');
  fs.writeFileSync(path.join(tmp, 'jeux.json'), JSON.stringify(info, null, 1));
  console.log('titres/accents :', path.join(tmp, 'jeux.json'));

  async function record(kind, id, spec, name) {
    const res = await page.evaluate(async ({ kind, id, spec }) => {
      const g = (kind === 'duo' ? window.JDW_DUOS : window.JDW_GAMES)[id];
      if (window.JDW_ASSETS && window.JDW_ASSETS.cache && window.JDW_ASSETS.cache.ilo) throw new Error('cache ilo présent');
      const W = Math.round(spec.w * spec.dpr), H = Math.round(spec.h * spec.dpr);
      const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      const out = mk(), a = mk(), b = mk();
      out.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647'; document.body.appendChild(out);
      const draw = (cv, t) => { const x = cv.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.setTransform(spec.dpr, 0, 0, spec.dpr, 0, 0); g.preview(x, spec.w, spec.h, t); x.restore(); };
      // la vignette dépend-elle seulement de t ? (sinon pas de fondu de boucle : on mélangerait deux états)
      const sig = (cv) => { const d = cv.getContext('2d').getImageData(0, 0, W, H).data; let s = 0; for (let i = 0; i < d.length; i += 97) s = (s * 31 + d[i]) | 0; return s; };
      const T0 = 2 + spec.fade;
      for (let t = 0; t < T0; t += 1 / 30) draw(a, t);
      draw(a, T0 + 1.5); const s1 = sig(a); draw(a, T0 + 0.2); draw(a, T0 + 1.5); const pure = sig(a) === s1;
      draw(a, T0);
      const o = out.getContext('2d'); o.drawImage(a, 0, 0);
      // image fixe : parmi plusieurs instants de la boucle, la plus riche (certaines vignettes passent par un écran presque vide)
      let poster = null, cands = [];
      const stream = out.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: spec.bps });
      const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      const done = new Promise(r => rec.onstop = r);
      rec.start(); const start = performance.now();
      await new Promise(resolve => {
        const step = () => {
          const u = (performance.now() - start) / 1000;
          if (u >= spec.dur) return resolve();
          draw(a, T0 + u); o.globalAlpha = 1; o.drawImage(a, 0, 0);
          const k = (u - (spec.dur - spec.fade)) / spec.fade;
          if (pure && k > 0) { draw(b, T0 + u - spec.dur); o.globalAlpha = Math.min(1, k); o.drawImage(b, 0, 0); o.globalAlpha = 1; }
          if (cands.length < 6 && u >= spec.dur * (0.08 + cands.length * 0.15)) cands.push(out.toDataURL('image/webp', 0.82));
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      rec.stop(); await done; out.remove();
      poster = cands.reduce((m, c) => c.length > m.length ? c : m, '');
      const blob = new Blob(chunks, { type: 'video/webm' });
      const b64 = await new Promise(r => { const f = new FileReader(); f.onload = () => r(String(f.result).split(',')[1]); f.readAsDataURL(blob); });
      return { b64, poster: poster.split(',')[1], pure, mime };
    }, { kind, id, spec });
    fs.writeFileSync(path.join(OUT, name + '.webm'), Buffer.from(res.b64, 'base64'));
    fs.writeFileSync(path.join(OUT, name + '.webp'), Buffer.from(res.poster, 'base64'));
    const kb = f => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0);
    console.log(`${name.padEnd(9)} vidéo ${kb(name + '.webm')} Ko · image ${kb(name + '.webp')} Ko · boucle ${res.pure ? 'fondue' : 'simple'} (${res.mime})`);
  }

  for (const id of SOLO) if (!ONLY || ONLY.includes(id)) await record('game', id, TILE, id);
  for (const id of DUO) if (!ONLY || ONLY.includes(id)) await record('duo', id, TILE, id);
  if (!ONLY || ONLY.includes('hero')) await record('game', 'ilo', HERO, 'hero');

  // image de partage 1200×630 (Open Graph) : mosaïque des vignettes + titre
  if (!ONLY || ONLY.includes('partage')) {
    const img = id => 'data:image/webp;base64,' + fs.readFileSync(path.join(OUT, id + '.webp')).toString('base64');
    const share = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await share.route(/^https?:/, r => /fonts\.(googleapis|gstatic)\.com/.test(r.request().url()) ? r.continue() : r.abort());
    const cells = ['empilo', 'palet', 'glouton', 'spatial', 'mouches', 'boum'].map(id => `<div class=c style="background-image:url(${img(id)})"></div>`).join('');
    await share.setContent(`<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&family=Chakra+Petch:wght@600;700&display=block">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;background:#0b141c;font-family:'Chakra Petch',sans-serif;position:relative}
.hero{position:absolute;inset:0;background:url(${img('hero')}) center/cover;filter:saturate(1.2)}
.shade{position:absolute;inset:0;background:linear-gradient(90deg,#0b141cf2 0%,#0b141cd0 46%,#0b141c30 75%,#0b141c00 100%)}
.grid{position:absolute;right:-40px;top:-30px;display:grid;grid-template-columns:repeat(2,230px);gap:16px;transform:rotate(-8deg);opacity:.97}
.c{width:230px;height:172px;border-radius:16px;background:center/cover;border:2px solid #ffffff22;box-shadow:0 12px 40px #000a,0 0 30px #5ef0ff33}
.t{position:absolute;left:64px;top:118px;width:640px}
h1{font:400 76px/0.98 Bungee,sans-serif;color:#fff;text-shadow:0 0 28px #ffa63099,0 4px 0 #0008}
h1 b{font-weight:400;color:#ffd34d;display:block}
p{margin-top:26px;font-size:30px;font-weight:600;color:#cfe6ef;line-height:1.3}
.pill{display:inline-block;margin-top:30px;padding:10px 22px;border-radius:99px;background:#ffa630;color:#0b141c;font:400 24px Bungee,sans-serif;box-shadow:0 0 30px #ffa63088}
</style></head><body><div class=hero></div><div class=grid>${cells}</div><div class=shade></div>
<div class=t><h1>Borne d'arcade<b>entre amis</b></h1><p>15 jeux gratuits, en solo ou en duel,<br>sur ton téléphone ou ton PC.</p><span class=pill>Jouer</span></div></body></html>`);
    await share.evaluate(() => document.fonts.ready);
    await share.waitForTimeout(400);
    await share.screenshot({ path: path.join(OUT, 'partage.jpg'), type: 'jpeg', quality: 84 });
    console.log('partage.jpg', (fs.statSync(path.join(OUT, 'partage.jpg')).size / 1024).toFixed(0), 'Ko');
  }
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  const total = fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
  console.log('accueil/ :', (total / 1048576).toFixed(2), 'Mo');
})().catch(e => { console.error(e); process.exit(1); });
