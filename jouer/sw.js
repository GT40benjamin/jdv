// Service worker de la borne (publié dans jouer/sw.js, portée jouer/) : la borne s'ouvre et se joue SANS RÉSEAU.
// build2.py (write_sw) remplit BUILD (numéro de version du site, = site.json), ASSETS, PRE et FONT_CSS ci-dessous :
// un nouveau build = un nouveau fichier = nouveau service worker, qui remplace l'ancien cache (jdw-core-<build>).
//  - la page (navigation dans jouer/) : réseau d'abord avec un délai court (3,5 s ; 10 s pour une adresse ?v=<build> de mise à jour), puis le cache ;
//  - assets/ (images et musiques emballées) : cache d'abord (jdw-media, gardé d'un build à l'autre ; chaque fichier porte son empreinte
//    x-jdw-h : un fichier changé est retéléchargé, un fichier disparu est retiré du cache) ; musiques gardées à l'usage ;
//  - polices Google : cache d'abord (repli sur les polices du système si rien) ; icônes et manifeste : cache d'abord ;
//  - JAMAIS : Supabase (/rest, /auth, realtime), site.json, telecharger/version.json, MediaPipe… (le service worker ne s'en mêle pas).
'use strict';
const BUILD = "20261028171001";
const ASSETS = {"assets/bolides.moteur.bin": "cb02a25032e7", "assets/chrono.moteur.bin": "4b11d7911a7e", "assets/coffres.moteur.bin": "724ad4a54d6c", "assets/ilo.bin": "ad8a338b7a65", "assets/magic.monde1.bin": "ab56354bb89b", "assets/magic.monde2.bin": "f80278797152", "assets/magic.monde3.bin": "f6b1ded51bde", "assets/magic.monde4.bin": "6253cf902c6a", "assets/magic.monde5.bin": "8c1b379d9b97", "assets/magic.monde6.bin": "302bdfaa65dc", "assets/magic.moteur.bin": "ee9afc63d192", "assets/mandale.commun.bin": "5410cb809a55", "assets/mandale.f09.bin": "3bc026bf5036", "assets/mandale.f11.bin": "18c93c816b56", "assets/mandale.moteur.bin": "413549ab096b", "assets/mots.vosk.bin": "3799c7a6f6d6", "assets/pegase.garde.chloe.bin": "5bd82a6a3a9c", "assets/pegase.garde.galvon.bin": "b78eeb4442cf", "assets/pegase.garde.javi.bin": "782fcdbb8788", "assets/pegase.garde.john.bin": "caf20e8ee469", "assets/pegase.garde.mary.bin": "84c28cade163", "assets/pegase.garde.sally.bin": "a62d8971a4cf", "assets/pegase.garde.zulle.bin": "2972c64b6432", "assets/pegase.ic.beard.bin": "bbb9e0bc61ae", "assets/pegase.ic.bot.bin": "c31fc75142eb", "assets/pegase.ic.brow.bin": "337755eea917", "assets/pegase.ic.calques.bin": "b436589f03f7", "assets/pegase.ic.feet.bin": "cf62aa7c1efc", "assets/pegase.ic.glass.bin": "6d546e281d45", "assets/pegase.ic.glov.bin": "32b819e1ffd6", "assets/pegase.ic.hacc.bin": "f55209214b09", "assets/pegase.ic.hat.bin": "818e44de6b27", "assets/pegase.ic.hb.bin": "1d4d950b6843", "assets/pegase.ic.hf.bin": "232134561037", "assets/pegase.ic.lash.bin": "ade026f26832", "assets/pegase.ic.ovr.bin": "bbfaffd6729a", "assets/pegase.ic.top.bin": "0ebae50244b8", "assets/pegase.moteur.bin": "0640fe75eb82", "assets/pegase.pc.beard.lower_bushy_beard.bin": "0dfc8ad38c74", "assets/pegase.pc.beard.lower_chin_goatee.bin": "b43abbef91f3", "assets/pegase.pc.beard.lower_full_beard.bin": "45a98ef18f7f", "assets/pegase.pc.beard.lower_goatee.bin": "2c5d4ab3f912", "assets/pegase.pc.beard.lower_mustashe.bin": "e9cc812089a1", "assets/pegase.pc.beard.lower_mustashe_chin.bin": "db8b513082c9", "assets/pegase.pc.bot.baggy_pants_ankles.bin": "e2cd2f39f369", "assets/pegase.pc.bot.baggy_pants_long.bin": "42b4381b976a", "assets/pegase.pc.bot.baggy_pants_short.bin": "f639f5b2a127", "assets/pegase.pc.bot.big_shorts.bin": "34ccadf6ef3c", "assets/pegase.pc.bot.cargo_pants.bin": "f535a26ad1e8", "assets/pegase.pc.bot.cargo_pants_short.bin": "986b19571e65", "assets/pegase.pc.bot.dress_pants.bin": "0da728600144", "assets/pegase.pc.bot.jean_skirt.bin": "3ba30a2a4da8", "assets/pegase.pc.bot.jeans.bin": "44bd96cddb1d", "assets/pegase.pc.bot.loose_jeans.bin": "590c6f3b7b5b", "assets/pegase.pc.bot.pleated_skirt.bin": "fcd1123564f2", "assets/pegase.pc.bot.short_shorts.bin": "6192decedd9b", "assets/pegase.pc.bot.shorts.bin": "ded902867eb8", "assets/pegase.pc.bot.skirt.bin": "7fd4d34dc480", "assets/pegase.pc.bot.striped_pants.bin": "68d6e7e0b0e8", "assets/pegase.pc.bot.yoga_pants.bin": "3841c8c19439", "assets/pegase.pc.feet.big_boots.bin": "43f285e6ed5a", "assets/pegase.pc.feet.comfy_shoes.bin": "9c9527cb8511", "assets/pegase.pc.feet.cool_shoes.bin": "9b42d225ba78", "assets/pegase.pc.feet.high_lace_shoe.bin": "84a2c466efde", "assets/pegase.pc.feet.office_shoes.bin": "ebc885820e67", "assets/pegase.pc.feet.school_shoes.bin": "7f8c28337f48", "assets/pegase.pc.feet.short_boots.bin": "918a034e63c4", "assets/pegase.pc.feet.shower_sandal.bin": "1234b8a368f7", "assets/pegase.pc.feet.slip_ons.bin": "4ade0bd9e091", "assets/pegase.pc.feet.sports_shoes.bin": "eb415d62ecb2", "assets/pegase.pc.feet.street_shoes.bin": "2e0afcc25297", "assets/pegase.pc.feet.work_boots.bin": "39649eabb8e2", "assets/pegase.pc.glass.round_shaded.bin": "8825bb125eb8", "assets/pegase.pc.glass.shaded_glasses.bin": "30cce2a8acd0", "assets/pegase.pc.glass.simple_glasses.bin": "67f21920635a", "assets/pegase.pc.glov.arm_warmers.bin": "784122b6860b", "assets/pegase.pc.glov.fingerless.bin": "77353aa7fe1b", "assets/pegase.pc.glov.work_gloves.bin": "498aaf0977df", "assets/pegase.pc.hat.ballcap.bin": "b51755c61c1c", "assets/pegase.pc.hat.beanie.bin": "36736d79220f", "assets/pegase.pc.hat.bucket.bin": "016d8f824806", "assets/pegase.pc.hat.fedora.bin": "c8ae9cdab951", "assets/pegase.pc.hb.dread_back.bin": "3add5ec4abf5", "assets/pegase.pc.hb.flare.bin": "720e5761e41a", "assets/pegase.pc.hb.long_dreads.bin": "fd6fe60e4845", "assets/pegase.pc.hb.long_streight.bin": "84b35222f73b", "assets/pegase.pc.hb.pony_tail_long.bin": "55ab55ca9b7c", "assets/pegase.pc.hb.pony_tail_short.bin": "6c3bc15ccf46", "assets/pegase.pc.hb.punk.bin": "5f77968d63f1", "assets/pegase.pc.hb.scrappy.bin": "e861c541b6f6", "assets/pegase.pc.hb.short.bin": "973b8bed00f7", "assets/pegase.pc.hb.short_bob.bin": "786b01a1fc10", "assets/pegase.pc.hb.twin_tail_long.bin": "025978888735", "assets/pegase.pc.hb.twin_tail_short.bin": "17a7e46c857b", "assets/pegase.pc.hb.wild.bin": "266213eca27f", "assets/pegase.pc.hb.wild_tail.bin": "43b0a2e23822", "assets/pegase.pc.head.stern.bin": "55e2c58efebc", "assets/pegase.pc.hf.fohawk.bin": "ee7611bb4e99", "assets/pegase.pc.hf.hanging_dreads.bin": "84681108d57b", "assets/pegase.pc.hf.hime.bin": "06a15de8cee0", "assets/pegase.pc.hf.long_sweeps.bin": "ac8b56d92bdc", "assets/pegase.pc.hf.messy.bin": "9a8d672f6506", "assets/pegase.pc.hf.quickly_hair.bin": "d0e5a6ea0faa", "assets/pegase.pc.hf.sweapt_back.bin": "23e51fbd3cfa", "assets/pegase.pc.hf.sweapt_dreads.bin": "fa9e702aecd7", "assets/pegase.pc.hf.wolf_cut.bin": "f26f53c44256", "assets/pegase.pc.ly.age.bin": "c62a2cb32a30", "assets/pegase.pc.ly.blush.bin": "c193426d92a1", "assets/pegase.pc.ly.freckles.full.bin": "c4c0c2cb0357", "assets/pegase.pc.ly.freckles.light.bin": "3ae0f91396f6", "assets/pegase.pc.ly.liner.bin": "d526a83e4fd3", "assets/pegase.pc.ly.lips.bin": "573c2fe05361", "assets/pegase.pc.ly.pupil.sharp.bin": "a7e8d64e60a6", "assets/pegase.pc.ly.shine.double.bin": "2d823141e880", "assets/pegase.pc.ly.socks.ankle.bin": "4f765b4a1999", "assets/pegase.pc.ly.socks.basic.bin": "38be7872fbf0", "assets/pegase.pc.ly.socks.knee.bin": "996fae5cfcd2", "assets/pegase.pc.ly.socks.stirrup.bin": "0204dbfe2997", "assets/pegase.pc.ly.socks.thigh.bin": "3a3cb5eac085", "assets/pegase.pc.ly.socks.tights.bin": "ecb5f8f4b056", "assets/pegase.pc.ovr.overall.bin": "84c29bae2641", "assets/pegase.pc.ovr.smart_dress.bin": "029b5de7a7b5", "assets/pegase.pc.ovr.sundress.bin": "a020868a955c", "assets/pegase.pc.top.button_up.bin": "dc5c38689066", "assets/pegase.pc.top.button_up_short.bin": "1d6986ff69e5", "assets/pegase.pc.top.casual_jacket.bin": "ebf19a763365", "assets/pegase.pc.top.dress_shirt.bin": "4711ae7c559d", "assets/pegase.pc.top.henley.bin": "1b5061e9e743", "assets/pegase.pc.top.hoodie.bin": "c60d49e44277", "assets/pegase.pc.top.open_jacket.bin": "ca92b106fb2d", "assets/pegase.pc.top.open_shoulder.bin": "0238699050ca", "assets/pegase.pc.top.open_shoulder_crop.bin": "450888a041e6", "assets/pegase.pc.top.open_shoulder_straps.bin": "bb9a54addb4a", "assets/pegase.pc.top.open_shoulder_strapsless.bin": "420d0b787eb7", "assets/pegase.pc.top.seifuku.bin": "1856106a15b7", "assets/pegase.pc.top.seifuku_short.bin": "e86f97da1e5d", "assets/pegase.pc.top.shirt.bin": "a75f21e5ee2d", "assets/pegase.pc.top.suit_jacket.bin": "f7d578dda431", "assets/pegase.pc.top.suspenders.bin": "f280de3c27a8", "assets/pegase.pc.top.sweater.bin": "64f2c20b2665", "assets/pegase.pc.top.tank_top.bin": "326197cfb175", "assets/pegase.pc.top.turtle_neck.bin": "699e7e4302d1", "assets/pegase.perso.bin": "ef36290d7177", "assets/rouleaux.bin": "8160452ab4a0", "assets/tirsaubut.moteur.bin": "32ac20f6dc63", "assets/toupies.moteur.bin": "9b815539ce0b", "assets/music/accueil-2.mp3": "8e608c1d9b9e", "assets/music/accueil-3.mp3": "035edecace51", "assets/music/accueil-4.bin": "41e06216d49a", "assets/music/accueil-5.bin": "304328cb5b6a", "assets/music/accueil-6.bin": "c4615c265f19", "assets/music/accueil-x1.mp3": "bc6037b5af89", "assets/music/canards-1.mp3": "e60886c069f5", "assets/music/canards-2.mp3": "e1e24dbad185", "assets/music/canards-3.mp3": "6fb50dfd478c", "assets/music/canards-x1.mp3": "cab55b25d267", "assets/music/carreaux-2.mp3": "48f058c86263", "assets/music/carreaux-3.mp3": "ae5ebd08b14b", "assets/music/carreaux-x1.mp3": "1cdea6d3d8d3", "assets/music/coffres-1.bin": "295698306b2d", "assets/music/coffres-2.bin": "9f529650aa70", "assets/music/dboum-1.bin": "56c146304f5b", "assets/music/dboum-2.bin": "e87c6fa151b2", "assets/music/dboum-x1.bin": "96d7b83cbcdc", "assets/music/dbriques-1.bin": "2382a54d0f91", "assets/music/dbriques-2.bin": "0deaaa64783c", "assets/music/dbriques-x1.bin": "5847019d9ae7", "assets/music/dguerre-1.bin": "3eb34b1dc405", "assets/music/dguerre-2.bin": "2e282038fe6d", "assets/music/dguerre-x1.bin": "f5dfb7fa2244", "assets/music/dkombat-1.bin": "3d5998935ca2", "assets/music/dkombat-2.bin": "cc2abd49d3d4", "assets/music/dkombat-x1.bin": "6f80ca14ced6", "assets/music/dmots-1.bin": "b25bdee4d26d", "assets/music/dmots-2.bin": "994ec1af22ab", "assets/music/dmots-x1.bin": "3e64152cae67", "assets/music/dpalet-1.bin": "1692f284a0f2", "assets/music/dpalet-2.bin": "97956bd85a57", "assets/music/dpalet-x1.bin": "6bbca11bcf9b", "assets/music/dpingpong-1.bin": "196c20ac5a78", "assets/music/dpingpong-2.bin": "710d954d0806", "assets/music/dpingpong-x1.bin": "28e4ebec59a2", "assets/music/dscores-1.bin": "34c34aa91b95", "assets/music/dscores-2.bin": "16766a28125b", "assets/music/dsouris-1.bin": "864b726965d4", "assets/music/dsouris-2.bin": "fa448ff79b75", "assets/music/dsouris-x1.bin": "74f7a8aab18d", "assets/music/dspatial-1.bin": "a85ec5845090", "assets/music/dspatial-2.bin": "3e7d4656c312", "assets/music/dspatial-x1.bin": "c85b861498ad", "assets/music/dtirsaubut-1.mp3": "f440a62064bd", "assets/music/dtirsaubut-2.mp3": "90a1beb0b57f", "assets/music/dtirsaubut-x1.mp3": "84827e4a8a75", "assets/music/dtoupies-1.mp3": "7af5922d7361", "assets/music/dtoupies-2.mp3": "4ce0fd2d7619", "assets/music/dtoupies-x1.mp3": "b15efffd7a28", "assets/music/dtrouve-1.bin": "edbba954edea", "assets/music/dtrouve-2.bin": "a1d5c9eb8393", "assets/music/dtrouve-x1.bin": "7cd05a277ec4", "assets/music/empilo-2.mp3": "a9c236e694eb", "assets/music/empilo-3.mp3": "bd98a242c514", "assets/music/empilo-x1.mp3": "876d311e3d25", "assets/music/glouton-2.mp3": "8a3983378013", "assets/music/glouton-3.mp3": "f3d8f713bb63", "assets/music/glouton-x1.mp3": "cce255e3e349", "assets/music/ilo-2.mp3": "91d5b662dff2", "assets/music/ilo-3.mp3": "0765185f7c8b", "assets/music/ilo-4.mp3": "02f736d98663", "assets/music/ilo-5.mp3": "b9e2fbcf39a9", "assets/music/ilo-x1.mp3": "c6504372dc76", "assets/music/ilo-x2.mp3": "b0a274f9690e", "assets/music/ilo-x3.mp3": "a578fd9b2e94", "assets/music/iloboss-1.mp3": "77a158ff155a", "assets/music/iloboss-2.mp3": "76959cddaa3a", "assets/music/magic-1.bin": "5a052da87fee", "assets/music/magic-2.mp3": "14cc3333f96e", "assets/music/magic-3.mp3": "26fd4898c6fa", "assets/music/magic-x1.bin": "89ca93faea15", "assets/music/magic-x2.mp3": "472f1a7a5c25", "assets/music/magic-x3.mp3": "fa544c3023fa", "assets/music/magicboss-1.bin": "74e9eb3d2336", "assets/music/magicboss-2.mp3": "4cdd098a68a1", "assets/music/magicboss-3.mp3": "f261ef4f3877", "assets/music/magicfin-1.bin": "5033d4210507", "assets/music/mouches-2.mp3": "25ea139985fc", "assets/music/mouches-3.mp3": "9586c04b73a2", "assets/music/mouches-x1.mp3": "7eac770dfaee", "assets/music/neonrush-1.mp3": "6411e0fb1fcc", "assets/music/neonrush-2.mp3": "e12b6bd8f00c", "assets/music/neonrush-3.mp3": "9b2aef8dc37d", "assets/music/pegase-1.mp3": "09c421a2ed1a", "assets/music/pgsuite-1.mp3": "f0a202ae302a", "assets/music/pgsuite-2.mp3": "71ed7b7651cd", "assets/music/pgsuite-3.mp3": "ac3e6f6126a4", "assets/music/pgsuite-4.mp3": "29b1f37be630", "assets/music/pleingaz-2.mp3": "84243ec8b9f8", "assets/music/pleingaz-3.mp3": "f8a446d87b25", "assets/music/pleingaz-x1.mp3": "5f01546b976b", "assets/music/rouleaux-1.mp3": "385b65f07181", "assets/music/rouleaux-2.mp3": "eddc53f82c07", "assets/music/rouleaux-3.mp3": "8c201a0e5a2a", "assets/music/rouleaux-x1.mp3": "0b94f6bd68c5", "assets/music/smoothie-1.mp3": "f660d4c8f8ff", "assets/music/smoothie-2.mp3": "7f73db68efba", "assets/music/smoothie-x1.mp3": "6a2097bd9217", "assets/music/smw1-1.mp3": "f660d4c8f8ff", "assets/music/smw2-1.mp3": "7f73db68efba", "assets/music/smw3-1.mp3": "c9667d13b4ed", "assets/music/smw4-1.mp3": "75c288b80ca3", "assets/music/smw5-1.mp3": "c1aaeeebdc06", "assets/music/smw6-1.mp3": "a9ebd661c922", "assets/music/sting-go.bin": "bd4f2b7b1a6e", "assets/music/sting-lose.bin": "0f6dcf9aca3e", "assets/music/sting-match.bin": "bd13394bfe6f", "assets/music/sting-podium.bin": "874f78da7015", "assets/music/sting-point.bin": "b89c07493cff", "assets/music/sting-win.bin": "5d0b54dadf05", "assets/music/sting-win2.bin": "696585519d80", "assets/pegase/decor.json": "1e11fb47fbc0", "assets/pegase/decor_01_poster.jpg": "c34e29206720", "assets/pegase/decor_21b_m_poster.jpg": "12eafd6421de", "assets/pegase/decor_21b_poster.jpg": "a995056e6022", "assets/pegase/decor_26_poster.jpg": "dc95c718bcb3", "assets/pegase/decor_28_m_poster.jpg": "43ca8b130ac3", "assets/pegase/decor_28_poster.jpg": "bdcedbc888b1", "assets/pegase/decor_29b_m_poster.jpg": "d9297d32426d", "assets/pegase/decor_29b_poster.jpg": "19e06d4b6e47", "assets/pegase/decor_32b_m_poster.jpg": "d9cea8378682", "assets/pegase/decor_32b_poster.jpg": "7737a8cce7c9", "assets/pegase/decor_34_m_poster.jpg": "595560d252b5", "assets/pegase/decor_34_poster.jpg": "693430553b0e", "assets/pegase/decor_35_m_poster.jpg": "d4e96db3344b", "assets/pegase/decor_35_poster.jpg": "543e62a8aa6f", "assets/pegase/ile_nuages_1024.webp": "391fc7d75de8", "assets/pegase/ile_nuages_2048.webp": "42e80e309ff2"};            // { 'assets/ilo.bin': 'empreinte', 'assets/music/accueil-2.mp3': '…', … } (chemins depuis la racine du site)
const PRE = ["assets/ilo.bin", "assets/rouleaux.bin", "assets/music/sting-go.bin", "assets/music/sting-lose.bin", "assets/music/sting-match.bin", "assets/music/sting-podium.bin", "assets/music/sting-point.bin", "assets/music/sting-win.bin", "assets/music/sting-win2.bin", "assets/music/accueil-2.mp3"];                  // assets gardés dès l'installation (images de Galaxy Wars, jingles, une musique de l'accueil)
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Bungee&family=Chakra+Petch:wght@400;600&display=swap";
const CORE = 'jdw-core-' + BUILD, MEDIA = 'jdw-media', FONTS = 'jdw-fonts';
const SCOPE = self.registration.scope;                 // https://…/jdv/jouer/
const ROOT = new URL('../', SCOPE).href;               // https://…/jdv/
const ROOT_PATH = new URL(ROOT).pathname;
const SHELL = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function putMedia(cache, rel, resp) {
  // copie de la réponse avec son empreinte (pour savoir plus tard si le fichier a changé)
  const blob = await resp.blob(), h = new Headers(resp.headers); h.set('x-jdw-h', ASSETS[rel] || '');
  const out = new Response(blob, { status: 200, statusText: 'OK', headers: h });
  await cache.put(ROOT + rel, out.clone());
  return out;
}
const fresh = (hit, rel) => !!hit && (!ASSETS[rel] || hit.headers.get('x-jdw-h') === ASSETS[rel]);
async function cacheAsset(rel) {
  const c = await caches.open(MEDIA);
  if (fresh(await c.match(ROOT + rel), rel)) return;
  const r = await fetch(ROOT + rel, { cache: 'no-cache' });
  if (r.ok) await putMedia(c, rel, r);
}
async function cacheFonts() {
  if (!FONT_CSS) return;
  const c = await caches.open(FONTS);
  const r = await fetch(FONT_CSS, { mode: 'cors', credentials: 'omit' });
  if (!r.ok) return;
  const css = await r.clone().text();
  await c.put(FONT_CSS, r);
  const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1]);
  await Promise.all(urls.map(async u => { if (await c.match(u)) return; const f = await fetch(u, { mode: 'cors', credentials: 'omit' }); if (f.ok) await c.put(u, f); }));
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const c = await caches.open(CORE);
    // la page de CE build (?v= : contourne le cache de GitHub), rangée sous l'adresse de la borne
    const p = await fetch(SCOPE + '?v=' + encodeURIComponent(BUILD), { cache: 'reload' });
    if (!p.ok) throw new Error('page ' + p.status);
    await c.put(SCOPE, p);
    await Promise.allSettled(SHELL.map(async f => { const r = await fetch(ROOT + f, { cache: 'no-cache' }); if (r.ok) await c.put(ROOT + f, r); }));
    await Promise.allSettled([cacheFonts(), ...PRE.map(cacheAsset)]);
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // anciens builds : partis ; médias dont le fichier a changé ou n'existe plus : retirés
    for (const k of await caches.keys()) if (k.startsWith('jdw-core-') && k !== CORE) await caches.delete(k);
    try {
      const c = await caches.open(MEDIA);
      for (const req of await c.keys()) {
        const rel = req.url.startsWith(ROOT) ? req.url.slice(ROOT.length) : '';
        const hit = await c.match(req);
        if (!rel || !(rel in ASSETS) || !fresh(hit, rel)) await c.delete(req);
      }
    } catch (x) {}
    await self.clients.claim();
  })());
});

// la borne demande de garder quelques musiques (une par jeu) quand elle est au calme et en ligne
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.t === 'warm' && Array.isArray(d.list)) {
    e.waitUntil((async () => { for (const rel of d.list.slice(0, 40)) { if (typeof rel !== 'string' || !/^assets\/[a-z0-9/_.-]+$/.test(rel)) continue; try { await cacheAsset(rel); } catch (x) { return; } await sleep(150); } })());
  }
});

const OFFLINE_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b141c"><title>Pas de connexion</title><link rel="stylesheet" href="${FONT_CSS}"><style>
html,body{margin:0;height:100%;background:#0b141c;color:#e9f0f3;font:16px/1.45 'Chakra Petch',system-ui,sans-serif}
main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box}
.orb{width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#22394a,#111d27);box-shadow:0 0 0 2px #22394a,0 0 40px #ffa63033;font-size:42px}
h1{font:400 26px/1.15 Bungee,Impact,system-ui,sans-serif;letter-spacing:.02em;margin:22px 0 8px;color:#ffd34d;text-transform:uppercase}
p{margin:0 0 22px;color:#8aa0ae;max-width:320px}
button{font:400 17px Bungee,system-ui,sans-serif;color:#0b141c;background:#ffa630;border:0;border-radius:14px;padding:14px 30px;box-shadow:0 6px 0 #b86d10}
button:active{transform:translateY(3px);box-shadow:0 3px 0 #b86d10}
</style></head><body><main><div class="orb">📡</div><h1>Pas de connexion</h1>
<p>La borne a besoin d'internet la première fois. Vérifie le Wi-Fi ou les données mobiles, puis réessaie.</p>
<button onclick="location.reload()">Réessayer</button></main>
<script>addEventListener('online',()=>setTimeout(()=>location.reload(),800))</script></body></html>`;

async function page(e) {
  const u = new URL(e.request.url);
  const net = fetch(e.request).then(async r => {
    if (r && r.ok && r.type === 'basic') { const c = await caches.open(CORE); await c.put(SCOPE, r.clone()); }
    return r;
  });
  const wait = u.searchParams.has('v') ? 10000 : 3500;
  try {
    const r = await Promise.race([net, sleep(wait).then(() => null)]);
    if (r && (r.ok || r.status < 500)) return r;
  } catch (x) {}
  const hit = (await caches.match(SCOPE, { cacheName: CORE })) || (await caches.match(SCOPE));
  if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
  try { return await net; } catch (x) {}
  return new Response(OFFLINE_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
async function asset(req, rel) {
  const c = await caches.open(MEDIA), hit = await c.match(ROOT + rel);
  if (fresh(hit, rel)) return hit;
  try {
    // « no-cache » : le navigateur revalide auprès du serveur (sinon sa copie de 10 min, peut-être l'ANCIEN fichier, serait rangée
    // sous l'empreinte du nouveau, et gardée pour toujours ; 1.43.5)
    const r = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
    if (r.ok && r.status === 200) return await putMedia(c, rel, r);
    return hit || r;
  } catch (x) { if (hit) return hit; throw x; }
}
// VIDÉOS DU DÉCOR : gardées après le 1er téléchargement complet (lecture instantanée et hors ligne au 2e passage) ; 150 Mo au plus, les plus
// anciennes sortent ; une demande par plage (Range, la balise <video>) est servie depuis le fichier gardé
const DECOR = 'jdw-decor', DECOR_MAX = 150e6;
async function decorVideo(req, rel) {
  const c = await caches.open(DECOR), key = ROOT + rel, hit = await c.match(key);
  const range = req.headers.get('range');
  if (hit) {
    if (!range) return hit;
    const buf = await hit.arrayBuffer(), m = /bytes=(\d+)-(\d*)/.exec(range), a = m ? +m[1] : 0, b = m && m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
    return new Response(buf.slice(a, b + 1), { status: 206, headers: { 'Content-Type': hit.headers.get('Content-Type') || 'video/webm', 'Content-Range': 'bytes ' + a + '-' + b + '/' + buf.byteLength, 'Content-Length': String(b - a + 1), 'Accept-Ranges': 'bytes' } });
  }
  const r = await fetch(req);
  if (!range && r.ok && r.status === 200) {   // un téléchargement complet (pas une plage) : on le garde
    const copy = r.clone();
    (async () => {
      try {
        const blob = await copy.blob(), h = new Headers(copy.headers); h.set('x-jdw-t', String(Date.now())); h.set('x-jdw-s', String(blob.size));
        await c.put(key, new Response(blob, { status: 200, headers: h }));
        const keys = await c.keys(), info = [];
        for (const k of keys) { const x = await c.match(k); info.push([k, +(x.headers.get('x-jdw-t') || 0), +(x.headers.get('x-jdw-s') || 0)]); }
        info.sort((A, B) => A[1] - B[1]); let tot = info.reduce((t, x) => t + x[2], 0);
        while (tot > DECOR_MAX && info.length > 1) { const o = info.shift(); await c.delete(o[0]); tot -= o[2]; }
      } catch (x) {}
    })();
  }
  return r;
}
async function shell(req, key) {
  const hit = await caches.match(key);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok) { const c = await caches.open(CORE); await c.put(key, r.clone()); }
  return r;
}
async function fonts(req) {
  const c = await caches.open(FONTS), css = req.url.startsWith('https://fonts.googleapis.com/');
  const hit = await c.match(req.url);
  if (hit) {
    if (css) fetch(req.url, { mode: 'cors', credentials: 'omit' }).then(r => r.ok && c.put(req.url, r)).catch(() => {});   // à jour pour la prochaine fois
    return hit;
  }
  try { const r = await fetch(req); if (r.ok && (r.type === 'cors' || r.type === 'basic')) await c.put(req.url, r.clone()); return r; }
  catch (x) { return css ? new Response('/* hors ligne : polices du système */', { headers: { 'Content-Type': 'text/css' } }) : Response.error(); }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (req.mode === 'navigate') { if (u.href.startsWith(SCOPE)) e.respondWith(page(e)); return; }
    if (!u.pathname.startsWith(ROOT_PATH)) return;
    const rel = decodeURIComponent(u.pathname.slice(ROOT_PATH.length));
    if ((/^assets\/[a-z0-9/_.-]+\.(bin|mp3)$/.test(rel) || /^assets\/pegase\/[a-z0-9_.-]+\.(jpg|webp|json)$/.test(rel)) && !u.search) { e.respondWith(asset(req, rel)); return; }
    if (/^assets\/pegase\/decor_[a-z0-9_]+\.(webm|mp4)$/.test(rel) && !u.search) { e.respondWith(decorVideo(req, rel)); return; }   // vidéos du décor : cache jdw-decor   // pegase/ : affiches, carte, île 3D, decor.json
    if (SHELL.includes(rel)) { e.respondWith(shell(req, ROOT + rel)); return; }
    return;                                  // site.json, telecharger/version.json… : toujours le réseau
  }
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') e.respondWith(fonts(req));
  // tout le reste (Supabase : /rest, /auth, realtime ; jsDelivr ; …) : pas touché, jamais mis en cache
});
