// Musiques des duels et de la compétition, tirées de la collection « Ultimate Game Music Collection » du projet Unity ILO
// (Asset Store : jamais en clair dans le dépôt public). WAV → volume égalisé → AAC (encodeur de Chrome, WebCodecs) → CHIFFRÉ.
//   node pack-music.js [seulement-ces-id,...]   (clé d'emballage : source/asset-key.txt)
// Sortie : ../assets/music/<id>.bin = sel(16) + iv(12) + AES-GCM(fichier AAC ADTS), clé PBKDF2-SHA256 200 000 tours.
// Le même sel pour tous les morceaux (dans le fichier music-salt.hex, à côté) : la page ne calcule la clé qu'une fois.
// <jeu>-<n> = morceau calme, <jeu>-x<n> = morceau énergique (balle de match) ; sting-<nom> = petit jingle.
const fs = require('fs'), path = require('path'), http = require('http'), { webcrypto } = require('crypto'); const subtle = webcrypto.subtle;
const COL = process.env.MUSIC_COLLECTION || 'D:/Games/ILO/Assets/Ultimate Game Music Collection';
const LOOPS = {
  'dtrouve-1': 'Puzzles/Lighthearted LOOP LONG.wav', 'dtrouve-2': 'Puzzles/Casual Level LOOP.wav', 'dtrouve-x1': 'Platform/Playful LOOP.wav',
  'dmots-1': 'Puzzles/Harp and Pizz LOOP.wav', 'dmots-2': 'Puzzles/Laid Back LOOP.wav', 'dmots-x1': 'Puzzles/Pizz Menu LOOP.wav',
  'dpalet-1': 'Platform/Platform Action LOOP.wav', 'dpalet-2': 'Platform/Chase LOOP.wav', 'dpalet-x1': 'Combat/Frantic Pursuit LOOP.wav',
  'dbriques-1': 'Platform/Soaring LOOP NO SOLO.wav', 'dbriques-2': 'Platform/Jungle LOOP.wav', 'dbriques-x1': 'Combat/Epic Combat LOOP.wav',
  'dboum-1': 'Combat/Combat LOOP.wav', 'dboum-2': 'Platform/Lab LOOP.wav', 'dboum-x1': 'Combat/Frantic Battle LOOP.wav',
  'dsouris-1': 'Platform/Sneaky LOOP.wav', 'dsouris-2': 'Puzzles/Childrens Game Loop.wav', 'dsouris-x1': 'Platform/Downhill Chase LOOP.wav',
  'dspatial-1': 'Space/Long Range Combat LOOP.wav', 'dspatial-2': 'Space/Planet Surface (combat) - Main Loop.wav', 'dspatial-x1': 'Space/Hangar Escape LOOP.wav',
  'dguerre-1': 'Locations/Remote Island - Main Loop.wav', 'dguerre-2': 'Locations/Western OUTSIDE LOOP.wav', 'dguerre-x1': 'Combat/Desperate Battle LOOP.wav',
  'dscores-1': 'Short Cues/Scores/Scores.wav', 'dscores-2': 'Titles/Casual/Playtime LOOP.wav',
  'dpingpong-1': 'Titles/Casual/Funky Bass.wav', 'dpingpong-2': 'Titles/Casual/Casual Title GUITAR LOOP.wav', 'dpingpong-x1': 'Titles/Casual/Chase MENU LOOP.wav',
  'dkombat-1': 'Combat/Close Combat LOOP.wav', 'dkombat-2': 'Combat/Bandits LOOP.wav', 'dkombat-x1': 'Combat/Tense Combat LOOP.wav',
  // accueil-4 / -5 : musiques de l'accueil choisies par Benjamin (27 oct. 2026), entrent seules dans la rotation (accueil-2, -3, -x1)
  'accueil-4': 'Platform/Playful LOOP.wav', 'accueil-5': 'Titles/Casual/Funky Bass.wav', 'accueil-6': 'Titles/Casual/Country Title Loop.wav',
  // magicfin-1 : la grande victoire de Magic Force (api.music('magicfin') dans finale(), à la place d'un morceau de combat qui revenait)
  'magicfin-1': 'Puzzles/Lighthearted LOOP LONG.wav'
};
// volume visé (efficace) par morceau, s'il doit sonner plus fort que 0,12 : l'accueil (ElevenLabs) est vers -14 à -17 dBFS ;
// au-delà de la crête, un limiteur doux (pas de saturation dure). Les autres morceaux ne changent pas.
const LOUD = { 'accueil-4': 0.16, 'accueil-5': 0.14, 'accueil-6': 0.16 };
const STINGS = {
  'sting-win': 'Short Cues/Winning/Fanfare Win.wav', 'sting-win2': 'Short Cues/Winning/Casual Win 1.wav', 'sting-podium': 'Short Cues/Winning/Triumphant Victory.wav',
  'sting-lose': 'Short Cues/Losing/Casual Lose 1.wav', 'sting-point': 'Short Cues/Scales/Combo Hit 3.wav', 'sting-go': 'Short Cues/Quest SFX/Quest Start DRUMS BIG.wav',
  'sting-match': 'Short Cues/Losing/Alert STING 1.wav'
};
(async () => {
  const pw = fs.readFileSync(path.join(__dirname, 'asset-key.txt'), 'utf8').trim();   // clé d'emballage intégrée au site (pas un secret)
  const only = (process.argv[2] || '').split(',').filter(Boolean);
  const todo = Object.entries(Object.assign({}, LOOPS, STINGS)).filter(([id]) => !only.length || only.includes(id));
  // petite page locale (contexte sécurisé : WebCodecs) qui sert aussi les WAV
  const srv = http.createServer((q, r) => {
    const u = new URL(q.url, 'http://x');
    if (u.pathname === '/wav') { const f = path.join(COL, u.searchParams.get('f')); if (!f.startsWith(path.resolve(COL))) { r.writeHead(403); return r.end(); } r.writeHead(200, { 'content-type': 'audio/wav' }); return fs.createReadStream(f).pipe(r); }
    r.writeHead(200, { 'content-type': 'text/html' }); r.end('<body></body>');
  });
  await new Promise(res => srv.listen(0, '127.0.0.1', res));
  const port = srv.address().port;
  const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/Benjamin/jdv-tools/node_modules/playwright-core');
  const b = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await b.newPage(); await page.goto('http://localhost:' + port + '/');
  // clé : même sel pour tous les morceaux
  const saltFile = path.join(__dirname, 'music-salt.hex');
  if (!fs.existsSync(saltFile)) fs.writeFileSync(saltFile, Buffer.from(webcrypto.getRandomValues(new Uint8Array(16))).toString('hex'));
  const salt = new Uint8Array(Buffer.from(fs.readFileSync(saltFile, 'utf8').trim(), 'hex'));
  const km = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const outDir = path.join(__dirname, '..', 'assets', 'music'); fs.mkdirSync(outDir, { recursive: true });
  let total = 0;
  for (const [id, rel] of todo) {
    const sting = id.startsWith('sting-');
    const res = await page.evaluate(async ({ url, sting, loud }) => {
      const ab = await (await fetch(url)).arrayBuffer();
      const buf = await new OfflineAudioContext(2, 1, 44100).decodeAudioData(ab);
      const n = buf.length, ch = [buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)];
      // volume égalisé (proche des musiques ElevenLabs déjà dans la borne), crête sous 0 dB, petits fondus anti-clic
      let sum = 0, peak = 0;
      for (const c of ch) for (let i = 0; i < n; i++) { const v = c[i]; sum += v * v; const a = v < 0 ? -v : v; if (a > peak) peak = a; }
      const rms = Math.sqrt(sum / (2 * n)) || 1e-6;
      const gain = loud ? loud / rms : Math.min((sting ? 0.16 : 0.12) / rms, 0.97 / (peak || 1));
      // limiteur doux (seulement avec un volume visé) : linéaire sous 0,8, courbe tanh au-dessus, jamais plus de 0,97
      const lim = loud ? v => { const a = v < 0 ? -v : v; if (a <= 0.8) return v; const y = 0.8 + 0.17 * Math.tanh((a - 0.8) / 0.17); return v < 0 ? -y : y; } : v => v;
      const fi = Math.min(n, 441), fo = Math.min(n, sting ? 2205 : 1323);
      const L = new Float32Array(n), R = new Float32Array(n);
      for (let i = 0; i < n; i++) { let g = gain; if (i < fi) g *= i / fi; if (i > n - fo) g *= (n - i) / fo; L[i] = lim(ch[0][i] * g); R[i] = lim(ch[1][i] * g); }
      const parts = []; let err = null;
      const enc = new AudioEncoder({ output: c => { const a = new Uint8Array(c.byteLength); c.copyTo(a); parts.push(a); }, error: e => { err = e; } });
      enc.configure({ codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: sting ? 128000 : 96000, aac: { format: 'adts' } });
      const step = 4096;
      for (let o = 0; o < n; o += step) {
        const m = Math.min(step, n - o), data = new Float32Array(m * 2);
        data.set(L.subarray(o, o + m), 0); data.set(R.subarray(o, o + m), m);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: 44100, numberOfFrames: m, numberOfChannels: 2, timestamp: Math.round(o / 44100 * 1e6), data });
        enc.encode(ad); ad.close();
      }
      await enc.flush(); enc.close(); if (err) throw err;
      const len = parts.reduce((s, p) => s + p.length, 0), all = new Uint8Array(len); let k = 0; for (const p of parts) { all.set(p, k); k += p.length; }
      // vérification : le fichier AAC se relit
      const back = await new OfflineAudioContext(2, 1, 44100).decodeAudioData(all.buffer.slice(0));
      return { b64: btoa(Array.from(all, x => String.fromCharCode(x)).join('')), dur: buf.duration, back: back.duration, gain };
    }, { url: '/wav?f=' + encodeURIComponent(rel), sting, loud: LOUD[id] || 0 });
    const aac = Buffer.from(res.b64, 'base64');
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const ct = Buffer.from(await subtle.encrypt({ name: 'AES-GCM', iv }, key, aac));
    fs.writeFileSync(path.join(outDir, id + '.bin'), Buffer.concat([Buffer.from(salt), Buffer.from(iv), ct]));
    total += aac.length;
    console.log(id.padEnd(13), rel.padEnd(62), res.dur.toFixed(1) + ' s →', (aac.length / 1024).toFixed(0) + ' Ko', '(relu ' + res.back.toFixed(1) + ' s, gain ' + res.gain.toFixed(2) + ')');
  }
  await b.close(); srv.close();
  console.log('total', (total / 1048576).toFixed(1), 'Mo');
})().catch(e => { console.error(e); process.exit(1); });
