// Visuels du site du studio (index.html), faits UNIQUEMENT à partir des plans filmés de Pégase déjà publiés (assets/pegase/decor_*) :
//   node source/studio-media.js   → accueil/studio-<n>.webp + studio-<n>-m.webp (affiches du panneau d'entrée, Python + Pillow),
//                                   accueil/studio-reel.webm (courte boucle, fondus enchaînés), accueil/studio-partage.jpg (aperçu des liens)
// Besoins : Python + Pillow, Chrome, playwright-core dans ~/jdv-tools.
const fs = require('fs'), path = require('path'), http = require('http'), { execFileSync } = require('child_process');
const { chromium } = require('C:/Users/Benjamin/jdv-tools/node_modules/playwright-core');
const REPO = path.resolve(__dirname, '..'), OUT = path.join(REPO, 'accueil', 'studio-reel.webm');
const POSTERS = ['29b', '34', '31', '28', '21b', '32b'];   // studio-1 … studio-6 (l'ordre des SCENES de accueil.html)
execFileSync('python', ['-c', `
from PIL import Image
for i,d in enumerate(${JSON.stringify(POSTERS)},1):
  Image.open(r'${REPO}/assets/pegase/decor_%s_poster.jpg'%d).convert('RGB').resize((1600,900),Image.LANCZOS).save(r'${REPO}/accueil/studio-%d.webp'%i,quality=68,method=6)
  Image.open(r'${REPO}/assets/pegase/decor_%s_m_poster.jpg'%d).convert('RGB').resize((720,1280),Image.LANCZOS).save(r'${REPO}/accueil/studio-%d-m.webp'%i,quality=66,method=6)
`], { stdio: 'inherit' });
const CLIPS = [['29b', 8], ['28', 12], ['31', 10], ['34', 6]];   // [plan, seconde de départ]
const SEG = 4.6, FADE = 1.1, W = 1280, H = 720, BPS = +(process.env.BPS || 1100000);
const srv = http.createServer((q, r) => {
  const f = path.join(REPO, 'assets', 'pegase', path.basename(decodeURIComponent(q.url.split('?')[0])));
  if (!/.mp4$/.test(f)) { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end('<!doctype html><body></body>'); }
  const st = fs.statSync(f), rg = /bytes=(\d+)-(\d*)/.exec(q.headers.range || '');
  if (rg) { const a = +rg[1], b = rg[2] ? +rg[2] : st.size - 1; r.writeHead(206, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 }); fs.createReadStream(f, { start: a, end: b }).pipe(r); }
  else { r.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': st.size, 'Accept-Ranges': 'bytes' }); fs.createReadStream(f).pipe(r); }
}).listen(8871);
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:8871/none');
  const b64 = await page.evaluate(async ({ CLIPS, SEG, FADE, W, H, BPS }) => {
    const vids = await Promise.all(CLIPS.map(([id, t0]) => new Promise((res, rej) => {
      const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = `/decor_${id}_720.mp4`;
      v.onloadeddata = () => { v.currentTime = t0 + (id === CLIPS[0][0] ? FADE : 0); v.onseeked = () => { v.onseeked = null; res(v); }; }; v.onerror = rej;
    })));
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: BPS });
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data); const done = new Promise(r => rec.onstop = r);
    const N = vids.length, TOTAL = N * SEG;
    // le plan i joue de i*SEG - FADE à (i+1)*SEG ; le premier rejoue en fondu à la fin (boucle sans saut)
    const draw = (v, a) => { if (a <= 0) return; x.globalAlpha = a; const s = Math.max(W / v.videoWidth, H / v.videoHeight); const w = v.videoWidth * s, h = v.videoHeight * s; x.drawImage(v, (W - w) / 2, (H - h) / 2, w, h); x.globalAlpha = 1; };
    vids[0].play(); await new Promise(r => setTimeout(r, 300));
    rec.start(); const t0 = performance.now();
    await new Promise(resolve => {
      const step = () => {
        const u = (performance.now() - t0) / 1000; if (u >= TOTAL) return resolve();
        const i = Math.min(N - 1, Math.floor(u / SEG)), k = u - i * SEG;
        const nxt = (i + 1) % N, fk = (k - (SEG - FADE)) / FADE;
        if (fk > -0.15 && vids[nxt].paused) { if (nxt === 0) vids[0].currentTime = CLIPS[0][1] + 0.3; vids[nxt].play(); }
        draw(vids[i], 1); if (fk > 0) draw(vids[nxt], Math.min(1, fk));
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    rec.stop(); await done;
    const blob = new Blob(chunks, { type: 'video/webm' });
    return await new Promise(r => { const f = new FileReader(); f.onload = () => r(String(f.result).split(',')[1]); f.readAsDataURL(blob); });
  }, { CLIPS, SEG, FADE, W, H, BPS });
  fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
  console.log(OUT, (fs.statSync(OUT).size / 1048576).toFixed(2), 'Mo');
  // aperçu des liens (og:image) 1200×630
  const share = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const img = 'data:image/webp;base64,' + fs.readFileSync(path.join(REPO, 'accueil', 'studio-1.webp')).toString('base64');
  await share.setContent(`<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Manrope:wght@300;600&display=block">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;background:#07080c;position:relative;display:grid;place-items:center;text-align:center}
.bg{position:absolute;inset:0;background:url(${img}) center 40%/cover}
.sh{position:absolute;inset:0;background:radial-gradient(90% 80% at 50% 50%,rgba(7,8,12,.25),rgba(7,8,12,.7) 70%,rgba(7,8,12,.92)),linear-gradient(180deg,rgba(7,8,12,.35),rgba(7,8,12,.1) 40%,rgba(7,8,12,.6))}
.c{position:relative}
.k{font:600 17px/1 Manrope;letter-spacing:.42em;text-transform:uppercase;color:#f1d79c;padding-left:.42em}
h1{margin-top:20px;font:500 190px/.86 'Cormorant Garamond';letter-spacing:.06em;padding-left:.06em;background:linear-gradient(180deg,#fffaf0,#f3e6c8 55%,#d9b46a);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 6px 30px rgba(0,0,0,.6))}
.w2{display:flex;align-items:center;justify-content:center;gap:24px;margin-top:18px;font:300 26px/1 Manrope;letter-spacing:.62em;text-transform:uppercase;color:#f4efe4;padding-left:.62em}
.w2:before,.w2:after{content:'';width:80px;height:1px;background:linear-gradient(90deg,transparent,#d9b46a)}.w2:after{background:linear-gradient(270deg,transparent,#d9b46a)}
p{margin-top:34px;font:italic 500 34px/1.2 'Cormorant Garamond';color:#e6dfd0}
</style></head><body><div class=bg></div><div class=sh></div><div class=c><div class=k>Pégase · La Borne d'arcade entre amis</div><h1>ELIXIR</h1><div class=w2>Game Studio</div><p>Des mondes à explorer, des jeux à partager.</p></div></body></html>`);
  await share.evaluate(() => document.fonts.ready); await share.waitForTimeout(500);
  await share.screenshot({ path: path.join(REPO, 'accueil', 'studio-partage.jpg'), type: 'jpeg', quality: 84 });
  console.log('studio-partage.jpg', (fs.statSync(path.join(REPO, 'accueil', 'studio-partage.jpg')).size / 1024).toFixed(0), 'Ko');
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
