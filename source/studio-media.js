// Aperçu des liens du site du studio (og:image de index.html) : accueil/studio-partage.jpg, 1200×630, le blason de la page sur l'affiche
// d'un plan filmé de Pégase (assets/pegase/decor_29b_poster.jpg). Le panneau d'entrée, lui, lit directement les plans 4K du seau R2.
//   node source/studio-media.js        Besoins : Chrome, playwright-core dans ~/jdv-tools.
const fs = require('fs'), path = require('path');
const { chromium } = require('C:/Users/Benjamin/jdv-tools/node_modules/playwright-core');
const REPO = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  // aperçu des liens (og:image) 1200×630
  const share = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const img = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(REPO, 'assets', 'pegase', 'decor_29b_poster.jpg')).toString('base64');
  const home = fs.readFileSync(path.join(__dirname, 'accueil.html'), 'utf8'), d0 = home.indexOf('<svg width="0" height="0"');
  const defs = home.slice(d0, home.indexOf('</svg>', home.indexOf('<symbol id="emblem"')) + 6);   // le même blason que la page
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
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
