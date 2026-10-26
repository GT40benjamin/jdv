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
  const defs = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">\n  <defs>\n    <linearGradient id="emg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffc23d"/><stop offset="1" stop-color="#d0640f"/></linearGradient>\n    <linearGradient id="eml" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cf3ff"/><stop offset=".55" stop-color="#4fa8ff"/><stop offset="1" stop-color="#9a5cff"/></linearGradient>\n    <clipPath id="emc"><path d="M27 18v13L15 53a5 5 0 0 0 4.4 7.4h25.2A5 5 0 0 0 49 53L37 31V18z"/></clipPath>\n    <symbol id="emblem" viewBox="0 0 64 72">\n      <path d="M32 2 61 18.5v35L32 70 3 53.5v-35z" fill="#0d0f1a" stroke="url(#emg)" stroke-width="3.2" stroke-linejoin="round"/>\n      <path d="M32 8.5 55.5 22v28L32 63.5 8.5 50V22z" fill="none" stroke="#ffc23d" stroke-opacity=".35" stroke-width="1"/>\n      <g clip-path="url(#emc)"><g class="liq"><path d="M8 40c6-3 10 2 16-1s10-3 16 0 10 3 16 0V66H8z" fill="url(#eml)"/></g>\n        <circle class="bub" cx="28" cy="52" r="2" fill="#dffbff"/><circle class="bub b2" cx="35" cy="55" r="1.5" fill="#dffbff"/><circle class="bub b3" cx="31" cy="57" r="1.2" fill="#dffbff"/></g>\n      <path d="M27 18v13L15 53a5 5 0 0 0 4.4 7.4h25.2A5 5 0 0 0 49 53L37 31V18" fill="none" stroke="url(#emg)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>\n      <path d="M24.5 17.5h15" stroke="url(#emg)" stroke-width="3.4" stroke-linecap="round"/>\n      <path d="M45 10l1.3 2.7 2.7 1.3-2.7 1.3L45 18l-1.3-2.7-2.7-1.3 2.7-1.3z" fill="#fff3c4"/>\n    </symbol>\n  </defs>\n</svg>';
  await share.setContent(`<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@900&family=Oxanium:wght@700;800&family=Chakra+Petch:wght@600&display=block">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;background:#06070d;position:relative;display:grid;place-items:center;text-align:center}
.bg{position:absolute;inset:0;background:url(${img}) center 40%/cover;filter:saturate(1.15)}
.sh{position:absolute;inset:0;background:radial-gradient(60% 55% at 50% 48%,rgba(6,7,13,.45),rgba(6,7,13,0) 70%),radial-gradient(120% 95% at 50% 50%,rgba(6,7,13,0) 45%,rgba(6,7,13,.8))}
.fr{position:absolute;inset:26px;--c:rgba(255,224,138,.85);background:linear-gradient(var(--c),var(--c)) 0 0/34px 3px,linear-gradient(var(--c),var(--c)) 0 0/3px 34px,linear-gradient(var(--c),var(--c)) 100% 0/34px 3px,linear-gradient(var(--c),var(--c)) 100% 0/3px 34px,linear-gradient(var(--c),var(--c)) 0 100%/34px 3px,linear-gradient(var(--c),var(--c)) 0 100%/3px 34px,linear-gradient(var(--c),var(--c)) 100% 100%/34px 3px,linear-gradient(var(--c),var(--c)) 100% 100%/3px 34px;background-repeat:no-repeat}
.c{position:relative}.em{width:104px;height:117px;filter:drop-shadow(0 0 18px rgba(79,230,255,.5))}
h1{margin-top:10px;font:900 150px/.9 Orbitron;letter-spacing:.04em;padding-left:.04em;background:linear-gradient(180deg,#fff,#fff3c4 30%,#ffc23d 56%,#ff8a1f 78%,#c4520c);-webkit-background-clip:text;color:transparent;
 filter:drop-shadow(0 3px 0 #7a3306) drop-shadow(0 6px 0 #4a1d03) drop-shadow(0 0 30px rgba(255,150,40,.5))}
.w2{display:flex;align-items:center;justify-content:center;gap:22px;margin-top:20px;font:800 26px/1 Oxanium;letter-spacing:.55em;text-transform:uppercase;color:#4fe6ff;padding-left:.55em;text-shadow:0 0 14px rgba(79,230,255,.7)}
.w2:before,.w2:after{content:'';width:80px;height:2px;background:linear-gradient(90deg,transparent,#4fe6ff)}.w2:after{background:linear-gradient(270deg,transparent,#4fe6ff)}
p{margin-top:26px;font:600 27px/1.2 'Chakra Petch';color:#fff;text-shadow:0 2px 8px #000}
</style></head><body>${defs}<div class=bg></div><div class=sh></div><div class=fr></div><div class=c><svg class=em viewBox="0 0 64 72"><use href="#emblem"/></svg><h1>ELIXIR</h1><div class=w2>Game Studio</div><p>Des mondes à explorer, des jeux à partager.</p></div></body></html>`);
  await share.evaluate(() => document.fonts.ready); await share.waitForTimeout(500);
  await share.screenshot({ path: path.join(REPO, 'accueil', 'studio-partage.jpg'), type: 'jpeg', quality: 84 });
  console.log('studio-partage.jpg', (fs.statSync(path.join(REPO, 'accueil', 'studio-partage.jpg')).size / 1024).toFixed(0), 'Ko');
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
