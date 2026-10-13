// Ré-emballe les paquets de l'Asset Store (assets/ilo.bin, assets/music/*.bin) : déchiffre avec l'ANCIEN mot de passe du site
// (variable ARCADE_CODE, jamais affichée) et rechiffre avec la clé d'emballage intégrée au site (source/asset-key.txt).
// Cette clé n'est pas un secret : elle garde seulement les images et musiques EMBALLÉES (jamais en fichiers lisibles directement).
//   ARCADE_CODE=… node reemballer.js
// Même format qu'avant : sel(16) + iv(12) + AES-GCM, clé PBKDF2-SHA256 200 000 tours. Musiques : un seul sel (music-salt.hex).
const fs = require('fs'), path = require('path'), { webcrypto } = require('crypto'); const subtle = webcrypto.subtle;
const OLD = process.env.ARCADE_CODE; if (!OLD) { console.error('Définis ARCADE_CODE (ancien mot de passe)'); process.exit(1); }
const NEW = fs.readFileSync(path.join(__dirname, 'asset-key.txt'), 'utf8').trim();
const key = async (pw, salt, use) => subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
  await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, [use]);
(async () => {
  const A = path.join(__dirname, '..', 'assets'), M = path.join(A, 'music');
  const files = [path.join(A, 'ilo.bin'), ...fs.readdirSync(M).filter(f => f.endsWith('.bin')).map(f => path.join(M, f))];
  const musicSalt = webcrypto.getRandomValues(new Uint8Array(16));
  const oldKeys = {}, newKeys = {};
  let n = 0;
  for (const f of files) {
    const b = new Uint8Array(fs.readFileSync(f)), s = b.slice(0, 16), sk = Buffer.from(s).toString('hex');
    let plain;
    try {
      plain = await subtle.decrypt({ name: 'AES-GCM', iv: b.slice(16, 28) }, await (oldKeys[sk] = oldKeys[sk] || key(OLD, s, 'decrypt')), b.slice(28));
    } catch (e) {
      // déjà ré-emballé ? (relance du script)
      try { await subtle.decrypt({ name: 'AES-GCM', iv: b.slice(16, 28) }, await key(NEW, s, 'decrypt'), b.slice(28)); console.log('déjà fait :', path.basename(f)); continue; }
      catch (e2) { throw new Error('impossible de déchiffrer ' + f + ' (mauvais mot de passe ?)'); }
    }
    const salt = f.startsWith(M) ? musicSalt : webcrypto.getRandomValues(new Uint8Array(16)), nk = Buffer.from(salt).toString('hex');
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, await (newKeys[nk] = newKeys[nk] || key(NEW, salt, 'encrypt')), plain));
    fs.writeFileSync(f + '.tmp', Buffer.concat([Buffer.from(salt), Buffer.from(iv), Buffer.from(ct)]));
    fs.renameSync(f + '.tmp', f); n++;
  }
  if (n) fs.writeFileSync(path.join(__dirname, 'music-salt.hex'), Buffer.from(musicSalt).toString('hex'));
  console.log('ré-emballés :', n, '/', files.length);
})().catch(e => { console.error(e.message); process.exit(1); });
