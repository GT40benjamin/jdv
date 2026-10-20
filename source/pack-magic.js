// Prépare les données de « Magic Force » (games/magic.js) : modèles, textures, effets, sons → paquets EMBALLÉS de la borne.
//   node pack-magic.js [--tout] [--etapes=kaykit,effets,golem,dragon,forge,glace,hydre,jardin,chene,tour,oeil,trone,seigneur,quaternius,sons,moteur,emballage] [--out <dossier>]
// Sorties (dossier assets/ à côté de source/, ou --out) :
//   magic.monde1.bin  : la Crypte oubliée (décor KayKit, mage, squelettes, animations, spectre/orc/sorcier gluant Quaternius,
//                       golem « Gardien de pierre », planche d'effets, sons) — chargé à l'ouverture du jeu ;
//   magic.monde2.bin  : les Forges ardentes (texture basalte, dragon « Braise », démon bleu, diablotin, dragonnet, masque de feu,
//                       sons du feu) — chargé en arrière-plan pendant le monde 1 ;
//   magic.monde3.bin  : les Grottes de glace (atlas givré, Givre l'hydre, yéti, requin, piranha, calmar) ;
//   magic.monde4.bin  : le Jardin maudit (atlas moussu, le Vieux Chêne = Oak Tree Ent, champignons, bogue, crapaud, bourdon,
//                       le Roi Champignon) ; magic.monde5.bin : la Tour du sorcier (pierre de lune, le Grand Œil = Evil Watcher,
//                       ninja, lutin, tourbillon, petite ombre) ; magic.monde6.bin : la Salle du trône (marbre rouge, le Seigneur des
//                       ombres = Demon Lord, dino, garde royal, gargouille, prince doré) — chacun chargé pendant le monde d'avant ;
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
const HYD = HFC + 'Fantasy Lizards Pack/Hydra/';
const ENT = HFC + 'Demonic Creatures Pack/Oak Tree Ent/', EYE = HFC + 'Demonic Creatures Pack/Evil Watcher/', DLD = HFC + 'Demonic Creatures Pack/Demon Lord/';
const CREATURES = {
  golem: { sk: GOL + 'SK_Golem.FBX', tris: 6000, dir: GOL, pre: 'Golem@', out: P('golem.glb'), pack: P('golem.pack.glb'), af: '20',
    clips: { idle: 'Idle', walk: 'Walk', roar: 'Roar', atk1: 'Attack1', atk2: 'Attack2', atk3: 'Attack3', atk4: 'Attack4', atk5: 'Attack5', hit: 'GetHitHeavy', hitl: 'GetHitLight', death: 'Death' } },
  dragon: { sk: DRA + 'FBX Files/SK_MountainDragon.FBX', tris: 9000, dir: DRA + 'FBX Files/', pre: 'MountainDragon@', out: P('w2src', 'dragon.glb'), pack: P('w2', 'dragon.glb'), af: '20',
    clips: { idle: 'IdleBreathe', look: 'IdleLookAround', walk: 'Walk', run: 'Run', clawL: 'ClawsAttackLeft', clawR: 'ClawsAttackRight', combo: 'ClawsAttack2HitComboForward',
      bite: 'JumpBite', spit: 'SpitFireBall', breath: 'SpreadFire', hit: 'GetHitFront', death: 'Death', takeoff: 'TakeOffToGlide', glide: 'Glide', land: 'GlideToLanding',
      hover: 'FlyStationary', hoverSpit: 'FlyStationarySpitFireBall', hoverBreath: 'FlyStationarySpreadFire', hoverLand: 'FlyStationaryToLanding',
      fly: 'FlyNormal', hoverHit: 'FlyStationaryGetHit', glideHit: 'GlideGetHit' } },
  hydra: { sk: HYD + 'FBX Files/SK_Hydra.FBX', tris: 9000, dir: HYD + 'FBX Files/', pre: 'Hydra@', out: P('w3src', 'hydra.glb'), pack: P('w3', 'hydra.glb'), af: '20',
    clips: { idle: 'IdleBreathe', look: 'IdleLookAround', walk: 'Walk', run: 'Run', bite: 'Bite3HitCombo', bite6: 'Bite6HitCombo', spit: '3toxicSpitCombo',
      breath: 'RoarSpreadToxicBreath', hit: 'GetHitFront1', death: 'Death', turnL: 'Turn45Left', turnR: 'Turn45Right' } },
  // monde 4 : le Vieux Chêne (Oak Tree Ent) ; monde 5 : le Grand Œil (Evil Watcher) ; monde 6 : le Seigneur des ombres (Demon Lord)
  ent: { sk: ENT + 'FBX Files/SK_OakTreeEnt.FBX', tris: 8000, dir: ENT + 'FBX Files/', pre: 'OakTreeEnt@', out: P('w4src', 'ent.glb'), pack: P('w4', 'ent.glb'), af: '20',
    clips: { idle: 'IdleBreathe', walk: 'Walk', combo: 'Attack3HitCombo', claws: 'ClawsAttack2HitCombo', clawL: 'ClawsAttackL', clawR: 'ClawsAttackR', stomp: 'StompAttack',
      pick: 'PickUpRock', throw: 'ThrowRock', holdIdle: 'IdleBreatheHoldRock', hide: 'Hide1', unhide: 'Hide2', hit: 'GetHit1', death: 'Death' } },
  watcher: { sk: EYE + 'FBX Files/SK_EvilWatcher.fbx', tris: 7000, dir: EYE + 'FBX Files/', pre: 'EvilWatcher@', ext: '.fbx', out: P('w5src', 'watcher.glb'), pack: P('w5', 'watcher.glb'), af: '20',
    clips: { idle: 'Idle', look: 'IdleLookAround', combo2: '2HitCombo', combo3: '3HitCombo', cast: 'CastSpell', clawL: 'LeftClawsAttack', clawR: 'RightClawsAttack', sting: 'StingerAttack',
      roar: 'Roar', sleep: 'Sleep', wake: 'WakesUp', hit: 'GetHitFront', death: 'Death' } },
  demonlord: { sk: DLD + 'FBX Files/SK_DemonLord.FBX', tris: 9000, dir: DLD + 'FBX Files/', pre: 'DemonLord@', out: P('w6src', 'demonlord.glb'), pack: P('w6', 'demonlord.glb'), af: '20',
    clips: { idle: 'Idle', walk: 'Walk', fly: 'Fly', flyHit: 'FlyGetHit', roar: 'Roar', summon: 'SummonSword&Whip', sw1: 'SwordAttack1', sw2: 'SwordAttack2', combo2: '2HitCombo',
      combo3: '3HitCombo', whip: 'WhipAttack', hit: 'GetHit1', death: 'Death' } }
};
function creature(name) {
  const c = CREATURES[name];
  fs.mkdirSync(path.dirname(c.out), { recursive: true }); fs.mkdirSync(path.dirname(c.pack), { recursive: true });
  if (TOUT || !fs.existsSync(c.out)) {
    const cfg = { sk: c.sk, out: c.out, tris: c.tris, keep: null, clips: {} };
    for (const [k, clip] of Object.entries(c.clips)) cfg.clips[k] = c.dir + c.pre + clip + (c.ext || '.FBX');
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
  // 5b) les Grottes de glace : atlas givré + Givre, l'hydre des glaces (HFC) et ses textures
  if (doStep('glace') || doStep('hydre')) fs.mkdirSync(P('w3'), { recursive: true });
  if (doStep('glace')) py(T('w3', 'ice_tex.py'), KK + '/KayKit-Dungeon-Remastered-1.0/addons/kaykit_dungeon_remastered/Assets/texture/dungeon_texture.png', P('w3', 'kkt_ice.webp'));
  if (doStep('hydre')) { creature('hydra'); py(T('w3', 'hydra_tex.py'), HYD + 'Textures', P('w3')); }
  // 5c) mondes 4 à 6 : atlas du décor recoloré (mousse du Jardin maudit, pierre de lune de la Tour, marbre rouge et or du Trône)
  //     + leur boss HFC (le Vieux Chêne, le Grand Œil, le Seigneur des ombres) et ses textures recolorées
  const KKTEX = KK + '/KayKit-Dungeon-Remastered-1.0/addons/kaykit_dungeon_remastered/Assets/texture/dungeon_texture.png';
  for (const [w, deco, atlas, boss, bossDir] of [['w4', 'jardin', 'kkt_garden', 'ent', ENT], ['w5', 'tour', 'kkt_tower', 'watcher', EYE], ['w6', 'trone', 'kkt_throne', 'demonlord', DLD]]) {
    const step = { ent: 'chene', watcher: 'oeil', demonlord: 'seigneur' }[boss];
    if (doStep(deco) || doStep(step)) fs.mkdirSync(P(w), { recursive: true });
    if (doStep(deco)) { py(T('worlds_tex.py'), KKTEX, P(w, atlas + '.webp'), deco); py(T('worlds_tex.py'), KKTEX, P(w, atlas + '_sol.webp'), deco + '_sol'); }
    if (doStep(step)) { creature(boss); py(T('boss_tex.py'), bossDir + 'Textures', P(w), boss); }
  }
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
  // 9) emballage des six mondes
  if (doStep('emballage')) node(T('devpack.js'), '--out', OUT, '--sans-moteur');
  console.log('fini en', ((Date.now() - t0) / 1000).toFixed(0), 's');
})().catch((e) => { console.error(e.message || e); process.exit(1); });
