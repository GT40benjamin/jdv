const fs = require('fs'), { webcrypto } = require('crypto'); const subtle = webcrypto.subtle;
(async () => {
  const [src, out, pw, h1, blurb] = process.argv.slice(2);
  const html = fs.readFileSync(src, 'utf8');
  const salt = webcrypto.getRandomValues(new Uint8Array(16)), iv = webcrypto.getRandomValues(new Uint8Array(12));
  const km = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(html)));
  const b = u => Buffer.from(u).toString('base64');
  const gate = fs.readFileSync(__dirname + '/gate.html', 'utf8').replace('__DATA__', JSON.stringify({ s: b(salt), i: b(iv), c: b(ct) }))
    .replace('__H1__', h1 || "Borne d'arcade <b>entre amis</b>")
    .replace('__BLURB__', blurb || "La salle d'arcade de la bande. Entre le mot de passe pour jouer : il sera retenu sur cet appareil.");
  fs.writeFileSync(out, gate);
  console.log('encrypted', html.length, '->', gate.length);
})();
