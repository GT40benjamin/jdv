// Prépare les données de « Magic Force » (games/magic.js) : modèles, textures, effets, sons → paquets EMBALLÉS de la borne.
//   node pack-magic.js [--tout] [--etapes=kaykit,effets,golem,dragon,forge,quaternius,sons,moteur,emballage] [--out <dossier>]
// Sorties (dossier assets/ à côté de source/, ou --out) :
//   magic.monde1.bin  : la Crypte oubliée (décor KayKit, mage, squelettes, animations, spectre/orc/sorcier gluant Quaternius,
//                       golem « Gardien de pierre », planche d'effets, sons) — chargé à l'ouverture du jeu ;
//   magic.monde2.bin  : les Forges ardentes (texture basalte, dragon « Braise », démon bleu, diablotin, dragonnet, sons du feu)
//                       — chargé en arrière-plan pendant le monde 1 ;
//   magic.moteur.bin  : three.js (MIT) réduit à ce que le jeu utilise, gzippé (lisible : ce n'est pas un fichier de l'Asset Store).
// Format des paquets : sel(16) + iv(12) + AES-GCM( [taille de l'en-tête sur 4 octets][en-tête JSON][données] ), clé PBKDF2-SHA256
// 200 000 tours (source/asset-key.txt) ; en-tête { v: 1, e: { nom: { o, l, t: 'glb'|'webp'|'png'|'aac'|'json', z: 1 si gzippé } } }.
// Licence : jamais de modèle, d'image ni de son de l'Asset Store en clair.
//
// Sources (ce PC) :
//   KayKit Dungeon Remastered + Character Packs Adventures & Skeletons (CC0)  D:/Games/Assets_MagicForce/KayKit-*   (KK_ASSETS)
//   Quaternius Ultimate Monsters (CC0)                                          D:/Games/Assets_MagicForce/Quaternius-Ultimate-Monsters
//   Heroic Fantasy Creatures (golem, dragon des montagnes)                     D:/Games/ILO/Assets/HeroicFantasyCreaturesFullPackVol1 (ILO_ASSETS)
//   Cartoon FX Remaster Free, Imphenzia Universal Sound FX (.unitypackage)     ~/AppData/Roaming/Unity/Asset Store-5.x/…
//   KriptoFX Realistic Effects Pack v4 (sons des sorts)                        D:/Games/ILO/Assets/KriptoFX/…
// Outils : l'atelier Magic Force (MAGIC_ATELIER, défaut ~/jdv-tools/duotest/magic : tools/, blender/, node_modules/ avec three,
// esbuild, gltfpack), Blender 5 (BLENDER), Python 3 + Pillow (PYTHON), Chrome (CHROME) + playwright-core pour les sons.
// Chaque étape garde son résultat dans <atelier>/packwork ; --tout refait aussi les étapes lentes (Blender, extractions).
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const HOME = os.homedir();
const A = process.env.MAGIC_ATELIER || path.join(HOME, 'jdv-tools/duotest/magic');
const PW = path.join(A, 'packwork');
const ILO = process.env.ILO_ASSETS || 'D:/Games/ILO/Assets';
const QUAT = process.env.QUAT_ASSETS || 'D:/Games/Assets_MagicForce/Quaternius-Ultimate-Monsters';
const KK = process.env.KK_ASSETS || 'D:/Games/Assets_MagicForce';
const BLENDER = process.env.BLENDER || 'C:/Program Files/Blender Foundation/Blender 5.0/blender.exe';
const PYTHON = process.env.PYTHON || 'python';
const CFX_PKG = process.env.CFX_PKG || path.join(HOME, 'AppData/Roaming/Unity/Asset Store-5.x/Jean Moreno/Particle Systems/Cartoon FX Remaster Free.unitypackage');
const ARGS = process.argv.slice(2), TOUT = ARGS.includes('--tout');
const ONLY = ((ARGS.find((a) => a.startsWith('--etapes=')) || '').split('=')[1] || '').split(',').filter(Boolean);
const oi = ARGS.indexOf('--out'), OUT = oi >= 0 ? path.resolve(ARGS[oi + 1]) : path.join(__dirname, '..', 'assets');
const GAME = fs.existsSync(path.join(__dirname, 'games', 'magic.js')) ? path.join(__dirname, 'games', 'magic.js') : path.join(A, 'src', 'magic.js');
const doStep = (s) => !ONLY.length || ONLY.includes(s);
const kb = (n) => (n / 1024).toFixed(0) + ' Ko';
const P = (...p) => path.join(PW, ...p);
const T = (...p) => path.join(A, 'tools', ...p);
const run = (cmd, args, o) => execFileSync(cmd, args, Object.assign({ stdio: 'inherit', cwd: A, maxBuffer: 1 << 28, env: Object.assign({}, process.env, { PYTHONUTF8: '1' }) }, o || {}));
const node = (...a) => run(process.execPath, a);
const py = (...a) => run(PYTHON, ['-I', ...a]);
const gltfpack = (i, o, extra) => run(process.execPath, [path.join(process.env.MAGIC_NODE || path.join(A, 'node_modules'), 'gltfpack/cli.js'), '-i', i, '-o', o, '-cc', '-kn', '-km', '-kv', '-vtf', ...extra], { stdio: 'pipe' });
function blender(args) {
  const out = execFileSync(BLENDER, ['--background', ...args], { stdio: 'pipe', maxBuffer: 1 << 28 }).toString();
  if (!/CREATURE|QEXPORT/.test(out)) throw new Error('Blender : export raté\n' + out.split('\n').filter((l) => /Traceback|Error/.test(l)).join('\n'));
  return out;
}
// créatures Heroic Fantasy Creatures : squelette + clips (même pose de repos recalée dans Blender, blender/creature_glb.py)
const HFC = ILO + '/HeroicFantasyCreaturesFullPackVol1/';
const GOL = HFC + 'Demonic Creatures Pack/Golem/FBX Files/Skinned Golem/', DRA = HFC + 'Fantasy Lizards Pack/Mountain Dragon/';
const CREATURES = {
  golem: { sk: GOL + 'SK_Golem.FBX', tris: 6000, dir: GOL, pre: 'Golem@', out: P('golem.glb'), pack: P('golem.pack.glb'), af: '20',
    clips: { idle: 'Idle', walk: 'Walk', roar: 'Roar', atk1: 'Attack1', atk2: 'Attack2', atk3: 'Attack3', atk4: 'Attack4', atk5: 'Attack5', hit: 'GetHitHeavy', hitl: 'GetHitLight', death: 'Death' } },
  dragon: { sk: DRA + 'FBX Files/SK_MountainDragon.FBX', tris: 9000, dir: DRA + 'FBX Files/', pre: 'MountainDragon@', out: P('w2src', 'dragon.glb'), pack: P('w2', 'dragon.glb'), af: '20',
    clips: { idle: 'IdleBreathe', look: 'IdleLookAround', walk: 'Walk', run: 'Run', clawL: 'ClawsAttackLeft', clawR: 'ClawsAttackRight', combo: 'ClawsAttack2HitComboForward',
      bite: 'JumpBite', spit: 'SpitFireBall', breath: 'SpreadFire', hit: 'GetHitFront', death: 'Death', takeoff: 'TakeOffToGlide', glide: 'Glide', land: 'GlideToLanding',
      hover: 'FlyStationary', hoverSpit: 'FlyStationarySpitFireBall', hoverBreath: 'FlyStationarySpreadFire', hoverLand: 'FlyStationaryToLanding' } }
};
function creature(name) {
  const c = CREATURES[name];
  fs.mkdirSync(path.dirname(c.out), { recursive: true }); fs.mkdirSync(path.dirname(c.pack), { recursive: true });
  if (TOUT || !fs.existsSync(c.out)) {
    const cfg = { sk: c.sk, out: c.out, tris: c.tris, keep: null, clips: {} };
    for (const [k, clip] of Object.entries(c.clips)) cfg.clips[k] = c.dir + c.pre + clip + '.FBX';
    const j = c.out.replace(/\.glb$/, '.json'); fs.writeFileSync(j, JSON.stringify(cfg));
    blender(['--python', path.join(A, 'blender', 'creature_glb.py'), '--', j]);
  }
  // les UV restent en flottants (-vtf) : les textures sont emballées à part et appliquées par le jeu
  run(process.execPath, [path.join(process.env.MAGIC_NODE || path.join(A, 'node_modules'), 'gltfpack/cli.js'), '-i', c.out, '-o', c.pack, '-cc', '-kn', '-km', '-kv', '-vtf', '-vpf', '-af', c.af], { stdio: 'pipe' });
  console.log('créature', name, '→', kb(fs.statSync(c.pack).size));
}

(async () => {
  const t0 = Date.now();
  console.log('jeu :', GAME, '\natelier :', A, '\nsortie :', OUT);
  // 1) KayKit : pièces du donjon citées par le jeu, mage, squelettes, armes, animations communes, textures
  if (doStep('kaykit')) node(T('kk', 'kk-pack.js'), '--game', GAME, '--out', P('kk'));
  // 2) planche d'effets (Cartoon FX Remaster Free → PNG → planche 1024² + carte JSON)
  if (doStep('effets')) {
    const cfx = path.join(A, 'ext', 'cfx_png');
    if (TOUT || !fs.existsSync(path.join(cfx, 'CFX4_T_PowHit.png'))) py(T('unitypkg.py'), 'cfxall', CFX_PKG, cfx);
    fs.mkdirSync(P('fx'), { recursive: true });
    py(T('kk', 'fxatlas2.py'), cfx, P('fx', 'fx.webp'), P('fx', 'fx.json'));
  }
  // 3) le Gardien de pierre (golem HFC) + ses textures (roche, veines lumineuses)
  if (doStep('golem')) { creature('golem'); py(T('textures.py'), P('tex'), ILO); }
  // 4) Braise, le dragon des forges (HFC) : modèle + écailles d'obsidienne et fissures de lave
  if (doStep('dragon')) { creature('dragon'); py(T('w2', 'dragon_tex.py'), DRA + 'Textures', P('w2')); }
  // 5) le décor des Forges : l'atlas KayKit du donjon recoloré en basalte
  if (doStep('forge')) py(T('w2', 'forge_tex.py'), KK + '/KayKit-Dungeon-Remastered-1.0/addons/kaykit_dungeon_remastered/Assets/texture/dungeon_texture.png', P('w2', 'kkt_forge.webp'));
  // 6) monstres Quaternius (le démon volant est réexporté de son .blend : son glTF n'a qu'une animation)
  if (doStep('quaternius')) {
    const g = P('qsrc', 'Flying_Demon', 'Flying_Demon.gltf');
    if (TOUT || !fs.existsSync(g)) blender([QUAT + '/Flying/Blends/Demon.blend', '--python', T('q', 'qexport_blend.py'), '--', g]);
    run(PYTHON, [T('q', 'qpack.py')]);
  }
  // 7) sons (KriptoFX + Imphenzia → AAC par l'encodeur de Chrome)
  if (doStep('sons')) { node(T('kk', 'sons.js')); node(T('kk', 'sons.js'), '--monde2'); }
  // 8) moteur 3D
  if (doStep('moteur')) node(T('moteur.js'), GAME, path.join(OUT, 'magic.moteur.bin'));
  // 9) emballage des deux mondes
  if (doStep('emballage')) node(T('devpack.js'), '--out', OUT, '--sans-moteur');
  console.log('fini en', ((Date.now() - t0) / 1000).toFixed(0), 's');
})().catch((e) => { console.error(e.message || e); process.exit(1); });
