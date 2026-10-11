// Chiffre / déchiffre les photos de la bande (elles ne doivent jamais être en clair sur GitHub).
// node photos.js enc <photos.json> <photos.enc.json>   |   node photos.js dec <photos.enc.json>  (affiche le JSON)
// Le mot de passe est lu dans la variable d'environnement ARCADE_CODE.
const fs = require('fs'), { webcrypto } = require('crypto'); const subtle = webcrypto.subtle;
const pw = process.env.ARCADE_CODE; if (!pw) { console.error('Définis ARCADE_CODE=motdepasse'); process.exit(1); }
async function key(salt, use) {
  const km = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, [use]);
}
(async () => {
  const [mode, a, b] = process.argv.slice(2);
  if (mode === 'enc') {
    const salt = webcrypto.getRandomValues(new Uint8Array(16)), iv = webcrypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, await key(salt, 'encrypt'), fs.readFileSync(a)));
    fs.writeFileSync(b, JSON.stringify({ s: Buffer.from(salt).toString('base64'), i: Buffer.from(iv).toString('base64'), c: Buffer.from(ct).toString('base64') }));
  } else {
    const d = JSON.parse(fs.readFileSync(a, 'utf8')); const u = x => Buffer.from(x, 'base64');
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv: u(d.i) }, await key(u(d.s), 'decrypt'), u(d.c));
    process.stdout.write(Buffer.from(pt).toString('utf8'));
  }
})().catch(e => { console.error('Échec (mauvais mot de passe ?)', e.message); process.exit(1); });
