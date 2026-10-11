// Prépare les images du jeu « ILO Hyperespace » à partir du projet Unity ILO (packs de l'Asset Store) :
// redimensionne, compresse en WebP, puis CHIFFRE le paquet avec le mot de passe du site (licence : jamais d'images en clair dans le dépôt public).
//   ARCADE_CODE=… node pack-ilo.js [dossier_test]
// Sortie : ../assets/ilo.bin (chiffré, publié) ; si dossier_test est donné, les WebP en clair y sont aussi écrits (tests locaux, hors dépôt).
// Format de ilo.bin : sel(16) + iv(12) + AES-GCM( [taille de l'en-tête sur 4 octets][en-tête JSON][WebP concaténés] ), clé PBKDF2-SHA256 200 000 tours.
const fs = require('fs'), path = require('path'), { webcrypto } = require('crypto'); const subtle = webcrypto.subtle;
const ILO = process.env.ILO_ASSETS || 'D:/Games/ILO/Assets';
const PLANETS = [2, 5, 9, 10, 11, 12, 13, 16, 17, 18, 20, 21, 23, 24, 27, 29, 32, 33, 34, 35, 37, 38, 41, 42, 43, 47, 51, 52, 53, 60, 61, 70];
const NEBULAS = ['front (+z).png', 'back (-z).png', 'bottom (-y).png', 'right (-x).png'];
const items = [
  ...PLANETS.map(n => ({ kind: 'planets', src: ILO + '/Andrey Zashikhin/Planets Bundle Part 5/Planet Bundle (' + n + ').png', size: 320, q: 0.84 })),
  ...NEBULAS.map(f => ({ kind: 'nebulas', src: ILO + '/SpaceFusion/Shared/Skybox/Skybox Galaxy 2/Textures/' + f, size: 768, q: 0.72 }))
];
(async () => {
  const pw = process.env.ARCADE_CODE; if (!pw) { console.error('Définis ARCADE_CODE'); process.exit(1); }
  const testDir = process.argv[2];
  const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/Benjamin/jdv-tools/node_modules/playwright-core');
  const b = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  const page = await b.newPage();
  const tmp = path.join(require('os').tmpdir(), 'pack-ilo.html'); fs.writeFileSync(tmp, '<body></body>'); await page.goto('file:///' + tmp.replace(/\\/g, '/'));
  const header = { planets: [], nebulas: [] }, chunks = []; let off = 0;
  for (const it of items) {
    const bytes = await page.evaluate(async ({ url, size, q }) => {
      const im = new Image(); im.src = url; await im.decode();
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, size, size);
      const blob = await new Promise(r => c.toBlob(r, 'image/webp', q));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, { url: encodeURI('file:///' + it.src), size: it.size, q: it.q });
    const buf = Buffer.from(bytes);
    header[it.kind].push({ off, len: buf.length, size: it.size });
    chunks.push(buf); off += buf.length;
    if (testDir) { fs.mkdirSync(path.join(testDir, it.kind), { recursive: true }); fs.writeFileSync(path.join(testDir, it.kind, String(header[it.kind].length).padStart(2, '0') + '.webp'), buf); }
  }
  await b.close();
  const h = Buffer.from(JSON.stringify(header), 'utf8'), hl = Buffer.alloc(4); hl.writeUInt32LE(h.length);
  const plain = Buffer.concat([hl, h, ...chunks]);
  const salt = webcrypto.getRandomValues(new Uint8Array(16)), iv = webcrypto.getRandomValues(new Uint8Array(12));
  const km = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = Buffer.from(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  const out = path.join(__dirname, '..', 'assets', 'ilo.bin');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.concat([Buffer.from(salt), Buffer.from(iv), ct]));
  if (testDir) fs.writeFileSync(path.join(testDir, 'manifest.json'), JSON.stringify({ planets: header.planets.length, nebulas: header.nebulas.length }));
  console.log('ilo.bin :', (fs.statSync(out).size / 1024).toFixed(0), 'Ko |', header.planets.length, 'planètes,', header.nebulas.length, 'nébuleuses');
})().catch(e => { console.error(e); process.exit(1); });
