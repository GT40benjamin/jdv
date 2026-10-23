(() => {
  'use strict';

  // ===========================================================================
  // Pégase (id technique « pegase ») — LE HUB de Pégase dans la borne (pas le jeu : le jeu est l'appli Pégase, Unity, à installer).
  // POUR TOUS depuis la borne 1.22 (20 oct. 2026) ; avant : en essai derrière la porte « labo » de la bibliothèque.
  // Une belle page : l'AVATAR 3D du joueur sur un rondin à l'heure dorée (devant une vraie photo du jeu), un « Dressing » pour le
  // choisir (mêmes choix que le Dressing du jeu : PegaseWardrobe.cs, tenue = un numéro, gardée sur l'appareil au format garde-robe.json),
  // la page de téléchargement du jeu pour PC (fiche telecharger/pegase-pc.json ; absente = « Bientôt disponible »), Android / iPhone
  // « À venir », et les fonctions du hub qui arrivent. Personnages BoZo (Asset Store) : JAMAIS en clair — paquets emballés
  // assets/pegase.perso.bin + pegase.garde.<perso>.bin (clé du site) ; moteur 3D assets/pegase.moteur.bin (three.js, MIT, gzippé).
  // Rien de lourd à l'ouverture : la page s'affiche tout de suite, la 3D se charge après (repli 2D si WebGL manque).
  // Fichier ASSEMBLÉ depuis l'atelier ~/jdv-tools/pegase/borne/hub (src/*.js + wrap/, `node tools/assemble.js`) : modifier l'atelier.
  // ===========================================================================

  const PG_BUILD = '2026-10-17-hub2';   // version du hub
  // fichier du créateur → paquet emballé qui le contient (assets/pegase.<paquet>.bin) ; rempli par tools/assemble.js depuis out/packmap.json
  const PG_PACKMAP = {"perso/m/bot.striped_pants.glb":"pc.bot.striped_pants","perso/t/bot.striped_pants.d.webp":"pc.bot.striped_pants","perso/m/bot.yoga_pants.glb":"pc.bot.yoga_pants","perso/t/bot.yoga_pants.d.webp":"pc.bot.yoga_pants","perso/m/bot.baggy_pants_ankles.glb":"pc.bot.baggy_pants_ankles","perso/t/bot.baggy_pants_ankles.d.webp":"pc.bot.baggy_pants_short","perso/m/bot.baggy_pants_long.glb":"pc.bot.baggy_pants_long","perso/m/bot.baggy_pants_short.glb":"pc.bot.baggy_pants_short","perso/m/bot.big_shorts.glb":"pc.bot.big_shorts","perso/t/bot.big_shorts.d.webp":"pc.bot.big_shorts","perso/m/bot.cargo_pants.glb":"pc.bot.cargo_pants","perso/t/bot.cargo_pants.d.webp":"pc.bot.cargo_pants","perso/m/bot.cargo_pants_short.glb":"pc.bot.cargo_pants_short","perso/t/bot.cargo_pants_short.d.webp":"pc.bot.cargo_pants_short","perso/m/bot.dress_pants.glb":"pc.bot.dress_pants","perso/t/bot.dress_pants.d.webp":"pc.bot.dress_pants","perso/m/bot.jean_skirt.glb":"pc.bot.jean_skirt","perso/t/bot.jean_skirt.d.webp":"pc.bot.jean_skirt","perso/m/bot.jeans.glb":"pc.bot.jeans","perso/t/bot.jeans.d.webp":"pc.bot.jeans","perso/m/bot.loose_jeans.glb":"pc.bot.loose_jeans","perso/t/bot.loose_jeans.d.webp":"pc.bot.loose_jeans","perso/m/bot.pleated_skirt.glb":"pc.bot.pleated_skirt","perso/t/bot.pleated_skirt.d.webp":"pc.bot.pleated_skirt","perso/m/bot.short_shorts.glb":"pc.bot.short_shorts","perso/t/bot.short_shorts.d.webp":"pc.bot.short_shorts","perso/m/bot.shorts.glb":"pc.bot.shorts","perso/t/bot.shorts.d.webp":"pc.bot.shorts","perso/m/bot.skirt.glb":"pc.bot.skirt","perso/t/bot.skirt.d.webp":"pc.bot.skirt","perso/m/feet.sports_shoes.glb":"pc.feet.sports_shoes","perso/t/feet.sports_shoes.d.webp":"pc.feet.sports_shoes","perso/t/feet.sports_shoes.id.webp":"pc.feet.sports_shoes","perso/m/feet.big_boots.glb":"pc.feet.big_boots","perso/t/feet.big_boots.d.webp":"pc.feet.big_boots","perso/m/feet.comfy_shoes.glb":"pc.feet.comfy_shoes","perso/t/feet.comfy_shoes.d.webp":"pc.feet.comfy_shoes","perso/m/feet.cool_shoes.glb":"pc.feet.cool_shoes","perso/t/feet.cool_shoes.d.webp":"pc.feet.cool_shoes","perso/t/feet.cool_shoes.id.webp":"pc.feet.cool_shoes","perso/m/feet.office_shoes.glb":"pc.feet.office_shoes","perso/t/feet.office_shoes.d.webp":"pc.feet.office_shoes","perso/m/feet.school_shoes.glb":"pc.feet.school_shoes","perso/t/feet.school_shoes.d.webp":"pc.feet.school_shoes","perso/m/feet.short_boots.glb":"pc.feet.short_boots","perso/t/feet.short_boots.d.webp":"pc.feet.short_boots","perso/m/feet.shower_sandal.glb":"pc.feet.shower_sandal","perso/t/feet.shower_sandal.d.webp":"pc.feet.shower_sandal","perso/m/feet.slip_ons.glb":"pc.feet.slip_ons","perso/t/feet.slip_ons.d.webp":"pc.feet.slip_ons","perso/m/feet.street_shoes.glb":"pc.feet.street_shoes","perso/t/feet.street_shoes.d.webp":"pc.feet.street_shoes","perso/t/feet.street_shoes.id.webp":"pc.feet.street_shoes","perso/m/feet.work_boots.glb":"pc.feet.work_boots","perso/t/feet.work_boots.d.webp":"pc.feet.work_boots","perso/t/feet.work_boots.id.webp":"pc.feet.work_boots","perso/m/feet.high_lace_shoe.glb":"pc.feet.high_lace_shoe","perso/t/feet.high_lace_shoe.d.webp":"pc.feet.high_lace_shoe","perso/t/feet.high_lace_shoe.id.webp":"pc.feet.high_lace_shoe","perso/m/glov.fingerless.glb":"pc.glov.fingerless","perso/t/glov.fingerless.d.webp":"pc.glov.fingerless","perso/m/glov.work_gloves.glb":"pc.glov.work_gloves","perso/t/glov.work_gloves.d.webp":"pc.glov.work_gloves","perso/m/glov.arm_warmers.glb":"pc.glov.arm_warmers","perso/t/glov.arm_warmers.d.webp":"pc.glov.arm_warmers","perso/m/hb.dread_back.glb":"pc.hb.dread_back","perso/t/hb.dread_back.d.webp":"pc.hb.dread_back","perso/m/hb.flare.glb":"pc.hb.flare","perso/t/hb.flare.d.webp":"pc.hb.flare","perso/m/hb.long_dreads.glb":"pc.hb.long_dreads","perso/t/hb.long_dreads.d.webp":"pc.hb.long_dreads","perso/m/hb.long_streight.glb":"pc.hb.long_streight","perso/t/hb.long_streight.d.webp":"pc.hb.long_streight","perso/m/hb.pony_tail_long.glb":"pc.hb.pony_tail_long","perso/t/hb.pony_tail_long.d.webp":"pc.hb.twin_tail_short","perso/m/hb.pony_tail_short.glb":"pc.hb.pony_tail_short","perso/m/hb.punk.glb":"pc.hb.punk","perso/t/hb.punk.d.webp":"pc.hb.punk","perso/m/hb.scrappy.glb":"pc.hb.scrappy","perso/t/hb.scrappy.d.webp":"pc.hb.scrappy","perso/m/hb.short.glb":"pc.hb.short","perso/t/hb.short.d.webp":"pc.hb.short","perso/m/hb.short_bob.glb":"pc.hb.short_bob","perso/t/hb.short_bob.d.webp":"pc.hb.short_bob","perso/m/hb.twin_tail_long.glb":"pc.hb.twin_tail_long","perso/m/hb.twin_tail_short.glb":"pc.hb.twin_tail_short","perso/m/hb.wild.glb":"pc.hb.wild","perso/t/hb.wild.d.webp":"pc.hb.wild","perso/m/hb.wild_tail.glb":"pc.hb.wild_tail","perso/t/hb.wild_tail.d.webp":"pc.hb.wild_tail","perso/m/hf.fohawk.glb":"pc.hf.fohawk","perso/t/hf.fohawk.d.webp":"pc.hf.fohawk","perso/m/hf.hanging_dreads.glb":"pc.hf.hanging_dreads","perso/t/hf.hanging_dreads.d.webp":"pc.hf.hanging_dreads","perso/m/hf.hime.glb":"pc.hf.hime","perso/t/hf.hime.d.webp":"pc.hf.hime","perso/m/hf.long_sweeps.glb":"pc.hf.long_sweeps","perso/t/hf.long_sweeps.d.webp":"pc.hf.long_sweeps","perso/m/hf.messy.glb":"pc.hf.messy","perso/t/hf.messy.d.webp":"pc.hf.messy","perso/m/hf.quickly_hair.glb":"pc.hf.quickly_hair","perso/t/hf.quickly_hair.d.webp":"pc.hf.quickly_hair","perso/m/hf.sweapt_back.glb":"pc.hf.sweapt_back","perso/t/hf.sweapt_back.d.webp":"pc.hf.sweapt_back","perso/m/hf.sweapt_dreads.glb":"pc.hf.sweapt_dreads","perso/t/hf.sweapt_dreads.d.webp":"pc.hf.sweapt_dreads","perso/m/hf.wolf_cut.glb":"pc.hf.wolf_cut","perso/t/hf.wolf_cut.d.webp":"pc.hf.wolf_cut","perso/m/hat.ballcap.glb":"pc.hat.ballcap","perso/t/hat.ballcap.d.webp":"pc.hat.ballcap","perso/m/hat.beanie.glb":"pc.hat.beanie","perso/t/hat.beanie.d.webp":"pc.hat.beanie","perso/m/hat.bucket.glb":"pc.hat.bucket","perso/t/hat.bucket.d.webp":"pc.hat.bucket","perso/m/hat.fedora.glb":"pc.hat.fedora","perso/t/hat.fedora.d.webp":"pc.hat.fedora","perso/m/beard.lower_bushy_beard.glb":"pc.beard.lower_bushy_beard","perso/t/beard.lower_bushy_beard.d.webp":"pc.beard.lower_bushy_beard","perso/m/beard.lower_chin_goatee.glb":"pc.beard.lower_chin_goatee","perso/t/beard.lower_chin_goatee.d.webp":"pc.beard.lower_mustashe_chin","perso/m/beard.lower_full_beard.glb":"pc.beard.lower_full_beard","perso/t/beard.lower_full_beard.d.webp":"pc.beard.lower_full_beard","perso/m/beard.lower_goatee.glb":"pc.beard.lower_goatee","perso/t/beard.lower_goatee.d.webp":"pc.beard.lower_goatee","perso/m/beard.lower_mustashe.glb":"pc.beard.lower_mustashe","perso/m/beard.lower_mustashe_chin.glb":"pc.beard.lower_mustashe_chin","perso/m/ovr.overall.glb":"pc.ovr.overall","perso/t/ovr.overall.d.webp":"pc.ovr.overall","perso/t/ovr.overall.id.webp":"pc.ovr.overall","perso/m/ovr.smart_dress.glb":"pc.ovr.smart_dress","perso/t/ovr.smart_dress.d.webp":"pc.ovr.smart_dress","perso/m/ovr.sundress.glb":"pc.ovr.sundress","perso/t/ovr.sundress.d.webp":"pc.ovr.sundress","perso/m/top.casual_jacket.glb":"pc.top.casual_jacket","perso/t/top.casual_jacket.d.webp":"pc.top.casual_jacket","perso/m/top.dress_shirt.glb":"pc.top.dress_shirt","perso/t/top.dress_shirt.d.webp":"pc.top.dress_shirt","perso/m/top.hoodie.glb":"pc.top.hoodie","perso/t/top.hoodie.d.webp":"pc.top.hoodie","perso/m/top.open_jacket.glb":"pc.top.open_jacket","perso/t/top.open_jacket.d.webp":"pc.top.open_jacket","perso/m/top.seifuku.glb":"pc.top.seifuku","perso/t/top.seifuku.d.webp":"pc.top.seifuku_short","perso/t/top.seifuku.id.webp":"pc.top.seifuku_short","perso/m/top.seifuku_short.glb":"pc.top.seifuku_short","perso/m/top.shirt.glb":"pc.top.shirt","perso/t/top.shirt.d.webp":"pc.top.shirt","perso/m/top.suit_jacket.glb":"pc.top.suit_jacket","perso/t/top.suit_jacket.d.webp":"pc.top.suit_jacket","perso/m/top.suspenders.glb":"pc.top.suspenders","perso/t/top.suspenders.d.webp":"pc.top.suspenders","perso/m/top.sweater.glb":"pc.top.sweater","perso/t/top.sweater.d.webp":"pc.top.sweater","perso/m/top.tank_top.glb":"pc.top.tank_top","perso/t/top.tank_top.d.webp":"pc.top.tank_top","perso/m/top.turtle_neck.glb":"pc.top.turtle_neck","perso/t/top.turtle_neck.d.webp":"pc.top.turtle_neck","perso/m/top.button_up.glb":"pc.top.button_up","perso/t/top.button_up.d.webp":"pc.top.button_up_short","perso/m/top.button_up_short.glb":"pc.top.button_up_short","perso/m/top.henley.glb":"pc.top.henley","perso/t/top.henley.d.webp":"pc.top.henley","perso/m/top.open_shoulder.glb":"pc.top.open_shoulder","perso/t/top.open_shoulder.d.webp":"pc.top.open_shoulder_strapsless","perso/m/top.open_shoulder_crop.glb":"pc.top.open_shoulder_crop","perso/m/top.open_shoulder_straps.glb":"pc.top.open_shoulder_straps","perso/m/top.open_shoulder_strapsless.glb":"pc.top.open_shoulder_strapsless","perso/m/glass.round_shaded.glb":"pc.glass.round_shaded","perso/m/glass.shaded_glasses.glb":"pc.glass.shaded_glasses","perso/m/glass.simple_glasses.glb":"pc.glass.simple_glasses","perso/t/pupil_sharp.d.webp":"pc.ly.pupil.sharp","perso/t/shine_double.d.webp":"pc.ly.shine.double","perso/t/freckles_light.d.webp":"pc.ly.freckles.light","perso/t/freckles_full.d.webp":"pc.ly.freckles.full","perso/t/blush.d.webp":"pc.ly.blush","perso/t/lips.d.webp":"pc.ly.lips","perso/t/liner.d.webp":"pc.ly.liner","perso/t/age.d.webp":"pc.ly.age","perso/t/socks_ankle.d.webp":"pc.ly.socks.ankle","perso/t/socks_basic.d.webp":"pc.ly.socks.basic","perso/t/socks_knee.d.webp":"pc.ly.socks.knee","perso/t/socks_thigh.d.webp":"pc.ly.socks.thigh","perso/t/socks_stirrup.d.webp":"pc.ly.socks.stirrup","perso/t/socks_tights.d.webp":"pc.ly.socks.tights","perso/t/head_stern.d.webp":"pc.head.stern","perso/t/head_stern.id.webp":"pc.head.stern","perso/i/bot.striped_pants.webp":"ic.bot","perso/i/bot.yoga_pants.webp":"ic.bot","perso/i/bot.baggy_pants_ankles.webp":"ic.bot","perso/i/bot.baggy_pants_long.webp":"ic.bot","perso/i/bot.baggy_pants_short.webp":"ic.bot","perso/i/bot.big_shorts.webp":"ic.bot","perso/i/bot.cargo_pants.webp":"ic.bot","perso/i/bot.cargo_pants_short.webp":"ic.bot","perso/i/bot.dress_pants.webp":"ic.bot","perso/i/bot.jean_skirt.webp":"ic.bot","perso/i/bot.jeans.webp":"ic.bot","perso/i/bot.loose_jeans.webp":"ic.bot","perso/i/bot.pleated_skirt.webp":"ic.bot","perso/i/bot.short_shorts.webp":"ic.bot","perso/i/bot.shorts.webp":"ic.bot","perso/i/bot.skirt.webp":"ic.bot","perso/i/feet.sports_shoes.webp":"ic.feet","perso/i/feet.big_boots.webp":"ic.feet","perso/i/feet.comfy_shoes.webp":"ic.feet","perso/i/feet.cool_shoes.webp":"ic.feet","perso/i/feet.office_shoes.webp":"ic.feet","perso/i/feet.sandals.webp":"ic.feet","perso/i/feet.school_shoes.webp":"ic.feet","perso/i/feet.short_boots.webp":"ic.feet","perso/i/feet.shower_sandal.webp":"ic.feet","perso/i/feet.slip_ons.webp":"ic.feet","perso/i/feet.street_shoes.webp":"ic.feet","perso/i/feet.work_boots.webp":"ic.feet","perso/i/feet.high_lace_shoe.webp":"ic.feet","perso/i/glov.fingerless.webp":"ic.glov","perso/i/glov.work_gloves.webp":"ic.glov","perso/i/glov.arm_warmers.webp":"ic.glov","perso/i/hb.buzzed.webp":"ic.hb","perso/i/hb.dread_back.webp":"ic.hb","perso/i/hb.flare.webp":"ic.hb","perso/i/hb.long_dreads.webp":"ic.hb","perso/i/hb.long_streight.webp":"ic.hb","perso/i/hb.pony_tail_long.webp":"ic.hb","perso/i/hb.pony_tail_short.webp":"ic.hb","perso/i/hb.punk.webp":"ic.hb","perso/i/hb.scrappy.webp":"ic.hb","perso/i/hb.short.webp":"ic.hb","perso/i/hb.short_bob.webp":"ic.hb","perso/i/hb.twin_tail_long.webp":"ic.hb","perso/i/hb.twin_tail_short.webp":"ic.hb","perso/i/hb.wild.webp":"ic.hb","perso/i/hb.wild_tail.webp":"ic.hb","perso/i/hf.bang_side_flicks.webp":"ic.hf","perso/i/hf.fohawk.webp":"ic.hf","perso/i/hf.hanging_dreads.webp":"ic.hf","perso/i/hf.hime.webp":"ic.hf","perso/i/hf.long_sweeps.webp":"ic.hf","perso/i/hf.messy.webp":"ic.hf","perso/i/hf.quickly_hair.webp":"ic.hf","perso/i/hf.sweapt_back.webp":"ic.hf","perso/i/hf.sweapt_dreads.webp":"ic.hf","perso/i/hf.wolf_cut.webp":"ic.hf","perso/i/hat.ballcap.webp":"ic.hat","perso/i/hat.beanie.webp":"ic.hat","perso/i/hat.bucket.webp":"ic.hat","perso/i/hat.fedora.webp":"ic.hat","perso/i/hat.sun_hat.webp":"ic.hat","perso/i/hacc.alien_attena.webp":"ic.hacc","perso/i/hacc.horns.webp":"ic.hacc","perso/i/beard.lower_bushy_beard.webp":"ic.beard","perso/i/beard.lower_chin_goatee.webp":"ic.beard","perso/i/beard.lower_full_beard.webp":"ic.beard","perso/i/beard.lower_goatee.webp":"ic.beard","perso/i/beard.lower_mustashe.webp":"ic.beard","perso/i/beard.lower_mustashe_chin.webp":"ic.beard","perso/i/ovr.overall.webp":"ic.ovr","perso/i/ovr.smart_dress.webp":"ic.ovr","perso/i/ovr.sundress.webp":"ic.ovr","perso/i/top.casual_jacket.webp":"ic.top","perso/i/top.dress_shirt.webp":"ic.top","perso/i/top.hoodie.webp":"ic.top","perso/i/top.open_jacket.webp":"ic.top","perso/i/top.seifuku.webp":"ic.top","perso/i/top.seifuku_short.webp":"ic.top","perso/i/top.shirt.webp":"ic.top","perso/i/top.suit_jacket.webp":"ic.top","perso/i/top.suspenders.webp":"ic.top","perso/i/top.sweater.webp":"ic.top","perso/i/top.tank_top.webp":"ic.top","perso/i/top.turtle_neck.webp":"ic.top","perso/i/top.button_up.webp":"ic.top","perso/i/top.button_up_short.webp":"ic.top","perso/i/top.henley.webp":"ic.top","perso/i/top.open_shoulder.webp":"ic.top","perso/i/top.open_shoulder_crop.webp":"ic.top","perso/i/top.open_shoulder_straps.webp":"ic.top","perso/i/top.open_shoulder_strapsless.webp":"ic.top","perso/i/glass.round_glasses.webp":"ic.glass","perso/i/glass.round_shaded.webp":"ic.glass","perso/i/glass.shaded_glasses.webp":"ic.glass","perso/i/glass.simple_glasses.webp":"ic.glass","perso/i/brow.stylized_basic_brows.webp":"ic.brow","perso/i/brow.stylized_thick_brows.webp":"ic.brow","perso/i/lash.stylized_long_lashes.webp":"ic.lash","perso/i/lash.stylized_short_lashes.webp":"ic.lash","perso/i/pupil.basic.webp":"ic.calques","perso/i/pupil.sharp.webp":"ic.calques","perso/i/freckles.light.webp":"ic.calques","perso/i/freckles.full.webp":"ic.calques","perso/i/blush.webp":"ic.calques","perso/i/lips.webp":"ic.calques","perso/i/liner.webp":"ic.calques","perso/i/age.webp":"ic.calques","perso/i/socks.ankle.webp":"ic.calques","perso/i/socks.basic.webp":"ic.calques","perso/i/socks.knee.webp":"ic.calques","perso/i/socks.thigh.webp":"ic.calques","perso/i/socks.stirrup.webp":"ic.calques","perso/i/socks.tights.webp":"ic.calques"};
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ROOT = () => (typeof window !== 'undefined' && window.JDW_ROOT) || '';

  // ---------------------------------------------------------------------------
  // VIGNETTE (2D) : le lac à l'heure dorée, le village et son moulin, Pégase qui passe avec sa traînée d'étoiles
  // ---------------------------------------------------------------------------
  const PV = { stars: null, motes: null };
  function rnd(seed) { let a = seed | 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pvInit() {
    if (PV.motes) return;
    const r = rnd(7);
    PV.motes = Array.from({ length: 46 }, () => ({ x: r(), y: 0.35 + r() * 0.6, s: 0.4 + r() * 1.2, p: r() * TAU, v: 0.004 + r() * 0.01 }));
    PV.houses = Array.from({ length: 9 }, (_, i) => ({ x: 0.03 + i * 0.052 + r() * 0.02, w: 0.04 + r() * 0.025, h: 0.05 + r() * 0.035, roof: r() < 0.5 ? '#7a2f2a' : '#3f4a6e', win: r() }));
    PV.trees = Array.from({ length: 14 }, () => ({ x: r() * 0.5, s: 0.6 + r() * 0.8, c: r() < 0.35 ? 1 : 0 }));
    PV.glints = Array.from({ length: 40 }, () => ({ x: r(), y: r(), p: r() * TAU }));
  }
  function horse(ctx, x, y, s, flap, dir) {
    // Pégase stylisé (silhouette blanche lumineuse) : corps, encolure, tête, jambes repliées, queue, deux ailes qui battent
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    ctx.shadowColor = 'rgba(255,236,190,.9)'; ctx.shadowBlur = 10 * s;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#fffaf0'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // aile arrière (plus sombre)
    ctx.save(); ctx.rotate(-0.25 - flap * 0.9); ctx.fillStyle = '#e8e2f4';
    ctx.beginPath(); ctx.moveTo(-2, -4); ctx.quadraticCurveTo(-6, -26, 10, -40); ctx.quadraticCurveTo(6, -24, 14, -14); ctx.quadraticCurveTo(6, -10, 8, -4); ctx.closePath(); ctx.fill(); ctx.restore();
    // corps
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 7, -0.08, 0, TAU); ctx.fill();
    // encolure + tête
    ctx.beginPath(); ctx.moveTo(9, -3); ctx.quadraticCurveTo(16, -10, 19, -18); ctx.lineTo(24, -16); ctx.quadraticCurveTo(21, -8, 14, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(24, -17.5, 6, 3.2, 0.45, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(19.5, -21); ctx.lineTo(20.5, -25.5); ctx.lineTo(22.5, -21.5); ctx.fill();   // oreille
    // crinière dorée
    ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(18, -21); ctx.quadraticCurveTo(12, -14, 9, -5); ctx.stroke();
    // jambes repliées
    ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 2.6;
    for (const [lx, a] of [[-9, 0.6], [-6, 0.9], [8, -0.3], [11, 0.1]]) { ctx.beginPath(); ctx.moveTo(lx, 4); ctx.lineTo(lx + Math.sin(a) * 5, 10); ctx.lineTo(lx + Math.sin(a) * 5 - 3, 13); ctx.stroke(); }
    // queue
    ctx.strokeStyle = '#ffe9b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.quadraticCurveTo(-24, -2 + flap * 3, -28, 6); ctx.stroke();
    // aile avant (plumes)
    ctx.save(); ctx.rotate(-0.15 - flap * 1.05); ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(-3, -5); ctx.quadraticCurveTo(-9, -30, 8, -46); ctx.quadraticCurveTo(4, -30, 16, -22); ctx.quadraticCurveTo(7, -16, 11, -7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,190,230,.8)'; ctx.lineWidth = 0.8; ctx.shadowBlur = 0;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0 + k, -8 - k * 2); ctx.lineTo(6 + k * 2.5, -30 + k * 4); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
  }
  function paintScene(ctx, w, h, t, night) {
    pvInit();
    const hz = h * 0.6, u = Math.min(h, w * 0.62);   // horizon ; u = unité de taille (le portrait ne grossit pas tout)
    // ciel
    let g = ctx.createLinearGradient(0, 0, 0, hz);
    if (night) { g.addColorStop(0, '#060b22'); g.addColorStop(0.6, '#1a2350'); g.addColorStop(1, '#3a3a6a'); }
    else { g.addColorStop(0, '#2b2f6e'); g.addColorStop(0.45, '#a0619a'); g.addColorStop(0.8, '#ffad7a'); g.addColorStop(1, '#ffd79a'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz + 1);
    // soleil bas + halo
    const sx = w * 0.74, sy = hz - h * 0.07;
    g = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.42);
    g.addColorStop(0, night ? 'rgba(220,230,255,.5)' : 'rgba(255,236,170,.95)'); g.addColorStop(0.1, night ? 'rgba(170,190,255,.22)' : 'rgba(255,190,110,.55)'); g.addColorStop(1, 'rgba(255,150,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz + 1);
    ctx.fillStyle = night ? '#eef2ff' : '#fff2c8'; ctx.beginPath(); ctx.arc(sx, sy, u * (night ? 0.045 : 0.06), 0, TAU); ctx.fill();
    if (night) { const r = rnd(3); ctx.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { const a = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + r() * 2) + i)); ctx.globalAlpha = a * 0.8; ctx.fillRect(r() * w, r() * hz * 0.85, r() < 0.15 ? 1.6 : 1, r() < 0.15 ? 1.6 : 1); } ctx.globalAlpha = 1; }
    // nuages dorés
    ctx.globalAlpha = night ? 0.18 : 0.5;
    for (let i = 0; i < 4; i++) { const cx = ((i * 0.31 + t * 0.006) % 1.3 - 0.15) * w, cy = h * (0.12 + i * 0.07); g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.16);
      g.addColorStop(0, night ? '#8a96c8' : '#ffd2b0'); g.addColorStop(1, 'rgba(255,210,176,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.18, h * 0.035, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // montagnes (trois plans dans la brume)
    const mts = night ? ['#1c2148', '#262c58', '#323a6a'] : ['#8a6e9c', '#76608e', '#5e4f7c'];
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = mts[k]; ctx.beginPath(); ctx.moveTo(0, hz);
      for (let x = 0; x <= w; x += w / 40) { const u = x / w; const y = hz - h * (0.1 + 0.07 * k) * (0.5 + 0.5 * Math.sin(u * (5 + k * 2) + k * 1.7)) * (0.6 + 0.4 * Math.sin(u * 13 + k)); ctx.lineTo(x, Math.min(hz, y + k * h * 0.035)); }
      ctx.lineTo(w, hz); ctx.closePath(); ctx.fill();
    }
    // lac + reflets
    g = ctx.createLinearGradient(0, hz, 0, h);
    if (night) { g.addColorStop(0, '#2a3466'); g.addColorStop(1, '#0a1230'); } else { g.addColorStop(0, '#f3b28a'); g.addColorStop(0.3, '#8a6aa0'); g.addColorStop(1, '#2b3a6a'); }
    ctx.fillStyle = g; ctx.fillRect(0, hz, w, h - hz);
    for (const gl of PV.glints) { const a = Math.max(0, Math.sin(t * 3 + gl.p)); const x = sx + (gl.x - 0.5) * w * 0.25 * (0.4 + gl.y), y = hz + 3 + gl.y * (h - hz) * 0.9; ctx.fillStyle = night ? `rgba(220,230,255,${a * 0.7})` : `rgba(255,240,200,${a * 0.9})`; ctx.fillRect(x, y, 2 + gl.y * 6, 1.2); }
    // rive gauche : herbe, arbres, village, moulin
    ctx.fillStyle = night ? '#0e1830' : '#3e4a3a';
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, hz - h * 0.04); ctx.quadraticCurveTo(w * 0.32, hz - h * 0.08, w * 0.62, hz + h * 0.02); ctx.quadraticCurveTo(w * 0.5, h * 0.8, w * 0.3, h); ctx.closePath(); ctx.fill();
    for (const tr of PV.trees) {   // arbres : tronc + feuillage en trois boules (verts et roux d'automne, dans l'ombre du contre-jour)
      const x = tr.x * w, y = hz - h * 0.035 - (0.62 - tr.x) * h * 0.035, r = u * 0.03 * tr.s;
      ctx.fillStyle = night ? '#0c1426' : '#3a2a24'; ctx.fillRect(x - r * 0.12, y - r * 1.2, r * 0.24, r * 1.2);
      ctx.fillStyle = night ? '#132242' : (tr.c ? '#a8462a' : '#46603a');
      for (const [ox, oy, k] of [[-0.45, -1.25, 0.75], [0.45, -1.3, 0.72], [0, -1.75, 0.85]]) { ctx.beginPath(); ctx.arc(x + ox * r, y + oy * r, r * k, 0, TAU); ctx.fill(); }
      if (!night) { ctx.fillStyle = 'rgba(255,190,120,.28)'; ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 1.9, r * 0.45, 0, TAU); ctx.fill(); } }
    for (const hs of PV.houses) {
      const x = hs.x * w, base = hz - h * 0.02, hw = hs.w * w, hh = hs.h * u;
      ctx.fillStyle = night ? '#2a2f4a' : '#e8d6b8'; ctx.fillRect(x, base - hh, hw, hh);
      ctx.fillStyle = night ? 'rgba(0,0,0,.25)' : 'rgba(120,70,60,.28)'; ctx.fillRect(x + hw * 0.62, base - hh, hw * 0.38, hh);   // côté à l'ombre
      if (!night) { ctx.strokeStyle = 'rgba(92,52,36,.75)'; ctx.lineWidth = Math.max(0.6, u * 0.004); ctx.beginPath(); ctx.moveTo(x, base - hh * 0.55); ctx.lineTo(x + hw, base - hh * 0.55); ctx.moveTo(x + hw * 0.5, base - hh); ctx.lineTo(x + hw * 0.5, base); ctx.stroke(); }
      ctx.fillStyle = night ? '#191c33' : hs.roof; ctx.beginPath(); ctx.moveTo(x - hw * 0.12, base - hh); ctx.lineTo(x + hw / 2, base - hh - hh * 0.75); ctx.lineTo(x + hw * 1.12, base - hh); ctx.closePath(); ctx.fill();
      if (night || hs.win > 0.6) { ctx.fillStyle = night ? 'rgba(255,190,100,.95)' : 'rgba(255,220,150,.6)'; ctx.fillRect(x + hw * 0.3, base - hh * 0.62, hw * 0.18, hh * 0.24); }
    }
    // moulin
    { const mx = w * 0.4, my = hz - h * 0.05, mh = u * 0.2;
      ctx.fillStyle = night ? '#232845' : '#cdb48f'; ctx.beginPath(); ctx.moveTo(mx - mh * 0.16, my); ctx.lineTo(mx - mh * 0.1, my - mh); ctx.lineTo(mx + mh * 0.1, my - mh); ctx.lineTo(mx + mh * 0.16, my); ctx.closePath(); ctx.fill();
      ctx.fillStyle = night ? '#171a30' : '#8a3a30'; ctx.beginPath(); ctx.moveTo(mx - mh * 0.14, my - mh); ctx.lineTo(mx, my - mh * 1.25); ctx.lineTo(mx + mh * 0.14, my - mh); ctx.fill();
      ctx.save(); ctx.translate(mx, my - mh * 0.92); ctx.rotate(t * 0.6); ctx.strokeStyle = night ? '#3a4068' : '#5a4030'; ctx.lineWidth = Math.max(1, u * 0.008);
      for (let k = 0; k < 4; k++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -mh * 0.62); ctx.stroke(); ctx.fillStyle = night ? 'rgba(80,90,140,.7)' : 'rgba(240,226,200,.85)'; ctx.fillRect(1, -mh * 0.6, mh * 0.12, mh * 0.42); }
      ctx.restore(); }
    // Pégase qui passe (boucle de 9 s) avec sa traînée d'étoiles
    const k = (t % 9) / 9, px = w * (1.15 - k * 1.3), py = h * (0.36 - Math.sin(k * Math.PI) * 0.14) + Math.sin(t * 2.2) * h * 0.01, flap = Math.sin(t * 6) * 0.5 + 0.2;
    for (let i = 1; i < 26; i++) { const kk = k - i * 0.006; if (kk < 0) break; const tx = w * (1.15 - kk * 1.3) + 10 * (u / 170), ty = h * (0.36 - Math.sin(kk * Math.PI) * 0.14) + Math.sin((t - i * 0.054) * 2.2) * h * 0.01 + 2;
      const a = (1 - i / 26) * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)); ctx.fillStyle = `rgba(255,${night ? 235 : 225},${night ? 255 : 170},${a})`; const r = (1.6 - i * 0.04) * (u / 170);
      ctx.beginPath(); ctx.arc(tx + Math.sin(i * 2.1 + t) * 3, ty + i * 0.25 * (u / 170), Math.max(0.4, r), 0, TAU); ctx.fill(); }
    horse(ctx, px, py, u / 170 * 0.9, flap, -1);
    // poussières dorées / lucioles
    for (const m of PV.motes) { const x = ((m.x + t * m.v) % 1) * w, y = m.y * h + Math.sin(t * 0.8 + m.p) * h * 0.02, a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.4 + m.p));
      ctx.fillStyle = night ? `rgba(190,255,150,${a * 0.85})` : `rgba(255,224,150,${a * 0.75})`; ctx.beginPath(); ctx.arc(x, y, m.s * (u / 170), 0, TAU); ctx.fill(); }
    // vignette
    g = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.3, w / 2, h * 0.5, w * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,6,20,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  function preview(ctx, w, h, t) {
    try { ctx.save(); paintScene(ctx, w, h, t, Math.sin(t * 0.05) > 0.92); ctx.restore(); }
    catch (e) { try { ctx.restore(); ctx.fillStyle = '#2b2f6e'; ctx.fillRect(0, 0, w, h); } catch (e2) { /* rien */ } }
  }

  // ---------------------------------------------------------------------------
  // CHARGEMENT : moteur (three.js gzippé, MIT) + paquets emballés. Gardés en mémoire tant que la page de la borne vit (rouvrir le hub
  // ne retélécharge rien) ; le service worker de la borne les garde aussi sur l'appareil (le point dans le nom : après la 1re ouverture).
  // ---------------------------------------------------------------------------
  const STORE = { three: null, packs: {}, files: new Map(), keys: {}, busyN: 0, busyUntil: 0, thumbs: new Map(), icons: new Map(), roomAv: {} };
  const PACK_GUESS = { perso: 640000, 'garde.sally': 140000, 'garde.chloe': 236000, 'garde.mary': 252000, 'garde.zulle': 141000, 'garde.javi': 252000, 'garde.john': 255000, 'garde.galvon': 312000 };
  async function fetchBytes(url, onProg, guess) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url.split('/').pop() + ' : ' + r.status);
    const total = +(r.headers.get('content-length') || 0) || guess || 0;
    if (!r.body || !r.body.getReader) { const b = new Uint8Array(await r.arrayBuffer()); if (onProg) onProg(1); return b; }
    const rd = r.body.getReader(), parts = []; let got = 0;
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      parts.push(value); got += value.length;
      if (onProg && total) onProg(Math.min(1, got / total));
    }
    const out = new Uint8Array(got); let k = 0;
    for (const p of parts) { out.set(p, k); k += p.length; }
    return out;
  }
  async function gunzip(u8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien (DecompressionStream)');
    return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  }
  function loadThree(onProg) {
    if (window.JDW_PG3) return Promise.resolve(window.JDW_PG3);
    if (STORE.three) return STORE.three;
    STORE.three = (async () => {
      const gz = await fetchBytes(ROOT() + 'assets/pegase.moteur.bin', onProg, 198000);
      const code = new TextDecoder().decode(await gunzip(gz));
      await new Promise((res, rej) => {
        const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        s.onload = () => { URL.revokeObjectURL(u); s.remove(); res(); };
        s.onerror = () => { URL.revokeObjectURL(u); s.remove(); rej(new Error('moteur 3D illisible')); };
        s.src = u; document.head.appendChild(s);
      });
      if (!window.JDW_PG3) throw new Error('moteur 3D absent');
      return window.JDW_PG3;
    })();
    STORE.three.catch(() => { STORE.three = null; });
    return STORE.three;
  }
  // paquet emballé : sel(16) + iv(12) + AES-GCM( [taille en-tête][en-tête JSON][données] ) ; même sel pour tous ceux de Pégase (clé dérivée une fois)
  async function packKey(salt) {
    const id = Array.from(salt, (b) => b.toString(16).padStart(2, '0')).join('');
    if (!STORE.keys[id]) STORE.keys[id] = (async () => {
      const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(window.JDW_ASSET_KEY || ''), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    })();
    return STORE.keys[id];
  }
  // un fichier des paquets ; s'il manque, son paquet (PG_PACKMAP) est chargé d'abord
  async function fileOf(name) {
    if (STORE.files.has(name)) return STORE.files.get(name);
    const p = PG_PACKMAP[name]; if (!p) return null;
    await needPack(p); return STORE.files.get(name) || null;
  }
  // vignette d'une pièce (icône du catalogue) en adresse blob:, gardée tant que la borne vit
  async function iconUrl(path) {
    const k = 'perso/' + path; if (STORE.icons.has(k)) return STORE.icons.get(k);
    const b = await fileOf(k); if (!b) return '';
    const u = URL.createObjectURL(new Blob([b], { type: 'image/webp' })); STORE.icons.set(k, u); return u;
  }
  const PROG = new Map();
  function needPack(name, onProg) {
    if (onProg) { if (!PROG.has(name)) PROG.set(name, new Set()); PROG.get(name).add(onProg); }
    if (STORE.packs[name]) return STORE.packs[name];
    const p = (async () => {
      const buf = await fetchBytes(ROOT() + 'assets/pegase.' + name + '.bin', (k) => { for (const f of PROG.get(name) || []) { try { f(k); } catch (e) { /* rien */ } } }, PACK_GUESS[name]);
      STORE.busyN++;   // déballage : le jeu ne juge pas sa vitesse pendant ce temps (à-coups qui ne disent rien de l'appareil)
      try {
        const key = await packKey(buf.slice(0, 16));
        const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(16, 28) }, key, buf.slice(28)));
        const hl = new DataView(plain.buffer, plain.byteOffset, plain.byteLength).getUint32(0, true);
        const head = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + hl))), base = 4 + hl;
        for (const k of Object.keys(head.e)) {
          const e = head.e[k], raw = plain.subarray(base + e.o, base + e.o + e.l);
          STORE.files.set(k, e.z ? await gunzip(raw) : raw.slice());
        }
      } finally { STORE.busyN--; STORE.busyUntil = performance.now() + 1500; }
      PROG.delete(name);
      return true;
    })();
    STORE.packs[name] = p;
    p.catch(() => { if (STORE.packs[name] === p) delete STORE.packs[name]; PROG.delete(name); });
    return p;
  }

  // ---------------------------------------------------------------------------
  // L'AVATAR 3D (src/*.js de l'atelier) : fabrique évaluée à l'ouverture de la page ; require('three') = moteur, require('pg-env') = { env }
  // ---------------------------------------------------------------------------
  function PG_FACTORY(require) {
    const module = { exports: {} }, exports = module.exports;
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
      mod2
    ));
    var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

    // src/main.js
    var main_exports = {};
    __export(main_exports, {
      BRA_RECT: () => BRA_RECT,
      CHARS: () => CHARS,
      FIN_MS: () => FIN_MS,
      MAKEUP: () => MAKEUP,
      MAKEUP_DRAWN: () => MAKEUP_DRAWN,
      MAKEUP_ROWS: () => MAKEUP_ROWS,
      MOUTH_KEYS: () => MOUTH_KEYS,
      UT_HEM: () => UT_HEM,
      VIS: () => VIS,
      WORD_CAT: () => WORD_CAT,
      braCanvas: () => braCanvas,
      braShown: () => braShown,
      catsOf: () => catsOf,
      create: () => create,
      createGrowl: () => createGrowl,
      createLipSync: () => createLipSync,
      createMouth: () => createMouth,
      createTrigger: () => createTrigger,
      createWords: () => createWords,
      decode: () => decode,
      encode: () => encode,
      frenchVisemes: () => frenchVisemes,
      makeupCanvas: () => makeupCanvas,
      makeupCols: () => makeupCols,
      torsoCovered: () => torsoCovered,
      undershirtCols: () => undershirtCols,
      undershirtLongCanvas: () => undershirtLongCanvas,
      undershirtOff: () => undershirtOff,
      undershirtShown: () => undershirtShown
    });
    module.exports = __toCommonJS(main_exports);
    var T3 = __toESM(require("three"));
    var import_pg_env = require("pg-env");

    // src/avatar.js
    var T = __toESM(require("three"));

    // src/maquillage.js
    var MAKEUP = {
      "lips": { n: "Rouge à lèvres", g: "levres", bozo: true, d: [12], tint: [12, 15, 16, 17, 14, 13, 36, 37, 8, 31], r: "rare", p: 60 },
      "mq.gloss": { n: "Gloss qui brille", g: "levres", d: [17], tint: [17, 15, 14, 16, 38, 40], r: "commun", p: 60 },
      "mq.fard": { n: "Fard à paupières", g: "yeux", d: [38], tint: [38, 37, 17, 32, 34, 27, 40, 43, 9, 41], r: "commun", p: 60 },
      "liner": { n: "Eye-liner", g: "yeux", bozo: true, d: [5], tint: [5, 9, 30, 37, 29, 40], r: "rare", p: 60 },
      "mq.paillettes": { n: "Paillettes", g: "yeux", d: [40], tint: [40, 41, 17, 32, 38, 42], r: "rare", p: 120 },
      "blush": { n: "Joues roses", g: "joues", bozo: true, d: [15], tint: [15, 17, 14, 23, 16] },
      "freckles.light": { n: "Taches de rousseur", g: "joues", bozo: true, ex: "freckles", d: [47], tint: [47, 8, 9, 46] },
      "freckles.full": { n: "Plein de taches", g: "joues", bozo: true, ex: "freckles", d: [47], tint: [47, 8, 9, 46] },
      "mq.coeur": { n: "Cœur sur la joue", g: "peinture", d: [16], tint: [16, 12, 17, 37, 40, 32], r: "commun", p: 80 },
      "mq.etoiles": { n: "Étoiles", g: "peinture", d: [40], tint: [40, 41, 32, 17, 38, 20], r: "commun", p: 80 },
      "mq.arcenciel": { n: "Arc-en-ciel", g: "peinture", d: [12, 20, 31], tint: null, r: "rare", p: 120 },
      "mq.chat": { n: "Petit chat", g: "peinture", ex: "grand", d: [5, 17], tint: [5, 9, 30, 37], r: "rare", p: 150 },
      "mq.heros": { n: "Masque de héros", g: "peinture", ex: "grand", d: [12, 5], tint: [12, 30, 26, 37, 5, 18], r: "rare", p: 180 },
      "mq.papillon": { n: "Papillon", g: "peinture", ex: "grand", d: [31, 36, 52], tint: [31, 17, 37, 34, 18, 26], r: "legend", p: 220 },
      "mq.tigre": { n: "Tigre", g: "peinture", ex: "grand", d: [18, 5, 52], tint: [18, 20, 32, 17], r: "legend", p: 220 }
    };
    var MAKEUP_ROWS = [["levres", "Lèvres"], ["yeux", "Yeux"], ["joues", "Joues"], ["peinture", "Peintures de visage"]];
    var makeupDrawn = (id) => !!DRAW[id];
    function makeupCols(d, id) {
      const m = MAKEUP[id], c = d && d.fxc && Array.isArray(d.fxc[id]) ? d.fxc[id] : null;
      return m ? m.d.map((x, i) => c && Number.isInteger(c[i]) ? c[i] : x) : c || [];
    }
    var P = { eyeL: [182, 178], eyeR: [332, 178], eyeW: 48, eyeH: 22, lid: 150, brow: 128, lip: [257, 318], lipW: 46, nose: [258, 251], cheekL: [180, 252], cheekR: [334, 252], fore: [258, 78], chin: [258, 430] };
    var seed = 1;
    var rnd = () => {
      seed = seed * 16807 % 2147483647;
      return (seed - 1) / 2147483646;
    };
    function layers(size) {
      return [0, 1, 2].map(() => {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const x = c.getContext("2d");
        x.scale(size / 512, size / 512);
        x.fillStyle = "#fff";
        x.strokeStyle = "#fff";
        x.lineCap = "round";
        x.lineJoin = "round";
        return x;
      });
    }
    function merge(L, size) {
      const out = document.createElement("canvas");
      out.width = out.height = size;
      const o = out.getContext("2d"), img = o.createImageData(size, size), D = img.data;
      const A = L.map((x) => x.getImageData(0, 0, size, size).data);
      for (let i = 0; i < D.length; i += 4) {
        const a0 = A[0][i + 3] / 255, a1 = A[1][i + 3] / 255, a2 = A[2][i + 3] / 255;
        if (a0 + a1 + a2 <= 0) continue;
        const w2 = a2, w1 = a1 * (1 - a2), w0 = a0 * (1 - a1) * (1 - a2), aa = 1 - (1 - a0) * (1 - a1) * (1 - a2), ws = w0 + w1 + w2 || 1;
        D[i] = Math.round(255 * w0 / ws);
        D[i + 1] = Math.round(255 * w1 / ws);
        D[i + 2] = Math.round(255 * w2 / ws);
        D[i + 3] = Math.round(255 * aa);
      }
      o.putImageData(img, 0, 0);
      return out;
    }
    var both = (fn) => {
      fn(P.eyeL, -1);
      fn(P.eyeR, 1);
    };
    function soft(x, cx, cy, rx, ry, a, rot = 0, mid = 0.55) {
      x.save();
      x.translate(cx, cy);
      x.rotate(rot);
      x.scale(rx, ry);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(mid, `rgba(255,255,255,${a * 0.75})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.beginPath();
      x.arc(0, 0, 1, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    function star(x, cx, cy, r, n = 5, k = 0.45, rot = -Math.PI / 2) {
      x.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = rot + i * Math.PI / n, rr = i % 2 ? r * k : r;
        x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      x.closePath();
      x.fill();
    }
    function heart(x, cx, cy, s) {
      x.beginPath();
      x.moveTo(cx, cy + s * 0.9);
      x.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.75, cy - s * 1.15, cx, cy - s * 0.45);
      x.bezierCurveTo(cx + s * 0.75, cy - s * 1.15, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9);
      x.fill();
    }
    var holes = (xs, rx = 1.08, ry = 1.25) => {
      for (const x of xs) {
        x.save();
        x.globalCompositeOperation = "destination-out";
        x.globalAlpha = 1;
        both(([cx, cy]) => {
          x.beginPath();
          x.ellipse(cx, cy, P.eyeW * rx, P.eyeH * ry, 0, 0, Math.PI * 2);
          x.fill();
        });
        x.restore();
      }
    };
    var DRAW = {
      // gloss : couleur légère sur les lèvres + reflets clairs (couleur 2 = blanc)
      "mq.gloss"([a, b]) {
        const [cx, cy] = P.lip;
        soft(a, cx, cy - 4, P.lipW * 1.05, 20, 0.75, 0, 0.7);
        soft(a, cx, cy + 9, P.lipW * 0.9, 15, 0.6, 0, 0.7);
        soft(b, cx + 8, cy + 12, 16, 4.5, 0.85);
        soft(b, cx - 14, cy - 10, 9, 3, 0.6);
      },
      // fard : sur toute la paupière (du bord des cils au sourcil), plus fort près des cils, qui s'étire vers la tempe
      "mq.fard"([a]) {
        both(([cx], s) => {
          soft(a, cx + s * 4, P.lid, P.eyeW * 1.18, 30, 1, s * 0.06, 0.75);
          soft(a, cx + s * 40, P.lid + 4, 30, 20, 0.85, s * 0.4, 0.7);
        });
        holes([a], 0.95, 1);
      },
      // paillettes : étincelles sur les paupières et le haut des joues (pommettes)
      "mq.paillettes"([a]) {
        seed = 7;
        both(([cx], s) => {
          for (let i = 0; i < 70; i++) {
            const lid = rnd() < 0.55, u = rnd(), x0 = cx + s * (lid ? -46 + u * 100 : -10 + u * 70), y0 = lid ? P.lid - 8 + rnd() * 22 : 200 + rnd() * 34;
            a.globalAlpha = 0.6 + rnd() * 0.4;
            a.beginPath();
            a.arc(x0, y0, 1.2 + rnd() * 1.8, 0, Math.PI * 2);
            a.fill();
          }
          a.globalAlpha = 1;
          for (let i = 0; i < 6; i++) {
            const lid = i < 3;
            star(a, cx + s * (lid ? -24 + rnd() * 70 : 4 + rnd() * 50), lid ? P.lid - 4 + rnd() * 12 : 206 + rnd() * 24, 4.5 + rnd() * 3, 4, 0.28, rnd());
          }
        });
        holes([a], 0.95, 1);
      },
      "mq.coeur"([a]) {
        const [cx, cy] = P.cheekR;
        a.globalAlpha = 0.97;
        heart(a, cx + 6, cy + 6, 23);
      },
      "mq.etoiles"([a]) {
        a.globalAlpha = 0.97;
        const [ex, ey] = P.eyeR;
        star(a, ex + 60, ey + 20, 17);
        star(a, ex + 36, ey + 54, 11);
        star(a, ex + 70, ey - 18, 10);
      },
      // arc-en-ciel sur la joue : 3 bandes (rouge, jaune, bleu par défaut)
      "mq.arcenciel"(L) {
        const [cx, cy] = P.cheekL;
        [[0, 34], [1, 26], [2, 18]].forEach(([k, r]) => {
          const x = L[k];
          x.globalAlpha = 0.97;
          x.lineWidth = 8.5;
          x.beginPath();
          x.arc(cx - 6, cy + 26, r, Math.PI * 1.06, Math.PI * 1.94);
          x.stroke();
        });
      },
      // petit chat : bout du nez (couleur 1) avec un cœur rose (couleur 2), moustaches et petite bouche de chat
      "mq.chat"([a, b]) {
        const [nx, ny] = P.nose;
        a.globalAlpha = 0.97;
        a.beginPath();
        a.ellipse(nx, ny + 1, 17, 11, 0, 0, Math.PI * 2);
        a.fill();
        b.globalAlpha = 0.95;
        heart(b, nx, ny, 7);
        a.lineWidth = 3;
        for (const s of [-1, 1]) for (const dy of [-10, 0, 10]) {
          a.beginPath();
          a.moveTo(nx + s * 40, ny + 26 + dy * 0.5);
          a.quadraticCurveTo(nx + s * 72, ny + 20 + dy, nx + s * 104, ny + 16 + dy * 2.2);
          a.stroke();
        }
        a.lineWidth = 3.5;
        a.beginPath();
        a.moveTo(nx, ny + 12);
        a.lineTo(nx, ny + 40);
        a.stroke();
      },
      // masque de héros (loup) d'une tempe à l'autre en passant sur le nez, trous des yeux, liseré (couleur 2)
      "mq.heros"([a, b]) {
        const path = (x) => {
          const [lx, ly] = P.eyeL, [rx, ry] = P.eyeR, n = P.nose[0];
          x.beginPath();
          x.moveTo(n, ly - 30);
          x.bezierCurveTo(n - 30, ly - 58, lx - 40, ly - 70, lx - 78, ly - 52);
          x.bezierCurveTo(lx - 100, ly - 34, lx - 92, ly + 26, lx - 66, ly + 42);
          x.bezierCurveTo(lx - 40, ly + 58, lx + 22, ly + 52, n - 22, ly + 30);
          x.bezierCurveTo(n - 10, ly + 22, n - 6, ly + 18, n, ly + 18);
          x.bezierCurveTo(n + 6, ry + 18, n + 10, ry + 22, n + 22, ry + 30);
          x.bezierCurveTo(rx - 22, ry + 52, rx + 40, ry + 58, rx + 66, ry + 40);
          x.bezierCurveTo(rx + 92, ry + 26, rx + 100, ry - 34, rx + 78, ry - 52);
          x.bezierCurveTo(rx + 40, ry - 70, n + 30, ry - 58, n, ry - 30);
          x.closePath();
        };
        a.globalAlpha = 1;
        path(a);
        a.fill();
        b.globalAlpha = 1;
        b.lineWidth = 5;
        path(b);
        b.stroke();
        holes([a, b], 1.12, 1.45);
        b.lineWidth = 4;
        both(([cx, cy]) => {
          b.beginPath();
          b.ellipse(cx, cy, P.eyeW * 1.12 + 2, P.eyeH * 1.45 + 2, 0, 0, Math.PI * 2);
          b.stroke();
        });
      },
      // papillon : de chaque côté une grande aile (paupière → tempe → front) et une petite sur la joue, contour et nervures (couleur 2),
      // points blancs (couleur 3), corps le long du nez avec deux antennes
      "mq.papillon"([a, b, c]) {
        const wings = (x, k) => both(([ex, ey], s) => {
          x.beginPath();
          x.ellipse(ex + s * 26, ey - 40, 66 + k, 46 + k, s * -0.42, 0, Math.PI * 2);
          x.fill();
          x.beginPath();
          x.ellipse(ex + s * 28, ey + 46, 44 + k, 32 + k, s * 0.5, 0, Math.PI * 2);
          x.fill();
        });
        a.globalAlpha = 0.95;
        wings(a, 0);
        b.globalAlpha = 1;
        b.lineWidth = 5;
        both(([ex, ey], s) => {
          b.beginPath();
          b.ellipse(ex + s * 26, ey - 40, 66, 46, s * -0.42, 0, Math.PI * 2);
          b.stroke();
          b.beginPath();
          b.ellipse(ex + s * 28, ey + 46, 44, 32, s * 0.5, 0, Math.PI * 2);
          b.stroke();
          b.lineWidth = 3;
          b.beginPath();
          b.moveTo(P.nose[0] + s * 6, ey - 10);
          b.quadraticCurveTo(ex + s * 20, ey - 60, ex + s * 78, ey - 66);
          b.stroke();
          b.beginPath();
          b.moveTo(P.nose[0] + s * 6, ey + 14);
          b.quadraticCurveTo(ex + s * 24, ey + 48, ex + s * 56, ey + 62);
          b.stroke();
          b.lineWidth = 5;
        });
        c.globalAlpha = 1;
        both(([ex, ey], s) => {
          for (const [dx, dy, r] of [[56, -62, 8], [76, -36, 6], [30, -74, 5], [44, 58, 6.5], [60, 38, 4.5]]) {
            c.beginPath();
            c.arc(ex + s * dx, ey + dy, r, 0, Math.PI * 2);
            c.fill();
          }
        });
        holes([a, b, c], 1.04, 1.2);
        b.beginPath();
        b.ellipse(P.nose[0], P.eyeL[1] - 2, 9, 48, 0, 0, Math.PI * 2);
        b.fill();
        b.lineWidth = 3.5;
        for (const s of [-1, 1]) {
          b.beginPath();
          b.moveTo(P.nose[0], P.eyeL[1] - 44);
          b.quadraticCurveTo(P.nose[0] + s * 10, P.eyeL[1] - 82, P.nose[0] + s * 26, P.eyeL[1] - 96);
          b.stroke();
          b.beginPath();
          b.arc(P.nose[0] + s * 27, P.eyeL[1] - 97, 4.5, 0, Math.PI * 2);
          b.fill();
        }
      },
      // tigre : orange (couleur 1) sur le front, les tempes et les joues, blanc (couleur 3) au-dessus des yeux et autour de la bouche,
      // rayures noires (couleur 2) et bout du nez noir
      "mq.tigre"([a, b, c]) {
        a.globalAlpha = 0.95;
        soft(a, P.fore[0], P.fore[1] + 30, 160, 96, 1, 0, 0.7);
        both(([ex, ey], s) => {
          soft(a, ex + s * 20, ey + 92, 92, 110, 1, 0, 0.6);
          soft(a, ex + s * 50, ey - 6, 62, 86, 1, 0, 0.7);
        });
        c.globalAlpha = 1;
        const [lx, ly] = P.lip;
        for (const s of [-1, 1]) soft(c, lx + s * 25, ly - 28, 36, 24, 1, 0, 0.85);
        soft(c, lx, ly + 36, 46, 30, 1, 0, 0.8);
        both(([ex], s) => soft(c, ex - s * 4, P.brow + 6, 46, 13, 0.95, s * 0.12, 0.8));
        holes([a, c], 1, 1.15);
        b.globalAlpha = 1;
        const stripe = (x0, y0, x1, y1, w) => {
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1;
          b.beginPath();
          b.moveTo(x0, y0);
          b.quadraticCurveTo(mx + nx / l * w, my + ny / l * w, x1, y1);
          b.quadraticCurveTo(mx - nx / l * w * 0.25, my - ny / l * w * 0.25, x0, y0);
          b.fill();
        };
        stripe(P.fore[0], 34, P.fore[0] - 3, 108, 12);
        stripe(P.fore[0] - 46, 44, P.fore[0] - 28, 100, 10);
        stripe(P.fore[0] + 46, 44, P.fore[0] + 28, 100, 10);
        for (const s of [-1, 1]) {
          const e = P.nose[0] + s * 142;
          for (const [y, l] of [[232, 56], [262, 64], [292, 50]]) stripe(e, y - 10, e - s * l, y + 4, 9);
          stripe(e - s * 4, 186, e - s * 40, 196, 8);
        }
        b.beginPath();
        b.ellipse(P.nose[0], P.nose[1], 16, 11, 0, 0, Math.PI * 2);
        b.fill();
        b.lineWidth = 4.5;
        b.beginPath();
        b.moveTo(P.nose[0], P.nose[1] + 8);
        b.lineTo(P.nose[0], P.lip[1] - 16);
        b.stroke();
      }
    };
    var CACHE = /* @__PURE__ */ new Map();
    function makeupCanvas(id, size = 512) {
      const k = id + "@" + size;
      if (CACHE.has(k)) return CACHE.get(k);
      const fn = DRAW[id];
      if (!fn) return null;
      const L = layers(size);
      fn(L);
      const cv = merge(L, size);
      CACHE.set(k, cv);
      return cv;
    }
    var MAKEUP_DRAWN = Object.keys(DRAW);

    // src/maillot.js
    var UT_HEM = 828;
    var UT_DEFAULT = ["#ece6da", "#d8d0c2", "#ffffff"];
    function torsoCovered(d) {
      const it = d && d.it || {};
      return !!(it.top && it.top[0] || it.ovr && it.ovr[0] && it.ovr[0] !== "ovr.overall");
    }
    var undershirtOff = (d) => !!d && Array.isArray(d.ut) && d.ut[0] === "";
    var undershirtShown = (d) => !undershirtOff(d) || !torsoCovered(d);
    var braShown = (d) => !undershirtShown(d) && !!d && d.g !== "m";
    function undershirtCols(d) {
      const ut = d && Array.isArray(d.ut) ? d.ut : null;
      if (!ut) return null;
      if (ut[1] == null) return ut[0] === "" ? null : [1, 1];
      return [ut[1], ut[2] == null ? ut[1] : ut[2]];
    }
    function undershirtLongCanvas(img, tex, doc = typeof document !== "undefined" ? document : null) {
      const cv = doc.createElement("canvas");
      cv.width = tex.w;
      cv.height = tex.h;
      const x = cv.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      const [sx, sy, w, h, , dy] = tex.r[0];
      const hem = Math.min(h - 2, UT_HEM - dy);
      const id = x.getImageData(sx, sy, w, h), p = id.data;
      for (let c = 0; c < w; c++) {
        let yb = -1;
        for (let y = h - 1; y >= 0; y--) if (p[(y * w + c) * 4 + 3] > 128) {
          yb = y;
          break;
        }
        if (yb < h * 0.7 || yb >= hem) continue;
        let R = 0, G = 0, B = 0, n = 0;
        for (let y = Math.max(0, yb - 44); y < yb - 24; y++) {
          const o = (y * w + c) * 4;
          if (p[o + 3] < 250) continue;
          R += p[o];
          G += p[o + 1];
          B += p[o + 2];
          n++;
        }
        if (!n) continue;
        R /= n;
        G /= n;
        B /= n;
        const y0 = Math.max(0, yb - 16);
        for (let y = y0; y <= hem + 1 && y < h; y++) {
          const o = (y * w + c) * 4, k = Math.min(1, (y - y0) / 8);
          const sh = y >= hem - 3 ? 0.9 : 1;
          p[o] = Math.round((p[o] * (1 - k) + R * k) * sh);
          p[o + 1] = Math.round((p[o + 1] * (1 - k) + G * k) * sh);
          p[o + 2] = Math.round((p[o + 2] * (1 - k) + B * k) * sh);
          p[o + 3] = y < hem ? 255 : y === hem ? 170 : 70;
        }
      }
      x.putImageData(id, sx, sy);
      return cv;
    }
    var BRA_RECT = [0, 512, 448, 256];
    var CUPS = [157, 235];
    var CUP_R = 46;
    var CUP_TOP = 34;
    var BAND_TOP = 650;
    var BAND_BOT = 686;
    var BRA_W = 390;
    function braTop(x) {
      let y = BAND_TOP;
      for (const cx of CUPS) {
        const u = (x - cx) / CUP_R;
        if (Math.abs(u) < 1) y = Math.min(y, BAND_TOP - 2 - CUP_TOP * Math.sqrt(1 - u * u));
      }
      return y;
    }
    function braCanvas(doc = typeof document !== "undefined" ? document : null) {
      const [ax, ay, w, h] = BRA_RECT, cv = doc.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const x = cv.getContext("2d"), id = x.createImageData(w, h), p = id.data;
      const cl = (v) => Math.max(0, Math.min(1, v));
      for (let c = 0; c < w; c++) {
        const X = ax + c + 0.5;
        if (X > BRA_W + 1) continue;
        const top = braTop(X), bot = BAND_BOT + 2 * Math.cos((X - 196) / 196 * Math.PI);
        const side = cl(BRA_W + 1 - X) * cl(X + 1);
        for (let r = 0; r < h; r++) {
          const Y = ay + r + 0.5, cov = cl(Y - top + 0.5) * cl(bot - Y + 0.5) * side;
          if (cov <= 0) continue;
          let shade = 0.86;
          for (const cx of CUPS) {
            const dx = (X - cx) / CUP_R, dyy = (Y - (BAND_TOP - 16)) / 26;
            const q = 1 - dx * dx - dyy * dyy;
            if (q > 0) shade = Math.max(shade, 0.86 + 0.14 * q);
          }
          const trim = Y - top < 3.5 || bot - Y < 3.5 ? 1 : 0;
          const o = (r * w + c) * 4;
          p[o] = trim ? 0 : Math.round(255 * shade);
          p[o + 1] = trim ? Math.round(255 * shade) : 0;
          p[o + 2] = 0;
          p[o + 3] = Math.round(255 * cov);
        }
      }
      x.putImageData(id, 0, 0);
      return cv;
    }

    // src/avatar.js
    var PIECES = ["neck", "chest", "back", "shoulders", "upperarms", "lowerarms", "wrists", "hands", "waist", "hips", "upperlegs", "lowerlegs", "ankles", "feet"];
    var COVER = {
      CoverNeck: "neck",
      CoverChest: "chest",
      CoverBack: "back",
      CoverShoulders: "shoulders",
      CoverUpperArms: "upperarms",
      CoverLowerArms: "lowerarms",
      CoverWrist: "wrists",
      CoverWrists: "wrists",
      CoverHands: "hands",
      CoverStomach: "waist",
      CoverWaist: "waist",
      CoverHips: "hips",
      CoverUpperLegs: "upperlegs",
      CoverLowerLegs: "lowerlegs",
      CoverAnkles: "ankles",
      CoverFeet: "feet"
    };
    var SLOTS = ["hb", "hf", "beard", "top", "bot", "ovr", "feet", "glov", "hat", "hacc", "glass", "cam"];
    var FACES = [
      { id: "doux", name: "Doux", tex: "basic", s: {} },
      { id: "rieur", name: "Rieur", tex: "basic", s: { EyesOuterCornersHigh: 0.7, MouthWide: 0.35, RaiseBrows: 0.3 } },
      { id: "reveur", name: "Rêveur", tex: "basic", s: { EyesOuterCornersLow: 0.65, EyesSquare: 0.2, LowerBrows: 0.25 } },
      { id: "malin", name: "Malin", tex: "sharp", s: { Sharpness: 0.85, NoseTiltUp: 0.45, EyesOuterCornersHigh: 0.35 } },
      { id: "costaud", name: "Costaud", tex: "sharp", s: { Squareness: 0.85, NoseWidth: 0.55, MouthThin: 0.3 } },
      { id: "sage", name: "Sage", tex: "stern", s: { Stern: 0.85, Squareness: 0.35, LowerBrows: 0.3 } }
    ];
    var EXPR = {
      neutre: {},
      sourire: { Mouth_Happy: 0.52, Mouth_Wide: 0.8, Mouth_Oh: 0.63, Brows_Raised: 0.29, Brows_Sad: 0.06, Eyes_LowerClosed: 0.06 },
      content: {
        Eyes_LowerClosed: 0.125,
        Mouth_Happy: 1,
        Jaw_Open: 0.34,
        Mouth_Wide: 1,
        Eyes_UpperOpen: 0.6,
        Eyes_LowerOpen: 0.16,
        Mouth_Oh: 0.43,
        Brows_Raised: 0.66,
        Brows_Sad: 0.11,
        Mouth_Pucker: 0.51,
        Mouth_Grimace: 0.34
      },
      surpris: { Brows_Sad: 0.34, Brows_Raised: 1, Eyes_UpperOpen: 1, Eyes_LowerOpen: 0.97, Jaw_Open: 0.46, Mouth_Oh: 0.69 },
      triste: { Brows_Sad: 1, Mouth_Sad: 0.42, Brows_Lowered: 1, Eyes_UpperClosed: 0.13, Eyes_LowerClosed: 0.1, Mouth_Oh: 0.33, Mouth_Press: 0.33 },
      fache: { Brow_Angry: 0.5, Brows_Lowered: 1, Mouth_Sad: 0.42, Eyes_LowerClosed: 0.09 },
      malicieux: { Eyes_LowerClosed: 0.19, Mouth_Wide: 0.9, Mouth_Oh: 0.43, Mouth_Happy: 0.59, Brows_Sad: 0.17, Brow_Angry: 0.71, Mouth_Press: 0.3 }
    };
    var EXPR_OUI = { Mouth_Happy: 0.75, Mouth_Wide: 0.55, Brows_Raised: 0.45, Eyes_LowerClosed: 0.18 };
    var EXPR_NON = { Brows_Lowered: 0.7, Brow_Angry: 0.18, Mouth_Sad: 0.45, Mouth_Press: 0.4 };
    var EXPR_RIRE = { Eyes_LowerClosed: 0.9, Eyes_UpperClosed: 0.42, Mouth_Happy: 1, Mouth_Wide: 0.8, Jaw_Open: 0.3, Mouth_Oh: 0.12, Brows_Raised: 0.42, Brows_Sad: 0.3 };
    var EXPR_GRR = { Brow_Angry: 1, Brows_Lowered: 1, Mouth_Grimace: 1.1, Mouth_Wide: 0.45, Jaw_Open: 0.16, Eyes_LowerClosed: 0.35, Mouth_Sad: 0.2 };
    var EXPR_FACHE = { Brow_Angry: 0.8, Brows_Lowered: 1, Brows_Sad: 0.12, Mouth_Sad: 1, Mouth_Press: 0.65, Mouth_Oh: 0.12, Eyes_UpperClosed: 0.18 };
    var EXPR_67 = { Mouth_Happy: 0.6, Mouth_Wide: 0.4, Brows_Raised: 0.5, Eyes_LowerClosed: 0.15 };
    var EXPR_KEYS = [
      "Brow_Angry",
      "Brows_Lowered",
      "Brows_Sad",
      "Brows_Raised",
      "Eyes_UpperClosed",
      "Eyes_LowerClosed",
      "Eyes_UpperOpen",
      "Eyes_LowerOpen",
      "Mouth_Sad",
      "Mouth_Wide",
      "Mouth_Oh",
      "Mouth_Happy",
      "Mouth_Press",
      "Mouth_Grimace",
      "Mouth_Pucker",
      "Jaw_Open"
    ];
    var HAIR_PIVOT = { hb: 1.6, hf: 1.6 };
    var HAIR_PUSH = 0.16;
    var BODY_MORPHS = ["BodyType", "Chest", "Weight", "NeckThickness", "Squareness", "Sharpness", "Stern", "Hat"];
    var SKIN_SHADE_NATURAL = 9;
    var CAM_RECT = [1024, 1024, 512, 512];
    var _m = new T.Matrix4();
    var _v = new T.Vector3();
    var _q = new T.Quaternion();
    var _q2 = new T.Quaternion();
    var col = (hex) => new T.Color(hex);
    var Composer = class {
      constructor(renderer) {
        this.r = renderer;
        this.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.scene = new T.Scene();
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]), 3));
        g.setIndex([0, 1, 2, 2, 1, 3]);
        this.uni = {
          uMask: { value: null },
          uId: { value: null },
          uHasId: { value: 0 },
          uC: { value: Array.from({ length: 9 }, () => new T.Color()) },
          uDst: { value: new T.Vector4() },
          uSrc: { value: new T.Vector4() },
          uOpacity: { value: 1 },
          uMode: { value: 0 },
          uNorm: { value: null }
        };
        this.mat = new T.ShaderMaterial({
          uniforms: this.uni,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          blending: T.CustomBlending,
          blendSrc: T.SrcAlphaFactor,
          blendDst: T.OneMinusSrcAlphaFactor,
          blendSrcAlpha: T.OneFactor,
          blendDstAlpha: T.OneMinusSrcAlphaFactor,
          vertexShader: `uniform vec4 uDst; uniform vec4 uSrc; varying vec2 vS; void main(){ vec2 p = mix(uDst.xy, uDst.zw, position.xy); vS = mix(uSrc.xy, uSrc.zw, position.xy); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`,
          fragmentShader: `uniform sampler2D uMask; uniform sampler2D uId; uniform sampler2D uNorm; uniform float uHasId; uniform vec3 uC[9]; uniform float uOpacity; uniform int uMode; varying vec2 vS;
            void main(){ vec4 m = texture2D(uMask, vS);
              if (uMode == 1) { vec3 n = texture2D(uNorm, vS).rgb; gl_FragColor = vec4(n, m.a * uOpacity); return; }
              vec3 c = m.r * uC[0] + m.g * uC[1] + m.b * uC[2];
              if (uHasId > 0.5) { vec4 id = texture2D(uId, vS);
                vec3 c4 = m.r * uC[3] + m.g * uC[4] + m.b * uC[5]; vec3 c7 = m.r * uC[6] + m.g * uC[7] + m.b * uC[8];
                c = mix(mix(c, c4, id.g), c7, id.b); }
              gl_FragColor = vec4(c, m.a * uOpacity); }`
        });
        this.quad = new T.Mesh(g, this.mat);
        this.quad.frustumCulled = false;
        this.scene.add(this.quad);
      }
      // layers : [{ t: {w,h,r,...}, mask: Texture, id: Texture|null, n: Texture|null, c: [Color x9], o: opacité }]
      compose(rt, layers2, size, normal = false, clear = 10119765) {
        const r = this.r, prevTarget = r.getRenderTarget(), prevAuto = r.autoClear, prevClear = r.getClearColor(new T.Color()), prevA = r.getClearAlpha();
        r.setRenderTarget(rt);
        r.autoClear = false;
        r.setClearColor(normal ? 8421631 : clear, normal ? 1 : 0);
        r.clear(true, false, false);
        const S = 2048, u = this.uni;
        for (const L of layers2) {
          if (!L.mask || normal && !L.n) continue;
          u.uMask.value = L.mask;
          u.uId.value = L.id || L.mask;
          u.uHasId.value = L.id ? 1 : 0;
          u.uOpacity.value = L.o == null ? 1 : L.o;
          u.uMode.value = normal ? 1 : 0;
          u.uNorm.value = L.n || L.mask;
          for (let i = 0; i < 9; i++) u.uC.value[i].copy(L.c[i] || L.c[0]);
          for (const [sx, sy, w, h, dx, dy] of L.t.r) {
            u.uDst.value.set(dx / S, dy / S, (dx + w) / S, (dy + h) / S);
            u.uSrc.value.set(sx / L.t.w, sy / L.t.h, (sx + w) / L.t.w, (sy + h) / L.t.h);
            r.render(this.scene, this.cam);
          }
        }
        r.setRenderTarget(prevTarget);
        r.autoClear = prevAuto;
        r.setClearColor(prevClear, prevA);
      }
    };
    var Wardrobe = class {
      constructor(renderer, root = "data/", io = null) {
        this.r = renderer;
        this.root = root;
        this.io = io;
        this.parts = /* @__PURE__ */ new Map();
        this.texs = /* @__PURE__ */ new Map();
        this.bytes = 0;
        this.urls = /* @__PURE__ */ new Set();
        this.composer = new Composer(renderer);
      }
      async init() {
        const cb = await this.io.bytes(this.root + "catalog.json");
        this.cat = JSON.parse(new TextDecoder().decode(cb));
        this._count(this.root + "catalog.json", cb.byteLength);
        this.items = new Map(this.cat.items.map((i) => [i.id, i]));
        this.layers = this.cat.layers;
        for (const l of Object.values(this.cat.looks || {})) if (!("so" in l)) l.so = null;
        this.pal = this.cat.palette.map(([n, h]) => ({ n, h, c: col(h) }));
        this.loader = new T.GLTFLoader();
        this.loader.setMeshoptDecoder(T.MeshoptDecoder);
        const [body, head] = await Promise.all([this._loadGltf("body", this.cat.base.body.glb), this._loadGltf("head", this.cat.base.head.glb)]);
        let sm2;
        body.scene.traverse((o) => {
          if (o.isSkinnedMesh) sm2 = o;
        });
        let top = sm2.skeleton.bones[0];
        while (top.parent && top.parent.isBone) top = top.parent;
        this.tplArm = top.parent;
        this.tplArm.updateMatrixWorld(true);
        this.restWorld = /* @__PURE__ */ new Map();
        this.masterIBM = /* @__PURE__ */ new Map();
        this.tplArm.traverse((o) => {
          if (o.isBone) {
            this.restWorld.set(o.name, o.matrixWorld.clone());
            this.masterIBM.set(o.name, o.matrixWorld.clone().invert());
          }
        });
        this.parts.set("body", this._partData("body", body));
        this.parts.set("head", this._partData("head", head));
        this.parts.set("cam", makeCameraPart(this));
        return this;
      }
      _count(url, n) {
        if (!this.urls.has(url)) {
          this.urls.add(url);
          this.bytes += n;
        }
      }
      async _loadGltf(id, url) {
        const full = this.root + url;
        const u8 = await this.io.bytes(full);
        const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
        this._count(full, buf.byteLength);
        return await this.loader.parseAsync(buf, this.root);
      }
      async part(id) {
        if (this.parts.has(id)) return this.parts.get(id);
        if (!this._pp) this._pp = /* @__PURE__ */ new Map();
        if (!this._pp.has(id)) this._pp.set(id, (async () => {
          const it = this.items.get(id);
          const g = await this._loadGltf(id, it.glb);
          const p = this._partData(id, g);
          this.parts.set(id, p);
          return p;
        })());
        return this._pp.get(id);
      }
      // géométrie d'une pièce ramenée dans l'espace « de liaison » du squelette maître
      _partData(id, gltf) {
        let sm2;
        gltf.scene.traverse((o) => {
          if (o.isSkinnedMesh) sm2 = o;
        });
        gltf.scene.updateMatrixWorld(true);
        const g = sm2.geometry, sk = sm2.skeleton, names = sk.bones.map((b) => b.name);
        let j0 = names.findIndex((n2) => this.masterIBM.has(n2) && n2 !== "root");
        if (j0 < 0) j0 = 0;
        const K = this.masterIBM.get(names[j0]).clone().invert().multiply(sk.boneInverses[j0]).multiply(sm2.bindMatrix);
        const Kinv = K.clone().invert(), Kn = new T.Matrix3().getNormalMatrix(K), Kl = new T.Matrix3().setFromMatrix4(K);
        const n = g.attributes.position.count, P2 = g.attributes.position, N2 = g.attributes.normal, UV = g.attributes.uv;
        const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
        for (let i = 0; i < n; i++) {
          _v.fromBufferAttribute(P2, i).applyMatrix4(K);
          pos[i * 3] = _v.x;
          pos[i * 3 + 1] = _v.y;
          pos[i * 3 + 2] = _v.z;
          _v.fromBufferAttribute(N2, i).applyMatrix3(Kn).normalize();
          nrm[i * 3] = _v.x;
          nrm[i * 3 + 1] = _v.y;
          nrm[i * 3 + 2] = _v.z;
          uv[i * 2] = UV.getX(i);
          uv[i * 2 + 1] = UV.getY(i);
        }
        const SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
        const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
        const bonesUsed = /* @__PURE__ */ new Set();
        for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
          si[i * 4 + k] = SI.getComponent(i, k);
          sw[i * 4 + k] = SW.getComponent(i, k);
          if (sw[i * 4 + k] > 0) bonesUsed.add(si[i * 4 + k]);
        }
        const extra = [];
        sk.bones.forEach((b, i) => {
          if (this.masterIBM.has(b.name)) return;
          extra.push({ name: b.name, parent: b.parent && b.parent.isBone ? b.parent.name : null, local: b.matrix.clone(), ibm: sk.boneInverses[i].clone().multiply(sm2.bindMatrix).multiply(Kinv) });
        });
        const morph = {};
        const dict = sm2.morphTargetDictionary || {};
        const MA = g.morphAttributes.position || [];
        for (const [name, k] of Object.entries(dict)) {
          const A = MA[k], d = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) {
            _v.fromBufferAttribute(A, i);
            if (!g.morphTargetsRelative) _v.sub(new T.Vector3().fromBufferAttribute(P2, i));
            _v.applyMatrix3(Kl);
            d[i * 3] = _v.x;
            d[i * 3 + 1] = _v.y;
            d[i * 3 + 2] = _v.z;
          }
          morph[name.replace(/^X_/, "")] = d;
        }
        const index = g.index ? Uint32Array.from(g.index.array) : Uint32Array.from({ length: n }, (_, i) => i);
        let piece = null;
        if (id === "body" && g.attributes.color) {
          const C = g.attributes.color;
          piece = new Uint8Array(n);
          for (let i = 0; i < n; i++) piece[i] = Math.floor(C.getX(i) * 255 / 16 + 1e-3);
        }
        g.dispose();
        return { id, n, pos, nrm, uv, si, sw, joints: names, extra, morph, index, piece };
      }
      async tex(url, kind = "d") {
        if (!url) return null;
        if (this.texs.has(url)) return this.texs.get(url);
        const p = (async () => {
          const full = this.root + url;
          const u8 = await this.io.bytes(full);
          const blob = new Blob([u8], { type: "image/webp" });
          this._count(full, blob.size);
          let img;
          try {
            img = await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
          } catch (e) {
            img = await new Promise((ok, ko) => {
              const im = new Image();
              im.onload = () => ok(im);
              im.onerror = ko;
              im.src = URL.createObjectURL(blob);
            });
          }
          const t = new T.Texture(img);
          t.flipY = false;
          t.generateMipmaps = true;
          t.minFilter = T.LinearMipmapLinearFilter;
          t.magFilter = T.LinearFilter;
          t.colorSpace = kind === "n" ? T.NoColorSpace : T.SRGBColorSpace;
          t.anisotropy = 1;
          t.needsUpdate = true;
          return t;
        })();
        this.texs.set(url, p);
        return p;
      }
      color(id) {
        const p = this.pal[id] || this.pal[0];
        return p.c;
      }
    };
    function makeCameraPart(W) {
      const rest = (n) => new T.Vector3().setFromMatrixPosition(W.restWorld.get(n));
      const s3 = rest("spine_03"), s4 = rest("spine_04"), s5 = rest("spine_05"), nk = rest("neck_01"), cl = rest("clavicle_l"), cr = rest("clavicle_r");
      const up = new T.Vector3(0, 1, 0), fwd = new T.Vector3(0, 0, 1);
      const parts = [];
      const center = new T.Vector3(0, s3.y + 0.02, 0).addScaledVector(fwd, 0.215);
      const add = (geo, rect, bone, m) => {
        if (m) geo.applyMatrix4(m);
        parts.push({ geo: geo.toNonIndexed(), rect, bone });
      };
      const M = (x, y, z, rx = 0, ry = 0, rz = 0) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(1, 1, 1));
      const c = center;
      const body = new T.BoxGeometry(0.118, 0.07, 0.05, 6, 4, 3);
      roundBox(body, 0.012);
      add(body, [0.02, 0.02, 0.48, 0.48], "spine_04", M(c.x, c.y, c.z));
      const topPlate = new T.BoxGeometry(0.12, 0.016, 0.052, 6, 1, 3);
      roundBox(topPlate, 6e-3);
      add(topPlate, [0.52, 0.02, 0.98, 0.22], "spine_04", M(c.x, c.y + 0.041, c.z));
      const z0 = c.z + 0.025;
      add(new T.CylinderGeometry(0.026, 0.028, 0.012, 28, 1), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x, c.y - 2e-3, z0 + 6e-3, Math.PI / 2));
      add(new T.CylinderGeometry(0.022, 0.024, 0.026, 28, 2), [0.02, 0.52, 0.48, 0.72], "spine_04", M(c.x, c.y - 2e-3, z0 + 0.025, Math.PI / 2));
      add(new T.CylinderGeometry(0.0235, 0.0235, 6e-3, 28, 1), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x, c.y - 2e-3, z0 + 0.04, Math.PI / 2));
      add(new T.CircleGeometry(0.019, 28), [0.52, 0.52, 0.98, 0.98], "spine_04", M(c.x, c.y - 2e-3, z0 + 0.0435));
      add(new T.BoxGeometry(0.03, 0.02, 0.03), [0.52, 0.02, 0.98, 0.22], "spine_04", M(c.x - 0.03, c.y + 0.056, c.z));
      add(new T.CylinderGeometry(9e-3, 9e-3, 8e-3, 18), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x + 0.038, c.y + 0.053, c.z + 8e-3));
      add(new T.CylinderGeometry(6e-3, 6e-3, 6e-3, 14), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x + 0.02, c.y + 0.052, c.z + 0.012));
      add(new T.CircleGeometry(8e-3, 18), [0.52, 0.52, 0.98, 0.98], "spine_04", M(c.x - 0.03, c.y + 0.056, c.z + 0.0151));
      for (const sx of [-1, 1]) add(new T.TorusGeometry(7e-3, 18e-4, 6, 14), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x + sx * 0.061, c.y + 0.03, c.z, 0, Math.PI / 2));
      const strapPts = (sx) => [
        new T.Vector3(c.x + sx * 0.061, c.y + 0.03, c.z),
        new T.Vector3(sx * 0.075, c.y + 0.11, c.z - 0.035),
        new T.Vector3(sx * 0.082, s5.y - 0.02, s5.z + 0.12),
        new T.Vector3(sx * 0.085, nk.y - 0.025, nk.z + 0.06),
        new T.Vector3(sx * 0.072, nk.y + 0, nk.z - 5e-3),
        new T.Vector3(sx * 0.04, nk.y + 5e-3, nk.z - 0.06),
        new T.Vector3(0, nk.y + 5e-3, nk.z - 0.075)
      ];
      const pts = [...strapPts(-1)].concat(strapPts(1).reverse().slice(1));
      const curve = new T.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
      const tube = new T.TubeGeometry(curve, 90, 75e-4, 6, false);
      {
        const p = tube.attributes.position;
        const fr = curve.computeFrenetFrames(90, false);
        for (let i = 0; i < p.count; i++) {
          const seg = Math.floor(i / 7);
          const t = Math.min(90, seg);
          const ctr = curve.getPointAt(t / 90);
          _v.fromBufferAttribute(p, i).sub(ctr);
          const dir = new T.Vector3(ctr.x, 0, ctr.z - s4.z).normalize();
          const along = _v.dot(dir);
          _v.addScaledVector(dir, -along * 0.65);
          _v.add(ctr);
          p.setXYZ(i, _v.x, _v.y, _v.z);
        }
      }
      add(tube, [0.02, 0.76, 0.48, 0.98], "strap", null);
      const [ax, ay, aw, ah] = CAM_RECT, S = 2048;
      let total = 0;
      for (const p of parts) total += p.geo.attributes.position.count;
      const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = new Float32Array(total * 2), si = new Uint16Array(total * 4), sw = new Float32Array(total * 4);
      const joints = ["spine_04", "spine_05", "neck_01"];
      const mChest = new Float32Array(total * 3), mWeight = new Float32Array(total * 3), mBody = new Float32Array(total * 3);
      let o = 0;
      for (const p of parts) {
        const P2 = p.geo.attributes.position, N2 = p.geo.attributes.normal, U = p.geo.attributes.uv;
        for (let i = 0; i < P2.count; i++, o++) {
          pos.set([P2.getX(i), P2.getY(i), P2.getZ(i)], o * 3);
          nrm.set([N2.getX(i), N2.getY(i), N2.getZ(i)], o * 3);
          const u = U ? U.getX(i) : 0.5, v = U ? U.getY(i) : 0.5;
          const [r0, r1, r2, r3] = p.rect;
          uv[o * 2] = (ax + (r0 + (r2 - r0) * u) * aw) / S;
          uv[o * 2 + 1] = (ay + (r1 + (r3 - r1) * (1 - v)) * ah) / S;
          const y = P2.getY(i), z = P2.getZ(i);
          if (p.bone === "strap") {
            const k = T.MathUtils.clamp((y - (s5.y - 0.02)) / (nk.y - s5.y + 0.02), 0, 1);
            if (k <= 0) {
              si.set([0, 1, 0, 0], o * 4);
              sw.set([1, 0, 0, 0], o * 4);
            } else {
              si.set([1, 2, 0, 0], o * 4);
              sw.set([1 - k * 0.6, k * 0.6, 0, 0], o * 4);
            }
          } else {
            si.set([0, 0, 0, 0], o * 4);
            sw.set([1, 0, 0, 0], o * 4);
          }
          const front = T.MathUtils.clamp((z - (s4.z + 0.02)) / 0.12, 0, 1) * (y < nk.y - 0.03 ? 1 : 0);
          mChest[o * 3 + 2] = 0.045 * front;
          mWeight[o * 3 + 2] = 0.05 * front;
          mBody[o * 3] = (pos[o * 3] > 0.03 ? 1 : pos[o * 3] < -0.03 ? -1 : 0) * 0.012 * (y > s5.y - 0.04 ? 1 : 0);
        }
      }
      const index = Uint32Array.from({ length: total }, (_, i) => i);
      return { id: "cam", n: total, pos, nrm, uv, si, sw, joints, extra: [], morph: { Chest: mChest, Weight: mWeight, BodyType: mBody }, index, piece: null };
    }
    function roundBox(g, r) {
      g.computeBoundingBox();
      const b = g.boundingBox, h = new T.Vector3().subVectors(b.max, b.min).multiplyScalar(0.5), p = g.attributes.position, inner = h.clone().subScalar(r);
      for (let i = 0; i < p.count; i++) {
        _v.fromBufferAttribute(p, i);
        const cl = _v.clone().clamp(inner.clone().negate(), inner);
        const d = _v.clone().sub(cl);
        if (d.lengthSq() > 1e-12) {
          d.normalize().multiplyScalar(r);
          _v.copy(cl).add(d);
          p.setXYZ(i, _v.x, _v.y, _v.z);
        }
      }
      g.computeVertexNormals();
    }
    function cameraMaskCanvas(size = 512) {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const x = c.getContext("2d");
      const R = (a, b, cw, ch) => [a * size, b * size, cw * size, ch * size];
      x.fillStyle = "rgba(0,0,0,0)";
      x.clearRect(0, 0, size, size);
      let img = x.createImageData(size * 0.5, size * 0.5);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = 200 + Math.random() * 40 - (i / 4 % 7 === 0 ? 30 : 0);
        img.data[i] = n;
        img.data[i + 1] = 0;
        img.data[i + 2] = 0;
        img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      x.strokeStyle = "rgb(150,0,0)";
      x.lineWidth = size * 6e-3;
      x.setLineDash([size * 0.012, size * 0.01]);
      x.strokeRect(...R(0.035, 0.035, 0.43, 0.43));
      x.setLineDash([]);
      for (const [a, b, w, h] of [[0.5, 0, 0.5, 0.24], [0.5, 0.24, 0.5, 0.24]]) {
        const gr2 = x.createLinearGradient(a * size, b * size, a * size, (b + h) * size);
        gr2.addColorStop(0, "rgb(0,255,0)");
        gr2.addColorStop(0.45, "rgb(0,190,0)");
        gr2.addColorStop(0.55, "rgb(0,235,0)");
        gr2.addColorStop(1, "rgb(0,160,0)");
        x.fillStyle = gr2;
        x.fillRect(...R(a, b, w, h));
        for (let k = 0; k < 60; k++) {
          x.fillStyle = `rgba(0,${180 + Math.random() * 75},0,0.35)`;
          x.fillRect(a * size, (b + Math.random() * h) * size, w * size, 1);
        }
      }
      for (let k = 0; k < 24; k++) {
        x.fillStyle = k % 2 ? "rgb(120,0,0)" : "rgb(190,0,0)";
        x.fillRect(...R(0 + k * 0.5 / 24, 0.5, 0.5 / 24 + 2e-3, 0.24));
      }
      const gr = x.createRadialGradient(0.75 * size, 0.75 * size, 0, 0.75 * size, 0.75 * size, 0.24 * size);
      gr.addColorStop(0, "rgba(0,0,40,1)");
      gr.addColorStop(0.78, "rgba(0,0,25,1)");
      gr.addColorStop(0.86, "rgba(0,140,0,1)");
      gr.addColorStop(1, "rgba(0,90,0,1)");
      x.fillStyle = gr;
      x.fillRect(...R(0.5, 0.5, 0.5, 0.5));
      img = x.createImageData(size * 0.5, size * 0.24);
      for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) {
        const i = (yy * img.width + xx) * 4;
        const w = ((xx >> 2) + (yy >> 2)) % 2 ? 230 : 190;
        const edge = yy < 4 || yy > img.height - 5 ? 0.75 : 1;
        img.data[i] = 0;
        img.data[i + 1] = 0;
        img.data[i + 2] = w * edge;
        img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, size * 0.75);
      return c;
    }
    function defaultDesc(W) {
      return {
        v: 1,
        g: "f",
        bd: [0, 0.55, 0.1],
        h: 1,
        sk: 3,
        fc: 0,
        ey: 0,
        pu: "basic",
        br: "brow.stylized_basic_brows",
        la: "lash.stylized_long_lashes",
        hc: 48,
        hc2: 49,
        fx: ["blush"],
        so: ["socks.basic", 0],
        it: {
          hb: ["hb.pony_tail_long"],
          hf: ["hf.bang_side_flicks"],
          top: ["top.hoodie", 26, 1, 1],
          bot: ["bot.cargo_pants_short", 7, 9, 53],
          feet: ["feet.work_boots", 8, 9, 50, 49, 40],
          cam: ["cam", 9, 40, 53]
        },
        ex: "sourire"
      };
    }
    function normalizeDesc(W, d) {
      d = JSON.parse(JSON.stringify(d || {}));
      const D = defaultDesc(W);
      for (const k of ["v", "g", "bd", "h", "sk", "fc", "ey", "pu", "br", "la", "hc", "hc2", "fx", "so"]) if (!(k in d) || d[k] == null && k !== "so") d[k] = D[k];
      if (!d.it) d.it = {};
      for (const [slot, v] of Object.entries(d.it)) {
        if (!v) {
          delete d.it[slot];
          continue;
        }
        if (slot === "cam") continue;
        const it = W.items.get(v[0]);
        if (!it) {
          delete d.it[slot];
          continue;
        }
        for (let i = 0; i < it.ch.length; i++) if (v[i + 1] == null) v[i + 1] = it.ch[i].c;
      }
      if (d.it.ovr) {
        delete d.it.top;
        delete d.it.bot;
      }
      return d;
    }
    var Avatar = class {
      constructor(W, opts = {}) {
        this.W = W;
        this.o = Object.assign({ atlas: 1024, normals: false, face: true, shadow: true }, opts);
        this.group = new T.Group();
        this.group.name = "avatar";
        this.arm = W.tplArm.clone(true);
        this.arm.children.slice().forEach((c) => {
          if (!c.isBone) this.arm.remove(c);
        });
        this.group.add(this.arm);
        this.bones = /* @__PURE__ */ new Map();
        this.arm.traverse((o) => {
          if (o.isBone) this.bones.set(o.name, o);
        });
        this.restLocal = /* @__PURE__ */ new Map();
        for (const [n, b] of this.bones) this.restLocal.set(n, { q: b.quaternion.clone(), p: b.position.clone() });
        this.arm.updateMatrixWorld(true);
        const inv = new T.Matrix4().copy(this.group.matrixWorld).invert();
        this.restWQ = /* @__PURE__ */ new Map();
        this.restWP = /* @__PURE__ */ new Map();
        for (const [n, b] of this.bones) {
          _m.multiplyMatrices(inv, b.matrixWorld);
          const p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3();
          _m.decompose(p, q, s);
          this.restWQ.set(n, q);
          this.restWP.set(n, p);
        }
        this.rt = new T.WebGLRenderTarget(this.o.atlas, this.o.atlas, { colorSpace: T.SRGBColorSpace, generateMipmaps: true, minFilter: T.LinearMipmapLinearFilter, magFilter: T.LinearFilter, depthBuffer: false });
        this.rt.texture.anisotropy = 4;
        if (this.o.normals) this.nrt = new T.WebGLRenderTarget(this.o.atlas, this.o.atlas, { generateMipmaps: true, minFilter: T.LinearMipmapLinearFilter, depthBuffer: false });
        this.mat = makeSkinMaterial(this.rt.texture, this.nrt && this.nrt.texture);
        this.meshes = {};
        this.exprCur = {};
        this.exprTarget = {};
        this.blinkT = 2 + Math.random() * 3;
        this.blink = 0;
        this.t = Math.random() * 100;
        this.look = new T.Vector2();
        this.lookTarget = new T.Vector2();
        this.lookAt = null;
        this.hop = 0;
        this.extraBones = [];
        this.anim = new IdleAnim(this);
      }
      // construit / reconstruit selon la description (renvoie quand c'est prêt)
      async set(desc) {
        const W = this.W;
        const d = normalizeDesc(W, desc);
        this.desc = d;
        const token = this._tok = (this._tok || 0) + 1;
        const ids = [];
        for (const [slot, v] of Object.entries(d.it)) ids.push(v[0]);
        ids.push(d.br, d.la, "teeth.stylized_basic_teeth");
        const parts = (await Promise.all(ids.filter((i) => i && (i === "cam" || W.items.has(i))).map((i) => W.part(i).catch((e) => {
          console.warn("pièce", i, e);
          W._pp && W._pp.delete(i);
          return null;
        })))).filter(Boolean);
        if (token !== this._tok) return false;
        const layers2 = await this._layers(d);
        if (token !== this._tok) return false;
        const P2 = new Map(parts.map((p) => [p.id, p]));
        const hidden = /* @__PURE__ */ new Set();
        for (const id of ids) {
          const it = W.items.get(id);
          if (!it) continue;
          for (const tg of it.tags) if (COVER[tg]) hidden.add(COVER[tg]);
        }
        const bodyParts = [{ p: W.parts.get("body"), hide: hidden }];
        const faceParts = [{ p: W.parts.get("head") }];
        for (const [slot, v] of Object.entries(d.it)) {
          const p = P2.get(v[0]);
          if (!p) continue;
          (slot === "beard" ? faceParts : bodyParts).push(slot === "hb" || slot === "hf" ? { p, hair: slot } : { p });
        }
        for (const id of [d.br, d.la, "teeth.stylized_basic_teeth"]) if (P2.get(id)) faceParts.push({ p: P2.get(id) });
        this._rebuildSkeleton([...bodyParts, ...faceParts].map((x) => x.p));
        const faceMorphs = [
          "BodyType",
          "Weight",
          "NeckThickness",
          "Squareness",
          "Sharpness",
          "Stern",
          "NoseWidth",
          "NoseTiltUp",
          "MouthWide",
          "MouthThin",
          "EyesOuterCornersLow",
          "EyesOuterCornersHigh",
          "LowerBrows",
          "RaiseBrows",
          "EyesSquare",
          "EarsElf",
          "IrisSize",
          "BrowsThickness",
          ...EXPR_KEYS
        ];
        this.hfStretch = false;
        const gB = this._merge(bodyParts, BODY_MORPHS), gF = this._merge(faceParts, faceMorphs);
        gB.setAttribute("cav", new T.BufferAttribute(new Float32Array(gB.attributes.position.count), 1));
        gF.setAttribute("cav", mouthCavity(gF));
        for (const [k, g] of [["body", gB], ["face", gF]]) {
          let m = this.meshes[k];
          if (m) {
            m.geometry.dispose();
            m.geometry = g;
            m.updateMorphTargets();
          } else {
            m = this.meshes[k] = new T.SkinnedMesh(g, this.mat);
            m.castShadow = this.o.shadow;
            m.receiveShadow = false;
            m.frustumCulled = false;
            this.group.add(m);
          }
          m.bind(this.skeleton, new T.Matrix4());
        }
        W.composer.compose(this.rt, layers2, this.o.atlas);
        if (this.nrt) W.composer.compose(this.nrt, layers2, this.o.atlas, true);
        this.group.scale.setScalar(d.h || 1);
        this.applyMorphs();
        this.setHairLength(d.hl, d.hlf);
        this.exprTarget = EXPR[d.ex] || EXPR.sourire;
        return true;
      }
      _rebuildSkeleton(parts) {
        for (const b of this.extraBones) {
          b.parent && b.parent.remove(b);
          this.bones.delete(b.name);
        }
        this.extraBones = [];
        this.extraIBM = /* @__PURE__ */ new Map();
        for (const p of parts) for (const e of p.extra) {
          if (this.bones.has(e.name)) continue;
          const b = new T.Bone();
          b.name = e.name;
          e.local.decompose(b.position, b.quaternion, b.scale);
          const par = e.parent && this.bones.get(e.parent) || this.bones.get("head");
          par.add(b);
          this.bones.set(e.name, b);
          this.extraBones.push(b);
          this.extraIBM.set(e.name, e.ibm);
          this.restLocal.set(e.name, { q: b.quaternion.clone(), p: b.position.clone() });
        }
        const names = [...this.bones.keys()];
        this.boneIndex = new Map(names.map((n, i) => [n, i]));
        const bones = names.map((n) => this.bones.get(n));
        const ibm = names.map((n) => (this.W.masterIBM.get(n) || this.extraIBM.get(n) || new T.Matrix4()).clone());
        if (this.skeleton) this.skeleton.dispose();
        this.skeleton = new T.Skeleton(bones, ibm);
      }
      _merge(list, morphNames) {
        let nv = 0, ni = 0;
        const plans = list.map(({ p, hide }) => {
          let index = p.index;
          if (hide && hide.size && p.piece) {
            const hid = new Set([...hide].map((h) => PIECES.indexOf(h)));
            const keep = [];
            for (let t = 0; t < index.length; t += 3) if (!hid.has(p.piece[index[t]])) keep.push(index[t], index[t + 1], index[t + 2]);
            index = keep;
          }
          const r = { p, index, v0: nv };
          nv += p.n;
          ni += index.length;
          return r;
        });
        const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4);
        const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
        const used = morphNames.filter((m) => plans.some(({ p }) => p.morph[m]));
        const mo = used.map(() => new Float32Array(nv * 3));
        const hairPlans = plans.filter((x) => list[plans.indexOf(x)].hair);
        if (hairPlans.length) {
          const H = new Float32Array(nv * 3), HF = new Float32Array(nv * 3), nMoved = { hb: 0, hf: 0 }, sm2 = (a, b, x) => {
            const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
            return t * t * (3 - 2 * t);
          };
          for (const x of hairPlans) {
            const kind = list[plans.indexOf(x)].hair, y0 = kind === "hf" ? HAIR_PIVOT.hf : HAIR_PIVOT.hb, P2 = x.p.pos, A = kind === "hf" ? HF : H;
            for (let i = 0; i < x.p.n; i++) {
              const px = P2[i * 3], py = P2[i * 3 + 1], pz = P2[i * 3 + 2];
              if (py >= y0) continue;
              const w = sm2(y0, y0 - 0.06, py), dy = (py - y0) * w, o = (x.v0 + i) * 3;
              nMoved[kind]++;
              A[o + 1] = dy;
              const below = sm2(1.5, 1.25, py), rr = Math.hypot(px, pz + 0.01) || 1;
              A[o] = -dy * HAIR_PUSH * below * px / rr;
              A[o + 2] = -dy * HAIR_PUSH * below * (pz + 0.01) / rr;
            }
          }
          if (nMoved.hb) {
            used.push("HairLen");
            mo.push(H);
          }
          if (nMoved.hf) {
            used.push("HairLenF");
            mo.push(HF);
          }
          this.hfStretch = nMoved.hf >= 20;
        }
        let io = 0;
        for (const { p, index, v0 } of plans) {
          pos.set(p.pos, v0 * 3);
          nrm.set(p.nrm, v0 * 3);
          uv.set(p.uv, v0 * 2);
          sw.set(p.sw, v0 * 4);
          const map = p.joints.map((n) => this.boneIndex.has(n) ? this.boneIndex.get(n) : this.boneIndex.get("head"));
          for (let i = 0; i < p.n * 4; i++) si[v0 * 4 + i] = map[p.si[i]];
          for (let t = 0; t < index.length; t++) idx[io++] = index[t] + v0;
          used.forEach((m, k) => {
            if (p.morph[m]) mo[k].set(p.morph[m], v0 * 3);
          });
        }
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.BufferAttribute(pos, 3));
        g.setAttribute("normal", new T.BufferAttribute(nrm, 3));
        g.setAttribute("uv", new T.BufferAttribute(uv, 2));
        g.setAttribute("skinIndex", new T.BufferAttribute(si, 4));
        g.setAttribute("skinWeight", new T.BufferAttribute(sw, 4));
        g.setIndex(new T.BufferAttribute(idx, 1));
        g.morphAttributes.position = mo.map((a, k) => {
          const b = new T.BufferAttribute(a, 3);
          b.name = used[k];
          return b;
        });
        g.morphTargetsRelative = true;
        g.computeBoundingSphere();
        g.boundingSphere.radius = 1.4;
        return g;
      }
      async _layers(d) {
        const W = this.W, C = W.cat, L = [], tex = (u, k) => W.tex(u, k);
        const add = async (t, cols, o) => {
          if (!t) return null;
          try {
            const [mask, id, n] = await Promise.all([tex(t.d), tex(t.id), this.o.normals ? tex(t.n, "n") : null]);
            return { t, mask, id, n, c: cols, o };
          } catch (e) {
            console.warn("texture", t.d, e);
            return null;
          }
        };
        const skin = skinColors(C.skin[d.sk] ? C.skin[d.sk][1] : C.skin[3][1], d.sk >= SKIN_SHADE_NATURAL);
        const hair = W.color(d.hc), hair2 = W.color(d.hc2 == null ? d.hc : d.hc2);
        const jobs = [];
        jobs.push(() => add(C.base.body.tex, [skin.tone, skin.shade, skin.tone]));
        const utc = undershirtCols(d), utCols = utc ? [W.color(utc[0]), W.color(utc[1]), col("#ffffff")] : UT_DEFAULT.map(col);
        jobs.push(() => add(C.layers["under.bottom"].tex, [col("#5d6b86"), col("#ece6da"), col("#ffffff")]));
        if (undershirtShown(d)) jobs.push(() => this._utLayer(utCols));
        else if (braShown(d)) jobs.push(() => this._braLayer(utCols));
        if (d.so && d.so[0] && C.layers[d.so[0]]) jobs.push(() => add(C.layers[d.so[0]].tex, [W.color(d.so[1] || 0), W.color(d.so[2] == null ? 4 : d.so[2]), W.color(0)]));
        const face = FACES[d.fc] || FACES[0];
        jobs.push(() => add(C.base.head.tex[face.tex] || C.base.head.tex.basic, [skin.tone, skin.shade, skin.tone, col("#ffffff"), col("#f1dfd8"), col("#9c3a32"), col("#ffffff"), col("#ffffff"), col("#ffffff")]));
        for (const f of d.fx || []) {
          if (makeupDrawn(f)) {
            const mc = makeupCols(d, f);
            jobs.push(() => this._mqLayer(f, mc));
            continue;
          }
          const l = C.layers[f];
          if (!l) continue;
          let cc = l.cols ? l.cols.map((i) => W.color(i)) : [skin.tone, skin.shade, skin.tone];
          if (MAKEUP[f] && d.fxc && Array.isArray(d.fxc[f])) cc = makeupCols(d, f).map((i) => W.color(i));
          jobs.push(() => add(l.tex, f === "age" ? [skin.tone, skin.shade, skin.tone] : cc, f === "blush" ? 0.75 : 1));
        }
        const eye = C.eyes[d.ey] || C.eyes[0];
        jobs.push(() => add(C.layers.iris.tex, [col("#0b0a0d"), col(eye[1]), col(eye[2])]));
        jobs.push(() => add((C.layers["pupil." + d.pu] || C.layers["pupil.basic"]).tex, [col("#060507"), col("#060507"), col("#060507")]));
        jobs.push(() => add(C.layers["shine.single"].tex, [col("#ffffff"), col("#ffffff"), col("#ffffff")]));
        const browC = hair.clone().multiplyScalar(0.55);
        for (const id of [d.br, d.la, "teeth.stylized_basic_teeth"]) {
          const it = W.items.get(id);
          if (!it) continue;
          const cc = id.startsWith("teeth") ? [col("#f3efe6"), col("#d9a2a0"), col("#ffffff")] : id.startsWith("lash") ? [col("#17121a"), browC, browC] : [browC, hair, hair];
          jobs.push(() => add(it.tex, cc));
        }
        for (const slot of SLOTS) {
          const v = d.it[slot];
          if (!v) continue;
          if (slot === "cam") {
            jobs.push(() => this._camLayer(v));
            continue;
          }
          const it = W.items.get(v[0]);
          if (!it) continue;
          let cols = it.ch.map((c, i) => W.color(v[i + 1] == null ? c.c : v[i + 1]));
          if (it.hair) {
            const own = slot === "hf" ? d.hcf : slot === "beard" ? d.hcb : null, h1 = own != null ? W.color(own) : hair, h2 = own != null ? h1 : hair2;
            cols[0] = h1;
            if (cols.length > 1) cols[1] = h2;
            if (slot === "beard") cols = [h1, h2, h1];
          }
          while (cols.length < 9) cols.push(cols[cols.length - 1]);
          jobs.push(() => add(it.tex, cols));
        }
        const res = await Promise.all(jobs.map((j) => j()));
        return res.flat().filter(Boolean);
      }
      // maillot de corps ALLONGÉ (hub 2.12) : masque du pack prolongé en code (maillot.js), fait une fois par page ; repli : le masque du pack
      async _utLayer(cols) {
        const W = this.W, tex = W.cat.layers["under.top"].tex;
        if (!W._utLong) W._utLong = (async () => {
          const src = await W.tex(tex.d);
          try {
            const t = new T.CanvasTexture(undershirtLongCanvas(src.image, tex));
            t.flipY = false;
            t.colorSpace = T.SRGBColorSpace;
            t.generateMipmaps = true;
            t.minFilter = T.LinearMipmapLinearFilter;
            return t;
          } catch (e) {
            console.warn("maillot allongé", e);
            return src;
          }
        })();
        try {
          return { t: tex, mask: await W._utLong, id: null, n: null, c: cols };
        } catch (e) {
          console.warn("maillot", e);
          return null;
        }
      }
      // brassière (hub 2.12, dessinée en code : maillot.js) dans le rectangle BRA_RECT de l'atlas
      async _braLayer(cols) {
        const W = this.W;
        if (!W._bra) {
          const t = new T.CanvasTexture(braCanvas());
          t.flipY = false;
          t.colorSpace = T.SRGBColorSpace;
          t.generateMipmaps = true;
          t.minFilter = T.LinearMipmapLinearFilter;
          W._bra = t;
        }
        const [ax, ay, w, h] = BRA_RECT;
        return { t: { w, h, r: [[0, 0, w, h, ax, ay]] }, mask: W._bra, id: null, n: null, c: cols };
      }
      // calque de maquillage dessiné en code (masque 512 de l'espace du visage, en haut à gauche de l'atlas) ; la texture est gardée par la page
      async _mqLayer(id, cols) {
        const W = this.W;
        W._mq = W._mq || /* @__PURE__ */ new Map();
        let t = W._mq.get(id);
        if (!t) {
          const cv = makeupCanvas(id, 512);
          if (!cv) return null;
          t = new T.CanvasTexture(cv);
          t.flipY = false;
          t.colorSpace = T.SRGBColorSpace;
          t.generateMipmaps = true;
          W._mq.set(id, t);
        }
        const c = cols.map((i) => W.color(i));
        while (c.length < 3) c.push(c[c.length - 1] || W.color(0));
        return { t: { w: 512, h: 512, r: [[0, 0, 512, 512, 0, 0]] }, mask: t, id: null, n: null, c };
      }
      async _camLayer(v) {
        const W = this.W;
        if (!W._camTex) {
          const cv = cameraMaskCanvas(512);
          const t = new T.CanvasTexture(cv);
          t.flipY = false;
          t.colorSpace = T.SRGBColorSpace;
          t.generateMipmaps = true;
          W._camTex = t;
        }
        const [ax, ay, aw, ah] = CAM_RECT;
        return { t: { w: 512, h: 512, r: [[0, 0, 512, 512, ax, ay]] }, mask: W._camTex, id: null, n: null, c: [W.color(v[1] ?? 9), W.color(v[2] ?? 40), W.color(v[3] ?? 53)] };
      }
      applyMorphs() {
        const d = this.desc, face = FACES[d.fc] || FACES[0];
        const bt = d.g === "m" ? 1 : 0;
        const base = {
          BodyType: d.bd && d.bd[0] != null ? d.bd[0] : bt,
          Chest: d.bd ? d.bd[1] : 0,
          Weight: d.bd ? d.bd[2] : 0,
          NeckThickness: 1,
          Hat: d.it.hat ? 1 : 0
        };
        Object.assign(base, face.s);
        base.EarsElf = d.elf ? 1 : 0;
        base.HairLen = (this.hairLen || 1) - 1;
        base.HairLenF = (this.hairLenF || this.hairLen || 1) - 1;
        this.morphBase = base;
        this._setInfl(this.meshes.body, base, {});
        this._setInfl(this.meshes.face, base, this.exprCur);
      }
      _setInfl(m, base, ex) {
        if (!m || !m.morphTargetDictionary) return;
        const dict = m.morphTargetDictionary, inf = m.morphTargetInfluences;
        inf.fill(0);
        for (const [k, v] of Object.entries(base)) if (dict[k] != null) inf[dict[k]] = v;
        for (const [k, v] of Object.entries(ex)) if (dict[k] != null) inf[dict[k]] = Math.max(-1, Math.min(1.4, (inf[dict[k]] || 0) + v));
      }
      // longueur des cheveux (hub) : les coiffures BoZo sont des pièces fixes, sans forme « longueur » ; leurs MÈCHES ont des os (chaîne sous
      // HairBack…) : on agrandit / rapetisse le 1er os de chaque mèche des coiffures « derrière » (hb), 0,7 à 1,4. Sans mèches : rien ne change.
      hairStrands() {
        const ex = this.extraBones || [];
        return ex.filter((b) => /^hb/.test(b.name) && ex.includes(b.parent) && !ex.includes(b.parent.parent));
      }
      // longueur (hub 2.10.1) : la forme HairLen (toutes les coiffures) ; les os de mèches ne sont plus agrandis (ils grossissaient aussi les mèches)
      // hub 2.13 : vf = la frange (devant) ; absente = suit la coiffure
      setHairLength(v, vf) {
        const cl = (x) => Math.max(0.7, Math.min(1.45, +x || 1)), s = cl(v), sf = vf == null ? s : cl(vf);
        this.hairLen = s;
        this.hairLenF = sf;
        for (const b of this.hairStrands()) b.scale.setScalar(1);
        if (this.morphBase) {
          this.morphBase.HairLen = s - 1;
          this.morphBase.HairLenF = sf - 1;
          this._setInfl(this.meshes.body, this.morphBase, {});
        }
      }
      hasFringe() {
        return !!(this.desc && this.desc.it && this.desc.it.hf);
      }
      hasHair() {
        return !!(this.desc && this.desc.it && (this.desc.it.hb || this.desc.it.hf));
      }
      setExpression(name, hold = 0) {
        this.exprTarget = EXPR[name] || {};
        this.exprHold = hold;
        this.desc && (this.desc.ex = name);
      }
      react() {
        this.hop = 1;
        this.exprFlash = 1.1;
      }
      // gestes du hub (durées en secondes) : coucou de la main droite, petit saut avec élan, éclat de rire
      wave() {
        this.waveT = 2.6;
        this.exprFlash = 2.4;
      }
      jump() {
        this.jumpT = 1e-4;
        this.exprFlash = 1.2;
      }
      // rire (1.20.5) : laugh(durée, force) part (ou se prolonge) ; laughHold(force) le fait DURER tant qu'on l'appelle (rire entendu au micro) ;
      // laughW = poids lissé (entrée 0,25 s, sortie 0,5 s), laughB = rebond de chaque « ha » (~4,6 par seconde), laughK = force (main sur le ventre
      // au-dessus de 0,5)
      laugh(dur = 2.2, k = 1) {
        if (!(this.laughT > 0)) {
          this.laughE = 0;
          this.laughPh = 0;
          this.laughK = 0;
        }
        this.laughT = Math.max(this.laughT || 0, dur);
        this.laughK = Math.max(k, this.laughK || 0);
      }
      laughHold(k = 1) {
        if (!(this.laughT > 0)) this.laugh(1.2, k);
        else {
          this.laughT = Math.max(this.laughT, 0.75);
          this.laughK = Math.max(this.laughK || 0, k);
        }
      }
      // anticipation (1.20.5) : un mot-clé PAS ENCORE sûr (partielle) → le geste s'esquisse (prep 'oui' | 'non' | 'salut', poids qui retombe tout seul
      // en ~0,3 s s'il n'est pas confirmé) ; écoute : la voix commence → petite inclinaison attentive de la tête (rare : pas un tic)
      prep(kind) {
        if (kind) {
          this.prepK = kind;
          this.prepT = 0.28;
        } else this.prepT = 0;
      }
      // fin d'une phrase COURTE (un mot ?) : petit « hm ? » attentif (sourcils qui montent, tête qui se relève à peine) le temps que le mot soit
      // reconnu : le geste qui suit part de là ; rare (2,5 s entre deux) pour ne jamais devenir un tic
      ack() {
        const now = this.t || 0;
        if (now - (this.ackAt == null ? -99 : this.ackAt) < 2.5) return;
        this.ackAt = now;
        this.ackT = 0.55;
      }
      listen() {
        const now = this.t || 0;
        if (now - (this.listenAt == null ? -99 : this.listenAt) < 4) return;
        this.listenAt = now;
        this.listenT = 0.9;
        this.listenS = Math.random() < 0.5 ? -1 : 1;
      }
      // « oui » : deux hochements de tête (le 2e plus petit) avec un petit sourire ; « non » : la tête fait non, sourcils un peu froncés
      yes() {
        this.yesT = 1.4;
      }
      no() {
        this.noT = 1.6;
      }
      // hub 2.10 : GRR (grogne : dents, nez plissé, tête qui tremble, épaules rentrées ; grrHold le fait durer tant que tu grognes),
      // PAS CONTENT (sourcils froncés, moue, poings sur les hanches, tête qui se détourne, petit soupir ; ~3,4 s puis retour doux),
      // SIX-SEPT (le mème « 6 7 » : mains paumes vers le haut qui montent et descendent en alternance, comme une balance, la tête suit)
      grr(dur = 1.6) {
        if (!(this.grrT > 0)) this.grrE = 0;
        this.grrT = Math.max(this.grrT || 0, dur);
      }
      grrHold() {
        if (!(this.grrT > 0)) this.grr(1);
        else this.grrT = Math.max(this.grrT, 0.55);
      }
      fache(dur = 3.4) {
        if (!(this.facheT > 0)) this.facheE = 0;
        this.facheT = Math.max(this.facheT || 0, dur);
      }
      sixSept(dur = 2.9) {
        if (!(this.ssT > 0)) this.ssE = 0;
        this.ssT = Math.max(this.ssT || 0, dur);
      }
      busy() {
        return this.waveT > 0 || this.jumpT > 0 || this.laughT > 0 || this.yesT > 0 || this.noT > 0 || this.grrT > 0 || this.facheT > 0 || this.ssT > 0;
      }
      update(dt, cam) {
        this.t += dt;
        if (this.laughT > 0) {
          this.laughT = Math.max(0, this.laughT - dt);
          this.laughE = (this.laughE || 0) + dt;
          this.laughPh = (this.laughPh || 0) + dt * 2 * Math.PI * (4.6 - Math.min(1.2, this.laughE * 0.35));
        }
        const lgT = this.laughT > 0 ? Math.min(1, this.laughE / 0.25, this.laughT / 0.5) : 0, lgs = lgT * lgT * (3 - 2 * lgT);
        this.laughW = lgs;
        this.laughB = lgs > 0 ? Math.pow(Math.max(0, Math.sin(this.laughPh)), 1.5) : 0;
        for (const [k2, a, b] of [["grr", 0.12, 0.35], ["fache", 0.35, 0.7], ["ss", 0.3, 0.45]]) {
          const T0 = this[k2 + "T"] || 0;
          if (T0 > 0) {
            this[k2 + "T"] = Math.max(0, T0 - dt);
            this[k2 + "E"] = (this[k2 + "E"] || 0) + dt;
          }
          const x = T0 > 0 ? Math.min(1, this[k2 + "E"] / a, this[k2 + "T"] / b) : 0;
          this[k2 + "W"] = x * x * (3 - 2 * x);
        }
        const pk = this.prepT > 0 ? 1 : 0;
        this.prepT = Math.max(0, (this.prepT || 0) - dt);
        this.prepW = (this.prepW || 0) + (pk - (this.prepW || 0)) * (1 - Math.exp(-dt / (pk ? 0.07 : 0.12)));
        this.listenT = Math.max(0, (this.listenT || 0) - dt);
        this.ackT = Math.max(0, (this.ackT || 0) - dt);
        this.ackW = this.ackT > 0 ? Math.sin(Math.min(1, (0.55 - this.ackT) / 0.55) * Math.PI) : 0;
        const tgt = this.grrT > 0 ? EXPR_GRR : this.laughT > 0 ? EXPR_RIRE : this.facheT > 0 ? EXPR_FACHE : this.ssT > 0 ? EXPR_67 : this.yesT > 0 ? EXPR_OUI : this.noT > 0 ? EXPR_NON : this.exprFlash > 0 ? this.waveT > 0 ? EXPR.sourire : EXPR.content : this.exprTarget;
        if (this.exprFlash > 0) this.exprFlash -= dt;
        const k = 1 - Math.exp(-dt * 10);
        for (const key of EXPR_KEYS) {
          const c = this.exprCur[key] || 0, tv = tgt && tgt[key] || 0;
          this.exprCur[key] = c + (tv - c) * k;
        }
        this.blinkT -= dt;
        if (this.blinkT <= 0) {
          this.blink = 1e-4;
          this.blinkT = 1.8 + Math.random() * 4.2;
          if (Math.random() < 0.18) this.blinkT = 0.28;
        }
        if (this.blink > 0) {
          this.blink += dt / 0.16;
          if (this.blink >= 1) this.blink = 0;
        }
        const bl = this.blink > 0 ? Math.sin(this.blink * Math.PI) : 0;
        const ex = Object.assign({}, this.exprCur);
        if (this.laughW > 0) {
          ex.Jaw_Open = (ex.Jaw_Open || 0) + this.laughW * 0.32 * this.laughB;
          ex.Eyes_LowerClosed = Math.min(1, (ex.Eyes_LowerClosed || 0) + this.laughW * 0.08 * this.laughB);
        }
        if (this.ackW > 0) {
          ex.Brows_Raised = Math.min(1, (ex.Brows_Raised || 0) + 0.32 * this.ackW);
          ex.Eyes_UpperOpen = Math.min(1, (ex.Eyes_UpperOpen || 0) + 0.15 * this.ackW);
        }
        ex.Eyes_UpperClosed = Math.min(1, (ex.Eyes_UpperClosed || 0) + bl * (1 - (ex.Eyes_UpperOpen || 0) * 0.3));
        ex.Eyes_UpperOpen = (ex.Eyes_UpperOpen || 0) * (1 - bl);
        if (this.talk && this.talk.w > 0) {
          const lw = this.laughW || 0, w = this.talk.w * (1 - Math.max(0.75 * lw, 0.85 * (this.grrW || 0), 0.45 * (this.facheW || 0))), v = this.talk.v || {};
          for (const k2 of ["Mouth_Happy", "Mouth_Wide", "Mouth_Oh", "Jaw_Open", "Mouth_Pucker", "Mouth_Press", "Mouth_Grimace", "Mouth_Sad"]) ex[k2] = (ex[k2] || 0) * (1 - 0.92 * w);
          for (const [k2, x] of Object.entries(v)) ex[k2] = Math.min(1.2, (ex[k2] || 0) + x * w * (k2 === "Jaw_Open" ? 1 + lw : 1));
        }
        if (this.laughW > 0) {
          const lw = this.laughW;
          ex.Mouth_Happy = Math.max(ex.Mouth_Happy || 0, 0.95 * lw);
          ex.Mouth_Wide = Math.max(ex.Mouth_Wide || 0, 0.75 * lw);
          ex.Mouth_Oh = (ex.Mouth_Oh || 0) * (1 - 0.7 * lw);
          ex.Mouth_Pucker = (ex.Mouth_Pucker || 0) * (1 - lw);
          ex.Mouth_Sad = (ex.Mouth_Sad || 0) * (1 - lw);
          ex.Jaw_Open = Math.min(ex.Jaw_Open || 0, 0.55 + 0.1 * this.laughB);
        }
        const gw = this.grrW || 0, fw = this.facheW || 0;
        if (gw > 0) {
          ex.Mouth_Grimace = Math.max(ex.Mouth_Grimace || 0, 1.05 * gw);
          ex.Mouth_Wide = Math.max(ex.Mouth_Wide || 0, 0.4 * gw);
          for (const k2 of ["Mouth_Oh", "Mouth_Pucker", "Mouth_Happy", "Mouth_Press"]) ex[k2] = (ex[k2] || 0) * (1 - 0.85 * gw);
          ex.Jaw_Open = Math.min(0.3, (ex.Jaw_Open || 0) * (1 - 0.5 * gw) + gw * (0.12 + 0.05 * (0.5 + 0.5 * Math.sin(this.t * 2 * Math.PI * 6.5))));
          ex.NoseTiltUp = 0.9 * gw;
          ex.NoseWidth = 0.6 * gw;
          ex.Brow_Angry = Math.max(ex.Brow_Angry || 0, gw);
          ex.Brows_Lowered = Math.max(ex.Brows_Lowered || 0, gw);
        }
        if (fw > 0) {
          ex.Mouth_Sad = Math.max(ex.Mouth_Sad || 0, 0.85 * fw);
          ex.Mouth_Happy = (ex.Mouth_Happy || 0) * (1 - fw);
          ex.Brows_Lowered = Math.max(ex.Brows_Lowered || 0, 0.9 * fw);
          ex.Brow_Angry = Math.max(ex.Brow_Angry || 0, 0.7 * fw);
        }
        if (this.meshes.face && this.morphBase) this._setInfl(this.meshes.face, this.morphBase, ex);
        this.anim.update(dt, cam);
      }
      dispose() {
        for (const m of Object.values(this.meshes)) {
          m.geometry.dispose();
          this.group.remove(m);
        }
        this.rt.dispose();
        this.nrt && this.nrt.dispose();
        this.mat.dispose();
        this.skeleton && this.skeleton.dispose();
      }
    };
    function skinColors(hex, fantasy) {
      const tone = col(hex);
      const shade = fantasy ? tone.clone().multiplyScalar(0.32).offsetHSL(0.06, 0.1, 0) : new T.Color().setRGB(tone.r * 0.42, tone.g * 0.012, tone.b * 0.01);
      return { tone, shade };
    }
    function mouthCavity(g) {
      const P2 = g.attributes.position, N2 = g.attributes.normal, n = P2.count, a = new Float32Array(n);
      const sm2 = (e0, e1, x) => {
        const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
        return t * t * (3 - 2 * t);
      };
      for (let i = 0; i < n; i++) {
        const x = Math.abs(P2.getX(i)), y = P2.getY(i), z = P2.getZ(i), ny = N2.getY(i), nz = N2.getZ(i);
        if (x > 0.03 || y < 1.525 || y > 1.605 || z < 0.03 || z > 0.122) continue;
        a[i] = sm2(0.118, 0.096, z) * (1 - sm2(0.02, 0.029, x)) * sm2(1.528, 1.542, y) * (1 - sm2(1.592, 1.603, y)) * (1 - sm2(0.25, 0.6, nz)) * (1 - sm2(-0.3, -0.6, ny) * (1 - sm2(1.548, 1.556, y)));
      }
      return new T.BufferAttribute(a, 1);
    }
    var STAGE = { rim: new T.Color(1, 0.78, 0.5), rimPow: 3, rimStr: 0.35 };
    function makeSkinMaterial(map, nmap) {
      const m = new T.MeshStandardMaterial({ map, roughness: 0.78, metalness: 0, normalMap: nmap || null, envMapIntensity: 0.38 });
      if (nmap) m.normalScale.set(0.6, -0.6);
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uRim = { value: STAGE.rim };
        sh.uniforms.uRimPow = { value: STAGE.rimPow };
        sh.uniforms.uRimStr = { value: STAGE.rimStr };
        sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
          attribute float cav; varying float vCav;`).replace("#include <begin_vertex>", `#include <begin_vertex>
          vCav = cav;`);
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
          uniform vec3 uRim; uniform float uRimPow; uniform float uRimStr; varying float vCav;`).replace("#include <map_fragment>", `#include <map_fragment>
          diffuseColor.rgb *= mix(vec3(1.0), vec3(0.5, 0.26, 0.27), vCav);`).replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
          { vec2 a = vMapUv; // zones de l'atlas : cheveux, yeux, verres, chaussures, appareil
            if (a.x > 0.49 && a.y < 0.26) roughnessFactor = 0.5;                       // cheveux
            if (a.x > 0.49 && a.x < 0.63 && a.y > 0.36 && a.y < 0.5) roughnessFactor = 0.42;  // yeux (le reflet est peint)
            if (a.x > 0.49 && a.x < 0.64 && a.y > 0.24 && a.y < 0.385) roughnessFactor = 0.2; // lunettes
            if (a.x < 0.13 && a.y > 0.74) roughnessFactor = 0.55;                       // chaussures
            if (a.x > 0.5 && a.x < 0.75 && a.y > 0.5 && a.y < 0.75) { roughnessFactor = 0.42; if (a.x > 0.625 && a.y > 0.5 && a.y < 0.62) metalnessFactor = 0.75; if (a.x > 0.625 && a.y > 0.625) roughnessFactor = 0.06; }
          }`).replace("#include <opaque_fragment>", `
          { float f = pow(1.0 - clamp(dot(normalize(vViewPosition) * -1.0, normal), 0.0, 1.0), uRimPow);
            outgoingLight += uRim * f * uRimStr * (0.35 + 0.65 * diffuseColor.rgb) * (1.0 - vCav);
            outgoingLight *= 1.0 - 0.5 * vCav; }
          #include <opaque_fragment>`);
      };
      return m;
    }
    var IdleAnim = class {
      constructor(A) {
        this.A = A;
        this.t = Math.random() * 50;
        this.seed = Math.random() * 10;
        this.dirs = /* @__PURE__ */ new Map();
        const P2 = (n) => A.restWP.get(n);
        for (const [a, b] of [["upperarm_l", "lowerarm_l"], ["lowerarm_l", "hand_l"], ["upperarm_r", "lowerarm_r"], ["lowerarm_r", "hand_r"], ["hand_l", "middle_01_l"], ["hand_r", "middle_01_r"]])
          if (P2(a) && P2(b)) this.dirs.set(a, P2(b).clone().sub(P2(a)).normalize());
        this.fingers = [];
        for (const s of ["l", "r"]) for (const f of ["index", "middle", "ring", "pinky"]) for (const k of ["01", "02", "03"]) if (A.bones.has(`${f}_${k}_${s}`)) this.fingers.push({ n: `${f}_${k}_${s}`, s, k: +k, f });
        for (const s of ["l", "r"]) for (const k of ["01", "02", "03"]) if (A.bones.has(`thumb_${k}_${s}`)) this.fingers.push({ n: `thumb_${k}_${s}`, s, k: +k, f: "thumb" });
        this.side = {};
        for (const s of ["l", "r"]) {
          const a = P2(`pinky_01_${s}`), b = P2(`index_01_${s}`);
          if (a && b) this.side[s] = b.clone().sub(a).normalize();
        }
        this.R = /* @__PURE__ */ new Map();
        this.palm = Math.PI / 2;
        this.wave = { up: [0.92, 0.1, 0.3], fx: 0.06, fz: 0.16, fa: 0.1, hw: 0.42, hz: 0.12, lag: 0.7, tw: 0.8, htw: 0, f: 2.2 };
      }
      // rotation « monde du modèle » d'un os = R × repos ; les enfants héritent
      setR(n, q) {
        this.R.set(n, q);
      }
      apply() {
        const A = this.A;
        for (const [n, b] of A.bones) {
          const rl = A.restLocal.get(n);
          if (!rl) continue;
          const R = this.R.get(n);
          if (!R) {
            b.quaternion.copy(rl.q);
            continue;
          }
          const rw = A.restWQ.get(n);
          if (!rw) {
            b.quaternion.copy(rl.q);
            continue;
          }
          _q.copy(rw).invert().multiply(R).multiply(rw);
          b.quaternion.copy(rl.q).multiply(_q);
        }
      }
      aim(n, child, target, accum, twist = 0) {
        const d0 = this.dirs.get(n);
        if (!d0) return new T.Quaternion();
        const tl = target.clone().applyQuaternion(accum.clone().invert());
        let q = new T.Quaternion().setFromUnitVectors(d0, tl.normalize());
        if (twist) q = new T.Quaternion().setFromAxisAngle(tl, twist).multiply(q);
        this.setR(n, q);
        return q;
      }
      update(dt, cam) {
        const A = this.A;
        this.t += dt;
        const t = this.t, s = this.seed;
        this.R.clear();
        const fem = A.desc && A.desc.g === "f";
        const br = Math.sin(t * 1.7);
        const sw = Math.sin(t * 0.55 + s) * 0.6 + Math.sin(t * 0.23 + s * 2) * 0.4;
        const hop = A.hop > 0 ? Math.sin((1 - A.hop) * Math.PI) : 0;
        if (A.hop > 0) A.hop = Math.max(0, A.hop - dt * 2.2);
        let air = 0, crouch = 0;
        if (A.jumpT > 0) {
          const p = A.jumpT;
          A.jumpT += dt / 0.9;
          if (A.jumpT >= 1) A.jumpT = 0;
          if (p < 0.2) crouch = Math.sin(p / 0.2 * Math.PI) * (p < 0.1 ? 1 : 1);
          else if (p < 0.78) air = Math.sin((p - 0.2) / 0.58 * Math.PI);
          else crouch = Math.sin((p - 0.78) / 0.22 * Math.PI) * 0.8;
        }
        let w = 0;
        if (A.waveT > 0) {
          A.waveT = Math.max(0, A.waveT - dt);
          const e = 2.6 - A.waveT;
          w = Math.min(1, e / 0.35, A.waveT / 0.45);
          w = w * w * (3 - 2 * w);
        }
        const lg = A.laughW || 0, lb = A.laughB || 0, lk = lg * Math.min(1, Math.max(0, ((A.laughK || 0) - 0.4) / 0.3));
        const back = lg * (0.2 + 0.07 * Math.min(1, (A.laughE || 0) / 0.6)), shake = 0;
        const gw = A.grrW || 0, fw = A.facheW || 0, ssw = A.ssW || 0, fe = A.facheE || 0;
        const sigh = fw * (fe > 0.2 && fe < 1.3 ? Math.sin((fe - 0.2) / 1.1 * Math.PI) : 0), ssa = ssw * Math.sin((A.ssE || 0) * 2 * Math.PI * 2.1);
        const gshake = gw * 0.035 * Math.sin(t * 2 * Math.PI * 7.5);
        const pw = A.prepW || 0, pK = A.prepK || "", lsn = A.listenT > 0 ? Math.sin(Math.min(1, (0.9 - A.listenT) / 0.9) * Math.PI) : 0;
        let yes = 0, no = 0;
        if (A.yesT > 0) {
          A.yesT = Math.max(0, A.yesT - dt);
          const p = 1 - A.yesT / 1.4, env2 = Math.min(1, p / 0.05, A.yesT / 0.14);
          const c = Math.min(1, p / 0.86);
          yes = env2 * (c < 0.5 ? 0.34 : 0.24) * (1 - Math.cos(c * Math.PI * 4)) / 2;
        }
        if (A.noT > 0) {
          A.noT = Math.max(0, A.noT - dt);
          const p = 1 - A.noT / 1.6, env2 = Math.min(1, p / 0.07, A.noT / 0.22);
          no = env2 * 0.5 * (1 - 0.5 * p) * Math.sin(p * Math.PI * 2 * 2.6);
        }
        const qe = (x, y, z) => new T.Quaternion().setFromEuler(new T.Euler(x, y, z, "YXZ"));
        const pr = sw * 0.022, py = Math.sin(t * 0.31 + s) * 0.05;
        this.setR("pelvis", qe(0, py, pr));
        const pel = A.bones.get("pelvis"), rl = A.restLocal.get("pelvis");
        if (pel) {
          pel.position.copy(rl.p);
        }
        const inv = qe(0, -py, -pr);
        const kb = crouch * 0.42 + air * 0.12;
        this.setR("thigh_l", inv.clone().multiply(qe(0.02 + kb, 0, 0.02 + sw * 0.01)));
        this.setR("thigh_r", inv.clone().multiply(qe(0.02 + kb, 0, -0.02 + sw * 0.01)));
        this.setR("calf_l", qe(-0.04 - Math.max(0, sw) * 0.05 - kb * 2, 0, 0));
        this.setR("calf_r", qe(-0.04 - Math.max(0, -sw) * 0.05 - kb * 2, 0, 0));
        this.setR("spine_02", qe(br * 0.012, -py * 0.3, -pr * 0.5));
        this.setR("spine_03", qe(br * 0.016 - hop * 0.05 + crouch * 0.12 - air * 0.06 - shake * 0.05 - back * 0.22 + lg * lb * 0.05 + gw * 0.04 - sigh * 0.05, -py * 0.3 - w * 0.08 + fw * 0.06, -pr * 0.4 + w * 0.05 + ssa * 0.025));
        this.setR("spine_04", qe(br * 0.012 + yes * 0.18 - back * 0.3 + lg * lb * 0.035 + gw * 0.05, no * 0.12 + fw * 0.05, 0));
        const lt = A.lookTarget, l = A.look;
        const wanderX = Math.sin(t * 0.37 + s) * 0.22 + Math.sin(t * 0.13 + s * 3) * 0.12, wanderY = Math.sin(t * 0.29 + s * 2) * 0.06;
        const gx = A.lookAt ? lt.x : wanderX, gy = A.lookAt ? lt.y : wanderY;
        l.x += (gx - l.x) * (1 - Math.exp(-dt * 3));
        l.y += (gy - l.y) * (1 - Math.exp(-dt * 3));
        const pyes = pK === "oui" ? pw * 0.07 : 0, pno = pK === "non" ? pw * 0.06 : 0;
        this.setR("neck_01", qe(-l.y * 0.35 + yes * 0.35 - back * 0.35 + pyes * 0.4 + gw * 0.03 - fw * 0.04, l.x * 0.35 + no * 0.3 + pno * 0.3 + fw * 0.1, lsn * 0.03 * (A.listenS || 1) + ssa * 0.04));
        const tk = A.talk && A.talk.w > 0 ? A.talk : null, nod = tk ? tk.nod || 0 : 0, tilt = tk ? tk.tilt || 0 : 0;
        this.setR("head", qe(
          -l.y * 0.55 + br * 0.01 + hop * 0.08 - shake * 0.16 - air * 0.08 + nod + yes - back * 0.6 + lg * lb * 0.06 + pyes - lsn * 0.03 - (A.ackW || 0) * 0.05 + gw * 0.015 - fw * 0.05 + sigh * 0.04,
          l.x * 0.5 + tilt * 0.5 + no + pno + gshake + fw * 0.14,
          Math.sin(t * 0.21 + s) * 0.03 + w * (0.08 + 0.03 * Math.sin(t * 2.2)) + lg * 0.07 + lsn * 0.07 * (A.listenS || 1) + ssa * 0.09 - fw * 0.04
        ));
        for (const e of ["eyeRoot_l", "eyeRoot_r"]) if (A.bones.has(e)) this.setR(e, qe(-l.y * 0.25, l.x * 0.4, 0));
        if (tk && tk.asym) {
          const as = tk.asym * Math.min(1, tk.w);
          this.setR("jaw", qe(0, as * 0.03, as * 0.04));
          this.setR("mouth", qe(0, 0, as * 0.05));
        }
        const sh = lg * (0.04 + 0.075 * lb), pw8 = pK === "salut" ? pw * 0.06 : 0;
        const shu = gw * 0.06 + sigh * 0.09;
        this.setR("clavicle_l", qe(0, 0, br * 0.012 + hop * 0.05 + sh + shu));
        this.setR("clavicle_r", qe(0, 0, -br * 0.012 - hop * 0.05 - sh - pw8 - shu - w * 0.05));
        const acc = (names) => {
          const q = new T.Quaternion();
          for (const n of names) {
            const r = this.R.get(n);
            if (r) q.multiply(r);
          }
          return q;
        };
        for (const [side, sx] of [["l", 1], ["r", -1]]) {
          const parents = ["pelvis", "spine_02", "spine_03", "spine_04", "clavicle_" + side];
          const pa = acc(parents);
          const spread = (fem ? 0.13 : 0.2) + hop * 0.35 + br * 6e-3 + air * 0.55 + crouch * 0.1;
          const wv = side === "r" ? Math.max(w, pK === "salut" ? pw * 0.18 : 0) : 0;
          const bv = side === "l" ? lk : 0;
          const ab = ssa * sx;
          const WV = this.wave, wph = t * 2 * Math.PI * WV.f;
          const up = new T.Vector3(sx * spread, -1 + air * 0.5, 0.04 + Math.sin(t * 0.8 + s + sx) * 0.01 + crouch * 0.25).normalize().lerp(new T.Vector3(sx * WV.up[0], WV.up[1], WV.up[2]).normalize(), wv).lerp(new T.Vector3(sx * 0.3, -0.85, 0.42 + lb * 0.04).normalize(), bv).lerp(new T.Vector3(sx * 0.72, -0.66, -0.2).normalize(), fw).lerp(new T.Vector3(sx * 0.26, -0.9 + ab * 0.12, 0.3).normalize(), ssw).normalize();
          const qU = this.aim("upperarm_" + side, null, up, pa);
          const pa2 = pa.clone().multiply(qU);
          const fo = new T.Vector3(sx * (spread * 0.6), -1, 0.32 + br * 0.01 + hop * 0.2).normalize().lerp(new T.Vector3(sx * WV.fx + Math.sin(wph) * WV.fa, 1, WV.fz).normalize(), wv).lerp(new T.Vector3(-sx * 0.8, -0.05, 0.55).normalize(), bv).lerp(new T.Vector3(-sx * 0.55, -0.62, 0.32).normalize(), fw).lerp(new T.Vector3(sx * 0.3, 0.05 + ab * 0.7, 1).normalize(), ssw).normalize();
          const qL = this.aim("lowerarm_" + side, null, fo, pa2, ssw * this.palm * -sx + wv * WV.tw * -sx);
          const pa3 = pa2.clone().multiply(qL);
          const hd = new T.Vector3(sx * 0.05, -1, 0.18).normalize().lerp(new T.Vector3(sx * WV.fx + Math.sin(wph - WV.lag) * WV.hw, 1, WV.hz).normalize(), wv).lerp(new T.Vector3(-sx * 0.95, -0.2, 0.15).normalize(), bv).lerp(new T.Vector3(-sx * 0.5, -0.75, 0.15).normalize(), fw).lerp(new T.Vector3(sx * 0.15, 0.08 + ab * 0.25, 1).normalize(), ssw).normalize();
          this.aim("hand_" + side, null, hd, pa3, wv * WV.htw * -sx);
        }
        for (const f of this.fingers) {
          const ax = this.side[f.s];
          if (!ax) continue;
          const curl = (f.f === "thumb" ? 0.15 : 0.22 + (f.f === "pinky" ? 0.12 : f.f === "ring" ? 0.08 : 0)) * (f.k === 1 ? 0.8 : 1) * (1 - 0.6 * ssw) * (f.s === "r" ? 1 - 0.75 * w : 1) + fw * (f.f === "thumb" ? 0.35 : 1.15);
          this.setR(f.n, new T.Quaternion().setFromAxisAngle(ax, (f.s === "l" ? -1 : 1) * curl));
        }
        for (const b of A.extraBones) this.setR(b.name, qe(Math.sin(t * 1.3 + b.name.length) * 0.03 - hop * 0.06, 0, Math.sin(t * 0.9 + b.name.length * 0.7) * 0.03));
        this.apply();
        if (pel) pel.position.y = rl.p.y + hop * 0;
        A.group.position.y = (A.baseY || 0) + hop * 0.05 + air * 0.24 - crouch * 0.05 + lg * lb * 6e-3;
      }
    };

    // src/stage.js
    var T2 = __toESM(require("three"));
    function canvasTex(w, h, draw, srgb = true) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      draw(c.getContext("2d"), w, h);
      const t = new T2.CanvasTexture(c);
      if (srgb) t.colorSpace = T2.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    }
    function rnd2(seed2) {
      let a = seed2 | 0;
      return () => {
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function makeStage(R, opts = {}) {
      const PHONE = !!opts.phone, r = rnd2(11);
      const scene = new T2.Scene();
      {
        const env2 = new T2.Scene();
        const sky = new T2.Mesh(new T2.SphereGeometry(10, 24, 12), new T2.ShaderMaterial({
          side: T2.BackSide,
          depthWrite: false,
          vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
          fragmentShader: `varying vec3 vP; void main(){ float h = vP.y; vec3 top = vec3(0.14,0.10,0.29), mid = vec3(0.60,0.37,0.52), hor = vec3(1.0,0.70,0.53);
            vec3 c = mix(hor, mid, smoothstep(-0.02, 0.16, h)); c = mix(c, top, smoothstep(0.12, 0.45, h)); c = mix(c, hor * 0.8, smoothstep(0.0, -0.3, h));
            c += vec3(1.0,0.81,0.54) * pow(max(0.0, dot(vP, normalize(vec3(-0.35, 0.06, -1.0)))), 10.0) * 0.65; gl_FragColor = vec4(c * 0.6, 1.0); }`
        }));
        env2.add(sky);
        const box = (c, i, p, s) => {
          const m2 = new T2.Mesh(new T2.PlaneGeometry(s[0], s[1]), new T2.MeshBasicMaterial({ color: new T2.Color(c).multiplyScalar(i), side: T2.DoubleSide }));
          m2.position.copy(p);
          m2.lookAt(0, 1, 0);
          env2.add(m2);
        };
        box("#ffe0b0", 2.1, new T2.Vector3(-4, 5, 4), [4, 3]);
        box("#9fb8ff", 0.9, new T2.Vector3(5, 3, 2), [3, 3]);
        box("#ffb070", 1.75, new T2.Vector3(2, 4, -5), [3, 4]);
        const pm = new T2.PMREMGenerator(R);
        scene.environment = pm.fromScene(env2, 0.02).texture;
        pm.dispose();
        sky.geometry.dispose();
        sky.material.dispose();
      }
      const hemi = new T2.HemisphereLight(16769732, 4864606, 0.55);
      scene.add(hemi);
      const key = new T2.DirectionalLight(16766624, 3);
      key.position.set(-2.2, 4.2, 3.2);
      key.castShadow = true;
      const sm2 = PHONE ? 1024 : 2048;
      key.shadow.mapSize.set(sm2, sm2);
      key.shadow.camera.left = -1.2;
      key.shadow.camera.right = 1.2;
      key.shadow.camera.top = 2.2;
      key.shadow.camera.bottom = -0.3;
      key.shadow.camera.near = 1;
      key.shadow.camera.far = 10;
      key.shadow.bias = -4e-4;
      key.shadow.normalBias = 0.02;
      key.shadow.radius = 4;
      scene.add(key);
      const fill = new T2.DirectionalLight(11059967, 0.7);
      fill.position.set(3, 1.6, 2.2);
      scene.add(fill);
      const rim = new T2.DirectionalLight(16756848, 2.6);
      rim.position.set(1.8, 3.2, -3.2);
      scene.add(rim);
      const rim2 = new T2.DirectionalLight(16752594, 0.9);
      rim2.position.set(-2.6, 2.4, -2.4);
      scene.add(rim2);
      const turn = new T2.Group();
      scene.add(turn);
      const ringsTex = canvasTex(512, 512, (x, w, h) => {
        const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, "#e9c38f");
        g.addColorStop(0.85, "#c9935c");
        g.addColorStop(0.93, "#8a5a34");
        g.addColorStop(1, "#5c3a22");
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
        for (let i = 1; i < 34; i++) {
          const rr = i / 34 * w * 0.45;
          x.beginPath();
          for (let a = 0; a <= 64; a++) {
            const t = a / 64 * Math.PI * 2, j = 1 + Math.sin(t * 3 + i) * 0.012 + Math.sin(t * 7 + i * 2) * 6e-3;
            x.lineTo(w / 2 + Math.cos(t) * rr * j, h / 2 + Math.sin(t) * rr * j);
          }
          x.strokeStyle = `rgba(120,70,30,${0.12 + (i % 3 === 0 ? 0.12 : 0)})`;
          x.lineWidth = 1.5 + (i % 4 === 0 ? 1.5 : 0);
          x.stroke();
        }
        for (let k = 0; k < 2200; k++) {
          x.fillStyle = `rgba(${r() < 0.5 ? "255,240,210" : "90,50,20"},0.05)`;
          x.fillRect(r() * w, r() * h, 2, 2);
        }
      });
      const barkTex = canvasTex(512, 64, (x, w, h) => {
        x.fillStyle = "#4a2f1d";
        x.fillRect(0, 0, w, h);
        for (let k = 0; k < 260; k++) {
          x.fillStyle = `rgba(${r() < 0.5 ? "120,80,50" : "25,14,8"},0.5)`;
          x.fillRect(r() * w, 0, 1 + r() * 3, h);
        }
      });
      barkTex.wrapS = T2.RepeatWrapping;
      barkTex.repeat.set(3, 1);
      const podium = new T2.Group();
      turn.add(podium);
      const top = new T2.Mesh(new T2.CylinderGeometry(0.6, 0.6, 0.02, 64), [new T2.MeshStandardMaterial({ map: barkTex, roughness: 0.95 }), new T2.MeshStandardMaterial({ map: ringsTex, roughness: 0.82 }), new T2.MeshStandardMaterial({ color: 3810582 })]);
      top.position.y = -0.01;
      top.receiveShadow = true;
      podium.add(top);
      const side = new T2.Mesh(new T2.CylinderGeometry(0.6, 0.66, 0.24, 64, 1, true), new T2.MeshStandardMaterial({ map: barkTex, roughness: 0.95 }));
      side.position.y = -0.14;
      side.receiveShadow = true;
      podium.add(side);
      const NG = PHONE ? 260 : 380;
      const grassGeo = new T2.ConeGeometry(0.012, 0.13, 4, 1, true).translate(0, 0.065, 0);
      const grassMat = new T2.MeshStandardMaterial({ color: 8038481, roughness: 0.9 });
      const wind = { value: 0 };
      grassMat.onBeforeCompile = (sh) => {
        sh.uniforms.uWind = wind;
        sh.vertexShader = "uniform float uWind;\n" + sh.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
         { vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float k = position.y / 0.13; transformed.x += sin(uWind * 1.7 + wp.x * 9.0 + wp.z * 5.0) * 0.018 * k * k; transformed.z += cos(uWind * 1.3 + wp.z * 7.0) * 0.012 * k * k; }`
        );
      };
      const grass = new T2.InstancedMesh(grassGeo, grassMat, NG);
      const flower = new T2.InstancedMesh(new T2.SphereGeometry(0.017, 8, 6), new T2.MeshStandardMaterial({ color: 16777215, roughness: 0.6, emissive: 3351057 }), 34);
      const m = new T2.Matrix4(), cols = [16773828, 16757704, 14074623, 16765802];
      for (let i = 0; i < NG; i++) {
        const a = r() * Math.PI * 2, rr = 0.6 + Math.pow(r(), 1.6) * 0.16;
        m.compose(new T2.Vector3(Math.cos(a) * rr, -0.26 + r() * 0.03, Math.sin(a) * rr), new T2.Quaternion().setFromEuler(new T2.Euler((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.6)), new T2.Vector3(1, 0.8 + r() * 1.2, 1));
        grass.setMatrixAt(i, m);
        grass.setColorAt(i, new T2.Color().setHSL(0.22 + r() * 0.07, 0.48, 0.3 + r() * 0.16));
      }
      for (let i = 0; i < 34; i++) {
        const a = r() * Math.PI * 2, rr = 0.64 + r() * 0.09;
        m.makeTranslation(Math.cos(a) * rr, -0.16 + r() * 0.06, Math.sin(a) * rr);
        flower.setMatrixAt(i, m);
        flower.setColorAt(i, new T2.Color(cols[i % 4]));
      }
      podium.add(grass, flower);
      const halo = new T2.Mesh(new T2.PlaneGeometry(2.4, 2.4), new T2.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(128, 128, (x, w) => {
        const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(20,10,20,.5)");
        g.addColorStop(0.45, "rgba(20,10,20,.32)");
        g.addColorStop(1, "rgba(20,10,20,0)");
        x.fillStyle = g;
        x.fillRect(0, 0, w, w);
      }) }));
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = -0.27;
      scene.add(halo);
      const blob = new T2.Mesh(new T2.PlaneGeometry(0.9, 0.9), new T2.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(128, 128, (x, w) => {
        const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(30,15,10,.55)");
        g.addColorStop(1, "rgba(30,15,10,0)");
        x.fillStyle = g;
        x.fillRect(0, 0, w, w);
      }) }));
      blob.rotation.x = -Math.PI / 2;
      blob.position.y = 2e-3;
      turn.add(blob);
      const motes = (() => {
        const N2 = PHONE ? 70 : 120, a = new Float32Array(N2 * 3), s = new Float32Array(N2);
        for (let i = 0; i < N2; i++) {
          const rr = 0.5 + r() * 2.2, t = r() * Math.PI * 2;
          a[i * 3] = Math.cos(t) * rr;
          a[i * 3 + 1] = r() * 2.6;
          a[i * 3 + 2] = Math.sin(t) * rr - 0.6;
          s[i] = r();
        }
        const g = new T2.BufferGeometry();
        g.setAttribute("position", new T2.BufferAttribute(a, 3));
        g.setAttribute("seed", new T2.BufferAttribute(s, 1));
        const mt = new T2.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: T2.AdditiveBlending,
          uniforms: { uT: { value: 0 }, uPx: { value: 1 } },
          vertexShader: `uniform float uT; uniform float uPx; attribute float seed; varying float vA; void main(){ vec3 p = position; float k = seed * 6.28;
            p.y = mod(p.y + uT * (0.05 + seed * 0.08), 2.8) - 0.1; p.x += sin(uT * 0.4 + k) * 0.12; p.z += cos(uT * 0.33 + k) * 0.12;
            vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vA = (0.35 + 0.65 * pow(0.5 + 0.5 * sin(uT * (0.8 + seed) + k), 2.0)) * smoothstep(0.0, 0.4, p.y) * smoothstep(2.7, 2.0, p.y);
            gl_PointSize = (0.012 + seed * 0.03) * uPx / -mv.z; }`,
          fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = exp(-d * d * 4.0) * vA; gl_FragColor = vec4(vec3(1.0, 0.82, 0.5) * a, a); }"
        });
        const p = new T2.Points(g, mt);
        p.frustumCulled = false;
        scene.add(p);
        mt.userData.pts = p;
        return mt;
      })();
      const sparks = (() => {
        const N2 = 56, pos = new Float32Array(N2 * 3), vel = new Float32Array(N2 * 3), life = new Float32Array(N2), seed2 = new Float32Array(N2);
        const g = new T2.BufferGeometry();
        g.setAttribute("position", new T2.BufferAttribute(pos, 3));
        g.setAttribute("life", new T2.BufferAttribute(life, 1));
        g.setAttribute("seed", new T2.BufferAttribute(seed2, 1));
        const mt = new T2.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: T2.AdditiveBlending,
          uniforms: { uPx: { value: 1 } },
          vertexShader: "uniform float uPx; attribute float life; attribute float seed; varying float vL; varying float vS; void main(){ vL = life; vS = seed; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (0.05 + 0.05 * seed) * uPx / -mv.z * smoothstep(0.0, 0.15, life); }",
          fragmentShader: "varying float vL; varying float vS; void main(){ vec2 d = gl_PointCoord - 0.5; float a = max(0.0, 1.0 - abs(d.x) * 9.0) * max(0.0, 1.0 - abs(d.y) * 2.2) + max(0.0, 1.0 - abs(d.y) * 9.0) * max(0.0, 1.0 - abs(d.x) * 2.2) + exp(-dot(d, d) * 60.0); a *= vL; gl_FragColor = vec4(mix(vec3(1.0, 0.85, 0.45), vec3(1.0, 0.95, 0.8), vS) * a, a); }"
        });
        const pts = new T2.Points(g, mt);
        pts.frustumCulled = false;
        turn.add(pts);
        let any = false;
        return {
          m: mt,
          pts,
          burst(h = 1, n = N2) {
            for (let i = 0; i < Math.min(N2, n); i++) {
              const a = Math.random() * Math.PI * 2, rr = 0.25 + Math.random() * 0.25;
              pos.set([Math.cos(a) * rr, (0.2 + Math.random() * 1.6) * h, Math.sin(a) * rr], i * 3);
              vel.set([Math.cos(a) * 0.35, 0.4 + Math.random() * 0.6, Math.sin(a) * 0.35], i * 3);
              life[i] = 0.7 + Math.random() * 0.5;
              seed2[i] = Math.random();
            }
            any = true;
            g.attributes.position.needsUpdate = g.attributes.life.needsUpdate = true;
          },
          update(dt) {
            if (!any) return;
            any = false;
            for (let i = 0; i < N2; i++) {
              if (life[i] <= 0) continue;
              any = true;
              life[i] = Math.max(0, life[i] - dt);
              for (let k = 0; k < 3; k++) pos[i * 3 + k] += vel[i * 3 + k] * dt;
              vel[i * 3 + 1] -= dt * 0.3;
            }
            g.attributes.position.needsUpdate = g.attributes.life.needsUpdate = true;
          }
        };
      })();
      return { scene, turn, podium, motes, sparks, wind, key, halo, blob };
    }

    // src/levres.js
    var VIS = ["sil", "M", "F", "S", "CH", "A", "E", "I", "O", "OU", "EU", "T"];
    var NV = VIS.length;
    var VI = Object.fromEntries(VIS.map((v, i) => [v, i]));
    var sm = (a, b, x) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    var KREF = [2700, 1580, 0.9];
    var bark = (f) => 26.81 * f / (1960 + f) - 0.53;
    var PROTO = [
      [720, 1450, 2550, { A: 1 }],
      [610, 980, null, { A: 0.6, O: 0.4 }],
      // a ; an (nasale)
      [360, 2150, 2700, { E: 1 }],
      [480, 1830, 2550, { E: 0.85, A: 0.15 }],
      // é ; è
      [305, 2300, 3100, { I: 1 }],
      // i
      [305, 1930, 2320, { OU: 0.85, I: 0.15 }],
      // u (lèvres arrondies, langue en avant)
      [330, 800, null, { OU: 1 }],
      [375, 860, null, { O: 1 }],
      [480, 1060, null, { O: 0.8, A: 0.2 }],
      [355, 1130, 2950, { O: 0.7, OU: 0.3 }],
      // ou ; o ; ò ; on
      [365, 1520, 2380, { EU: 1 }],
      [520, 1450, null, { EU: 0.7, E: 0.3 }]
      // eu / e muet ; œ
    ].map(([f1, f2, f3, c]) => ({ b1: bark(f1), b2: bark(f2), b32: f3 ? bark(f3) - bark(f2) : null, c: Object.entries(c).map(([k, x]) => [VI[k], x]) }));
    function biquad(type, f, sr, q = 0.7071) {
      const w = 2 * Math.PI * f / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), a0 = 1 + al;
      const b = type === "hp" ? [(1 + c) / 2, -(1 + c), (1 + c) / 2] : [(1 - c) / 2, 1 - c, (1 - c) / 2];
      return { b0: b[0] / a0, b1: b[1] / a0, b2: b[2] / a0, a1: -2 * c / a0, a2: (1 - al) / a0 };
    }
    function runEnergy(F, x, i0, i1) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0, e = 0;
      const pre = Math.max(0, i0 - 96);
      for (let i = pre; i < i1; i++) {
        const v = x[i], y = F.b0 * v + F.b1 * x1 + F.b2 * x2 - F.a1 * y1 - F.a2 * y2;
        x2 = x1;
        x1 = v;
        y2 = y1;
        y1 = y;
        if (i >= i0) e += y * y;
      }
      return e;
    }
    function createLipSync(sr, opt = {}) {
      const D = Math.max(1, Math.round(sr / 11500)), fs = sr / D;
      const P2 = fs > 13e3 ? 14 : 12;
      const NW = Math.round(0.03 * sr), ND = Math.floor(NW / D);
      const NE = Math.round(0.02 * sr);
      const taps = 8 * D + 1, h = new Float32Array(taps);
      {
        const fc = 0.45 / D;
        let s = 0;
        for (let i = 0; i < taps; i++) {
          const n = i - (taps - 1) / 2;
          h[i] = (n === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * n) / (Math.PI * n)) * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (taps - 1)));
          s += h[i];
        }
        for (let i = 0; i < taps; i++) h[i] /= s;
      }
      const ham = new Float32Array(ND);
      for (let i = 0; i < ND; i++) ham[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (ND - 1));
      const lagw = new Float32Array(P2 + 1);
      for (let k = 0; k <= P2; k++) lagw[k] = Math.exp(-0.5 * Math.pow(2 * Math.PI * 50 * k / fs, 2));
      const HP1 = biquad("hp", 1e3, sr), HP25 = biquad("hp", 2500, sr), HP55 = biquad("hp", Math.min(5500, sr * 0.4), sr), LP4 = biquad("lp", 400, sr), HP4 = biquad("hp", 400, sr);
      const xd = new Float32Array(ND), r = new Float64Array(P2 + 1), a = new Float64Array(P2 + 1), tmp = new Float64Array(P2 + 1);
      const re = new Float64Array(P2), im = new Float64Array(P2);
      let rootsOk = false;
      const st = { floor: 3e-3, pk: 0.03, f0m: 0, f0n: 0, k: 1.12, speechT: 9, lab: 0, hist: [], t: 0 };
      const feat = { hm: 0, L: 0, rms: 0, hf: 0, hf2: 0, low: 0, pg: 0, zcr: 0, F1: 0, F2: 0, F3: 0, B1: 0, B2: 0, voiced: 0, k: 1 };
      function lpc() {
        for (let k = 0; k <= P2; k++) {
          let s = 0;
          for (let i = k; i < ND; i++) s += xd[i] * xd[i - k];
          r[k] = s * lagw[k];
        }
        if (r[0] < 1e-12) return 0;
        r[0] *= 1.0001;
        a.fill(0);
        a[0] = 1;
        let err = r[0];
        for (let i = 1; i <= P2; i++) {
          let acc = r[i];
          for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
          const kk = -acc / err;
          tmp.set(a);
          for (let j = 1; j < i; j++) a[j] = tmp[j] + kk * tmp[i - j];
          a[i] = kk;
          err *= 1 - kk * kk;
          if (err <= 0) return 0;
        }
        return 10 * Math.log10(r[0] / err);
      }
      function roots() {
        if (!rootsOk) for (let i = 0; i < P2; i++) {
          const ang = (i + 0.5) / P2 * 2 * Math.PI + 0.1, rr = 0.9;
          re[i] = rr * Math.cos(ang);
          im[i] = rr * Math.sin(ang);
        }
        for (let it = 0; it < (rootsOk ? 24 : 70); it++) {
          let mv = 0;
          for (let i = 0; i < P2; i++) {
            let pr = 1, pi = 0;
            const zr = re[i], zi = im[i];
            for (let k = 1; k <= P2; k++) {
              const nr = pr * zr - pi * zi + a[k], ni = pr * zi + pi * zr;
              pr = nr;
              pi = ni;
            }
            let qr = 1, qi = 0;
            for (let j = 0; j < P2; j++) {
              if (j === i) continue;
              const dr = zr - re[j], di = zi - im[j], nr = qr * dr - qi * di, ni = qr * di + qi * dr;
              qr = nr;
              qi = ni;
            }
            const den = qr * qr + qi * qi;
            if (den < 1e-30) continue;
            const cr = (pr * qr + pi * qi) / den, ci = (pi * qr - pr * qi) / den;
            re[i] = zr - cr;
            im[i] = zi - ci;
            mv = Math.max(mv, Math.abs(cr) + Math.abs(ci));
          }
          if (mv < 1e-7) break;
        }
        rootsOk = true;
        for (let i = 0; i < P2; i++) if (!isFinite(re[i]) || !isFinite(im[i]) || Math.hypot(re[i], im[i]) > 1.5) {
          rootsOk = false;
          break;
        }
        const out = [];
        if (!rootsOk) return out;
        for (let i = 0; i < P2; i++) {
          if (im[i] <= 0) continue;
          const m = Math.hypot(re[i], im[i]), f = Math.atan2(im[i], re[i]) * fs / (2 * Math.PI), bw = -Math.log(m) * fs / Math.PI;
          if (f > 150 && f < fs / 2 - 250 && bw > 0 && bw < 700) out.push([f, bw]);
        }
        return out.sort((p2, q) => p2[0] - q[0]);
      }
      function analyze(td, dt, f0) {
        const n = td.length, i1 = n, i0 = Math.max(0, n - NW), e0 = Math.max(0, n - NE);
        let q = 0, zc = 0;
        for (let i = e0; i < n; i++) {
          q += td[i] * td[i];
          if (i > e0 && td[i] >= 0 !== td[i - 1] >= 0) zc++;
        }
        const rms = Math.sqrt(q / (n - e0));
        st.floor = rms < st.floor ? st.floor * 0.8 + rms * 0.2 : st.floor * (1 - dt * 0.03) + rms * dt * 0.03;
        st.pk = Math.max(rms, st.pk * Math.exp(-dt / 3), 0.01);
        const L = Math.pow(Math.min(1, Math.max(0, rms - st.floor * 1.5) / Math.max(6e-3, st.pk * 0.7 - st.floor * 1.5)), 0.6);
        const eT = q + 1e-12, eM = runEnergy(HP1, td, e0, n), eH = runEnergy(HP25, td, e0, n) + 1e-14, eH2 = runEnergy(HP55, td, e0, n), eL = runEnergy(LP4, td, e0, n), eA = runEnergy(HP4, td, e0, n) + 1e-13;
        feat.rms = rms;
        feat.L = L;
        feat.hf = eH / eA;
        feat.hf2 = eH2 / eH;
        feat.low = eL / eT;
        feat.hm = eM / eT;
        feat.zcr = zc / ((n - e0) / sr);
        feat.pg = 0;
        feat.F1 = feat.F2 = feat.F3 = 0;
        if (L > 0.04) {
          const base = i1 - ND * D;
          let prev = 0;
          for (let k = 0; k < ND; k++) {
            const c = base + k * D;
            let s = 0;
            for (let t = 0; t < taps; t++) {
              const j = c - t + (taps >> 1);
              s += h[t] * (j >= 0 && j < n ? td[j] : 0);
            }
            const y = s - 0.94 * prev;
            prev = s;
            xd[k] = y * ham[k];
          }
          feat.pg = lpc();
          if (feat.pg > 0) {
            const R = roots();
            const F1c = R.find((x) => x[0] > 200 && x[0] < 1300 && x[1] < 650);
            if (F1c) {
              const F2c = R.find((x) => x[0] > Math.max(600, F1c[0] + 180) && x[0] < 3500 && x[1] < 700);
              const F3c = F2c && R.find((x) => x[0] > F2c[0] + 250 && x[0] < 4800);
              feat.F1 = F1c[0];
              feat.B1 = F1c[1];
              feat.F2 = F2c ? F2c[0] : 0;
              feat.B2 = F2c ? F2c[1] : 0;
              feat.F3 = F3c ? F3c[0] : 0;
            }
          }
        }
        feat.voiced = f0 > 0 ? 1 : 0;
        if (f0 > 60 && f0 < 500 && L > 0.2) {
          st.f0m = st.f0n ? st.f0m + (f0 - st.f0m) * (st.f0n < 30 ? 0.1 : 0.01) : f0;
          st.f0n++;
        }
        const kF0 = st.f0n > 5 ? Math.max(1, Math.min(1.32, 1 + 17e-4 * (st.f0m - 120))) : 1.1;
        if (f0 > 0 && L > 0.35 && feat.F3 > 0 && feat.F2 > 0 && feat.hf < 0.12) {
          const a2 = 1 / Math.min(150, (st.fn = (st.fn || 0) + 1) + 10);
          st.l3 = st.l3 == null ? Math.log(feat.F3) : st.l3 + (Math.log(feat.F3) - st.l3) * a2;
          st.l2 = st.l2 == null ? Math.log(feat.F2) : st.l2 + (Math.log(feat.F2) - st.l2) * a2;
        }
        const kF = st.fn ? Math.exp(0.65 * (st.l3 - Math.log(KREF[0])) + 0.35 * (st.l2 - Math.log(KREF[1]))) : kF0, cf = Math.min(1, (st.fn || 0) / 40);
        st.k = opt.k || Math.max(0.85, Math.min(1.45, Math.exp(Math.log(kF0) * (1 - KREF[2] * cf) + Math.log(kF) * KREF[2] * cf)));
        feat.k = st.k;
        classify(dt);
        return feat;
      }
      const p = new Float32Array(NV), vw = new Float32Array(NV);
      function classify(dt) {
        const f = feat, L = f.L;
        p.fill(0);
        const speech = sm(0.03, 0.1, L);
        if (speech > 0.5) {
          if (st.speechT > 0) st.hist.length = 0;
          st.speechT = 0;
          const F2n = f.F2 && f.F1 ? f.F2 / f.k : 0;
          st.hist.push([st.t, F2n]);
          while (st.hist.length && st.t - st.hist[0][0] > 0.12) st.hist.shift();
        } else {
          if (st.speechT === 0) {
            const H = st.hist.filter((x) => x[1] > 0), last = H.slice(-2), ref = H.filter((x) => x[0] < (last.length ? last[0][0] : 0) - 0.02);
            const fl = last.length ? last.reduce((a2, x) => a2 + x[1], 0) / last.length : 0, fr = ref.length ? Math.max(...ref.map((x) => x[1])) : 0;
            st.lab = fl && fr ? sm(0.94, 0.87, fl / fr) : 0.5;
          }
          st.speechT += dt;
        }
        st.t += dt;
        const fric = sm(0.14, 0.32, f.hf) * speech;
        const hi = Math.max(sm(0.3, 0.42, f.hf2), sm(0.68, 0.8, f.hf) * sm(0.22, 0.3, f.hf2));
        const pS = fric * hi;
        const pCH = fric * (1 - hi) * sm(0.3, 0.45, f.hf) * sm(0.26, 0.36, L) * sm(4.5, 6, f.pg);
        const pF = fric * (1 - hi) - pCH;
        const F1 = f.F1 / f.k, F2 = f.F2 / f.k, F3 = f.F3 / f.k;
        const vox = speech * (1 - fric) * (F1 > 0 ? 1 : 0);
        let pM = 0, pT = speech * (1 - fric) - vox;
        if (vox > 0) {
          const mur = Math.max(sm(300, 265, F1), sm(332, 298, F1) * sm(240, 340, f.B2)) * sm(140, 230, f.B2) * (f.voiced ? 1 : 0.5);
          const lab = mur * sm(1500, 1300, F2 || 1e3);
          pM += vox * lab;
          pT += vox * (mur - lab);
          const vv = vox * (1 - mur) * sm(0.18, 0.42, L);
          pT += vox * (1 - mur) - vv;
          if (vv > 0 && F2 > 0) {
            const b1 = bark(F1), b2 = bark(F2), b32 = F3 > 0 ? bark(F3) - b2 : -1;
            vw.fill(0);
            let s2 = 0;
            for (const q of PROTO) {
              let d = Math.pow((b1 - q.b1) / 0.55, 2) + Math.pow((b2 - q.b2) / 0.8, 2);
              if (b32 >= 0 && q.b32 != null) d += Math.pow((b32 - q.b32) / 0.7, 2);
              const w = Math.exp(-0.5 * d) + 1e-6;
              s2 += w;
              for (const [c, x] of q.c) vw[c] += w * x;
            }
            for (let i = 0; i < NV; i++) p[i] += vv * vw[i] / s2;
          } else pT += vv;
          f.open = sm(300, 760, F1) * sm(0.15, 0.6, L);
        } else f.open = 0;
        const gap = (1 - speech) * (1 - sm(0.09, 0.16, st.speechT)) * (st.speechT > 0 || speech < 0.5 ? 1 : 0);
        pM += gap * st.lab;
        pT += gap * (1 - st.lab);
        p[VI.sil] += 1 - speech - gap;
        p[VI.M] += pM;
        p[VI.S] += pS;
        p[VI.CH] += pCH;
        p[VI.F] += Math.max(0, pF);
        p[VI.T] += Math.max(0, pT);
        let s = 0;
        for (let i = 0; i < NV; i++) s += p[i];
        if (s > 0) for (let i = 0; i < NV; i++) p[i] /= s;
        else p[VI.sil] = 1;
        f.p = p;
        f.gap = gap;
      }
      return { analyze, feat, st, fs, P: P2, D };
    }
    var MOUTH_KEYS = ["Jaw_Open", "Mouth_Oh", "Mouth_Pucker", "Mouth_Wide", "Mouth_Press", "Mouth_Grimace", "Mouth_Sad", "Mouth_Happy"];
    var POSE = {
      sil: [0, {}],
      M: [0, { Mouth_Press: 0.75 }],
      F: [0.05, { Mouth_Oh: 0.5, Mouth_Press: 0.3, Mouth_Sad: 0.12 }],
      S: [0.03, { Mouth_Grimace: 0.48, Mouth_Wide: 0.22 }],
      CH: [0.07, { Mouth_Grimace: 0.32, Mouth_Pucker: 0.55, Mouth_Oh: 0.15 }],
      A: [0.62, { Mouth_Oh: 0.25, Mouth_Wide: 0.12 }],
      E: [0.3, { Mouth_Oh: 0.35, Mouth_Wide: 0.35 }],
      I: [0.1, { Mouth_Grimace: 0.16, Mouth_Wide: 0.55, Mouth_Oh: 0.12 }],
      O: [0.36, { Mouth_Pucker: 0.55, Mouth_Oh: 0.05 }],
      OU: [0.1, { Mouth_Pucker: 0.92 }],
      EU: [0.23, { Mouth_Pucker: 0.48, Mouth_Oh: 0.3 }],
      T: [0.15, { Mouth_Oh: 0.32 }]
    };
    var VOWEL = /* @__PURE__ */ new Set(["A", "E", "I", "O", "OU", "EU"]);
    function createMouth(o = {}) {
      let seed2 = (o.seed || Math.random() * 1e6) | 0;
      const rnd3 = () => {
        seed2 = seed2 * 1664525 + 1013904223 >>> 0;
        return seed2 / 4294967296;
      };
      const ps = new Float32Array(NV);
      ps[0] = 1;
      const out = Object.fromEntries(MOUTH_KEYS.map((k) => [k, 0]));
      const S = { cur: 0, dwell: 1, lastV: VI.E, lastVw: 0, lv: 0, t: 0, idle: 0, twT: 2 + rnd3() * 3, tw: 0, twK: 0, asym: 0, asymT: 0, as: (rnd3() - 0.5) * 0.6 };
      const tgt = {};
      function step(dt, f) {
        S.t += dt;
        const kp = 1 - Math.exp(-dt / 0.025);
        for (let i = 0; i < NV; i++) ps[i] += (f.p[i] - ps[i]) * kp;
        let bi = 0;
        for (let i = 1; i < NV; i++) if (ps[i] > ps[bi]) bi = i;
        S.dwell += dt;
        const fast = bi === VI.M || bi === VI.sil || S.cur === VI.sil;
        if (bi !== S.cur && ps[bi] > ps[S.cur] + (fast ? 0.04 : 0.1) && (fast || S.dwell > 0.045)) {
          S.cur = bi;
          S.dwell = 0;
        }
        const cur = VIS[S.cur];
        if (VOWEL.has(cur)) {
          S.lastV = S.cur;
          S.lastVw = 1;
        } else S.lastVw = Math.max(0, S.lastVw - dt / 0.25);
        for (const k of MOUTH_KEYS) tgt[k] = 0;
        let jaw = 0, sw = 0;
        const add = (v, w) => {
          const P2 = POSE[v];
          jaw += P2[0] * w;
          for (const k in P2[1]) tgt[k] += P2[1][k] * w;
          sw += w;
        };
        add(cur, 0.65);
        for (let i = 0; i < NV; i++) if (ps[i] > 0.05) add(VIS[i], 0.35 * ps[i]);
        if (!VOWEL.has(cur) && cur !== "M" && cur !== "sil" && S.lastVw > 0) {
          const P2 = POSE[VIS[S.lastV]], c = (cur === "T" ? 0.5 : 0.3) * S.lastVw;
          for (const k in P2[1]) if (k !== "Mouth_Press") tgt[k] += P2[1][k] * c;
          jaw += P2[0] * c * 0.4;
          sw += c;
        }
        jaw /= sw;
        for (const k in tgt) tgt[k] /= sw;
        S.lv += ((f.L || 0) - S.lv) * (1 - Math.exp(-dt / 0.06));
        if (VOWEL.has(cur)) jaw = jaw * 0.55 + (0.06 + 0.62 * (f.open || 0)) * 0.45;
        jaw *= 0.6 + 0.7 * Math.min(1, S.lv);
        tgt.Jaw_Open = jaw;
        const quiet = cur === "sil" ? 1 : 0;
        S.idle += ((quiet ? 1 : 0) - S.idle) * (1 - Math.exp(-dt / 0.4));
        S.twT -= dt * S.idle;
        if (S.twT <= 0) {
          S.tw = 1;
          S.twK = rnd3() < 0.5 ? 0 : 1;
          S.twT = 2.5 + rnd3() * 5;
        }
        S.tw = Math.max(0, S.tw - dt / 0.9);
        const tw = Math.sin(Math.min(1, S.tw) * Math.PI) * S.idle;
        tgt.Jaw_Open += S.idle * (0.025 + 0.015 * Math.sin(S.t * 1.7));
        if (S.twK === 0) tgt.Mouth_Press += tw * 0.35;
        else {
          tgt.Mouth_Pucker += tw * 0.18;
          tgt.Mouth_Oh += tw * 0.12;
        }
        tgt.Mouth_Happy += 0.06 * S.idle;
        for (const k of MOUTH_KEYS) {
          const c = out[k], up = tgt[k] > c;
          const tau = k === "Jaw_Open" ? up ? 0.035 : 0.08 : k === "Mouth_Press" ? up ? 0.02 : 0.05 : up ? 0.035 : 0.07;
          out[k] = c + (tgt[k] - c) * (1 - Math.exp(-dt / tau));
        }
        S.asymT -= dt;
        if (S.asymT <= 0) {
          S.as = (rnd3() - 0.5) * 0.8;
          S.asymT = 1.5 + rnd3() * 3;
        }
        S.asym += (S.as - S.asym) * (1 - Math.exp(-dt / 0.8));
        return out;
      }
      return { step, out, get shown() {
        return VIS[S.cur];
      }, get asym() {
        return S.asym;
      }, ps };
    }
    function frenchVisemes(text) {
      const out = [], re = /[A-Za-zÀ-ÿœŒæÆ'’-]+/g;
      let m;
      while (m = re.exec(text)) {
        let w = m[0].toLowerCase().replace(/[’']/g, "'"), v = [];
        const parts = w.split(/['-]/).filter(Boolean);
        for (const p of parts) v.push(...wordVis(p));
        if (v.length) out.push({ w: m[0], i: m.index, v });
      }
      return out;
    }
    var MOTS = {
      est: "E",
      et: "E",
      es: "E",
      les: "T E",
      des: "T E",
      mes: "M E",
      tes: "T E",
      ses: "S E",
      ces: "S E",
      c: "S",
      j: "CH",
      l: "T",
      d: "T",
      m: "M",
      n: "T",
      s: "S",
      qu: "T",
      t: "T",
      je: "CH EU",
      le: "T EU",
      de: "T EU",
      te: "T EU",
      me: "M EU",
      ne: "T EU",
      se: "S EU",
      ce: "S EU",
      que: "T EU",
      oui: "OU I",
      non: "T O",
      eh: "E",
      oh: "O",
      ah: "A",
      y: "I",
      a: "A",
      à: "A",
      au: "O",
      aux: "O",
      tu: "T OU",
      vous: "F OU",
      nous: "T OU"
    };
    function wordVis(w) {
      if (MOTS[w]) return MOTS[w].split(" ").map((c) => [c, VOWEL.has(c) ? 1 : 0.7]);
      const V = [], vow = (x) => /[aeiouyéèêëàâîïôûùœ]/.test(x || "");
      const push = (c, d) => V.push([c, d]);
      let s = w;
      if (s.length > 2) s = s.replace(/s$/, "");
      let mute = false;
      if (s.length > 2 && /e$/.test(s)) {
        s = s.slice(0, -1);
        mute = true;
      }
      if (/(er|ez)$/.test(s) && s.length > 2) s = s.slice(0, -2) + "é";
      if (/et$/.test(s) && s.length > 2) s = s.slice(0, -2) + "è";
      if (!mute && s.length > 1 && /[^aeiouyéèêrcfl]$/.test(s)) s = s.replace(/(t|d|x|z|p|s|g)$/, "");
      let i = 0;
      const at = (k) => s.substr(i, k), nx = (k) => s[i + k];
      while (i < s.length) {
        const c = s[i];
        if (at(3) === "eau") {
          push("O", 1);
          i += 3;
          continue;
        }
        if (at(2) === "au") {
          push("O", 1);
          i += 2;
          continue;
        }
        if (at(2) === "ou" || at(2) === "où") {
          push("OU", 1);
          i += 2;
          continue;
        }
        if (at(2) === "oi") {
          push("OU", 0.5);
          push("A", 1);
          i += 2;
          continue;
        }
        if (at(2) === "ai" || at(2) === "ei") {
          if (/^[mn][^aeiouyéèê]?/.test(s.slice(i + 2)) && !vow(nx(3))) {
            push("E", 1);
            i += 3;
            continue;
          }
          push("E", 1);
          i += 2;
          continue;
        }
        if (at(2) === "eu" || at(2) === "œu") {
          push("EU", 1);
          i += 2;
          continue;
        }
        if (/^(an|am|en|em)/.test(at(2)) && !vow(nx(2)) && nx(2) !== "n" && nx(2) !== "m") {
          push("A", 1);
          push("O", 0.3);
          i += 2;
          continue;
        }
        if (/^(on|om)/.test(at(2)) && !vow(nx(2)) && nx(2) !== "n" && nx(2) !== "m") {
          push("O", 1);
          i += 2;
          continue;
        }
        if (/^(in|im|un|um|yn)/.test(at(2)) && !vow(nx(2)) && nx(2) !== "n" && nx(2) !== "m") {
          push("E", 1);
          i += 2;
          continue;
        }
        if (at(3) === "ill" && i > 0) {
          push("I", 0.6);
          i += 3;
          continue;
        }
        if (at(3) === "ien") {
          push("I", 0.5);
          push("E", 1);
          i += 3;
          continue;
        }
        if (at(2) === "ch") {
          push("CH", 0.8);
          i += 2;
          continue;
        }
        if (at(2) === "ph") {
          push("F", 0.7);
          i += 2;
          continue;
        }
        if (at(2) === "gn") {
          push("T", 0.6);
          i += 2;
          continue;
        }
        if (at(2) === "qu" || at(2) === "gu") {
          push("T", 0.6);
          i += 2;
          continue;
        }
        if (at(2) === "ss") {
          push("S", 0.8);
          i += 2;
          continue;
        }
        if (c === nx(1) && /[bcdfgklmnprtz]/.test(c)) {
          i++;
          continue;
        }
        switch (c) {
          case "a":
          case "à":
          case "â":
            push("A", 1);
            break;
          case "e":
            push(!vow(nx(1)) && nx(1) && (!vow(nx(2)) || i + 2 >= s.length) && i > 0 ? "E" : "EU", 0.8);
            break;
          // e + 2 consonnes ou consonne finale : è
          case "é":
          case "è":
          case "ê":
          case "ë":
            push("E", 1);
            break;
          case "i":
          case "î":
          case "ï":
          case "y":
            push("I", vow(nx(1)) ? 0.5 : 1);
            break;
          case "o":
          case "ô":
            push("O", 1);
            break;
          case "u":
          case "û":
          case "ù":
            push("OU", vow(nx(1)) ? 0.5 : 1);
            break;
          case "œ":
            push("EU", 1);
            break;
          case "b":
          case "p":
          case "m":
            push("M", 0.7);
            break;
          case "f":
          case "v":
            push("F", 0.7);
            break;
          case "w":
            push("OU", 0.5);
            break;
          case "s":
          case "z":
          case "ç":
            push("S", 0.8);
            break;
          case "x":
            push("T", 0.4);
            push("S", 0.7);
            break;
          case "c":
            push(/[eiyéèê]/.test(nx(1) || "") ? "S" : "T", 0.6);
            break;
          case "g":
            push(/[eiyéèê]/.test(nx(1) || "") ? "CH" : "T", 0.6);
            break;
          case "j":
            push("CH", 0.8);
            break;
          case "h":
            break;
          default:
            if (/[a-zà-ÿ]/.test(c)) push("T", 0.55);
        }
        i++;
      }
      return V;
    }

    // src/mots.js
    var WORD_CAT = {
      oui: "oui",
      ouais: "oui",
      non: "non",
      nan: "non",
      salut: "salut",
      coucou: "salut",
      haha: "rire",
      hahaha: "rire",
      hahahaha: "rire",
      hihi: "rire",
      hihihi: "rire",
      hihihihi: "rire",
      hehe: "rire",
      "héhé": "rire",
      "héhéhé": "rire",
      mdr: "rire",
      lol: "rire",
      iii: "rire"
    };
    var LAUGH_SYL = { ha: 1, hi: 1, "hé": 1, he: 1, ah: 1 };
    for (const w of ["grr", "grrr", "grrrr", "grrrrr", "rrrr"]) WORD_CAT[w] = "grr";
    var FACHE_W = {
      "fâché": 1,
      "fâchée": 1,
      "fâchés": 1,
      "fâchées": 1,
      "énervé": 1,
      "énervée": 1,
      "énervés": 1,
      "énervées": 1,
      "énerve": 1,
      "m'énerve": 1,
      "m'énervent": 1,
      "énervent": 1,
      "colère": 1,
      "marre": 1
    };
    var CONTENT_W = { content: 1, contente: 1, contents: 1, contentes: 1 };
    var NUL_BEFORE = { "c'est": 1, est: 1, trop: 1, vraiment: 1, super: 1, "archi": 1, "c'était": 1 };
    var NEG = { pas: 1, jamais: 1 };
    var RAS = { ras: 1, s: 1, rat: 1, rase: 1 };
    var negated = (t, i) => {
      for (let k = Math.max(0, i - 3); k < i; k++) if (NEG[t[k]]) return true;
      return false;
    };
    function facheAt(t, i) {
      const w = t[i];
      if (CONTENT_W[w]) return negated(t, i);
      if (w === "nul" || w === "nulle") return !!NUL_BEFORE[t[i - 1]] && !negated(t, i);
      if (w === "bol") return t[i - 1] === "le" && RAS[t[i - 2]] && !negated(t, i - 2);
      if (w === "ras-le-bol") return !negated(t, i);
      return !!FACHE_W[w] && !negated(t, i);
    }
    var SEPT_END = { "c'est": 1, sais: 1 };
    var sixSeptAt = (t, i) => {
      const w = t[i], p = t[i - 1];
      if ((w === "sept" || w === "seven" || w === "7") && (p === "six" || p === "6")) return true;
      if (w === "cévennes" && (p === "si" || p === "six")) return true;
      return SEPT_END[w] && p === "six" && i === t.length - 1;
    };
    var FIN_MS = 120;
    var PEND_MS = 80;
    var PRIME_MS = 280;
    var PRE_MS = 240;
    var CONF = [
      "--min-active=200",
      "--max-active=3000",
      "--beam=10.0",
      "--lattice-beam=2.0",
      "--acoustic-scale=1.0",
      "--frame-subsampling-factor=3",
      "--frames-per-chunk=9",
      "--endpoint.silence-phones=1:2:3:4:5:6:7:8:9:10",
      "--endpoint.rule2.min-trailing-silence=0.5",
      "--endpoint.rule3.min-trailing-silence=1.0",
      "--endpoint.rule4.min-trailing-silence=2.0"
    ].join("\n") + "\n";
    var toks = (text) => String(text || "").toLowerCase().split(/\s+/).filter(Boolean);
    function catsOf(text) {
      const out = [], t = toks(text);
      for (const [, c] of keysOf(t)) out.push(c);
      return out;
    }
    function keysOf(t) {
      const out = [];
      for (let i = 0; i < t.length; i++) {
        const c = WORD_CAT[t[i]];
        if (c) out.push([i, c]);
        else if (LAUGH_SYL[t[i]] && LAUGH_SYL[t[i + 1]]) {
          while (LAUGH_SYL[t[i + 1]]) i++;
          out.push([i, "rire"]);
        } else if (sixSeptAt(t, i)) out.push([i, "sixsept"]);
        else if (facheAt(t, i)) out.push([i, "fache"]);
      }
      return out;
    }
    function createTrigger(o = {}) {
      const cool = o.cool == null ? 1500 : o.cool, pend = o.pend == null ? PEND_MS : o.pend, done = /* @__PURE__ */ new Set(), last = {};
      let prev = null;
      const T4 = {
        hint: "",
        // kind : 'p' (partiel) | 'r' (résultat final : la phrase est finie) ; info.quiet = ms de silence après la voix à la fin du son décodé
        // rend la catégorie à jouer maintenant, ou ''
        feed(kind, text, now, info) {
          const t0 = toks(text), quiet = info && info.quiet != null ? info.quiet : -1;
          let fire = "";
          T4.hint = "";
          const glue = prev && now - prev.t < 1500 && prev.w === "six" && t0.length ? 1 : 0, t = glue ? [prev.w].concat(t0) : t0;
          for (const [i, c] of keysOf(t)) {
            if (glue && c !== "sixsept") continue;
            if (kind !== "r") {
              const followed = i < t.length - 1 && t.slice(i + 1).some((w) => w !== "[unk]");
              if (!followed && !(pend > 0 && quiet >= pend)) {
                const key2 = i + ":" + c;
                if (!done.has(key2)) T4.hint = c;
                continue;
              }
            }
            const key = i + ":" + c;
            if (done.has(key)) continue;
            done.add(key);
            if (!fire && !(last[c] != null && now - last[c] < cool)) {
              fire = c;
              last[c] = now;
            }
          }
          if (kind === "r") {
            done.clear();
            T4.hint = "";
            prev = t0.length ? { w: t0[t0.length - 1], t: now } : prev;
          }
          return fire;
        },
        // une catégorie jouée AILLEURS (grognement entendu au son) : même pause avant de la rejouer ; rend true si elle peut jouer maintenant
        take(c, now) {
          if (last[c] != null && now - last[c] < cool) return false;
          last[c] = now;
          return true;
        },
        reset() {
          done.clear();
          T4.hint = "";
          prev = null;
        }
      };
      return T4;
    }
    var GRR = { win: 160, mn: 0.35, slow: 0.35, fast: 0.27, per: 0.45, need: 3, rmin: 17, rmax: 72, clean: 0.8, rclean: 45 };
    function createGrowl(opt = {}) {
      const P2 = Object.assign({}, GRR, opt), W = P2.win, SR = 16e3;
      const a1 = Math.exp(-2 * Math.PI * 1e3 / SR), a8 = Math.exp(-2 * Math.PI * 70 / SR);
      const env2 = new Float32Array(W), sl = new Float32Array(W / 10), d = new Float32Array(W), px = new Float32Array(400);
      let l1 = 0, l2 = 0, e1 = 0, e2 = 0, k = 0, n = 0, wp = 0, run = 0, off = 0, on = false, loudN = 0;
      const lagMin = Math.max(5, Math.ceil(500 / P2.rmax)), lagMax = Math.ceil(500 / P2.rmin);
      const G = {
        last: null,
        // derniers traits (essais)
        // f32 : morceau 16 kHz ; loud : la porte de voix entend une voix dans ce morceau ; rend 'fire' (début du grognement), 'hold' (il dure) ou ''
        feed(f32, loud) {
          let np = 0;
          for (let i = 0; i < f32.length; i++) {
            l1 = a1 * l1 + (1 - a1) * f32[i];
            l2 = a1 * l2 + (1 - a1) * l1;
            const r = l2 < 0 ? -l2 : l2;
            if ((i & 3) === 0 && np < px.length) px[np++] = l2;
            e1 = a8 * e1 + (1 - a8) * r;
            e2 = a8 * e2 + (1 - a8) * e1;
            if (++k === 32) {
              k = 0;
              env2[wp] = e2;
              wp = (wp + 1) % W;
              if (n < W) n++;
            }
          }
          loudN = loud ? loudN + 1 : 0;
          let ok = false;
          if (n === W && loudN * f32.length >= W * 32) {
            let m = 0;
            for (let i = 0; i < W; i++) m += env2[i];
            m /= W;
            if (m > 1e-6) {
              let sm2 = 0, mn = 9;
              for (let j = 0; j < W / 10; j++) {
                let q = 0;
                for (let u = 0; u < 10; u++) q += env2[(wp + j * 10 + u) % W];
                sl[j] = q / 10;
                sm2 += sl[j];
              }
              sm2 /= W / 10;
              let sv = 0;
              for (let j = 0; j < W / 10; j++) {
                sv += (sl[j] - sm2) * (sl[j] - sm2);
                if (sl[j] < mn) mn = sl[j];
              }
              const slow = Math.sqrt(sv / (W / 10)) / sm2;
              mn /= sm2;
              let r0 = 0;
              for (let i = 0; i < W; i++) {
                d[i] = env2[(wp + i) % W] - sl[Math.floor(i / 10)];
                r0 += d[i] * d[i];
              }
              const fast = Math.sqrt(r0 / W) / m;
              let per = 0, prev = -2, cur = -2, rate = 0;
              for (let L = lagMin - 1; L <= lagMax + 1; L++) {
                let r = 0;
                for (let i = L; i < W; i++) r += d[i] * d[i - L];
                r /= r0 + 1e-12;
                if (L - 1 >= lagMin && L - 1 <= lagMax && cur > prev && cur >= r && cur > per) {
                  per = cur;
                  rate = 500 / (L - 1);
                }
                prev = cur;
                cur = r;
              }
              let pr = 0, f0 = 0;
              {
                const N2 = np, lo = 10, hi = Math.min(57, N2 >> 1);
                let e0 = 0;
                for (let i = 0; i < N2; i++) e0 += px[i] * px[i];
                for (let L = lo; L <= hi; L++) {
                  let r = 0, e12 = 0;
                  for (let i = L; i < N2; i++) {
                    r += px[i] * px[i - L];
                    e12 += px[i - L] * px[i - L];
                  }
                  const c = r / Math.sqrt((e0 + 1e-12) * (e12 + 1e-12));
                  if (c > pr) {
                    pr = c;
                    f0 = 4e3 / L;
                  }
                }
              }
              const sus = mn > P2.mn && slow < P2.slow, clean = pr >= P2.clean;
              const pitchy = pr >= 0.5 && f0 > 0 && rate > 0 && (Math.abs(rate - f0) < 0.25 * f0 || Math.abs(2 * rate - f0) < 0.2 * f0);
              ok = sus && !pitchy && (clean ? per >= P2.per + 0.05 && rate <= Math.min(P2.rclean, 0.6 * f0) : fast >= P2.fast || per >= P2.per);
              G.last = { mn, slow, fast, per, rate, pr, f0, sus, ok };
            }
          } else G.last = null;
          if (ok) {
            run++;
            off = 0;
          } else {
            run = 0;
            off++;
          }
          if (!on && run >= P2.need) {
            on = true;
            return "fire";
          }
          if (on) {
            if (off >= 4) {
              on = false;
              return "";
            }
            return "hold";
          }
          return "";
        },
        reset() {
          l1 = l2 = e1 = e2 = 0;
          k = n = wp = run = off = loudN = 0;
          on = false;
          env2.fill(0);
        }
      };
      return G;
    }
    var TAP = `class JdwMots extends AudioWorkletProcessor {
      constructor(o) { super(); const p = (o && o.processorOptions) || {}; this.ch = p.ch || 640; this.step = sampleRate / 16000; this.ph = 0; this.prev = 0;
        const f = Math.min(7000, sampleRate * 0.45), w = 2 * Math.PI * f / sampleRate, c = Math.cos(w), s = Math.sin(w) / (2 * 0.7071), a0 = 1 + s;
        this.b0 = (1 - c) / 2 / a0; this.b1 = (1 - c) / a0; this.b2 = this.b0; this.a1 = -2 * c / a0; this.a2 = (1 - s) / a0;
        this.z = [0, 0, 0, 0, 0, 0, 0, 0]; this.buf = new Float32Array(this.ch); this.n = 0; this.on = true; this.port.onmessage = (e) => { if (e.data === 'stop') this.on = false; }; }
      lp(x, k) { const z = this.z, y = this.b0 * x + this.b1 * z[k] + this.b2 * z[k + 1] - this.a1 * z[k + 2] - this.a2 * z[k + 3]; z[k + 1] = z[k]; z[k] = x; z[k + 3] = z[k + 2]; z[k + 2] = y; return y; }
      process(inputs) {
        if (!this.on) return false; const x = inputs[0] && inputs[0][0]; if (!x) return true;
        for (let i = 0; i < x.length; i++) {
          const v = this.lp(this.lp(x[i], 0), 4);
          this.ph += 1; while (this.ph >= this.step) { this.ph -= this.step; const f = 1 - this.ph; this.buf[this.n++] = this.prev + (v - this.prev) * Math.min(1, Math.max(0, f));
            if (this.n === this.ch) { this.port.postMessage(this.buf, [this.buf.buffer]); this.buf = new Float32Array(this.ch); this.n = 0; } }
          this.prev = v;
        }
        return true;
      }
    }
    registerProcessor('jdw-mots', JdwMots);`;
    async function makeTap(ctx, source, ch, onChunk) {
      const sink = ctx.createGain();
      sink.gain.value = 0;
      sink.connect(ctx.destination);
      if (ctx.audioWorklet && typeof AudioWorkletNode !== "undefined") {
        try {
          if (!ctx.__jdwMots) {
            const u = URL.createObjectURL(new Blob([TAP], { type: "text/javascript" }));
            try {
              await ctx.audioWorklet.addModule(u);
            } finally {
              URL.revokeObjectURL(u);
            }
            ctx.__jdwMots = true;
          }
          const node = new AudioWorkletNode(ctx, "jdw-mots", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { ch } });
          node.port.onmessage = (e) => onChunk(e.data);
          source.connect(node);
          node.connect(sink);
          return { kind: "worklet", stop() {
            try {
              node.port.postMessage("stop");
            } catch (e) {
            }
            try {
              source.disconnect(node);
            } catch (e) {
            }
            try {
              node.disconnect();
              sink.disconnect();
            } catch (e) {
            }
          } };
        } catch (e) {
        }
      }
      if (typeof ctx.createScriptProcessor !== "function") throw new Error("pas de prise de son");
      const sp = ctx.createScriptProcessor(2048, 1, 1), step = ctx.sampleRate / 16e3;
      let ph = 0, prev = 0, buf = new Float32Array(ch), n = 0;
      const z = [0, 0, 0, 0, 0, 0, 0, 0];
      const f = Math.min(7e3, ctx.sampleRate * 0.45), w = 2 * Math.PI * f / ctx.sampleRate, c = Math.cos(w), s = Math.sin(w) / (2 * 0.7071), a0 = 1 + s;
      const b0 = (1 - c) / 2 / a0, b1 = (1 - c) / a0, b2 = b0, a1 = -2 * c / a0, a2 = (1 - s) / a0;
      const lp = (x, k) => {
        const y = b0 * x + b1 * z[k] + b2 * z[k + 1] - a1 * z[k + 2] - a2 * z[k + 3];
        z[k + 1] = z[k];
        z[k] = x;
        z[k + 3] = z[k + 2];
        z[k + 2] = y;
        return y;
      };
      sp.onaudioprocess = (e) => {
        const x = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < x.length; i++) {
          const v = lp(lp(x[i], 0), 4);
          ph += 1;
          while (ph >= step) {
            ph -= step;
            buf[n++] = prev + (v - prev) * Math.min(1, Math.max(0, 1 - ph));
            if (n === ch) {
              onChunk(buf);
              buf = new Float32Array(ch);
              n = 0;
            }
          }
          prev = v;
        }
      };
      source.connect(sp);
      sp.connect(sink);
      return { kind: "script", stop() {
        sp.onaudioprocess = null;
        try {
          source.disconnect(sp);
        } catch (e) {
        }
        try {
          sp.disconnect();
          sink.disconnect();
        } catch (e) {
        }
      } };
    }
    var VOSK = null;
    function loadVosk(url) {
      if (window.Vosk && window.Vosk.createModel) return Promise.resolve(window.Vosk);
      if (VOSK) return VOSK;
      VOSK = (async () => {
        const r = await fetch(url);
        if (!r.ok) throw new Error("vosk " + r.status);
        const src = await r.text();
        const u = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = u;
          s.onload = res;
          s.onerror = () => rej(new Error("vosk : script"));
          document.head.appendChild(s);
        });
        URL.revokeObjectURL(u);
        if (!window.Vosk || !window.Vosk.createModel) throw new Error("vosk : absent");
        return window.Vosk;
      })();
      VOSK.catch(() => {
        VOSK = null;
      });
      return VOSK;
    }
    function createWords(o) {
      const ch = o.ch || 640, chMs = ch / 16, finMs = o.finMs || FIN_MS, preN = Math.max(0, Math.round((o.preMs == null ? PRE_MS : o.preMs) / chMs)), maxQ = o.maxQ || Math.round(480 / chMs);
      const primeN = Math.max(0, Math.round((o.primeMs == null ? PRIME_MS : o.primeMs) / chMs));
      const gate = o.gate !== false, onWord = o.onWord || (() => {
      }), onState = o.onState || (() => {
      }), diag = o.diag || (() => {
      }), onProgress = o.onProgress || (() => {
      });
      const onVoice = o.onVoice || (() => {
      }), onHint = o.onHint || (() => {
      }), onGrowl = o.onGrowl || (() => {
      });
      const GR = o.growl === false ? null : createGrowl(o.growlOpt);
      const S = {
        st: "off",
        model: null,
        rec: null,
        tap: null,
        feedOn: false,
        gen: 0,
        Q: [],
        sent: 0,
        drop: 0,
        lagMax: 0,
        lagSum: 0,
        lagN: 0,
        loud: -1,
        floor: 3e-3,
        voice: false,
        sil: 0,
        pos: 0,
        heard: {},
        flush: 0,
        slow: 0,
        skip: false,
        t0: 0,
        secs: 0,
        loadMs: 0,
        why: "",
        dead: false,
        open: false,
        ring: [],
        gated: 0,
        opens: 0,
        pfire: 0,
        rfire: 0,
        finSum: 0,
        finN: 0,
        finMax: 0,
        hint: "",
        ph: {},
        mcSum: 0,
        mcN: 0,
        mcMax: 0,
        mfSum: 0,
        mfN: 0,
        mfMax: 0,
        grrSon: 0,
        grrT: -9
      };
      const trig = createTrigger({ cool: o.cool, pend: o.pendMs == null ? PEND_MS : o.pendMs });
      const set = (st, info) => {
        S.st = st;
        try {
          onState(st, info || {});
        } catch (e) {
        }
      };
      async function ensure() {
        if (S.rec) return true;
        if (S.loading) return S.loading;
        S.loading = (async () => {
          const t0 = performance.now();
          set("load", { first: !o.cached });
          if (typeof WebAssembly !== "object" || typeof Worker === "undefined") throw new Error("pas de WebAssembly");
          if (o.wait) {
            try {
              await o.wait;
            } catch (e) {
            }
          }
          const tw = performance.now();
          const V = await loadVosk(o.voskUrl);
          const t1 = performance.now();
          try {
            onProgress("vosk", 0.05, {});
          } catch (e) {
          }
          const model = new V.Model(o.modelUrl, -1);
          try {
            model.worker.postMessage(Object.assign({ action: "jdw", conf: o.conf == null ? CONF : o.conf }, o.slow ? { slow: o.slow } : {}));
          } catch (e) {
          }
          model.on("jdwprogress", (m) => {
            const ms = Math.round(performance.now() - t1);
            if (m.phase !== "dl") S.ph[m.phase] = ms;
            else S.dl = true;
            try {
              onProgress(m.phase, m.phase === "dl" && m.of ? m.n / m.of : null, { ms, n: m.n, of: m.of });
            } catch (e) {
            }
          });
          await new Promise((res, rej) => {
            const tm = setTimeout(() => rej(new Error("trop long")), o.timeout || 18e4);
            model.on("load", (m) => {
              clearTimeout(tm);
              if (m && m.result) res();
              else rej(new Error("chargement"));
            });
            model.on("error", (m) => {
              clearTimeout(tm);
              rej(new Error(String(m && m.error || "erreur").slice(0, 80)));
            });
            try {
              model.worker.addEventListener("error", (e) => {
                try {
                  e.preventDefault();
                } catch (x) {
                }
                clearTimeout(tm);
                rej(new Error("worker : " + String(e && e.message || "").slice(0, 60)));
              });
            } catch (e) {
            }
          }).catch((e) => {
            try {
              model.worker.terminate();
            } catch (x) {
            }
            throw e;
          });
          if (S.dead) {
            try {
              model.terminate();
            } catch (e) {
            }
            return false;
          }
          model.on("error", (m) => {
            diag("err-model", "mots : erreur du moteur", { e: String(m && m.error || "").slice(0, 120) });
          });
          const rec = new model.KaldiRecognizer(16e3);
          rec.on("partialresult", (m) => got("p", m && m.result && m.result.partial, m && m.ms, m && m.msA));
          rec.on("result", (m) => got("r", m && m.result && m.result.text, m && m.ms, m && m.msA));
          S.Q.push({ t: performance.now(), end: 0, g: -1, k: "c" });
          try {
            rec.acceptWaveformFloat(new Float32Array(1600), 16e3);
          } catch (e) {
            S.Q.pop();
          }
          if (o.warm !== false) {
            let sd = 7;
            const x = new Float32Array(12800);
            for (let i = 0; i < x.length; i++) {
              sd = sd * 1103515245 + 12345 & 2147483647;
              x[i] = (sd / 2147483647 - 0.5) * 0.25 * (0.55 + 0.45 * Math.sin(i / 16e3 * 2 * Math.PI * 4));
            }
            S.Q.push({ t: performance.now(), end: 0, g: -1, k: "c" });
            try {
              rec.acceptWaveformFloat(x, 16e3);
            } catch (e) {
              S.Q.pop();
            }
          }
          S.Q.push({ t: performance.now(), end: 0, g: -1, k: "f", warm: true });
          try {
            rec.retrieveFinalResult();
          } catch (e) {
            S.Q.pop();
          }
          const tw0 = performance.now();
          await new Promise((res) => {
            S.warmRes = res;
            setTimeout(res, 15e3);
          });
          S.warmRes = null;
          S.warmMs = Math.round(performance.now() - tw0);
          S.model = model;
          S.rec = rec;
          S.loadMs = Math.round(performance.now() - t0);
          const ph = Object.assign({}, S.ph);
          diag(
            "ready",
            "mots prêts (" + (S.dl ? "téléchargés" : "depuis l’appareil") + ", " + S.loadMs + " ms)",
            { attente: Math.round(tw - t0), vosk: Math.round(t1 - tw), modele: Math.round(performance.now() - t1), miseEnRoute: S.warmMs, etapes: ph, cache: !!o.cached }
          );
          set("ready", { ms: S.loadMs });
          return true;
        })().catch((e) => {
          S.why = String(e && e.message || e).slice(0, 120);
          diag("fail", "mots impossibles (" + S.why + ")");
          set("fail", { why: S.why });
          return false;
        }).finally(() => {
          S.loading = null;
        });
        return S.loading;
      }
      function got(kind, text, ms, msA) {
        const at = S.Q.shift(), now = performance.now();
        if (o.trace && at) o.trace.push([Math.round(now), kind, Math.round(now - at.t), at.k, at.g, S.Q.length, ms == null ? null : Math.round(ms * 10) / 10, msA == null ? null : Math.round(msA * 10) / 10]);
        if (at && at.g >= 0) {
          const lag = now - at.t;
          S.lagSum += lag;
          S.lagN++;
          if (lag > S.lagMax) S.lagMax = lag;
          if (at.k === "f" && at.g >= 0) {
            S.finSum += lag;
            S.finN++;
            if (lag > S.finMax) S.finMax = lag;
          }
          if (ms != null && at.g >= 0) {
            if (at.k === "f") {
              S.mfSum += ms;
              S.mfN++;
              S.mfMax = Math.max(S.mfMax, ms);
            } else {
              S.mcSum += ms;
              S.mcN++;
              S.mcMax = Math.max(S.mcMax, ms);
            }
          }
        }
        if (at && at.warm && S.warmRes) S.warmRes();
        if (!at || at.g !== S.gen) return;
        const quiet = at.loud >= 0 ? Math.max(0, (at.end - at.loud) / 16) : -1;
        let c = trig.feed(kind, text, now, { quiet });
        if (c && c !== "grr" && now - S.grrT < 600) c = "";
        if (trig.hint !== S.hint) {
          S.hint = trig.hint;
          try {
            onHint(S.hint);
          } catch (e) {
          }
        }
        if (!c) return;
        if (kind === "p") S.pfire++;
        else S.rfire++;
        const calc = Math.round(now - at.t), fin = at.loud >= 0 ? Math.round(quiet + calc) : null;
        S.heard[c] = (S.heard[c] || 0) + 1;
        try {
          onWord(c, { fin, calc, final: kind === "r", quiet: Math.round(quiet) });
        } catch (e) {
        }
      }
      function send(f32) {
        S.Q.push({ t: performance.now(), end: S.pos, loud: S.loud, g: S.gen, k: "c" });
        S.sent++;
        try {
          S.rec.acceptWaveformFloat(f32, 16e3);
        } catch (e) {
          S.Q.pop();
          S.sent--;
        }
      }
      function flush() {
        S.flush++;
        S.Q.push({ t: performance.now(), end: S.pos, loud: S.loud, g: S.gen, k: "f" });
        try {
          S.rec.retrieveFinalResult();
        } catch (e) {
          S.Q.pop();
        }
      }
      function chunk(f32) {
        if (!S.rec || S.dead || !(S.tap || S.feedOn)) return;
        let q = 0;
        for (let i = 0; i < f32.length; i++) q += f32[i] * f32[i];
        const rms = Math.sqrt(q / f32.length);
        S.floor = rms < S.floor ? S.floor * 0.8 + rms * 0.2 : S.floor * 0.998 + rms * 2e-3;
        S.pos += f32.length;
        const loud = rms > Math.max(6e-3, S.floor * 4);
        if (loud) {
          S.loud = S.pos;
          S.sil = 0;
          if (!S.voice) {
            S.voice = true;
            S.vstart = S.pos - f32.length;
            try {
              onVoice(true);
            } catch (e) {
            }
          }
        } else if (S.voice) S.sil += f32.length / 16;
        if (GR) {
          const g = GR.feed(f32, loud), now = performance.now();
          if (g) S.grrT = now;
          if (g === "fire" && trig.take("grr", now)) {
            S.grrSon++;
            S.heard.grr = (S.heard.grr || 0) + 1;
            try {
              onWord("grr", { fin: null, calc: 0, final: false, son: true });
            } catch (e) {
            }
          } else if (g === "hold") {
            try {
              onGrowl();
            } catch (e) {
            }
          }
        }
        if (gate && S.open && S.prime > 0) {
          if (!loud && !S.voice) {
            S.prime--;
            send(f32);
            if (!S.prime) S.open = false;
            return;
          }
          S.prime = 0;
          S.opens++;
        }
        if (gate && !S.open) {
          if (!loud) {
            S.ring.push(f32);
            if (S.ring.length > preN) S.ring.shift();
            S.gated++;
            return;
          }
          S.open = true;
          S.opens++;
          S.skip = false;
          S.prime = 0;
          for (const r of S.ring) send(r);
          S.ring.length = 0;
        }
        const inflight = S.Q.length;
        if (!S.skip && inflight > maxQ) {
          S.skip = true;
          S.slow++;
          flush();
          if (performance.now() - S.t0 > 3e3) diag("slow", "mots : l’appareil est en retard (" + inflight + " morceaux en attente)", { calcMax: Math.round(S.lagMax) });
        }
        if (S.skip) S.drop++;
        else send(f32);
        if (S.voice && !loud && S.sil >= finMs) {
          S.voice = false;
          try {
            onVoice(false, (S.pos - S.vstart) / 16);
          } catch (e) {
          }
          if (!S.skip) flush();
          if (gate) {
            if (primeN > 0 && !S.skip) S.prime = primeN;
            else S.open = false;
          }
          S.skip = false;
        } else if (!gate && S.skip && !S.voice) S.skip = false;
      }
      function begin() {
        S.gen++;
        trig.reset();
        if (GR) GR.reset();
        S.loud = -1;
        S.voice = false;
        S.sil = 0;
        S.ring.length = 0;
        S.skip = false;
        S.t0 = performance.now();
        S.open = gate && primeN > 0;
        S.prime = S.open ? primeN : 0;
      }
      return {
        preload() {
          S.dead = false;
          return ensure();
        },
        async start(ctx, source) {
          S.dead = false;
          if (S.tap) return true;
          const ok = await ensure();
          if (!ok || S.dead) return false;
          if (S.tap) return true;
          try {
            begin();
            S.tap = await makeTap(ctx, source, ch, chunk);
            diag("tap:" + S.tap.kind, "mots : prise du son " + (S.tap.kind === "worklet" ? "AudioWorklet" : "ScriptProcessor") + " (" + ctx.sampleRate + " Hz)");
            return true;
          } catch (e) {
            S.tap = null;
            diag("fail-tap", "mots : prise du son impossible (" + String(e && e.message || e).slice(0, 80) + ")");
            return false;
          }
        },
        // essais : son 16 kHz fourni à la main (même chemin que la prise du micro)
        async feedStart() {
          S.dead = false;
          const ok = await ensure();
          if (!ok) return false;
          begin();
          S.feedOn = true;
          return true;
        },
        feed(f32) {
          chunk(f32);
        },
        stop() {
          if (S.tap) {
            try {
              S.tap.stop();
            } catch (e) {
            }
            S.tap = null;
            S.secs += (performance.now() - S.t0) / 1e3;
          }
          if (S.feedOn) {
            S.feedOn = false;
            S.secs += (performance.now() - S.t0) / 1e3;
          }
          if (S.rec && S.open) {
            S.Q.push({ t: performance.now(), end: S.pos, loud: -1, g: -1, k: "f" });
            try {
              S.rec.retrieveFinalResult();
            } catch (e) {
              S.Q.pop();
            }
          }
          S.open = false;
          S.gen++;
          if (S.hint) {
            S.hint = "";
            try {
              onHint("");
            } catch (e) {
            }
          }
        },
        dispose() {
          this.stop();
          S.dead = true;
          if (S.model) {
            try {
              S.model.terminate();
            } catch (e) {
            }
          }
          S.model = S.rec = null;
          set("off");
        },
        // le grognement au son entend en ce moment un son TENU et rugueux (le rire « au ton » s'efface devant lui : un « rrr » n'est pas un rire)
        rough: () => !!(GR && (GR.last && GR.last.ok || performance.now() - S.grrT < 300)),
        state: () => S.st,
        stats: () => ({
          morceaux: S.sent,
          silencesNonEnvoyes: S.gated,
          phrases: S.opens,
          finsDemandees: S.flush,
          sautes: S.drop,
          retards: S.slow,
          calcMoyen: S.lagN ? Math.round(S.lagSum / S.lagN) : null,
          calcMax: Math.round(S.lagMax),
          finMoyen: S.finN ? Math.round(S.finSum / S.finN) : null,
          finMax: Math.round(S.finMax),
          // calcul DANS le moteur (sans l'attente) : par morceau et par résultat final
          moteurMorceau: S.mcN ? +(S.mcSum / S.mcN).toFixed(1) : null,
          moteurMorceauMax: Math.round(S.mcMax),
          moteurFinal: S.mfN ? Math.round(S.mfSum / S.mfN) : null,
          moteurFinalMax: Math.round(S.mfMax),
          surPartielle: S.pfire,
          surFinal: S.rfire,
          grrAuSon: S.grrSon,
          compris: Object.assign({}, S.heard),
          secondes: Math.round(S.secs),
          chargement: S.loadMs
        })
      };
    }

    // src/main.js
    var CHARS = ["Sally", "Chloe", "Mary", "Zulle", "Javi", "John", "Galvon"];
    var N = 7;
    var ACC = [null, "", "hat.sun_hat", "glass.round_glasses", "hacc.horns", "hacc.alien_attena"];
    var ACC_SLOTS = ["hat", "hacc", "glass"];
    var mod = (x) => (x % N + N) % N;
    function decode(o) {
      o = Math.max(0, o | 0);
      const b = o % N, h = Math.floor(o / N) % N, v = Math.floor(o / 49) % N, a = Math.floor(o / 343);
      return { body: b, hair: mod(b + h), clothes: mod(b + v), acc: Math.min(a, ACC.length - 1) };
    }
    function encode(l) {
      const b = mod(l.body), h = mod(l.hair - b), v = mod(l.clothes - b), a = Math.max(0, Math.min(ACC.length - 1, l.acc | 0));
      return b + N * h + 49 * v + 343 * a;
    }
    function descOf(W, o, plus) {
      const l = decode(o), L = (i) => W.cat.looks[CHARS[i]];
      const B = L(l.body), H = L(l.hair), V = L(l.clothes), it = {};
      const d = {
        v: 1,
        g: B.g,
        bd: B.bd.slice(),
        h: 1,
        sk: B.sk,
        fc: B.fv === "sharp" ? 3 : 0,
        ey: B.ey || 0,
        pu: "basic",
        br: B.it.brow && B.it.brow[0] || "brow.stylized_basic_brows",
        la: B.it.lash && B.it.lash[0] || (B.g === "m" ? "lash.stylized_short_lashes" : "lash.stylized_long_lashes"),
        hc: H.hc,
        hc2: H.it.hb && H.it.hb[2] != null ? H.it.hb[2] : H.hc,
        fx: [],
        so: null,
        ex: "sourire",
        it
      };
      const cp = (src, slots) => {
        for (const s of slots) if (src.it[s]) it[s] = src.it[s].slice();
      };
      cp(B, ["beard"]);
      cp(H, ["hb", "hf"]);
      cp(V, ["top", "bot", "ovr", "feet"]);
      if (l.acc === 0) cp(B, ACC_SLOTS);
      else if (ACC[l.acc]) {
        const id = ACC[l.acc], slot = id.split(".")[0];
        const who = CHARS.map((c) => W.cat.looks[c]).find((x) => x.it[slot] && x.it[slot][0] === id);
        it[slot] = who ? who.it[slot].slice() : [id];
      }
      if (plus && plus.it) {
        for (const [slot, v] of Object.entries(plus.it)) {
          const a = v.slice();
          if (slot === "hb" || slot === "hf") {
            if (a.length < 2) a.push(d.hc, d.hc2);
          }
          it[slot] = a;
          if (slot === "ovr") {
            delete it.top;
            delete it.bot;
          }
          if (slot === "top" || slot === "bot") {
            if (it.ovr) {
              delete it.ovr;
            }
          }
          if (slot === "hat") delete it.hacc;
        }
        if ((plus.it.top || plus.it.bot) && !(it.top && it.bot)) {
          const V2 = W.cat.looks.John;
          if (!it.top) it.top = V2.it.top.slice();
          if (!it.bot) it.bot = V2.it.bot.slice();
        }
      }
      return { d: normalizeDesc(W, d), looks: [.../* @__PURE__ */ new Set([l.body, l.hair, l.clothes])].map((i) => "garde." + CHARS[i].toLowerCase()).concat(plus && plus.pack ? [plus.pack] : []) };
    }
    var GRADE = "\n#if defined( TONE_MAPPING )\n{ vec3 c = clamp( gl_FragColor.rgb, 0.0, 1.0 ); float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );\n  c = mix( vec3( l ), c, 1.2 ); c = clamp( c, 0.0, 1.0 ); c += 0.16 * ( c - 0.22 ) * ( 1.0 - c ) * c * 4.0;\n  c *= vec3( 1.035, 1.0, 0.95 ); gl_FragColor.rgb = clamp( c, 0.0, 1.0 ); }\n#endif\n";
    function gradeOnce() {
      const S = T3.ShaderChunk;
      if (!S || typeof S.tonemapping_fragment !== "string" || S.tonemapping_fragment.indexOf("PG_GRADE") >= 0) return;
      try {
        S.tonemapping_fragment = S.tonemapping_fragment + "\n// PG_GRADE" + GRADE;
      } catch (e) {
      }
    }
    async function create(canvas, opts = {}) {
      const PHONE = !!import_pg_env.env.mobile;
      gradeOnce();
      const R = new T3.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!opts.keep });
      R.setClearColor(0, 0);
      R.outputColorSpace = T3.SRGBColorSpace;
      R.toneMapping = T3.NeutralToneMapping;
      R.toneMappingExposure = 1.12;
      R.shadowMap.enabled = true;
      R.shadowMap.type = T3.PCFSoftShadowMap;
      const cam = new T3.PerspectiveCamera(28, 1, 0.05, 60);
      const ST = makeStage(R, { phone: PHONE });
      const { scene, turn, motes, sparks } = ST;
      const io = { async bytes(name) {
        const b = import_pg_env.env.file(name) || (import_pg_env.env.fileAsync ? await import_pg_env.env.fileAsync(name) : null);
        if (!b) throw new Error("pièce absente : " + name);
        return b;
      } };
      await import_pg_env.env.need("perso");
      const W = await new Wardrobe(R, "perso/", io).init();
      const A = new Avatar(W, { atlas: PHONE ? 1024 : 2048, normals: false, shadow: true });
      turn.add(A.group);
      const lookOf = (x) => typeof x === "number" ? descOf(W, x) : { d: normalizeDesc(W, x), looks: [] };
      let cur = -1, curK = "", want = null, wantK = "", setting = null, ready = false, dead = false;
      const keyOf = (x) => typeof x === "number" ? "o" + x : JSON.stringify(x);
      async function setLook(x) {
        if (typeof x === "number") x = x | 0;
        want = x;
        wantK = keyOf(x);
        if (setting) return setting;
        setting = (async () => {
          while (wantK !== curK && !dead) {
            const x2 = want, k2 = wantK, { d, looks } = lookOf(x2);
            await Promise.all(looks.map((n) => import_pg_env.env.need(n)));
            if (dead) return;
            if (k2 !== wantK) continue;
            await A.set(d);
            if (dead) return;
            cur = typeof x2 === "number" ? x2 : -2;
            curK = k2;
            ready = true;
          }
        })().finally(() => {
          setting = null;
        });
        return setting;
      }
      const view = { yaw: 0.3, vyaw: 0, target: null, focus: null, w: 1, h: 1, spin: 0 };
      const FR = { y: 0.9, h: 2.5 }, FRT = { y: 0.9, h: 2.5 };
      const FRAMES = { corps: { y: 0.9, h: 2.5 }, buste: { y: 1.25, h: 1.55 }, tete: { y: 1.58, h: 0.92 }, visage: { y: 1.62, h: 0.7 }, jambes: { y: 0.55, h: 1.35 }, pieds: { y: 0.3, h: 0.95 }, parle: { y: 1.47, h: 1 }, selfie: { y: 1.53, h: 0.6 }, geste: { y: 1.36, h: 1.8 } };
      function setFrame(k) {
        const f = FRAMES[k] || FRAMES.corps;
        FRT.y = f.y;
        FRT.h = f.h;
      }
      function layout() {
        const r = canvas.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
        const dpr = Math.min(window.devicePixelRatio || 1, PHONE ? 2 : 2);
        if (w !== view.w || h !== view.h || R.getPixelRatio() !== dpr) {
          R.setPixelRatio(dpr);
          R.setSize(w, h, false);
          view.w = w;
          view.h = h;
        }
        const f = view.focus || { x: 0, y: 0, w, h };
        cam.aspect = w / h;
        cam.setViewOffset(w, h, w / 2 - (f.x + f.w / 2), h / 2 - (f.y + f.h / 2), w, h);
        const vf = T3.MathUtils.degToRad(cam.fov), t = Math.tan(vf / 2);
        let dist = FR.h / 2 / t / (f.h / h);
        dist = Math.max(dist, FR.h * 0.42 / 2 / t / (cam.aspect * f.w / w));
        cam.position.set(0, FR.y + dist * 0.07, dist);
        cam.lookAt(0, FR.y, 0);
        cam.updateProjectionMatrix();
        motes.uniforms.uPx.value = R.getPixelRatio() * h / (2 * t);
        sparks.m.uniforms.uPx.value = motes.uniforms.uPx.value;
      }
      const GEST = ["wave", "jump", "face", "laugh", "twirl"];
      let gi = 0, gestT = 0;
      function gesture(kind) {
        if (!ready) return "";
        if (!kind) {
          kind = GEST[gi % GEST.length];
          gi++;
        }
        const hs = 1;
        if (kind === "wave") {
          view.target = 0;
          A.wave();
          A.lookAt = true;
          A.lookTarget.set(0, 0.05);
          lookT = 2.6;
        } else if (kind === "jump") {
          A.jump();
          sparks.burst(hs, 36);
        } else if (kind === "face") {
          view.target = 0;
          A.lookAt = true;
          A.lookTarget.set(0, 0.08);
          lookT = 3;
          A.setExpression("surpris");
          setTimeout(() => {
            if (!dead) A.setExpression("sourire");
          }, 1100);
        } else if (kind === "laugh") {
          A.laugh();
        } else if (kind === "oui" || kind === "non") {
          view.target = 0;
          A.lookAt = true;
          A.lookTarget.set(0, 0.04);
          lookT = 2.2;
          if (kind === "oui") A.yes();
          else A.no();
          if (Math.abs(FRT.y - FRAMES.corps.y) < 0.01 && Math.abs(FRT.h - FRAMES.corps.h) < 0.01) {
            setFrame("geste");
            clearTimeout(gestT);
            gestT = setTimeout(() => {
              if (!dead && FRT.h === FRAMES.geste.h && FRT.y === FRAMES.geste.y) setFrame("corps");
            }, kind === "oui" ? 1750 : 1950);
          }
        } else if (kind === "grr" || kind === "fache" || kind === "sixsept") {
          view.target = 0;
          A.lookAt = true;
          A.lookTarget.set(0, kind === "grr" ? 0.02 : 0.05);
          lookT = kind === "fache" ? 3.6 : 2.6;
          if (kind === "grr") A.grr();
          else if (kind === "fache") A.fache();
          else A.sixSept();
        } else if (kind === "twirl") {
          view.spin = 1;
          view.target = null;
          sparks.burst(hs, 56);
        } else if (kind === "spark") {
          A.react();
          sparks.burst(hs);
        }
        return kind;
      }
      const ptr = /* @__PURE__ */ new Map();
      let moved = 0, lastX = 0, downT = 0, lookT = 0;
      const onDown = (e) => {
        ptr.set(e.pointerId, e.clientX);
        moved = 0;
        lastX = e.clientX;
        downT = performance.now();
        view.target = null;
        view.homeT = 0;
      };
      const onMove = (e) => {
        const r = canvas.getBoundingClientRect(), f = view.focus || { x: 0, y: 0, w: r.width, h: r.height };
        if (e.pointerType === "mouse" || ptr.has(e.pointerId)) {
          A.lookAt = true;
          lookT = 2.2;
          A.lookTarget.set(T3.MathUtils.clamp((e.clientX - r.left - (f.x + f.w / 2)) / Math.max(200, f.w) * 1.6, -0.7, 0.7), T3.MathUtils.clamp(-(e.clientY - r.top - (f.y + f.h * 0.3)) / Math.max(300, f.h) * 0.8, -0.3, 0.3));
        }
        if (!ptr.has(e.pointerId)) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        moved += Math.abs(dx);
        if (moved > 6) {
          view.yaw += dx * 0.012;
          view.vyaw = dx * 0.012 / 0.016;
        }
      };
      const onUp = (e) => {
        if (!ptr.has(e.pointerId)) return;
        ptr.delete(e.pointerId);
        if (e.type === "pointerup" && moved < 8 && performance.now() - downT < 500 && hitAvatar(e)) {
          const k = gesture();
          if (opts.onGesture) opts.onGesture(k);
        }
      };
      function faceRect() {
        if (!ready || !A) return null;
        const hb = A.bones.get("head");
        if (!hb) return null;
        const r = canvas.getBoundingClientRect(), c = hb.getWorldPosition(new T3.Vector3()), pt = (dx, dy) => {
          const v = new T3.Vector3(c.x + dx, c.y + dy, c.z).project(cam);
          return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
        };
        const a = pt(-0.13, 0.26), b = pt(0.13, -0.08);
        return { left: Math.min(a.x, b.x), right: Math.max(a.x, b.x), top: Math.min(a.y, b.y), bottom: Math.max(a.y, b.y) };
      }
      function hitAvatar(e) {
        const r = canvas.getBoundingClientRect(), p = (x2, y2) => {
          const v = new T3.Vector3(x2, y2, 0).project(cam);
          return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height };
        };
        const a = p(0, 1.95), b = p(0, -0.1), hw = Math.abs(b.y - a.y) * 0.24, x = e.clientX - r.left, y = e.clientY - r.top;
        return y > a.y && y < b.y && Math.abs(x - (a.x + b.x) / 2) < hw;
      }
      let P2 = null, PIP = null, pipTalk = null;
      const pcam = new T3.PerspectiveCamera(22, 1, 0.05, 30), _hp = new T3.Vector3();
      async function setPip(o, rect) {
        if (o == null) {
          PIP = null;
          pipTalk = null;
          if (P2) {
            P2.talk = null;
            if (P2.group.parent) P2.group.parent.remove(P2.group);
          }
          return;
        }
        const p = PIP = { rect: rect || null, ready: false };
        if (!P2) P2 = new Avatar(W, { atlas: PHONE ? 512 : 1024, normals: false, shadow: false });
        const { d, looks } = lookOf(typeof o === "number" ? o | 0 : o);
        await Promise.all(looks.map((n) => import_pg_env.env.need(n)));
        if (dead || PIP !== p) return;
        await P2.set(d);
        if (dead || PIP !== p) return;
        P2.setExpression("sourire");
        P2.lookAt = true;
        P2.lookTarget.set(0, 0.03);
        P2.group.rotation.y = 0;
        P2.group.position.set(0, 0, 0);
        P2.group.visible = false;
        scene.add(P2.group);
        P2.update(1 / 30, pcam);
        p.ready = true;
      }
      function renderPip(dt) {
        const r = PIP && PIP.ready && PIP.rect;
        if (!r || r.w < 8 || r.h < 8) return;
        P2.talk = pipTalk ? (() => {
          try {
            return pipTalk(dt);
          } catch (e) {
            return null;
          }
        })() : null;
        P2.lookAt = true;
        P2.lookTarget.set(Math.sin(tt * 0.6) * 0.04, 0.03);
        P2.update(dt, pcam);
        const hb = P2.bones.get("head");
        if (!hb) return;
        hb.getWorldPosition(_hp);
        pcam.aspect = r.w / r.h;
        const hgt = 0.6, dist = hgt / 2 / Math.tan(T3.MathUtils.degToRad(pcam.fov) / 2);
        pcam.position.set(0, _hp.y - 0.05 + dist * 0.03, dist);
        pcam.lookAt(0, _hp.y - 0.07, 0);
        pcam.updateProjectionMatrix();
        const hide = [A.group, ST.podium, ST.halo, ST.blob, motes.userData.pts, sparks.pts], vis = hide.map((x) => x.visible);
        hide.forEach((x) => {
          x.visible = false;
        });
        P2.group.visible = true;
        const sh = R.shadowMap.enabled;
        R.shadowMap.enabled = false;
        R.setViewport(r.x, view.h - r.y - r.h, r.w, r.h);
        R.setScissor(r.x, view.h - r.y - r.h, r.w, r.h);
        R.setScissorTest(true);
        R.render(scene, pcam);
        R.setScissorTest(false);
        R.setViewport(0, 0, view.w, view.h);
        R.shadowMap.enabled = sh;
        P2.group.visible = false;
        hide.forEach((x, i) => {
          x.visible = vis[i];
        });
      }
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      let active = false, raf = 0, last = 0, tt = 0, talkFn = null;
      const _h = new T3.Vector3();
      function frame(now) {
        raf = 0;
        if (!active || dead) return;
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, last ? (now - last) / 1e3 : 0.016);
        last = now;
        tt += dt;
        if (!ptr.size) {
          if (view.spin > 0) {
            const s = Math.min(view.spin, dt / 1.1);
            view.spin -= s;
            view.yaw += s * Math.PI * 2;
            if (view.spin <= 0) view.target = 0;
          } else if (view.target != null) {
            const tgt = view.target + Math.round((view.yaw - view.target) / (Math.PI * 2)) * Math.PI * 2;
            view.yaw += (tgt - view.yaw) * (1 - Math.exp(-dt * 5));
            view.vyaw = 0;
            if (Math.abs(tgt - view.yaw) < 2e-3) view.target = null;
          } else {
            view.yaw += view.vyaw * dt;
            view.vyaw *= Math.exp(-dt * 3.5);
            if (view.home) {
              if (Math.abs(view.vyaw) < 0.08) {
                view.homeT = (view.homeT || 0) + dt;
                if (view.homeT > 0.9 && Math.abs(view.yaw - Math.round(view.yaw / (Math.PI * 2)) * Math.PI * 2) > 0.02) view.target = 0;
              }
            } else if (Math.abs(view.vyaw) < 0.01) view.yaw += 0.3 * Math.sin(tt * 0.12) * 0.15 * dt;
          }
        }
        turn.rotation.y = view.yaw;
        if (Math.abs(FR.y - FRT.y) > 1e-3 || Math.abs(FR.h - FRT.h) > 1e-3) {
          const k = 1 - Math.exp(-dt * 5);
          FR.y += (FRT.y - FR.y) * k;
          FR.h += (FRT.h - FR.h) * k;
          layout();
        }
        lookT -= dt;
        if (lookT <= 0) A.lookAt = false;
        if (talkFn) {
          let t = null;
          try {
            t = talkFn(dt, tt);
          } catch (e) {
            t = null;
          }
          A.talk = t;
          if (t && !ptr.size) {
            A.lookAt = true;
            A.lookTarget.set(Math.sin(tt * 0.7) * 0.05 + Math.sin(tt * 0.23) * 0.03, 0.03 + Math.sin(tt * 0.31) * 0.02);
            lookT = 0.4;
          }
        }
        motes.uniforms.uT.value = tt;
        ST.wind.value = tt;
        sparks.update(dt);
        if (ready) A.update(dt, cam);
        R.render(scene, cam);
        if (PIP) renderPip(dt);
        if (opts.onFrame && ready) {
          const hb = A.bones.get("head");
          if (hb) {
            hb.getWorldPosition(_h);
            _h.y += 0.3;
            _h.project(cam);
            opts.onFrame((_h.x + 1) / 2 * view.w, (1 - _h.y) / 2 * view.h);
          }
        }
      }
      function setActive(on) {
        on = !!on && !dead;
        if (on === active) return;
        active = on;
        if (on) {
          last = 0;
          layout();
          if (!raf) raf = requestAnimationFrame(frame);
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      }
      function portrait() {
        if (!ready) return "";
        const PW = 320, PH = 400, pc = new T3.PerspectiveCamera(20, PW / PH, 0.05, 20);
        const hb = A.bones.get("head"), hp = new T3.Vector3();
        const yaw0 = turn.rotation.y;
        turn.rotation.y = 0;
        A.group.updateMatrixWorld(true);
        hb.getWorldPosition(hp);
        const hat = !!(A.desc && A.desc.it && A.desc.it.hat), cy = hp.y + (hat ? 0 : -0.04), hgt = hat ? 0.68 : 0.52;
        const dist = hgt / 2 / Math.tan(T3.MathUtils.degToRad(pc.fov) / 2);
        pc.position.set(0.12 * dist * 0.18, cy + dist * 0.04, dist);
        pc.lookAt(0, cy, 0);
        const hide = [ST.podium, ST.halo, ST.blob, motes.userData.pts, sparks.pts];
        const vis = hide.map((o) => o.visible);
        hide.forEach((o) => {
          o.visible = false;
        });
        A.waveT = 0;
        A.jumpT = 0;
        A.laughT = 0;
        A.hop = 0;
        A.exprFlash = 0;
        const exS = A.exprTarget, lk = A.lookAt;
        A.lookAt = true;
        A.lookTarget.set(0, 0);
        A.blink = 0;
        A.blinkT = 3;
        A.setExpression("sourire");
        for (let i = 0; i < 30; i++) A.update(1 / 30, pc);
        const pr = R.getPixelRatio(), sz = R.getSize(new T3.Vector2());
        R.setPixelRatio(1);
        R.setSize(PW, PH, false);
        R.render(scene, pc);
        const c = document.createElement("canvas");
        c.width = 160;
        c.height = 200;
        const x = c.getContext("2d");
        x.drawImage(R.domElement, 0, 0, PW, PH, 0, 0, 160, 200);
        x.globalCompositeOperation = "destination-in";
        const g = x.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, "#000");
        g.addColorStop(0.66, "#000");
        g.addColorStop(0.97, "rgba(0,0,0,0)");
        x.fillStyle = g;
        x.fillRect(0, 0, 160, 200);
        R.setPixelRatio(pr);
        R.setSize(sz.x, sz.y, false);
        hide.forEach((o, i) => {
          o.visible = vis[i];
        });
        turn.rotation.y = yaw0;
        A.exprTarget = exS;
        A.lookAt = lk;
        layout();
        R.render(scene, cam);
        let d = "";
        try {
          d = c.toDataURL("image/webp", 0.88);
        } catch (e) {
        }
        if (!d.startsWith("data:image/webp")) d = c.toDataURL("image/png");
        return d;
      }
      let B = null, thumbQ = Promise.resolve();
      const tcam = new T3.PerspectiveCamera(20, 0.7, 0.05, 30);
      function thumb(o, size) {
        const job = thumbQ.then(() => thumbNow(typeof o === "number" ? o | 0 : o, size || {}));
        thumbQ = job.catch(() => {
        });
        return job;
      }
      async function thumbNow(o, { w = 150, h = 214, px = 2 }) {
        if (dead) return "";
        if (!B) B = new Avatar(W, { atlas: PHONE ? 512 : 1024, normals: false, shadow: false });
        const { d, looks } = lookOf(o);
        await Promise.all(looks.map((n) => import_pg_env.env.need(n)));
        if (dead) return "";
        await B.set(d);
        if (dead) return "";
        B.setExpression("sourire");
        B.lookAt = true;
        B.lookTarget.set(0.05, 0.03);
        B.blink = 0;
        B.blinkT = 3;
        B.group.rotation.y = 0.32;
        B.group.position.set(0, 0, 0);
        for (let i = 0; i < 24; i++) B.update(1 / 30, tcam);
        const hat = !!(B.desc && B.desc.it && B.desc.it.hat), top = hat ? 2.02 : 1.92, bot = -0.04, cy = (top + bot) / 2, hh = top - bot;
        tcam.aspect = w / h;
        tcam.fov = 20;
        const dist = (hh / 2 + 0.05) / Math.tan(T3.MathUtils.degToRad(tcam.fov) / 2);
        tcam.position.set(0, cy + dist * 0.035, dist);
        tcam.lookAt(0, cy, 0);
        tcam.updateProjectionMatrix();
        const hide = [A.group, ST.podium, ST.halo, ST.blob, motes.userData.pts, sparks.pts];
        const vis = hide.map((x) => x.visible);
        hide.forEach((x) => {
          x.visible = false;
        });
        scene.add(B.group);
        const pr = R.getPixelRatio(), sz = R.getSize(new T3.Vector2()), sh = R.shadowMap.enabled;
        const PW = Math.round(w * px), PH = Math.round(h * px);
        R.setPixelRatio(1);
        R.setSize(PW, PH, false);
        R.shadowMap.enabled = false;
        R.render(scene, tcam);
        const c = document.createElement("canvas");
        c.width = PW;
        c.height = PH;
        c.getContext("2d").drawImage(R.domElement, 0, 0, PW, PH, 0, 0, PW, PH);
        scene.remove(B.group);
        R.shadowMap.enabled = sh;
        hide.forEach((x, i) => {
          x.visible = vis[i];
        });
        R.setPixelRatio(pr);
        R.setSize(sz.x, sz.y, false);
        layout();
        R.render(scene, cam);
        let u = "";
        try {
          u = c.toDataURL("image/webp", 0.9);
        } catch (e) {
        }
        if (!u.startsWith("data:image/webp")) u = c.toDataURL("image/png");
        return u;
      }
      return {
        W,
        A,
        R,
        cam,
        view,
        setLook,
        gesture,
        layout,
        setActive,
        portrait,
        thumb,
        setFrame,
        faceRect,
        setFocus(f) {
          view.focus = f;
          layout();
        },
        setTalk(fn) {
          talkFn = typeof fn === "function" ? fn : null;
          if (!talkFn) A.talk = null;
        },
        setPip,
        pipRect(r) {
          if (PIP) PIP.rect = r || null;
        },
        setPipTalk(fn) {
          pipTalk = typeof fn === "function" ? fn : null;
        },
        pipReady: () => !!(PIP && PIP.ready),
        pipAvatar: () => P2,
        setHome(on) {
          view.home = !!on;
          view.homeT = 0;
          if (on) view.target = 0;
        },
        face() {
          view.target = 0;
        },
        burst() {
          sparks.burst(1);
          A.react();
        },
        ready: () => ready,
        info: () => ({ calls: R.info.render.calls, tris: R.info.render.triangles, dpr: R.getPixelRatio(), w: view.w, h: view.h, tenue: cur, look: curK, bytes: W.bytes }),
        descOf: (o) => descOf(W, o | 0).d,
        normalize: (d) => normalizeDesc(W, d),
        desc: () => A.desc,
        dispose() {
          dead = true;
          setActive(false);
          canvas.removeEventListener("pointerdown", onDown);
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerup", onUp);
          canvas.removeEventListener("pointercancel", onUp);
          try {
            A.dispose();
          } catch (e) {
          }
          try {
            if (B) B.dispose();
          } catch (e) {
          }
          try {
            if (P2) P2.dispose();
          } catch (e) {
          }
          scene.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            const ms = o.material ? Array.isArray(o.material) ? o.material : [o.material] : [];
            for (const m of ms) {
              for (const k of ["map"]) if (m[k]) m[k].dispose();
              m.dispose();
            }
          });
          if (scene.environment) scene.environment.dispose();
          R.dispose();
          try {
            R.forceContextLoss();
          } catch (e) {
          }
        }
      };
    }

    return module.exports;
  }

  // ===========================================================================
  // LE HUB : la page (HTML + CSS, préfixe pgh-), le Dressing, le téléchargement. La 3D (PG_FACTORY) n'arrive qu'après l'affichage.
  // ===========================================================================
  // Garde-robe du jeu (PegaseWardrobe.cs) : 7 personnages × 7 coiffures × 7 vêtements × 6 accessoires → UN numéro de tenue
  //   o = B + 7·((H − B) mod 7) + 49·((V − B) mod 7) + 343·A        (0..6 = un personnage en entier, l'ancien contrat « tenue = n »)
  const GR = {
    chars: [   // nom affiché, couleurs des pastilles (peau, cheveux, vêtement, bas) tirées du catalogue du pack
      { n: 'Sally', skin: '#a96c4c', hair: '#3d3d3d', h2: '#1a1a1a', c1: '#ccc8b9', c2: '#e9c46a' },
      { n: 'Chloé', skin: '#6f432c', hair: '#3d3d3d', h2: '#101010', c1: '#9a3737', c2: '#bababa' },
      { n: 'Mary', skin: '#e3aa8b', hair: '#e07c4f', h2: '#ff4fa8', c1: '#76367d', c2: '#e482cc' },
      { n: 'Zulle', skin: '#a96c4c', hair: '#f4efe6', h2: '#860000', c1: '#4a4e55', c2: '#7d8696' },
      { n: 'Javi', skin: '#a96c4c', hair: '#25262b', h2: '#323232', c1: '#267841', c2: '#75623e' },
      { n: 'John', skin: '#a96c4c', hair: '#323232', h2: '#101010', c1: '#c2ab93', c2: '#4f6e95' },
      { n: 'Galvon', skin: '#7fcf9a', hair: '#1c0f0f', h2: '#315720', c1: '#21755b', c2: '#476749' }
    ],
    hair: ['Longs, frange', 'Dreads relevées', 'Mi-longs ondulés', 'Sauvages', 'En bataille', 'Courts coiffés', 'Longues dreads'],
    clothes: ['Robe d\'été', 'Veste et short', 'Pull et jupe', 'Tenue légère', 'Chemise et bermuda', 'Henley et jean', 'Débardeur et cargo'],
    acc: ['Celui du personnage', 'Aucun', 'Chapeau de paille', 'Lunettes rondes', 'Petites cornes', 'Antennes']
  };
  const GN = 7, gmod = (x) => ((x % GN) + GN) % GN;
  const tDecode = (o) => { o = Math.max(0, o | 0); const b = o % GN; return { body: b, hair: gmod(b + Math.floor(o / GN) % GN), clothes: gmod(b + Math.floor(o / 49) % GN), acc: Math.min(5, Math.floor(o / 343)) }; };
  const tEncode = (l) => { const b = gmod(l.body); return b + GN * gmod(l.hair - b) + 49 * gmod(l.clothes - b) + 343 * Math.max(0, Math.min(5, l.acc | 0)); };
  const tDescribe = (o) => { const l = tDecode(o); return [GR.chars[l.body].n, GR.hair[l.hair], GR.clothes[l.clothes], GR.acc[l.acc]].join(' · '); };
  // même texte que PegaseWardrobe.Describe (noms du jeu : « Chloé » y est écrit avec l'accent)
  const tCanon = (o) => JSON.stringify({ v: 1, tenue: o, desc: tDescribe(o).replace(/"/g, '\'') });

  const PGH_SVG = {
    dl: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M32 8v30"/><path d="M20 27l12 12 12-12"/><path d="M10 40v10a5 5 0 0 0 5 5h34a5 5 0 0 0 5-5V40"/></svg>',
    zip: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M8 18a5 5 0 0 1 5-5h12l5 6h21a5 5 0 0 1 5 5v23a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5z"/><path d="M30 25h4M30 31h4M30 37h4" stroke-width="3.4"/><path d="M42 44l8-8m0 0h-7m7 0v7" stroke-width="3.4"/></svg>',
    play: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><rect x="9" y="9" width="46" height="46" rx="13"/><path d="M27 22l15 10-15 10z" fill="currentColor"/></svg>',
    pc: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><rect x="7" y="11" width="50" height="32" rx="4"/><path d="M24 53h16M32 43v10"/></svg>',
    android: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M14 30a18 18 0 0 1 36 0v18a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z"/><path d="M20 14l-4-6M44 14l4-6"/><circle cx="25" cy="24" r="1.6" fill="currentColor"/><circle cx="39" cy="24" r="1.6" fill="currentColor"/></svg>',
    phone: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><rect x="17" y="6" width="30" height="52" rx="7"/><path d="M28 50h8"/></svg>',
    shield: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M32 6l20 7v15c0 14-9 24-20 30C21 52 12 42 12 28V13z"/><path d="M24 32l6 6 11-12"/></svg>',
    bald: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 11c0-4.4 2.7-7.5 6-7.5s6 3.1 6 7.5v2c0 4.6-2.7 8-6 8s-6-3.4-6-8z"/><path d="M6 12.5c-1.3 0-2 .9-2 2s.8 2 2 2M18 12.5c1.3 0 2 .9 2 2s-.8 2-2 2"/><path d="M9 7.5c.8-1 1.8-1.4 3-1.4" opacity=".6"/></svg>',
    none: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M6.5 6.5l11 11"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.6 6.2 6.7.6-5.1 4.4 1.6 6.6L12 16.8l-5.8 3.5 1.6-6.6-5.1-4.4 6.7-.6z"/></svg>',
    hat: '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="15.5" rx="10.5" ry="3.6" opacity=".55"/><path d="M7 15c0-5 2.2-8 5-8s5 3 5 8c-3 .9-7 .9-10 0z"/><path d="M7.4 13.2c3 .8 6.2.8 9.2 0" stroke="#7a3d1f" stroke-width="1.4" fill="none"/></svg>',
    glasses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/><path d="M11 12.5c.6-.8 1.4-.8 2 0M3 12l-1.5-2M21 12l1.5-2"/></svg>',
    horns: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 19c-2-5-1-11 2-15 0 4 1 7 4 9-2 1-4 3-6 6zM19 19c2-5 1-11-2-15 0 4-1 7-4 9 2 1 4 3 6 6z"/></svg>',
    antenna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 20c0-6-2-10-4-13M16 20c0-6 2-10 4-13"/><circle cx="4" cy="5.5" r="2.4" fill="currentColor"/><circle cx="20" cy="5.5" r="2.4" fill="currentColor"/></svg>',
    dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    link: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"><path d="M27 37a10 10 0 0 0 14 1l9-9a10 10 0 0 0-14-14l-4 4"/><path d="M37 27a10 10 0 0 0-14-1l-9 9a10 10 0 0 0 14 14l4-4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="8.5" y="8.5" width="12" height="12" rx="2.6"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4v4.5H15"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>'
  };

  const PGH_CSS = (FD, FB) => `
.pgh{position:absolute;inset:0;overflow:hidden;background:#100c22;color:#fff4e2;font-family:${FB};-webkit-tap-highlight-color:transparent;
  --gold:#ffcf73;--gold2:#ff9f5a;--rose:#ff9ec4;--ink:#fff4e2;--soft:rgba(255,244,226,.74);--line:rgba(255,214,140,.24);--card:linear-gradient(180deg,rgba(255,236,210,.075),rgba(255,236,210,.035));--night:#100c22}
.pgh *{box-sizing:border-box}
.pgh button{font-family:${FB};cursor:pointer;-webkit-tap-highlight-color:transparent}
.pgh-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(255,214,140,.35) transparent}
/* ---------- haut de page : photo du jeu + avatar 3D ---------- */
.pgh-hero{position:relative;height:var(--heroH,640px);min-height:360px;overflow:hidden;isolation:isolate;background:linear-gradient(180deg,#2b2f6e 0%,#a0619a 48%,#ffad7a 74%,#3a2c4e 100%)}
.pgh-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:56% 50%;z-index:-2;opacity:0;transition:opacity .9s ease;transform:scale(1.04);animation:pghKen 38s ease-in-out infinite alternate}
.pgh-bg.on{opacity:1}
@keyframes pghKen{from{transform:scale(1.04) translateX(0)}to{transform:scale(1.1) translateX(-1.5%)}}
.pgh-veil{position:absolute;inset:0;z-index:-1;pointer-events:none;background:
  radial-gradient(ellipse 62% 42% at var(--sunX,62%) 60%,rgba(255,222,150,.34),rgba(255,206,140,0) 70%),
  linear-gradient(180deg,rgba(44,20,70,.46) 0%,rgba(44,20,70,.12) 24%,rgba(44,20,70,0) 40%,rgba(20,12,36,0) 72%,rgba(20,12,36,.5) 88%,var(--night) 100%)}
.pgh.wide .pgh-veil{background:radial-gradient(ellipse 40% 55% at 72% 60%,rgba(255,222,150,.32),rgba(255,206,140,0) 70%),
  linear-gradient(90deg,rgba(30,14,52,.66) 0%,rgba(30,14,52,.36) 30%,rgba(30,14,52,0) 54%),
  linear-gradient(180deg,rgba(44,20,70,.26) 0%,rgba(44,20,70,0) 24%,rgba(20,12,36,0) 76%,rgba(20,12,36,.55) 93%,var(--night) 100%)}
.pgh-fly{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
.pgh-gl{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:pan-y;z-index:1;outline:none;opacity:0;transition:opacity .8s ease}
.pgh-gl.on{opacity:1}
.pgh-name{position:absolute;left:0;top:0;z-index:3;pointer-events:none;transform:translate(-50%,-100%);padding:5px 12px 6px;border-radius:999px;white-space:nowrap;opacity:0;transition:opacity .5s;
  font:700 13px ${FB};letter-spacing:.06em;color:#3a1d0a;background:linear-gradient(180deg,#fff3cf,#ffd37e);box-shadow:0 4px 14px rgba(40,16,0,.35),inset 0 0 0 1px rgba(255,255,255,.6)}
.pgh-name::after{content:'';position:absolute;left:50%;bottom:-5px;margin-left:-5px;border:5px solid transparent;border-bottom:0;border-top-color:#ffd37e}
.pgh-name.on{opacity:1}
.pgh-hint{position:absolute;z-index:3;left:0;top:0;transform:translate(14px,-50%);pointer-events:none;opacity:0;transition:opacity .6s;padding:6px 11px;border-radius:12px;font:700 12.5px ${FB};color:#fff6e6;
  background:rgba(30,18,52,.72);box-shadow:inset 0 0 0 1px rgba(255,214,140,.4);white-space:nowrap;animation:pghBob 2.4s ease-in-out infinite}
.pgh-hint.on{opacity:1}
@keyframes pghBob{0%,100%{margin-top:0}50%{margin-top:-5px}}
.pgh-wait{position:absolute;z-index:2;left:0;top:0;transform:translate(-50%,-50%);display:grid;justify-items:center;gap:10px;pointer-events:none;opacity:0;transition:opacity .5s}
.pgh-wait.on{opacity:1}
.pgh-wait i{display:block;width:74px;height:150px;border-radius:40px 40px 22px 22px;background:radial-gradient(ellipse at 50% 30%,rgba(255,230,180,.55),rgba(255,200,140,.08) 70%);filter:blur(2px);animation:pghPulse 1.6s ease-in-out infinite}
.pgh-wait span{font:700 12.5px ${FB};color:#ffe9c8;text-shadow:0 2px 6px rgba(20,8,30,.8)}
.pgh-wait b{display:block;width:120px;height:4px;border-radius:3px;background:rgba(255,255,255,.18);overflow:hidden}
.pgh-wait b u{display:block;height:100%;width:4%;background:linear-gradient(90deg,#ffd27a,#ff9ec4);transition:width .3s}
@keyframes pghPulse{0%,100%{opacity:.55;transform:scale(.96)}50%{opacity:1;transform:scale(1.03)}}
.pgh-copy{position:absolute;z-index:4;left:0;right:0;top:0;padding:calc(16px + env(safe-area-inset-top,0px) * 0) 18px 0;pointer-events:none;text-align:center}
.pgh-copy > *{pointer-events:auto}
.pgh-eye{display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:999px;font:700 11px ${FB};letter-spacing:.14em;text-transform:uppercase;color:#ffe2ad;background:rgba(30,16,50,.62);box-shadow:inset 0 0 0 1px rgba(255,214,140,.35)}
.pgh-eye i{width:6px;height:6px;border-radius:50%;background:#ffd36a;box-shadow:0 0 10px #ffd36a}
.pgh-title{margin:8px 0 0;font:400 clamp(46px,14vw,64px)/1 ${FD};letter-spacing:.03em;color:#fff3dc;
  background:linear-gradient(180deg,#fffaf0 15%,#ffe2a6 55%,#ffb46a 95%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 3px 0 rgba(106,58,122,.85)) drop-shadow(0 0 22px rgba(255,190,110,.55))}
.pgh-pitch{margin:10px auto 0;max-width:420px;font:600 15px/1.42 ${FB};color:#fff1dd;text-shadow:0 2px 10px rgba(20,8,30,.85)}
.pgh-bottom{position:absolute;z-index:4;left:0;right:0;bottom:0;padding:0 16px 18px;display:grid;gap:12px;justify-items:center;pointer-events:none}
.pgh-bottom > *{pointer-events:auto}
.pgh-emotes{display:flex;gap:9px;justify-content:center}
.pgh-emo{width:50px;height:50px;border-radius:50%;border:0;display:grid;place-items:center;font-size:22px;line-height:1;color:#fff;padding:0;
  background:radial-gradient(circle at 50% 35%,rgba(110,70,140,.86),rgba(34,20,56,.86));box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.5),0 6px 16px rgba(0,0,0,.35);transition:transform .12s, box-shadow .2s}
.pgh-emo:active{transform:scale(.9)}
.pgh-emo.hit{box-shadow:inset 0 0 0 2px #ffe08a,0 0 22px rgba(255,200,110,.75)}
.pgh-emo small{display:none}
.pgh-emowrap{position:relative;display:grid}
.pgh-emo.more span{font-size:24px;letter-spacing:.02em;transform:translateY(-3px)}
.pgh-emo.more.on{box-shadow:inset 0 0 0 2px #ffe08a,0 0 18px rgba(255,200,110,.55)}
.pgh-emofan{position:absolute;left:50%;bottom:calc(100% + 10px);display:flex;flex-direction:column;gap:9px;opacity:0;visibility:hidden;pointer-events:none;transform:translate(-50%,10px) scale(.85);transform-origin:50% 100%;transition:opacity .18s, transform .22s cubic-bezier(.2,1.4,.4,1), visibility 0s .22s}
.pgh-emofan.on{opacity:1;visibility:visible;pointer-events:auto;transform:translate(-50%,0) scale(1);transition-delay:0s}
.pgh.wide.short .pgh-emofan{left:calc(100% + 10px);bottom:auto;top:50%;flex-direction:row;transform:translate(-8px,-50%) scale(.85);transform-origin:0 50%}
.pgh.wide.short .pgh-emofan.on{transform:translate(0,-50%) scale(1)}
.pgh-ctas{display:flex;gap:10px;width:100%;max-width:440px}
.pgh-cta{flex:1 1 0;min-height:52px;border-radius:16px;border:0;padding:8px 12px;font:700 15px ${FB};letter-spacing:.01em;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}
.pgh-cta svg{width:20px;height:20px;flex:none}
.pgh-cta.gold{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e 55%,#ff9f4a);box-shadow:0 8px 22px rgba(255,150,60,.38),inset 0 1px 0 rgba(255,255,255,.75),inset 0 -2px 0 rgba(160,70,10,.35)}
.pgh-cta.glass{color:#fff4e2;background:rgba(40,24,66,.74);box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.55),0 8px 20px rgba(0,0,0,.3)}
.pgh-cta:active{transform:translateY(1px) scale(.99)}
.pgh-small{font:600 12px ${FB};color:rgba(255,240,220,.78);text-shadow:0 1px 6px rgba(0,0,0,.6)}
.pgh-scrolltip{position:absolute;z-index:4;left:50%;bottom:6px;transform:translateX(-50%);width:22px;height:22px;opacity:.6;pointer-events:none;animation:pghBob 2s ease-in-out infinite;color:#ffe2ad}
/* paysage / ordinateur : texte à gauche, avatar à droite */
.pgh.wide .pgh-copy{right:auto;width:min(48%,560px);top:50%;transform:translateY(-54%);text-align:left;padding:0 0 0 max(22px,5vw)}
.pgh.wide .pgh-title{font-size:clamp(44px,7.4vw,92px)}
.pgh.wide .pgh-pitch{margin-left:0;font-size:clamp(14px,1.45vw,18px)}
.pgh.wide .pgh-bottom{left:auto;right:0;width:52%;padding-bottom:14px}
.pgh.wide .pgh-ctas{display:none}
.pgh-ctas2{display:none;gap:10px;margin-top:18px;max-width:460px}
.pgh.wide .pgh-ctas2{display:flex}
.pgh.wide .pgh-ctas2 .pgh-cta{flex:0 1 auto;padding:10px 18px}
.pgh.short .pgh-pitch{font-size:13.5px;margin-top:6px}
.pgh.short .pgh-title{font-size:clamp(38px,6.4vw,54px);margin-top:6px}
.pgh.short .pgh-ctas2{margin-top:12px}
.pgh.short .pgh-ctas2 .pgh-cta{min-height:44px;font-size:14px;padding:6px 14px}
.pgh.short .pgh-emo{width:42px;height:42px;font-size:19px}
.pgh.short .pgh-small{display:none}
/* ---------- sections ---------- */
.pgh-sec{position:relative;max-width:1080px;margin:0 auto;padding:30px 16px 8px}
.pgh-h2{margin:0;font:400 clamp(21px,5.6vw,30px)/1.1 ${FD};letter-spacing:.03em;color:#ffe9c2;text-shadow:0 3px 0 rgba(90,44,110,.8)}
.pgh-sub{margin:7px 0 0;font:600 14px/1.45 ${FB};color:var(--soft);max-width:640px}
.pgh-gal{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:18px 16px 18px;margin:0 -16px;scrollbar-width:none;overscroll-behavior-x:contain}
.pgh-gal::-webkit-scrollbar{display:none}
.pgh-pol{flex:0 0 min(74vw,300px);scroll-snap-align:center;margin:0;padding:8px 8px 10px;border-radius:6px;background:#fbf5ea;box-shadow:0 12px 28px rgba(0,0,0,.42);transform:rotate(var(--r,0deg));transition:transform .25s}
.pgh-pol:nth-child(odd){--r:-1.6deg}.pgh-pol:nth-child(even){--r:1.4deg}
.pgh-pol .ph{position:relative;aspect-ratio:3/2;border-radius:2px;overflow:hidden;background:linear-gradient(135deg,#ffcf9a,#9a6aa0)}
.pgh-pol img{width:100%;height:100%;object-fit:cover;display:block}
.pgh-pol figcaption{margin-top:8px;font:700 13px/1.3 ${FB};color:#4a3226;text-align:center}
.pgh-pol figcaption small{display:block;font-weight:600;font-size:11.5px;color:#8a6a58;margin-top:1px}
@media (min-width:900px){.pgh-gal{display:grid;grid-template-columns:repeat(3,1fr);overflow:visible;margin:0;padding:22px 0 10px;gap:22px}.pgh-pol{flex:none}.pgh-pol:hover{transform:rotate(0) scale(1.02)}}
.pgh-card{border-radius:22px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line),0 14px 34px rgba(0,0,0,.22);padding:18px}
.pgh-me{margin-top:16px;display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center}
.pgh-me-ico{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;position:relative;background:radial-gradient(circle at 50% 38%,#ffe6b5,#ffb46a 60%,#b0507a);box-shadow:0 0 0 3px rgba(255,214,140,.35),0 10px 24px rgba(255,150,80,.25)}
.pgh-me-ico i{position:absolute;inset:14px 18px 10px;border-radius:40% 40% 30% 30%;background:var(--skin,#a96c4c);box-shadow:inset 0 9px 0 var(--hairc,#333)}
.pgh-me-ico b{position:absolute;left:12px;right:12px;bottom:6px;height:16px;border-radius:12px 12px 22px 22px;background:var(--cloth,#ccc)}
.pgh-me h3{margin:0;font:700 17px ${FB};color:#fff3dc}
.pgh-me p{margin:4px 0 0;font:600 13.5px/1.4 ${FB};color:var(--soft)}
.pgh-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.pgh-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font:700 12px ${FB};color:#ffeccc;background:rgba(255,214,140,.12);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25)}
.pgh-tag i{width:10px;height:10px;border-radius:50%;background:var(--c)}
.pgh-me-actions{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.pgh-me-actions .pgh-cta{flex:0 1 auto;padding:8px 18px;min-height:46px}
.pgh-sync{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:12px;font:600 12.5px/1.35 ${FB};color:#cfe6ff;background:rgba(120,170,255,.1);box-shadow:inset 0 0 0 1px rgba(150,190,255,.28)}
.pgh-sync b{color:#fff}
/* téléchargement */
.pgh-dlcard{margin-top:16px;position:relative;overflow:hidden;padding:20px 18px;background:radial-gradient(ellipse 70% 90% at 100% 0%,rgba(255,190,110,.22),rgba(255,190,110,0) 60%),var(--card)}
.pgh-plat{display:flex;align-items:center;gap:12px}
.pgh-plat .ic{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffb85a);flex:none;box-shadow:0 6px 16px rgba(255,150,60,.3)}
.pgh-plat .ic svg{width:28px;height:28px}
.pgh-plat h3{margin:0;font:700 18px ${FB};color:#fff3dc}
.pgh-plat p{margin:2px 0 0;font:600 13px ${FB};color:var(--soft)}
.pgh-dlzone{margin-top:16px;display:grid;gap:8px;justify-items:start}
.pgh-dlbtn{min-height:58px;font-size:16.5px;padding:10px 22px;width:100%;max-width:440px}
.pgh-meta{font:600 12.5px ${FB};color:var(--soft)}
.pgh-soon{display:inline-flex;align-items:center;gap:10px;padding:12px 16px;border-radius:16px;font:700 15px ${FB};color:#ffe2ad;background:rgba(255,214,140,.1);box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.4)}
.pgh-soon i{width:10px;height:10px;border-radius:50%;background:#ffd36a;box-shadow:0 0 0 0 rgba(255,211,106,.7);animation:pghPing 1.8s infinite}
@keyframes pghPing{0%{box-shadow:0 0 0 0 rgba(255,211,106,.7)}80%,100%{box-shadow:0 0 0 12px rgba(255,211,106,0)}}
.pgh-onphone{font:600 12.5px/1.4 ${FB};color:#ffe9c8;background:rgba(255,255,255,.06);border-radius:12px;padding:8px 12px}
.pgh-notes{margin:4px 0 0;padding-left:18px;font:600 13px/1.5 ${FB};color:var(--soft)}
.pgh-steps{list-style:none;margin:20px 0 0;padding:0;display:grid;grid-template-columns:1fr;gap:12px;counter-reset:st}
@media (min-width:640px){.pgh-steps{grid-template-columns:repeat(3,1fr)}}
.pgh-step{position:relative;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;padding:14px;border-radius:18px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,214,140,.16)}
@media (min-width:640px){.pgh-step{grid-template-columns:1fr;justify-items:center;text-align:center;padding:18px 14px}}
.pgh-step .n{position:absolute;left:10px;top:10px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:700 12px ${FB};color:#3a1a05;background:#ffd36a}
.pgh-step .ico{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;color:#ffd98e;background:radial-gradient(circle at 50% 35%,rgba(120,80,150,.7),rgba(40,24,66,.8));box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.45)}
.pgh-step .ico svg{width:30px;height:30px}
.pgh-step h4{margin:0;font:700 15px ${FB};color:#fff3dc}
.pgh-step p{margin:3px 0 0;font:600 12.5px/1.45 ${FB};color:var(--soft)}
.pgh-step q{quotes:'« ' ' »';color:#ffe2ad;font-weight:700}
.pgh-ss{margin-top:14px;display:grid;grid-template-columns:1fr;gap:14px;align-items:center;padding:16px;border-radius:18px;background:rgba(120,170,255,.07);box-shadow:inset 0 0 0 1px rgba(150,190,255,.22)}
@media (min-width:760px){.pgh-ss{grid-template-columns:1.1fr 1fr}}
.pgh-ss h4{margin:0;display:flex;gap:8px;align-items:center;font:700 15px ${FB};color:#e6f0ff}
.pgh-ss h4 svg{width:22px;height:22px;color:#9fd0ff;flex:none}
.pgh-ss p{margin:6px 0 0;font:600 13px/1.5 ${FB};color:#cfdcf0}
.pgh-ss ol{margin:8px 0 0;padding-left:20px;font:600 13px/1.6 ${FB};color:#eaf2ff}
.pgh-ss ol b{color:#fff}
.pgh-win{position:relative;border-radius:8px;overflow:hidden;background:#1f6fc5;color:#fff;font:400 12px/1.35 'Segoe UI',system-ui,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.35);padding:12px 14px 12px;min-height:150px}
.pgh-win .t{font-size:17px;font-weight:300;margin:2px 0 8px}
.pgh-win .l{display:inline-block;margin-top:6px;text-decoration:underline;color:#fff;position:relative}
.pgh-win .k{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.pgh-win .k span{padding:5px 12px;border:1px solid rgba(255,255,255,.75);background:rgba(255,255,255,.08)}
.pgh-win .ring{position:absolute;inset:-6px -8px;border-radius:10px;box-shadow:0 0 0 3px #ffd36a,0 0 18px rgba(255,211,106,.9);animation:pghRing 1.6s ease-in-out infinite}
.pgh-win .badge{position:absolute;right:-12px;top:-14px;width:22px;height:22px;border-radius:50%;background:#ffd36a;color:#3a1a05;display:grid;place-items:center;font:700 12px ${FB}}
@keyframes pghRing{0%,100%{opacity:.55}50%{opacity:1}}
.pgh-win .s2{display:none}.pgh-win.two .s1{display:none}.pgh-win.two .s2{display:block}
.pgh-others{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pgh-others.one{grid-template-columns:1fr}
.pgh-andcard{margin-bottom:14px}
.pgh-andcard .pgh-plat .ic{background:linear-gradient(180deg,#c9f7a8,#6fd36a);box-shadow:0 6px 16px rgba(90,200,90,.3)}
.pgh-andbtns{display:flex;gap:10px;width:100%;max-width:440px;flex-wrap:wrap}
.pgh-andbtns .pgh-cta{min-height:56px;font-size:16px}
.pgh-andnote{font:600 12.5px/1.45 ${FB};color:#ffe9c8}
.pgh-andnote b{color:#fff4de}
.pgh-andbar{width:100%;max-width:440px;height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
.pgh-andbar i{display:block;height:100%;width:var(--p,0%);background:linear-gradient(90deg,#ffd36a,#ff9f4a);border-radius:inherit;transition:width .3s}
.pgh-other{padding:14px;border-radius:18px;background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px rgba(255,214,140,.14)}
.pgh-other .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#ffe2ad;background:rgba(255,214,140,.1)}
.pgh-other .ic svg{width:24px;height:24px}
.pgh-other h4{margin:10px 0 0;font:700 15px ${FB};color:#fff3dc;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.pgh-other p{margin:4px 0 0;font:600 12.5px/1.45 ${FB};color:var(--soft)}
.pgh-chip{display:inline-block;padding:2px 9px;border-radius:999px;font:700 10.5px ${FB};letter-spacing:.06em;text-transform:uppercase;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e)}
/* bientôt */
.pgh-soongrid{margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (min-width:760px){.pgh-soongrid{gap:16px}}@media (min-width:1100px){.pgh-soongrid{grid-template-columns:repeat(4,1fr)}}
.pgh-fut{position:relative;overflow:hidden;padding:16px 14px 14px;border-radius:20px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}
.pgh-fut::before{content:'';position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,var(--g,rgba(255,190,110,.25)),rgba(0,0,0,0) 70%)}
.pgh-fut .em{position:relative;width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-size:24px;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25)}
.pgh-fut h4{position:relative;margin:12px 0 0;font:700 15px/1.25 ${FB};color:#fff3dc}
.pgh-fut p{position:relative;margin:5px 0 0;font:600 12.5px/1.45 ${FB};color:var(--soft)}
.pgh-fut .pgh-chip{position:absolute;right:10px;top:12px;background:rgba(255,214,140,.16);color:#ffe2ad;box-shadow:inset 0 0 0 1px rgba(255,214,140,.35)}
.pgh-foot{max-width:1080px;margin:0 auto;padding:26px 16px calc(30px + env(safe-area-inset-bottom,0px));text-align:center;font:600 12px/1.5 ${FB};color:rgba(255,240,220,.5)}
/* ---------- onglets (collés en haut en défilant) ---------- */
.pgh-tabs{position:sticky;top:0;z-index:8;display:flex;justify-content:center;gap:4px;padding:8px 12px 0;background:rgb(16,12,34);box-shadow:0 1px 0 rgba(255,214,140,.16),0 10px 24px rgba(0,0,0,.25)}
.pgh-tab{position:relative;flex:1 1 0;max-width:200px;min-height:46px;border:0;background:none;padding:6px 8px 10px;display:flex;align-items:center;justify-content:center;gap:7px;font:700 14.5px ${FB};letter-spacing:.02em;color:rgba(255,240,220,.62);transition:color .2s}
.pgh-tab svg{width:19px;height:19px;flex:none}
.pgh-tab.on{color:#ffe2a6}
.pgh-tab .bdg{min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:none;align-items:center;justify-content:center;font:700 11.5px ${FB};color:#0f2a18;background:#7cf0a0}
.pgh-tab .bdg.on{display:inline-flex}
.pgh-tabs .ind{position:absolute;bottom:0;left:0;width:0;height:3px;border-radius:3px 3px 0 0;background:linear-gradient(90deg,#ffd27a,#ff9ec4);box-shadow:0 0 12px rgba(255,190,110,.7);transition:left .32s cubic-bezier(.3,.8,.3,1),width .32s cubic-bezier(.3,.8,.3,1)}
.pgh-pane{display:none;min-height:60vh}
.pgh-pane.on{display:block;animation:pghPane .35s ease}
@keyframes pghPane{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
/* ---------- MESSAGES (SMS du téléphone de l'avatar, 19 oct.) ---------- */
.pgh-tab .bdg.sms{color:#fff;background:linear-gradient(180deg,#ff7a8a,#e8455c);box-shadow:0 0 10px rgba(255,90,110,.55)}
.pgh-smsn{font:700 12.5px ${FB};color:#ffb3c1}
.pgh-smbox{margin-top:14px;padding:6px}
.pgh-smc{width:100%;display:grid;grid-template-columns:52px 1fr auto;gap:12px;align-items:center;padding:10px 12px;border:0;border-radius:16px;background:none;color:inherit;text-align:left;transition:background .15s,transform .15s}
.pgh-smc:hover{background:rgba(255,236,210,.05)}
.pgh-smc:active{transform:scale(.985)}
.pgh-smc + .pgh-smc{box-shadow:0 -1px 0 rgba(255,214,140,.1)}
.pgh-smc.un{background:linear-gradient(90deg,rgba(255,158,196,.12),rgba(255,207,115,.05))}
.pgh-smc .tx{min-width:0}
.pgh-smc b{display:block;font:700 15.5px ${FB};color:#fff3dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-smc b em{font-style:normal;margin-left:6px;padding:1px 7px;border-radius:999px;font:700 10px ${FB};letter-spacing:.06em;text-transform:uppercase;vertical-align:2px;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e)}
.pgh-smc .pv{display:block;margin-top:2px;font:600 13.5px/1.35 ${FB};color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-smc.un .pv{color:#fff3dc}
.pgh-smc .rt{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.pgh-smc .rt small{font:700 11.5px ${FB};color:var(--soft);white-space:nowrap}
.pgh-smc.un .rt small{color:#ffb3c1}
.pgh-smc .n{min-width:22px;height:22px;padding:0 7px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font:700 12px ${FB};color:#fff;background:linear-gradient(180deg,#ff7a8a,#e8455c);box-shadow:0 0 12px rgba(255,90,110,.5)}
.pgh-sma{position:relative;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;overflow:hidden;flex:none;font:400 22px ${FD};color:#fff3dc;background:hsl(var(--h,280) 45% 38%);box-shadow:inset 0 0 0 2px rgba(255,214,140,.28),0 6px 14px rgba(0,0,0,.3)}
.pgh-sma img{width:100%;height:100%;object-fit:cover;object-position:50% 18%}
.pgh-sma.pnj{font-size:26px;background:radial-gradient(circle at 50% 35%,#ffe7a8,#ffb35e 60%,#c46a2a);box-shadow:inset 0 0 0 2px rgba(255,240,200,.7),0 6px 16px rgba(255,150,60,.35)}
.pgh-sma.on::after{content:'';position:absolute;right:3px;bottom:3px;width:11px;height:11px;border-radius:50%;background:#7cf0a0;box-shadow:0 0 0 2.5px #2a1c4c}
.pgh-smempty{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:12px}
.pgh-smempty .em{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;font-size:28px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25)}
.pgh-smempty h3{margin:0;font:700 16px ${FB};color:#fff3dc}
.pgh-smempty p{margin:4px 0 0;font:600 13px/1.45 ${FB};color:var(--soft)}
.pgh-smempty .pgh-cta{grid-column:1 / -1;justify-self:start;flex:0 0 auto;padding:8px 18px;min-height:46px}
.pgh-smnew{display:flex;gap:8px;align-items:center;overflow-x:auto;scrollbar-width:none;padding:12px 6px 6px;margin-top:4px;box-shadow:0 -1px 0 rgba(255,214,140,.1)}
.pgh-smnew::-webkit-scrollbar{display:none}
.pgh-smnew > span{flex:none;font:700 12px ${FB};color:var(--soft);letter-spacing:.02em}
.pgh-smnew button{flex:none;display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:4px 14px 4px 4px;border:0;border-radius:999px;font:700 13px ${FB};color:#fff3dc;background:rgba(40,24,66,.74);box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.4)}
.pgh-smnew button .pgh-sma{width:30px;height:30px;font-size:13px;box-shadow:none}
.pgh-smwarn{margin:8px 12px 4px;font:600 12.5px/1.4 ${FB};color:#ffd2a0}
/* la conversation (par-dessus la page ; panneau centré sur grand écran) */
.pgh-th{position:absolute;inset:0;top:var(--pgkt,0px);bottom:var(--pgkb,0px);z-index:22;display:none;flex-direction:column;background:linear-gradient(180deg,#1c1640 0%,#271a4a 45%,#33204f 100%)}
.pgh-th.on{display:flex;animation:pghIn .28s ease}
.pgh-th::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 40% at 50% 0%,rgba(255,170,200,.14),rgba(0,0,0,0) 70%),radial-gradient(ellipse 70% 40% at 50% 100%,rgba(255,196,120,.12),rgba(0,0,0,0) 70%)}
.pgh-thh{position:relative;z-index:1;display:flex;align-items:center;gap:12px;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top));background:rgba(16,12,34,.72);box-shadow:0 1px 0 rgba(255,214,140,.16),0 10px 24px rgba(0,0,0,.25);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.pgh-thx{width:42px;height:42px;border-radius:50%;border:0;flex:none;color:#ffe2a6;background:rgba(255,255,255,.08);font:400 30px/1 ${FB};padding-bottom:4px}
.pgh-thh .pgh-sma{width:44px;height:44px;font-size:19px}
.pgh-thh .pgh-sma.pnj{font-size:22px}
.pgh-thh .tx{min-width:0}
.pgh-thh b{display:block;font:700 17px ${FB};color:#fff3dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-thh small{display:block;font:600 12.5px ${FB};color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-thh small.on{color:#9ff0b8}
.pgh-thl{position:relative;z-index:1;flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:14px 14px 10px;display:flex;flex-direction:column;gap:4px;scrollbar-width:thin;scrollbar-color:rgba(255,214,140,.3) transparent}
.pgh-thday{align-self:center;margin:12px 0 6px;padding:3px 12px;border-radius:999px;font:700 11.5px ${FB};letter-spacing:.04em;color:#ffe2ad;background:rgba(255,214,140,.1)}
.pgh-thmore{align-self:center;margin:2px 0 8px;min-height:36px;padding:4px 16px;border:0;border-radius:999px;font:700 12.5px ${FB};color:#ffe2ad;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,214,140,.3)}
.pgh-bub{max-width:min(78%,460px);padding:9px 13px 7px;border-radius:20px;font:600 15px/1.4 ${FB};white-space:pre-wrap;overflow-wrap:anywhere;position:relative;animation:pghBub .22s ease both}
@keyframes pghBub{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
.pgh-bub small{display:block;margin-top:3px;font:700 10.5px ${FB};opacity:.7;text-align:right}
.pgh-bub.th{align-self:flex-start;color:#fff3dc;background:rgba(255,236,210,.1);box-shadow:inset 0 0 0 1px rgba(255,214,140,.2);border-bottom-left-radius:6px}
.pgh-bub.me{align-self:flex-end;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e 70%,#ffae55);box-shadow:0 6px 16px rgba(255,150,60,.25),inset 0 1px 0 rgba(255,255,255,.7);border-bottom-right-radius:6px}
.pgh-bub.pnj{align-self:flex-start;color:#3b2410;background:linear-gradient(180deg,#fff6e4,#ffe6bf);box-shadow:0 6px 16px rgba(0,0,0,.25),inset 0 0 0 1px rgba(201,140,70,.5);border-bottom-left-radius:6px}
.pgh-bub.pnj i{display:block;font:700 11px ${FB};font-style:normal;letter-spacing:.05em;text-transform:uppercase;color:#a0623a;margin-bottom:2px}
.pgh-bub.pend{opacity:.72}
.pgh-bub.fail{background:linear-gradient(180deg,#ffd0d0,#ff9e9e);color:#4a0f14;cursor:pointer}
.pgh-thst{align-self:flex-end;margin:2px 4px 6px;font:700 11.5px ${FB};color:var(--soft)}
.pgh-thst.lu{color:#9fd8ff}
.pgh-thst.fail{color:#ff9e9e}
.pgh-thf{position:relative;z-index:1;display:flex;align-items:flex-end;gap:10px;padding:10px 12px;padding-bottom:max(10px,env(safe-area-inset-bottom));background:rgba(16,12,34,.78);box-shadow:0 -1px 0 rgba(255,214,140,.16)}
.pgh-thf textarea{flex:1 1 auto;min-height:46px;max-height:140px;resize:none;border:0;border-radius:23px;padding:12px 16px;font:600 15.5px/1.35 ${FB};color:#fff3dc;background:rgba(255,236,210,.08);box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.3);outline:none}
.pgh-thf textarea:focus{box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.75),0 0 0 4px rgba(255,190,110,.12)}
.pgh-thf textarea::placeholder{color:rgba(255,240,220,.45)}
.pgh-thsend{width:46px;height:46px;flex:none;border:0;border-radius:50%;display:grid;place-items:center;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e 55%,#ff9f4a);box-shadow:0 8px 20px rgba(255,150,60,.38),inset 0 1px 0 rgba(255,255,255,.75);transition:transform .15s,opacity .2s}
.pgh-thsend:active{transform:scale(.92)}
.pgh-thsend:disabled{opacity:.4;box-shadow:none}
.pgh-thsend svg{width:22px;height:22px;margin-left:2px}
.pgh-thc{position:absolute;right:72px;top:-20px;padding:1px 8px;border-radius:999px;font:700 11px ${FB};color:#ffe2ad;background:rgba(16,12,34,.85)}
.pgh-thc:empty,.pgh-thf[hidden],.pgh-thro[hidden]{display:none}
.pgh-thc.over{color:#ff9e9e}
.pgh-thro{position:relative;z-index:1;padding:14px 16px;padding-bottom:max(14px,env(safe-area-inset-bottom));text-align:center;font:600 13px/1.45 ${FB};color:var(--soft);background:rgba(16,12,34,.78);box-shadow:0 -1px 0 rgba(255,214,140,.16)}
.pgh-thempty{margin:auto;text-align:center;font:600 14px/1.5 ${FB};color:var(--soft);padding:20px}
.pgh-thempty b{display:block;font-size:34px;margin-bottom:6px}
@media (min-width:760px){
  .pgh-th{background:rgba(10,8,24,.62);align-items:center;justify-content:center;padding:24px}
  .pgh-th > *{width:min(640px,100%)}
  .pgh-thh{border-radius:22px 22px 0 0;background:rgba(30,22,62,.96)}
  .pgh-thl{flex:0 1 auto;height:min(62vh,640px);background:linear-gradient(180deg,#221a48,#2f1f50)}
  .pgh-thf,.pgh-thro{border-radius:0 0 22px 22px;background:rgba(30,22,62,.96)}
  .pgh-th::before{display:none}
}
/* clavier ouvert (classe kb, posée par thKb) : le panneau tient dans la zone VISIBLE (--pgkt / --pgkb), la barre colle au clavier ; kbs = très peu de place (téléphone couché) */
.pgh-th.kb .pgh-thf{padding-bottom:10px}
.pgh-th.kb .pgh-thh{padding-top:8px;padding-bottom:8px}
.pgh-th.kb .pgh-thl{flex:1 1 auto;height:auto;min-height:0}
.pgh-th.kbs .pgh-thh{padding:4px 12px}
.pgh-th.kbs .pgh-thx{width:34px;height:34px;font-size:26px}
.pgh-th.kbs .pgh-thh .pgh-sma{width:32px;height:32px;font-size:15px}
.pgh-th.kbs .pgh-thh small{display:none}
.pgh-th.kbs .pgh-thf{padding-top:6px;padding-bottom:6px}
@media (min-width:760px){.pgh-th.kb{padding-top:6px;padding-bottom:6px}}
@media (prefers-reduced-motion:reduce){.pgh-bub,.pgh-th.on{animation:none}}
/* ---------- RÉACTIONS sur les messages (20 oct. : ❤️ 👍 😂 😮 😢 👎, comme iMessage) : pastille au coin haut de la bulle (côté intérieur),
   barre de 6 réactions au-dessus de la bulle (appui long, clic droit, bouton ☺ au survol, A de la manette / Entrée) ---------- */
.pgh-bub.rx{margin-top:22px}
.pgh-bub[data-m]{-webkit-touch-callout:none}
.pgh-bub[data-m]:focus{outline:none}
.pgh-bub[data-m]:focus-visible{box-shadow:0 0 0 3px rgba(255,214,140,.85),0 0 22px rgba(255,190,110,.45)}
@media (hover:none){.pgh-bub[data-m]{-webkit-user-select:none;user-select:none}}
.pgh-bub.sel{z-index:2;animation:none;transform:scale(1.035);transition:transform .18s cubic-bezier(.3,1.5,.5,1);box-shadow:0 0 0 2px rgba(255,214,140,.75),0 12px 30px rgba(0,0,0,.45),0 0 26px rgba(255,190,110,.35)}
.pgh-bub.me.sel{transform-origin:100% 50%}
.pgh-bub.th.sel,.pgh-bub.pnj.sel{transform-origin:0 50%}
.pgh-rx{position:absolute;top:-23px;z-index:1;display:inline-flex;align-items:center;gap:2px;height:30px;min-width:30px;padding:0 7px;border-radius:999px;white-space:nowrap;
  font:700 12px ${FB};color:#fff3dc;background:linear-gradient(180deg,#3b2a6e,#2a1d55);box-shadow:0 0 0 2.5px #241848,0 6px 14px rgba(0,0,0,.35);pointer-events:none}
.pgh-bub.me .pgh-rx{left:-12px}
.pgh-bub.th .pgh-rx,.pgh-bub.pnj .pgh-rx{right:-12px}
.pgh-rx i{font-style:normal;font-size:16px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))}
.pgh-rx b{margin:0 1px 0 2px;font:800 11.5px ${FB};color:#ffe2ad}
.pgh-rx.mine{background:linear-gradient(180deg,#ffe7a8,#ffc35e 70%,#ffae55);box-shadow:0 0 0 2.5px #241848,0 6px 14px rgba(255,150,60,.3)}
.pgh-rx.mine b{color:#7a3d10}
.pgh-rx.new{animation:pghRx .42s cubic-bezier(.3,1.7,.45,1) both}
@keyframes pghRx{0%{opacity:0;transform:scale(.2) translateY(6px)}60%{opacity:1}100%{transform:none}}
/* bouton ☺ au survol (souris seulement) */
.pgh-rxb{position:absolute;top:50%;width:32px;height:32px;margin-top:-16px;border:0;border-radius:50%;display:none;place-items:center;padding:0;color:#ffe2ad;
  background:rgba(40,26,76,.92);box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.35),0 4px 12px rgba(0,0,0,.3);opacity:0;transition:opacity .15s,transform .15s;cursor:pointer}
.pgh-rxb svg{width:19px;height:19px}
.pgh-bub.me .pgh-rxb{left:-42px}
.pgh-bub.th .pgh-rxb,.pgh-bub.pnj .pgh-rxb{right:-42px}
@media (hover:hover) and (pointer:fine){.pgh-rxb{display:grid}.pgh-bub[data-m]:hover .pgh-rxb{opacity:1}.pgh-rxb:hover{transform:scale(1.12);color:#fff}}
/* la barre */
.pgh-rxveil{position:absolute;inset:0;width:auto;z-index:30;background:rgba(10,6,26,.18)}
.pgh-rxveil[hidden],.pgh-rxbar[hidden]{display:none}
.pgh-rxbar{position:absolute;z-index:31;width:auto;display:flex;gap:2px;padding:6px;border-radius:999px;background:rgba(30,20,60,.97);
  box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.32),0 14px 34px rgba(0,0,0,.5),0 0 30px rgba(255,170,200,.12);animation:pghRxBar .26s cubic-bezier(.3,1.5,.5,1) both}
@keyframes pghRxBar{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.pgh-rxbar button{width:48px;height:48px;border:0;border-radius:50%;padding:0;display:grid;place-items:center;font-size:29px;line-height:1;background:none;cursor:pointer;
  transition:transform .14s cubic-bezier(.3,1.6,.5,1),background .15s;animation:pghRxIt .3s cubic-bezier(.3,1.7,.45,1) both}
.pgh-rxbar button:nth-child(2){animation-delay:.03s}.pgh-rxbar button:nth-child(3){animation-delay:.06s}.pgh-rxbar button:nth-child(4){animation-delay:.09s}
.pgh-rxbar button:nth-child(5){animation-delay:.12s}.pgh-rxbar button:nth-child(6){animation-delay:.15s}
@keyframes pghRxIt{from{opacity:0;transform:translateY(10px) scale(.5)}to{opacity:1;transform:none}}
.pgh-rxbar button:hover,.pgh-rxbar button:focus-visible{transform:scale(1.22) translateY(-3px);outline:none}
.pgh-rxbar button:active{transform:scale(.92)}
.pgh-rxbar button.on{background:radial-gradient(circle,rgba(255,214,140,.42),rgba(255,190,110,.18) 70%);box-shadow:inset 0 0 0 2px rgba(255,214,140,.8)}
@media (max-width:380px){.pgh-rxbar button{width:42px;height:42px;font-size:25px}}
@media (prefers-reduced-motion:reduce){.pgh-rx.new,.pgh-rxbar,.pgh-rxbar button{animation:none}}
/* ---------- copains ---------- */
.pgh-frhead{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.pgh-frcount{font:700 12.5px ${FB};color:#9ff0b8}
.pgh-frrow{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x proximity;padding:16px 16px 10px;margin:0 -16px;scrollbar-width:none;overscroll-behavior-x:contain}
.pgh-frrow::-webkit-scrollbar{display:none}
@media (min-width:760px){.pgh-frrow{flex-wrap:wrap;overflow:visible;margin:0;padding:18px 0 8px}}
.pgh-fc{flex:0 0 132px;scroll-snap-align:start;border:0;padding:0;background:none;color:inherit;text-align:center;transition:transform .15s}
.pgh-fc:active{transform:scale(.96)}
.pgh-fc .st{position:relative;display:block;height:186px;border-radius:20px;overflow:hidden;background:radial-gradient(ellipse 90% 55% at 50% 92%,rgba(255,196,120,.55),rgba(255,196,120,0) 70%),radial-gradient(ellipse 70% 50% at 50% 20%,rgba(255,170,200,.22),rgba(0,0,0,0) 70%),linear-gradient(180deg,#4a3178,#2a1c4c 70%,#22173e);box-shadow:inset 0 0 0 1px rgba(255,214,140,.22),0 10px 22px rgba(0,0,0,.3)}
.pgh-fc.on .st{box-shadow:inset 0 0 0 1.5px rgba(124,240,160,.6),0 10px 22px rgba(0,0,0,.3),0 0 18px rgba(124,240,160,.18)}
.pgh-fc .st::after{content:'';position:absolute;left:18%;right:18%;bottom:10px;height:16px;border-radius:50%;background:radial-gradient(ellipse at 50% 40%,#ffd7a0,#c98b52 60%,#6a4026);box-shadow:0 4px 10px rgba(0,0,0,.4);z-index:0}
.pgh-fc .av{position:absolute;left:50%;bottom:15px;height:166px;transform:translateX(-50%);z-index:1;opacity:0;transition:opacity .45s}
.pgh-fc .av.on{opacity:1}
.pgh-fc .wait{position:absolute;left:50%;bottom:20px;width:46px;height:132px;margin-left:-23px;border-radius:24px 24px 14px 14px;z-index:1;background:linear-gradient(180deg,var(--hair,#3d3d3d) 0 14%,var(--skin,#a96c4c) 14% 26%,var(--cloth,#ccc) 26% 70%,rgba(255,255,255,.18) 70%);opacity:.5;filter:blur(1.5px);animation:pghPulse 1.6s ease-in-out infinite}
.pgh-fc .av.on + .wait{display:none}
.pgh-fc .sil{position:absolute;left:50%;bottom:22px;width:64px;height:96px;margin-left:-32px;border-radius:30px 30px 12px 12px;background:linear-gradient(180deg,rgba(210,190,255,.32),rgba(150,120,210,.2));z-index:1}
.pgh-fc .hd{position:absolute;left:50%;bottom:98px;width:66px;height:82px;margin-left:-33px;z-index:2;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))}
.pgh-fc .ini{position:absolute;left:50%;bottom:112px;width:56px;height:56px;margin-left:-28px;border-radius:50%;display:grid;place-items:center;z-index:2;font:400 24px ${FD};color:#fff3dc;background:hsl(var(--h,280) 45% 38%);box-shadow:0 4px 10px rgba(0,0,0,.35)}
.pgh-fc .none{position:absolute;left:10px;right:10px;bottom:30px;z-index:3;padding:3px 6px;border-radius:10px;font:700 10px/1.25 ${FB};color:#fff1dd;background:rgba(30,18,52,.72)}
.pgh-dclose{width:38px;height:38px;border-radius:50%;border:0;color:#fff4e2;background:rgba(255,255,255,.1);font-size:18px;line-height:1;flex:none}
.pgh-fc .dot{position:absolute;right:10px;top:10px;width:12px;height:12px;border-radius:50%;z-index:4;background:#7cf0a0;box-shadow:0 0 0 2.5px #2a1c4c,0 0 12px rgba(124,240,160,.9);display:none}
.pgh-fc.on .dot{display:block}
.pgh-fc.no .dot{top:10px;right:10px}
.pgh-fc b{display:block;margin-top:8px;font:700 14px ${FB};color:#fff3dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-fc small{display:block;margin-top:1px;font:600 11.5px ${FB};color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-fc.on small{color:#9ff0b8}
.pgh-frmsg{margin-top:16px;display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center}
.pgh-frmsg .em{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;font-size:28px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25)}
.pgh-frmsg h3{margin:0;font:700 16px ${FB};color:#fff3dc}
.pgh-frmsg p{margin:4px 0 0;font:600 13px/1.45 ${FB};color:var(--soft)}
.pgh-frmsg .pgh-cta{grid-column:1 / -1;justify-self:start;flex:0 0 auto;padding:8px 18px;min-height:46px}
/* ---------- le copain en grand ---------- */
.pgh-fv{position:absolute;inset:0;z-index:20;display:none;overflow:hidden;background:linear-gradient(180deg,#2a1d55 0%,#5d3f86 30%,#c1729a 60%,#ffb487 84%,#ffd796 100%)}
.pgh-fv.on{display:block;animation:pghIn .3s ease}
.pgh-fv::before{content:'';position:absolute;left:50%;top:50%;width:120vmax;height:120vmax;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(255,226,160,.6),rgba(255,200,140,0) 30%);pointer-events:none}
.pgh-fv.wide::before{left:26%;top:62%}
.pgh-fvstage{position:absolute;left:0;right:0;top:0;height:60%}
.pgh-fv.wide .pgh-fvstage{right:auto;width:52%;height:100%}
.pgh-fvnone{position:absolute;inset:0;display:none;place-items:center;text-align:center;padding:16px}
.pgh-fvnone.on{display:grid}
.pgh-fvnone .ped{position:relative;width:150px;height:230px;margin:0 auto}
.pgh-fvnone .ped::after{content:'';position:absolute;left:8%;right:8%;bottom:0;height:24px;border-radius:50%;background:radial-gradient(ellipse at 50% 40%,#ffd7a0,#c98b52 60%,#6a4026);box-shadow:0 6px 16px rgba(0,0,0,.35)}
.pgh-fvnone .sil{position:absolute;left:50%;bottom:14px;width:96px;height:132px;margin-left:-48px;border-radius:44px 44px 16px 16px;background:linear-gradient(180deg,rgba(255,255,255,.42),rgba(255,255,255,.14))}
.pgh-fvnone .hd{position:absolute;left:50%;bottom:122px;width:96px;height:120px;margin-left:-48px;object-fit:contain;filter:drop-shadow(0 6px 12px rgba(40,10,40,.35))}
.pgh-fvnone .ini{position:absolute;left:50%;bottom:140px;width:80px;height:80px;margin-left:-40px;border-radius:50%;display:grid;place-items:center;font:400 34px ${FD};color:#fff3dc;background:hsl(var(--h,280) 45% 38%)}
.pgh-fvnone p{margin:14px 0 0;font:700 15px/1.4 ${FB};color:#fff6ea;text-shadow:0 2px 8px rgba(60,20,60,.6)}
.pgh-fvpanel{position:absolute;left:0;right:0;bottom:0;top:60%;display:flex;flex-direction:column;gap:12px;padding:16px 16px calc(14px + env(safe-area-inset-bottom,0px));border-radius:24px 24px 0 0;background:linear-gradient(180deg,rgba(34,22,62,.95),rgba(20,13,38,.98));box-shadow:0 -10px 30px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,214,140,.3);overflow-y:auto}
.pgh-fv.wide .pgh-fvpanel{left:52%;top:0;border-radius:0;justify-content:center;padding:24px 28px;box-shadow:-10px 0 30px rgba(0,0,0,.3),inset 1px 0 0 rgba(255,214,140,.3)}
.pgh-fvhead{display:flex;align-items:center;gap:10px}
.pgh-fvhead b{flex:1;min-width:0;font:400 24px ${FD};letter-spacing:.03em;color:#ffe9c2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-fvst{display:inline-flex;align-items:center;gap:6px;font:700 12.5px ${FB};color:var(--soft)}
.pgh-fvst i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.3)}
.pgh-fvst.on{color:#9ff0b8}.pgh-fvst.on i{background:#7cf0a0;box-shadow:0 0 10px #7cf0a0}
.pgh-fvdesc{margin:-4px 0 0;font:600 13px/1.4 ${FB};color:var(--soft)}
.pgh-fvemo{display:flex;gap:9px}
.pgh-fvemo .pgh-emo{width:46px;height:46px;font-size:20px}
.pgh-fvbtns{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pgh-fvbtns [data-h="fvsms"]{grid-column:1 / -1}
.pgh-fvbtns [hidden]{display:none}
.pgh-fvbtns [data-h="fvlivre"][hidden] + [data-h="fvhouse"]{grid-column:1 / -1}
/* 23 oct. 2026 : l'onglet Amis en TUILES (une par ami : avatar, en ligne, nouveaux messages, son livre) ; les anciennes sections restent
   pour les cas vides (invité, pas de salle) et se cachent dès qu'il y a des tuiles */
.pgh-pane.tuiles > [data-h="secsms"],.pgh-pane.tuiles > [data-h="secfr"],.pgh-pane.tuiles > [data-h="lvfr"]{display:none!important}
.pga-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}
@media (min-width:760px){.pga-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}}
@media (min-width:1080px){.pga-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.pga-t{position:relative;display:flex;flex-direction:column;gap:10px;min-width:0;padding:12px;border:0;border-radius:20px;color:inherit;text-align:left;cursor:pointer;
  background:linear-gradient(180deg,rgba(255,236,210,.085),rgba(255,236,210,.03));box-shadow:inset 0 0 0 1px rgba(255,214,140,.14),0 10px 24px rgba(0,0,0,.26);transition:transform .15s,box-shadow .15s}
.pga-t:hover{transform:translateY(-2px);box-shadow:inset 0 0 0 1px rgba(255,214,140,.32),0 14px 30px rgba(0,0,0,.32)}
.pga-t:active{transform:scale(.98)}
.pga-t:focus-visible{outline:3px solid #fac55e;outline-offset:2px}
.pga-t.un{box-shadow:inset 0 0 0 2px rgba(255,190,90,.75),0 10px 26px rgba(0,0,0,.3)}
.pga-top{display:flex;align-items:center;gap:10px;min-width:0}
.pga-av{position:relative;flex:none;width:62px;height:62px;border-radius:18px;overflow:hidden;background:radial-gradient(120% 90% at 50% 20%,#6d4f9c,#2a1d4a)}
.pga-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 14%}
.pga-av img.av{opacity:0;transform:scale(1.9);transform-origin:50% 12%;transition:opacity .3s}
.pga-av img.av.on{opacity:1}
.pga-av .wait{position:absolute;left:50%;top:20%;width:30px;height:30px;margin-left:-15px;border-radius:50%;background:var(--skin,#e8b48f);box-shadow:0 -7px 0 3px var(--hair,#5a3a20),0 22px 0 6px var(--cloth,#6d5ab0)}
.pga-av img.av.on + .wait{display:none}
.pga-av .ini{position:absolute;inset:0;display:grid;place-items:center;font:400 28px ${FD};color:#fff3dc;background:hsl(var(--h,280) 45% 38%)}
.pga-av .dot{position:absolute;right:4px;bottom:4px;width:13px;height:13px;border-radius:50%;background:#8a8496;box-shadow:0 0 0 2.5px #241a3c}
.pga-t.on .pga-av .dot{background:#5fe08a}
.pga-id{display:flex;flex-direction:column;min-width:0;gap:2px}
.pga-id b{font:700 16px/1.15 ${FB};color:#fff3dc;overflow:hidden;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.pga-id small{font:600 12.5px ${FB};color:rgba(255,236,210,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pga-t.on .pga-id small{color:#8ff0b0}
.pga-bd{display:flex;flex-wrap:wrap;gap:6px}
.pga-b{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;font:700 12.5px ${FB};background:rgba(255,236,210,.09);color:#f3e2c8;white-space:nowrap}
.pga-b.on{background:linear-gradient(180deg,#ffe7a8,#ffb85e);color:#3a1a05}
.pga-last{display:block;font:600 13px ${FB};color:rgba(255,236,210,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 23 oct. (l'utilisateur : « fais réellement l'avatar vu en entier comme avant ») : la tuile d'un ami = la carte en pied d'avant (.pgh-fc :
   scène, rondin, avatar entier ; sans avatar : sa tête de la borne sur une silhouette, « Pas encore sur Pégase ») + ses nouvelles + 📞 */
.pga-f{padding:0;gap:0}
.pga-f .pgh-fc{flex:none;display:flex;flex-direction:column;width:100%;min-width:0;padding:8px 8px 12px;cursor:pointer;font:inherit}
.pga-f .pgh-fc .st{height:196px;border-radius:16px}
.pga-f .pgh-fc .av{height:176px}
.pga-f .pgh-fc b{margin-top:10px;font-size:15.5px}
.pga-f .pgh-fc small{font-size:12px}
.pga-f .pgh-fc.no .none{bottom:34px;font-size:10.5px}
.pga-f.un .pgh-fc .st{box-shadow:inset 0 0 0 2px rgba(255,190,90,.8),0 10px 22px rgba(0,0,0,.3)}
.pga-f .pga-bd{justify-content:center;margin-top:8px}
.pga-f .pga-last{margin-top:6px;text-align:center}
.pga-un{position:absolute;left:8px;top:8px;z-index:4;padding:4px 9px;border-radius:999px;font:800 12px ${FB};color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffb85e);box-shadow:0 4px 10px rgba(0,0,0,.35)}
.pga-call{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 10px 12px;min-height:44px;padding:0 14px;border:0;border-radius:999px;cursor:pointer;
  font:800 14.5px ${FB};color:#063a18;background:linear-gradient(180deg,#a6f5bb,#3cbf68);box-shadow:0 6px 16px rgba(20,90,50,.35),inset 0 0 0 1.5px rgba(255,255,255,.35);transition:transform .15s}
.pga-call:hover{transform:translateY(-1px)}
.pga-call:active{transform:scale(.96)}
.pga-call:focus-visible{outline:3px solid #fac55e;outline-offset:2px}
.pga-f .pgh-fc{flex:1 0 auto}
.pgh-fvbtns .pgh-cta{min-height:52px;font-size:14px;flex-direction:column;gap:2px;line-height:1.1}
.pgh-fvbtns .pgh-cta small{font:700 10px ${FB};letter-spacing:.08em;text-transform:uppercase;color:#ffcf8a}
.pgh-fvbtns .pgh-cta small,.pgh-fvbtns .pgh-cta span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pgh-fvbtns .pgh-cta[disabled]{opacity:.62}
/* la maison d'un copain (pg_room_maisons) : son plan vu du ciel, même dessin que « Ma maison », sa parcelle et la date */
.pgh-hm .pgh-mcard{width:min(100%,420px)}
.pgh-hmplan{position:relative;width:100%;max-width:340px;aspect-ratio:264 / 220;margin:14px auto 0;border-radius:18px;overflow:hidden;background:linear-gradient(180deg,#fff2d6,#f2d39f);box-shadow:inset 0 0 0 1px rgba(120,70,30,.35),0 12px 26px rgba(0,0,0,.38)}
.pgh-hmplan canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.pgh-hmleg{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 10px;margin:8px 0 0;font:700 11px ${FB};color:rgba(255,236,210,.72)}
.pgh-hmleg span{display:inline-flex;align-items:center;gap:5px}
.pgh-hmleg i{width:10px;height:10px;border-radius:3px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.18)}
.pgh-hmfacts{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 8px;margin-top:12px}
.pgh-hmfacts span{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:6px 12px;border-radius:999px;font:700 13px ${FB};color:#fff1da;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,214,140,.22)}
.pgh-hmfacts span.plot{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e);box-shadow:none}
.pgh-hmlv{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:10px}
.pgh-hmlv:empty{display:none}
.pgh-hmlv button{min-height:34px;padding:4px 14px;border-radius:999px;border:0;font:700 12.5px ${FB};color:#fff4e2;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25);cursor:pointer}
.pgh-hmlv button.on{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e);box-shadow:none}
.pgh.short .pgh-hmplan{grid-column:1;grid-row:1 / span 6;width:auto;height:min(64vh,250px);margin:0}
.pgh.short .pgh-hmlv,.pgh.short .pgh-hmleg,.pgh.short .pgh-hmfacts{grid-column:2;justify-content:flex-start;margin-top:4px}
.pgh.short .pgh-hm .pgh-mcard{width:min(100%,780px)}
.pgh.short .pgh-hm .pgh-mcard h3{font-size:17px}
.pgh.short .pgh-hm .pgh-hmleg,.pgh.short .pgh-hm .pgh-mcard p{display:none}
.pgh.short .pgh-hmlv button{min-height:30px;padding:2px 11px;font-size:12px}
.pgh.short .pgh-hmfacts span{padding:4px 10px;font-size:12px}
.pgh.short .pgh-hm .pgh-mbtns .pgh-cta{min-height:42px}
/* appel avec les avatars (hub 2.15) : la fiche du copain en plein écran, son avatar en grand, le mien dans le coin */
.pgh-fvbtns .pgh-cta[hidden]{display:none}
.pgh-fvbtns.three [data-h="fvsms"]{grid-column:auto}
.pgh-cta.call{background:linear-gradient(180deg,#a6f5bb,#3cbf68);color:#063a18;box-shadow:0 8px 20px rgba(40,160,90,.35)}
.pgh-fvbtns .pgh-cta.call small{color:#0b4d22}
.pgh-fv.call .pgh-fvstage{left:0;right:0;top:0;bottom:0;width:auto;height:auto}
.pgh-fv.call .pgh-fvpanel{display:none}
.pgh-clpip{position:absolute;right:14px;top:calc(96px + env(safe-area-inset-top,0px));width:30%;max-width:168px;aspect-ratio:3 / 4;border-radius:22px;display:none;z-index:4;overflow:hidden;
  background:radial-gradient(ellipse at 50% 88%,rgba(255,196,120,.5),rgba(255,196,120,0) 70%),linear-gradient(180deg,#3d2c70,#211747);box-shadow:inset 0 0 0 2px rgba(255,214,140,.5),0 12px 26px rgba(0,0,0,.45)}
.pgh-fv.call .pgh-clpip{display:block}
.pgh-fv.wide .pgh-clpip{top:24px;right:24px;width:18%;max-width:190px}
/* 23 oct. : sur la borne on se voit « en vrai » — la vidéo de l'autre plein cadre (sinon son avatar), ma caméra dans le coin (sinon mon avatar) */
.pgh-clvid{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:3;display:none;background:#0b0718}  /* 23 oct. : la vidéo ENTIÈRE (paysage reste paysage), jamais recadrée */
.pgh-fv.vid .pgh-clvid{display:block}
.pgh-clme{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:none;background:#140d28}
.pgh-fv.cam .pgh-clme{display:block}
.pgh-fv.cam .pgh-clpip{background:#140d28}
.pgh-fv.cam .pgh-clpip b{padding:2px 9px;border-radius:999px;background:rgba(14,8,28,.62)}
.pgh-clpip b{z-index:1;position:absolute;left:50%;bottom:7px;transform:translateX(-50%);font:700 11px ${FB};letter-spacing:.1em;text-transform:uppercase;color:#ffe9c2;text-shadow:0 1px 4px rgba(0,0,0,.7)}
.pgh-fvcall{position:absolute;inset:0;display:none;pointer-events:none;z-index:3}
.pgh-fv.call .pgh-fvcall{display:block}
.pgh-cltop{position:absolute;left:0;right:0;top:0;padding:calc(20px + env(safe-area-inset-top,0px)) 18px 34px;background:linear-gradient(180deg,rgba(22,12,44,.82),rgba(22,12,44,0))}
.pgh-cltop b{display:block;max-width:60%;font:400 30px ${FD};letter-spacing:.03em;color:#ffe9c2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-cltop span{display:inline-flex;align-items:center;gap:8px;margin-top:6px;font:700 15px ${FB};color:#fff1da}
.pgh-cltop span i{width:10px;height:10px;border-radius:50%;background:#ffd36a;animation:pghClPulse 1.1s ease-in-out infinite}
.pgh-cltop span em{font-style:normal}
.pgh-fvcall[data-s="live"] .pgh-cltop span i{background:#7cf0a0;box-shadow:0 0 10px #7cf0a0;animation:none}
.pgh-fvcall[data-s="end"] .pgh-cltop span i{background:#ff7b7b;animation:none}
@keyframes pghClPulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
@keyframes pghClRing{0%,100%{transform:rotate(0)}15%{transform:rotate(-14deg)}30%{transform:rotate(12deg)}45%{transform:rotate(-8deg)}60%{transform:rotate(0)}}
.pgh-clbar{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:center;gap:34px;padding:30px 16px calc(44px + env(safe-area-inset-bottom,0px));background:linear-gradient(0deg,rgba(22,12,44,.85),rgba(22,12,44,0))}
.pgh-clbar button{position:relative;width:74px;height:74px;border-radius:50%;border:0;display:none;place-items:center;font-size:30px;line-height:1;color:#fff;cursor:pointer;pointer-events:auto;box-shadow:0 10px 26px rgba(0,0,0,.45)}
.pgh-clbar button small{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:8px;font:700 12px ${FB};white-space:nowrap;color:#fff1da;text-shadow:0 1px 4px rgba(0,0,0,.6)}
.pgh-clbar .end,.pgh-clbar .no{background:linear-gradient(180deg,#ff7a7a,#d93c3c)}
.pgh-clbar .end span,.pgh-clbar .no span{display:block;transform:rotate(135deg)}
.pgh-clbar .ok{background:linear-gradient(180deg,#8ff0a8,#2fb35c)}
.pgh-clbar .ok span{display:block;animation:pghClRing 1.2s ease-in-out infinite}
.pgh-clbar .mute{background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.4),0 10px 26px rgba(0,0,0,.35)}
.pgh-clbar .mute.on{background:#fff1da;color:#3a1a05}
.pgh-clbar .cam{background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.4),0 10px 26px rgba(0,0,0,.35)}
.pgh-clbar .cam.on{background:#fff1da;color:#3a1a05}
.pgh-clbar .flip{background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.4),0 10px 26px rgba(0,0,0,.35)}
.pgh-fv.back .pgh-clme{transform:none}
.pgh-fvcall[data-s="in"] .ok,.pgh-fvcall[data-s="in"] .no,.pgh-fvcall[data-s="out"] .end,.pgh-fvcall[data-s="out"] .mute,.pgh-fvcall[data-s="live"] .end,.pgh-fvcall[data-s="live"] .mute,
.pgh-fvcall[data-s="out"] .cam,.pgh-fvcall[data-s="live"] .cam,.pgh-fvcall[data-s="out"] .flip,.pgh-fvcall[data-s="live"] .flip{display:grid}
.pgh-clbar .cam[hidden],.pgh-clbar .flip[hidden]{display:none!important}
.pgh-fv.vid .pgh-cltop{background:linear-gradient(180deg,rgba(10,6,22,.7),rgba(10,6,22,0))}
.pgh.short .pgh-cltop{padding-top:12px}.pgh.short .pgh-cltop b{font-size:22px}.pgh.short .pgh-clpip{top:12px;width:16%}
.pgh.short .pgh-clbar{padding-bottom:30px;gap:26px}.pgh.short .pgh-clbar button{width:60px;height:60px;font-size:24px}
@media (max-width:400px){.pgh-clbar{gap:18px}.pgh-clbar button{width:64px;height:64px;font-size:26px}}
/* ---------- modifier l'avatar SUR PLACE (panneau du bas ; côté droit en paysage) ---------- */
.pgh-hero .pgh-copy,.pgh-hero .pgh-bottom{transition:opacity .35s,transform .35s}
.pgh.editing .pgh-hero .pgh-copy{opacity:0;transform:translateY(-16px);pointer-events:none}
.pgh.editing .pgh-hero .pgh-bottom{opacity:0;transform:translateY(16px);pointer-events:none}
.pgh.editing .pgh-scroll{overflow:hidden}
.pgh.editing .pgh-name,.pgh.editing .pgh-hint{opacity:0!important}
.pgh-ed{position:absolute;left:0;right:0;bottom:0;z-index:15;height:54%;display:flex;flex-direction:column;border-radius:24px 24px 0 0;background:linear-gradient(180deg,rgba(36,24,66,.94),rgba(20,13,38,.97));box-shadow:0 -12px 34px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,214,140,.32);transform:translateY(105%);transition:transform .42s cubic-bezier(.2,.85,.25,1),visibility 0s .42s;visibility:hidden}
.pgh-ed.on{transform:none;visibility:visible;transition:transform .42s cubic-bezier(.2,.85,.25,1)}
.pgh.wide .pgh-ed{left:auto;top:0;width:min(56%,620px);height:auto;border-radius:24px 0 0 24px;transform:translateX(105%)}
.pgh.wide .pgh-ed.on{transform:none}
.pgh-edtop{display:flex;align-items:center;gap:8px;padding:12px 12px 4px 16px}
.pgh-edtop .t{flex:1;min-width:0}
.pgh-edtop b{display:block;font:400 18px ${FD};letter-spacing:.03em;color:#ffe9c2}
.pgh-edtop span{display:block;font:600 11.5px ${FB};color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-edtop button{width:38px;height:38px;border-radius:50%;border:0;color:#fff4e2;background:rgba(255,255,255,.08);font-size:18px;line-height:1;flex:none;display:grid;place-items:center;padding:0}
.pgh-edtop button svg{width:20px;height:20px}
.pgh-edtop button[disabled]{opacity:.3}
.pgh-edcats{display:flex;gap:6px;padding:6px 12px 8px;overflow-x:auto;scrollbar-width:none}
.pgh-edcats::-webkit-scrollbar{display:none}
.pgh-edcat{flex:1 0 auto;min-height:40px;border:0;border-radius:14px;padding:4px 10px;display:flex;align-items:center;justify-content:center;gap:6px;font:700 13px ${FB};color:rgba(255,240,220,.75);background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,214,140,.16);transition:background .2s,color .2s}
.pgh-edcat svg{width:18px;height:18px;flex:none}
.pgh-edcat.on{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e);box-shadow:0 4px 14px rgba(255,160,70,.3)}
.pgh-edgrid{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:4px 12px 10px}
.pgh-edg{display:none;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.pgh.wide .pgh-edg{grid-template-columns:repeat(auto-fill,minmax(104px,1fr))}
.pgh-edg.on{display:grid;animation:pghPane .28s ease}
.pgh-edg h5{grid-column:1 / -1;margin:8px 2px -2px;display:flex;align-items:center;gap:6px;font:700 11px ${FB};letter-spacing:.12em;text-transform:uppercase;color:#d9c2ff}
.pgh-edg h5 svg{width:14px;height:14px}
.pgh-ch{position:relative;border:0;padding:0 0 7px;border-radius:16px;color:#fff4e2;background:rgba(255,255,255,.055);box-shadow:inset 0 0 0 1px rgba(255,214,140,.16);display:flex;flex-direction:column;align-items:center;gap:2px;transition:transform .12s,box-shadow .2s,background .2s;overflow:hidden;min-width:0}
.pgh-ch:active{transform:scale(.95)}
.pgh-ch .th{position:relative;width:100%;aspect-ratio:1;display:grid;place-items:center;background:radial-gradient(circle at 50% 62%,rgba(255,214,150,.22),rgba(255,214,150,0) 66%)}
.pgh-ch .th img{width:90%;height:90%;object-fit:contain;display:block}
.pgh-ch .th img.full{height:100%;width:100%;object-fit:cover;object-position:50% 8%}
.pgh-ch .th .dot{width:44%;height:44%;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.5)}
.pgh-ch .th .ico{width:42%;height:42%;display:grid;place-items:center;color:#ffe2ad}
.pgh-ch .th .ico svg{width:100%;height:100%}
.pgh-ch .th img ~ .dot,.pgh-ch .th img ~ .ico{display:none}
.pgh-ch > span{max-width:100%;padding:0 6px;font:700 12.5px/1.2 ${FB};text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-ch.on{background:rgba(255,206,120,.16);box-shadow:inset 0 0 0 2px #ffcf73,0 0 16px rgba(255,190,110,.3)}
.pgh-ch.on::after{content:'';position:absolute;right:6px;top:6px;width:20px;height:20px;border-radius:50%;background:#ffcf73 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233a1a05' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.5l4 4 8-9'/%3E%3C/svg%3E") center/14px no-repeat}
.pgh-ch.lk .th img,.pgh-ch.lk .th .ico{filter:grayscale(.8) blur(1px) brightness(.85);opacity:.6}
.pgh-ch.lk .lock{position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;display:grid;place-items:center;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffbf5a);box-shadow:0 4px 12px rgba(0,0,0,.4)}
.pgh-ch.lk .lock svg{width:16px;height:16px}
.pgh-ch .price{font:700 10.5px ${FB};color:#ffcf8a;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;padding:0 4px}
.pgh-ch.lk.rare{box-shadow:inset 0 0 0 1px rgba(200,160,255,.45)}
.pgh-ch.lk.rare .price{color:#d9c2ff}
.pgh-ch.lk.try{box-shadow:inset 0 0 0 2px #d9c2ff,0 0 16px rgba(200,160,255,.4);background:rgba(160,120,240,.16)}
.pgh-ch.lk.try .th img{filter:none;opacity:1}
.pgh-lock{display:none;margin:0 12px 8px;padding:10px 12px;border-radius:18px;align-items:center;gap:12px;background:linear-gradient(135deg,rgba(150,110,230,.34),rgba(80,50,140,.34));box-shadow:inset 0 0 0 1px rgba(210,180,255,.42)}
.pgh-lock.on{display:flex;animation:pghPane .3s ease}
.pgh-lock .ic{width:42px;height:42px;border-radius:14px;flex:none;display:grid;place-items:center;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffbf5a)}
.pgh-lock .ic svg{width:22px;height:22px}
.pgh-lock .t{flex:1;min-width:0}
.pgh-lock b{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font:700 14.5px ${FB};color:#fff3dc}
.pgh-lock p{margin:2px 0 0;font:600 12.5px/1.35 ${FB};color:#e8dcff}
.pgh-lock button{flex:none;border:0;border-radius:12px;min-height:38px;padding:4px 12px;font:700 12.5px ${FB};color:#fff4e2;background:rgba(255,255,255,.12)}
.pgh-tier{display:inline-block;padding:2px 8px;border-radius:999px;font:700 10px ${FB};letter-spacing:.08em;text-transform:uppercase;color:#2a1450;background:#d9c2ff}
.pgh-tier.joli{background:#ffd98e;color:#3a1a05}
.pgh-tier.cadeau{background:#9ff0b8;color:#0f2a18}
.pgh-dbtns{display:flex;gap:8px;padding:10px 12px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,214,140,.14)}
.pgh-dbtns .pgh-cta{min-height:48px;font-size:14.5px}
.pgh-dbtns .rnd{flex:0 0 auto;width:52px;padding:0}
.pgh-dbtns .rnd svg{width:24px;height:24px}
.pgh.short .pgh-edtop{padding-top:6px}
.pgh.short .pgh-edcat{min-height:34px}
.pgh.short .pgh-dbtns{padding-top:6px;padding-bottom:8px}
.pgh.short .pgh-dbtns .pgh-cta{min-height:40px}
.pgh.short .pgh-edg{grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}
.pgh-dfall{display:none}
/* garde-robe (onglet Moi) */
.pgh-wr{margin-top:14px}
.pgh-wr h3{margin:0;font:700 16px ${FB};color:#fff3dc}
.pgh-wr p{margin:4px 0 0;font:600 13px/1.45 ${FB};color:var(--soft)}
.pgh-wrrow{display:flex;gap:10px;overflow-x:auto;padding:12px 2px 4px;scrollbar-width:none}
.pgh-wrrow::-webkit-scrollbar{display:none}
.pgh-wrrow .pgh-ch{flex:0 0 92px}
/* créateur complet : raretés, pastilles, curseurs, couleurs, lucioles */
.pgh-edcat em{font-style:normal;font:700 10.5px ${FB};padding:1px 6px;border-radius:999px;background:rgba(255,255,255,.1);color:inherit;opacity:.85}
.pgh-edcat.on em{background:rgba(90,40,0,.15)}
.pgh-edcat em:empty{display:none}
.pgh-edg h5 em{font-style:normal;color:rgba(255,240,220,.55);letter-spacing:.04em}
.pgh-ch .ico.face{width:78%;height:78%}
.pgh-ch .ico.q{width:62%;height:62%;filter:drop-shadow(0 0 8px rgba(190,150,255,.7));animation:pghTwk 2.6s ease-in-out infinite}
.pgh-ch.none .ico{width:34%;height:34%;color:rgba(255,240,220,.55)}
.pgh-ch .rb{position:absolute;left:5px;top:5px;padding:1px 6px;border-radius:999px;font:700 8.5px/1.5 ${FB};font-style:normal;letter-spacing:.08em;text-transform:uppercase;color:#1c1430;background:#cfd8e6}
.pgh-ch.r-rare .rb{background:#c9a6ff;color:#22104a}
.pgh-ch.r-legend .rb{background:linear-gradient(90deg,#ffe08a,#ffb35a,#ffe08a);background-size:200% 100%;color:#3a1a05;animation:pghShine 3s linear infinite}
.pgh-ch.r-secret .rb{background:linear-gradient(90deg,#7a5ac8,#c79cff);color:#fff}
.pgh-ch.r-cadeau .rb{background:#9ff0b8;color:#0f2a18}
@keyframes pghShine{to{background-position:-200% 0}}
.pgh-ch.r-legend{box-shadow:inset 0 0 0 1px rgba(255,200,110,.5)}
.pgh-ch.r-rare{box-shadow:inset 0 0 0 1px rgba(200,160,255,.38)}
.pgh-ch.r-secret{background:radial-gradient(circle at 50% 40%,rgba(160,120,255,.22),rgba(255,255,255,.04) 70%);box-shadow:inset 0 0 0 1px rgba(200,160,255,.45)}
.pgh-ch.r-secret .lock{background:linear-gradient(180deg,#e9d8ff,#9a78e6);color:#2a1450;font:700 15px ${FB}}
.pgh-ch.lk.try{box-shadow:inset 0 0 0 2px #d9c2ff,0 0 16px rgba(200,160,255,.4);background:rgba(160,120,240,.16)}
.pgh-ch.lk.try .th img,.pgh-ch.lk.try .th .ico,.pgh-ch.lk.try .th .dot{filter:none;opacity:1}
.pgh-ch.lk.on::after{display:none}
.pgh-ch .rb{max-width:calc(100% - 10px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pgh-ch.lk .th .dot{filter:grayscale(.6) brightness(.8);opacity:.7}
.pgh-ch.lk .price .pgh-lu{width:12px;height:12px}
.pgh-ch.sw{padding:0;border-radius:50%;aspect-ratio:1;background:none;box-shadow:none;overflow:visible}
.pgh-ch.sw .th{background:none;border-radius:50%}
.pgh-ch.sw .th .dot{width:76%;height:76%}
.pgh-ch.sw.on .th .dot{box-shadow:0 0 0 3px #ffcf73,0 0 14px rgba(255,190,110,.5)}
.pgh-ch.sw.on::after{display:none}
.pgh-ch.sw .lock{width:22px;height:22px;margin:-11px 0 0 -11px}
.pgh-ch.sw .lock svg{width:12px;height:12px}
.pgh-ch.sw .rb{display:none}
.pgh-edg .pgh-ch.sw{max-width:70px;justify-self:center;width:100%}
.pgh-sws{grid-column:1 / -1;display:grid;grid-template-columns:repeat(auto-fill,minmax(50px,1fr));gap:8px}
.pgh-sl.off input{opacity:.35}
.pgh-sl em{grid-column:1 / -1;font:600 11.5px ${FB};font-style:normal;color:rgba(255,240,220,.6)}
.pgh-sl{grid-column:1 / -1;display:grid;grid-template-columns:70px auto 1fr auto;gap:8px;align-items:center;font:600 11.5px ${FB};color:var(--soft)}
.pgh-sl label{font:700 12.5px ${FB};color:#fff3dc}
.pgh-sl input{width:100%;accent-color:#ffc35e}
.pgh-cols{margin-top:12px;padding:10px 0 2px;border-top:1px solid rgba(255,214,140,.14)}
.pgh-cols .chs{display:flex;gap:6px;flex-wrap:wrap}
.pgh-cc{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:3px 10px 3px 5px;border-radius:999px;border:0;font:700 12px ${FB};color:#fff4e2;background:rgba(255,255,255,.07)}
.pgh-cc i{width:20px;height:20px;border-radius:50%;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.5)}
.pgh-cc.on{background:rgba(255,206,120,.2);box-shadow:inset 0 0 0 1.5px #ffcf73}
.pgh-cols .sws{display:grid;grid-template-columns:repeat(auto-fill,minmax(30px,1fr));gap:7px;margin-top:9px}
.pgh-sw{width:30px;height:30px;border-radius:50%;border:0;padding:0;justify-self:center}
.pgh-sw.on{box-shadow:0 0 0 2.5px #1c1232,0 0 0 4.5px #ffcf73}
.pgh-edg .pgh-mqt{grid-column:1 / -1;margin-top:0;padding-top:6px;border-top:0}
.pgh-edg .pgh-mqt .chs .pgh-cc{pointer-events:none}
.pgh-edn{grid-column:1 / -1;margin:0 2px;font:600 12px/1.35 ${FB};color:var(--soft)}
.pgh-edg .pgh-mqt .chs.pgh-utc .pgh-cc{pointer-events:auto;cursor:pointer}
/* hub 2.13 : sous-onglets de la catégorie, réglages de la partie en haut (curseur, pastilles), vignettes plus petites (4 par rangée), sélecteur de couleur */
.pgh-edsub{display:flex;gap:6px;padding:0 12px 8px;overflow-x:auto;scrollbar-width:none}
.pgh-edsub::-webkit-scrollbar{display:none}
.pgh-edsub:empty{display:none}
.pgh-edsub button{flex:1 0 auto;min-width:0;min-height:38px;border:0;border-radius:12px;padding:4px 12px;font:700 13px ${FB};white-space:nowrap;color:rgba(255,240,220,.78);background:rgba(255,255,255,.045);box-shadow:inset 0 0 0 1px rgba(255,214,140,.2);transition:background .2s,color .2s,box-shadow .2s}
.pgh-edsub button.on{color:#fff3dc;background:linear-gradient(180deg,rgba(255,206,120,.26),rgba(255,170,90,.12));box-shadow:inset 0 0 0 1.5px rgba(255,207,115,.75),inset 0 -3px 0 #ffc35e}
.pgh-edset{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:2px 0 10px;margin:0 0 8px;border-bottom:1px solid rgba(255,214,140,.13)}
.pgh-edset .pgh-sl{flex:1 1 100%;grid-template-columns:auto auto 1fr auto}
.pgh-edset .pgh-sl label{min-width:62px}
.pgh-edset .pgh-edn{flex:1 1 100%;margin:0}
.pgh-edset .chs{display:flex;gap:6px;flex-wrap:wrap}
.pgh-pst{display:inline-flex;align-items:center;gap:8px;min-height:46px;max-width:100%;padding:4px 10px 4px 5px;border:0;border-radius:999px;color:#fff4e2;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,214,140,.28);text-align:left;transition:box-shadow .2s,background .2s}
.pgh-pst i{width:36px;height:36px;flex:none;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.55),0 3px 10px rgba(0,0,0,.35)}
.pgh-pst span{display:flex;flex-direction:column;min-width:0;line-height:1.2}
.pgh-pst small{font:600 10.5px ${FB};color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-pst b{font:700 12.5px ${FB};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}
.pgh-pst svg{width:15px;height:15px;flex:none;opacity:.7}
.pgh-pst.on{background:rgba(255,206,120,.18);box-shadow:inset 0 0 0 2px #ffcf73}
.pgh-pst:active{transform:scale(.97)}
.pgh-psts{flex:1 1 100%;min-width:0;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-right:18px;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent)}
.pgh-psts::-webkit-scrollbar{display:none}
.pgh-psts .pgh-pst{flex:none}
.pgh-edg{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.pgh.wide .pgh-edg{grid-template-columns:repeat(auto-fill,minmax(86px,1fr))}
.pgh.short .pgh-edg{grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px}
.pgh-ch{min-height:64px;padding-bottom:5px;border-radius:14px}
.pgh-ch .th img{width:84%;height:84%}
.pgh-ch > span{font-size:10.5px;padding:0 4px;line-height:1.2;white-space:normal;text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.pgh-ch .price{font-size:9.5px}
.pgh-ch .rb{left:3px;top:3px;padding:0 4px;font-size:6.5px;letter-spacing:.06em}
.pgh-ch.on::after{right:4px;top:4px;width:16px;height:16px;background-size:11px}
.pgh-ch.lk .lock{width:24px;height:24px;margin:-12px 0 0 -12px}
.pgh-ch.lk .lock svg{width:13px;height:13px}
.pgh-ch .ico.face{width:74%;height:74%}
.pgh-pop{position:absolute;inset:0;z-index:6;display:none;flex-direction:column;justify-content:flex-end;border-radius:inherit;background:rgba(10,6,24,.5)}
.pgh-pop.on{display:flex;animation:pghPane .22s ease}
.pgh-popc{max-height:82%;overflow-y:auto;overscroll-behavior:contain;padding:12px 14px calc(14px + env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;background:linear-gradient(180deg,#30225a,#1d1438);box-shadow:0 -12px 30px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,214,140,.35)}
.pgh.wide .pgh-popc{border-radius:22px 0 0 0}
.pgh-poph{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.pgh-poph b{flex:1;min-width:0;font:700 15px ${FB};color:#fff3dc}
.pgh-poph .x{width:40px;height:40px;flex:none;border:0;border-radius:50%;color:#fff4e2;background:rgba(255,255,255,.1);font-size:17px;line-height:1}
.pgh-popg .chs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.pgh-popg .pgh-sws{grid-template-columns:repeat(auto-fill,minmax(48px,1fr));gap:8px}
.pgh-swg{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:10px;justify-items:center}
.pgh-swg .pgh-sw{width:42px;height:42px}
.pgh-ed{height:58%}
/* téléphone couché (short) : réglages sur une seule ligne, vignettes moins hautes, rien sous le pli */
.pgh.short .pgh-edtop span{display:none}
.pgh.short .pgh-edtop button{width:34px;height:34px}
.pgh.short .pgh-edcats{padding-top:2px;padding-bottom:6px}
.pgh.short .pgh-edsub{padding-bottom:6px}
.pgh.short .pgh-edsub button{min-height:32px;font-size:12.5px}
.pgh.short .pgh-edset{flex-wrap:nowrap;padding-bottom:6px;margin-bottom:6px}
.pgh.short .pgh-edset .pgh-sl{flex:1 1 auto;min-width:0}
.pgh.short .pgh-edset .pgh-sl em{display:none}
.pgh.short .pgh-edset .pgh-edn{flex:1 1 auto;font-size:11.5px}
.pgh.short .pgh-pst{min-height:38px;flex:none}
.pgh.short .pgh-pst i{width:30px;height:30px}
.pgh.short .pgh-pst small{display:none}
.pgh.short .pgh-pst b{max-width:110px}
.pgh.short .pgh-ch .th{aspect-ratio:1.3}
.pgh.short .pgh-ch > span{-webkit-line-clamp:1}
.pgh.short .pgh-edg > h5:first-child{display:none}
.pgh.short .pgh-dbtns{padding-top:6px;padding-bottom:calc(6px + env(safe-area-inset-bottom,0px))}
.pgh.short .pgh-dbtns .pgh-cta{min-height:38px}
.pgh-utc{margin-bottom:2px}
.pgh-utc i.no{background:linear-gradient(135deg,transparent 44%,#ff8a7a 44%,#ff8a7a 56%,transparent 56%),rgba(255,255,255,.08)}
.pgh-lock[data-r="secret"]{background:linear-gradient(135deg,rgba(120,80,220,.45),rgba(40,20,90,.55));box-shadow:inset 0 0 0 1px rgba(210,180,255,.55)}
.pgh-lock[data-r="legend"]{background:linear-gradient(135deg,rgba(255,180,80,.32),rgba(120,60,140,.38));box-shadow:inset 0 0 0 1px rgba(255,210,130,.55)}
.pgh-lock p .pgh-lu{width:14px;height:14px}
.pgh-tier.commun{background:#cfd8e6;color:#1c1430}
.pgh-tier.rare{background:#c9a6ff;color:#22104a}
.pgh-tier.legend{background:linear-gradient(90deg,#ffe08a,#ffb35a);color:#3a1a05}
.pgh-tier.secret{background:linear-gradient(90deg,#7a5ac8,#c79cff);color:#fff}
.pgh-cta.lk{background:linear-gradient(180deg,#e9d8ff,#b89af0);color:#22104a}
.pgh-lu{display:inline-block;width:1.05em;height:1.05em;vertical-align:-.18em;filter:drop-shadow(0 0 2px rgba(220,255,120,.5))}
.pgh-lu.big{width:30px;height:30px;vertical-align:middle;filter:drop-shadow(0 0 6px rgba(225,255,130,.65)) drop-shadow(0 0 14px rgba(255,210,90,.35))}
.pgh-lu.big .pgh-luf{transform-box:fill-box;transform-origin:center;animation:pghTwk 2.4s ease-in-out infinite}
@keyframes pghTwk{0%,100%{opacity:.6;transform:scale(.82)}50%{opacity:1;transform:scale(1.18)}}
.pgh-wallet{margin-left:auto;display:inline-flex;align-items:center;gap:7px;padding:4px 14px 4px 8px;border-radius:999px;background:linear-gradient(180deg,rgba(60,70,24,.5),rgba(34,24,56,.66));box-shadow:inset 0 0 0 1px rgba(225,255,140,.35),0 0 20px rgba(200,255,120,.12)}
.pgh-wallet[hidden]{display:none}
.pgh-wallet b{font:700 18px ${FB};color:#f4ffd0;text-shadow:0 0 10px rgba(220,255,140,.45)}
.pgh-wallet small{font:600 11.5px ${FB};color:rgba(240,255,210,.7)}
@media (prefers-reduced-motion:reduce){.pgh-lu.big .pgh-luf,.pgh-ch .ico.q,.pgh-ch.r-legend .rb{animation:none}}
/* micro : la bouche de l'avatar suit la voix */
.pgh-emo.mic{position:relative;overflow:hidden}
.pgh-emo.mic::before{content:'';position:absolute;left:0;right:0;bottom:0;height:calc(var(--lv,0) * 100%);background:linear-gradient(0deg,rgba(124,240,160,.55),rgba(124,240,160,.15));transition:height .06s linear;pointer-events:none}
.pgh-emo.mic.on{box-shadow:inset 0 0 0 2px #7cf0a0,0 0 18px rgba(124,240,160,.55)}
.pgh-emo.mic.on::after{content:'';position:absolute;right:6px;top:6px;width:8px;height:8px;border-radius:50%;background:#ff5a6a;box-shadow:0 0 8px #ff5a6a;animation:pghPing 1.4s infinite}
.pgh-emo.mic span{position:relative;z-index:1}
.pgh-emo.mic.mload span{animation:pghMots 1.1s ease-in-out infinite}
@keyframes pghMots{50%{opacity:.4;transform:scale(.9)}}
.pgh-emo.say.on{box-shadow:inset 0 0 0 2px #ffd36a,0 0 18px rgba(255,211,106,.55)}
.pgh-micm .pgh-mcard .ic{font-size:44px;line-height:1;margin:6px 0 2px}
/* mots (1.20.5) : « Je prépare l'écoute… 40 % » au-dessus des gestes pendant le 1er chargement */
.pgh-mprog{display:grid;gap:5px;justify-items:center;min-width:200px;padding:7px 14px 8px;border-radius:14px;font:700 12.5px ${FB};color:#e8fff0;
  background:rgba(22,40,34,.82);box-shadow:inset 0 0 0 1px rgba(124,240,160,.45),0 6px 16px rgba(0,0,0,.3);transition:opacity .3s;pointer-events:none}
.pgh-mprog[hidden]{display:none}
.pgh-mprog b{display:block;width:100%;height:4px;border-radius:2px;background:rgba(255,255,255,.14);overflow:hidden}
.pgh-mprog u{display:block;height:100%;width:0;border-radius:2px;background:linear-gradient(90deg,#7cf0a0,#c8ffd9);transition:width .25s linear}
.pgh-mprog.ok{background:rgba(22,60,40,.86)}
.pgh-mprog.ok b{display:none}
/* ma maison */
.pgh-house{margin-top:14px;display:grid;grid-template-columns:132px 1fr;gap:14px;align-items:center;position:relative;overflow:hidden}
.pgh-house::before{content:'';position:absolute;right:-40px;top:-40px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(255,190,110,.22),rgba(0,0,0,0) 70%)}
.pgh-house .hs{position:relative;width:132px;height:110px;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,#ffe9c4,#f3cf98);box-shadow:inset 0 0 0 1px rgba(120,70,30,.35),0 8px 18px rgba(0,0,0,.3)}
.pgh-house canvas{position:absolute;inset:0;width:100%;height:100%;display:none}
.pgh-house.has canvas{display:block}
.pgh-house .hph{position:absolute;inset:0;display:grid;place-items:center}
.pgh-house.has .hph{display:none}
.pgh-house .hph svg{width:92px;height:92px}
.pgh-house h3{margin:0;font:700 16px ${FB};color:#fff3dc;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pgh-house p{margin:4px 0 0;font:600 13px/1.45 ${FB};color:var(--soft)}
.pgh-house .pgh-cta{margin-top:10px;flex:0 0 auto;min-height:44px;padding:6px 14px;font-size:14px}
.pgh-house .pgh-cta .pgh-chip{margin-left:4px}
@media (max-width:420px){.pgh-house{grid-template-columns:110px 1fr}.pgh-house .hs{width:110px;height:96px}}
.pgh-ctas2 .pgh-cta,.pgh-ctas .pgh-cta{white-space:nowrap}
.pgh.wide.short .pgh-bottom{left:auto;right:max(10px,env(safe-area-inset-right,0px));top:50%;bottom:auto;width:auto;transform:translateY(-50%);padding:0}
.pgh.wide.short .pgh-emotes{flex-direction:column}
.pgh-me-ico{overflow:hidden}
.pgh-me-ico.img i,.pgh-me-ico.img b{display:none}
.pgh-me-ico img{position:absolute;left:50%;top:6%;width:82%;transform:translateX(-50%);display:none}
.pgh-me-ico.img img{display:block}
.pgh-modal{position:absolute;inset:0;z-index:30;display:none;place-items:center;padding:16px;background:rgba(8,5,18,.62);backdrop-filter:blur(3px)}
.pgh-modal.on{display:grid;animation:pghIn .25s ease}
.pgh-mcard{width:min(100%,380px);max-height:100%;overflow-y:auto;border-radius:24px;padding:18px 16px 16px;text-align:center;background:linear-gradient(180deg,#2a1c4c,#1a1232);box-shadow:inset 0 0 0 1px rgba(255,214,140,.32),0 20px 50px rgba(0,0,0,.5)}
.pgh-mcard h3{margin:0;font:400 20px ${FD};letter-spacing:.03em;color:#ffe9c2}
.pgh-mprev{display:flex;gap:16px;justify-content:center;align-items:flex-end;margin:14px 0 6px}
.pgh-mprev .cut{width:128px;height:160px;border-radius:18px;background:radial-gradient(ellipse at 50% 80%,rgba(255,190,110,.35),rgba(255,190,110,0) 70%),linear-gradient(180deg,#3a2a64,#20163c);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25);display:grid;place-items:end center;overflow:hidden}
.pgh-mprev .cut img{width:128px;height:160px;display:block}
.pgh-mprev .rond{width:64px;height:64px;border-radius:50%;overflow:hidden;position:relative;background:#2a2146;box-shadow:0 0 0 3px #ffd36a}
.pgh-mprev .rond img{position:absolute;left:-12%;top:-4%;width:124%}
.pgh-mcard p{margin:8px 0 0;font:600 13.5px/1.45 ${FB};color:var(--soft)}
.pgh-mscope{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}
.pgh-mscope button{min-height:38px;padding:6px 14px;border-radius:999px;border:0;font:700 13px ${FB};color:#fff4e2;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25)}
.pgh-mscope button.on{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e)}
.pgh-mbtns{display:flex;gap:8px;margin-top:16px}
.pgh-mbtns .pgh-cta{min-height:48px;font-size:14.5px}
.pgh-cta[disabled]{opacity:.5;cursor:default}
.pgh.short .pgh-mcard{width:min(100%,600px);display:grid;grid-template-columns:auto 1fr;gap:6px 18px;text-align:left;align-items:center;padding:14px 16px}
.pgh.short .pgh-mcard h3{grid-column:2}
.pgh.short .pgh-mprev{grid-column:1;grid-row:1 / span 4;margin:0}
.pgh.short .pgh-mcard p,.pgh.short .pgh-mscope,.pgh.short .pgh-mbtns{grid-column:2;margin-top:4px;justify-content:flex-start}
.pgh-toast{position:absolute;left:50%;top:var(--tt,14px);z-index:40;transform:translate(-50%,-10px);max-width:88%;padding:10px 16px;border-radius:16px;text-align:center;font:700 14px ${FB};color:#3a1a05;
  background:linear-gradient(180deg,#fff1c8,#ffd27e);box-shadow:0 10px 26px rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .35s,transform .35s}
.pgh-toast.on{opacity:1;transform:translate(-50%,0)}
/* aujourd'hui : missions du jour (tirage partagé avec le jeu) + histoire, en lecture seule */
.pgh-today[hidden]{display:none}
.pgh-tdn{margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;font:700 12.5px ${FB};color:#ffe9c2;background:rgba(255,214,140,.12);box-shadow:inset 0 0 0 1px rgba(255,214,140,.3)}
.pgh-tdn:empty{display:none}
.pgh-tdn.all{color:#0f2a18;background:linear-gradient(180deg,#c9ffda,#7cf0a0);box-shadow:0 0 16px rgba(124,240,160,.4)}
.pgh-mjs{display:grid;gap:10px;margin-top:14px}
.pgh.wide .pgh-mjs{grid-template-columns:repeat(3,minmax(0,1fr))}
.pgh-mj{--g1:rgba(255,190,110,.36);--g2:#ffb46a;--g3:#ffd59a;position:relative;display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px;border-radius:20px;overflow:hidden;background:linear-gradient(120deg,var(--g1),rgba(34,22,60,.78) 58%,rgba(26,17,48,.86));box-shadow:inset 0 0 0 1px rgba(255,214,140,.2),0 10px 26px rgba(0,0,0,.24);animation:pghPane .4s ease both}
.pgh-mj:nth-child(2){animation-delay:.06s}.pgh-mj:nth-child(3){animation-delay:.12s}
.pgh-mj .ic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;font-size:26px;line-height:1;background:radial-gradient(circle at 38% 28%,rgba(255,255,255,.55),var(--g2) 72%);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.38),0 6px 14px rgba(0,0,0,.28)}
.pgh-mj small{display:block;font:700 10.5px ${FB};letter-spacing:.12em;text-transform:uppercase;color:var(--g3)}
.pgh-mj b{display:block;margin-top:2px;font:700 14.5px/1.3 ${FB};color:#fff3dc}
.pgh-mj .rw{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:999px;font:700 14px ${FB};color:#f4ffd0;background:rgba(20,30,10,.42);box-shadow:inset 0 0 0 1px rgba(225,255,140,.35),0 0 14px rgba(200,255,120,.12);white-space:nowrap}
.pgh-mj .rw .pgh-lu{width:17px;height:17px}
.pgh-mj.done{background:linear-gradient(120deg,rgba(124,240,160,.26),rgba(30,40,46,.8) 60%,rgba(26,17,48,.86))}
.pgh-mj.done .rw{color:#0f2a18;background:linear-gradient(180deg,#c9ffda,#7cf0a0);box-shadow:0 0 14px rgba(124,240,160,.35)}
.pgh-mj.done b{color:rgba(255,243,220,.72)}
.pgh-mj.done .ic{filter:saturate(.75)}
.pgh-mj.s-jour_photo{--g1:rgba(255,190,110,.38);--g2:#ffb46a;--g3:#ffd59a}
.pgh-mj.s-jour_ferme{--g1:rgba(130,220,120,.32);--g2:#7fd36a;--g3:#bff0a8}
.pgh-mj.s-jour_marche{--g1:rgba(255,150,120,.34);--g2:#ff8f6a;--g3:#ffc2a8}
.pgh-mj.s-jour_maison{--g1:rgba(255,200,150,.32);--g2:#e9a36a;--g3:#ffd8b0}
.pgh-mj.s-jour_social{--g1:rgba(255,150,200,.34);--g2:#ff8fc4;--g3:#ffc4e0}
.pgh-mj.s-jour_balade{--g1:rgba(150,210,255,.3);--g2:#7cc0f0;--g3:#bfe2ff}
.pgh-mj.s-jour_peche{--g1:rgba(110,190,255,.34);--g2:#5aa8f0;--g3:#a8d4ff}
.pgh-mj.s-jour_nature{--g1:rgba(200,160,255,.32);--g2:#b48af0;--g3:#dcc4ff}
.pgh-mj.s-jour_musee{--g1:rgba(230,200,140,.32);--g2:#d6b46a;--g3:#f2deb0}
.pgh-mj.sk{animation:none}
.pgh-mj.sk .ic{background:rgba(255,255,255,.08);box-shadow:none}
.pgh-mj.sk i{display:block;height:12px;border-radius:6px;margin:5px 0;background:rgba(255,255,255,.08);animation:pghSk 1.2s ease-in-out infinite}
.pgh-mj.sk i + i{width:70%}
@keyframes pghSk{50%{opacity:.4}}
.pgh-tdmsg{margin-top:14px;display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center}
.pgh-tdmsg .em{font-size:34px;line-height:1}
.pgh-tdmsg h3{margin:0;font:700 16px ${FB};color:#fff3dc}
.pgh-tdmsg p{margin:4px 0 0;font:600 13px/1.45 ${FB};color:var(--soft)}
.pgh-tdmsg .pgh-cta{grid-column:1 / -1;justify-self:start;flex:0 0 auto;padding:8px 18px;min-height:46px}
.pgh-story{margin-top:12px;display:grid;grid-template-columns:60px minmax(0,1fr);gap:8px 14px;align-items:center;position:relative;overflow:hidden;background:radial-gradient(ellipse 60% 90% at 100% 0%,rgba(255,170,120,.18),rgba(255,170,120,0) 60%),var(--card)}
.pgh-story .bk{width:60px;height:60px;border-radius:18px;display:grid;place-items:center;font-size:30px;background:linear-gradient(160deg,#ffe7b0,#d98a4a);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4),0 8px 18px rgba(0,0,0,.3)}
.pgh-story small{display:block;font:700 10.5px ${FB};letter-spacing:.12em;text-transform:uppercase;color:#ffcf8a}
.pgh-story h3{margin:2px 0 0;font:700 16px/1.25 ${FB};color:#fff3dc}
.pgh-story p{margin:3px 0 0;font:600 13px/1.4 ${FB};color:var(--soft)}
.pgh-story .bar{grid-column:1 / -1;height:8px;margin-top:4px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
.pgh-story .bar i{display:block;height:100%;width:var(--p);min-width:8px;border-radius:inherit;background:linear-gradient(90deg,#ffd27a,#ff9ec4);box-shadow:0 0 10px rgba(255,190,110,.6)}
.pgh-story .rw{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font:600 12.5px ${FB};color:var(--soft)}
.pgh-story .rw span{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font:700 12px ${FB};color:#ffeccc;background:rgba(255,214,140,.12);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25)}
.pgh-story .rw span.lu{color:#f4ffd0;background:rgba(20,30,10,.4);box-shadow:inset 0 0 0 1px rgba(225,255,140,.3)}
.pgh-story .rw .pgh-lu{width:15px;height:15px}
.pgh-story .st{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;font:700 10px ${FB};letter-spacing:.06em;text-transform:uppercase;vertical-align:2px;color:#2a1450;background:#d9c2ff}
.pgh-story .st.go{color:#0f2a18;background:#9ff0b8}
.pgh-story ul{grid-column:1 / -1;margin:2px 0 0;padding:0;list-style:none;display:grid;gap:6px}
.pgh-story li{display:flex;align-items:center;gap:8px;font:600 13px ${FB};color:#fff3dc}
.pgh-story li em{margin-left:auto;display:inline-flex;align-items:center;gap:3px;font-style:normal;font:700 12px ${FB};color:#ffcf8a}
.pgh-story li.ok em{color:#7cf0a0}
.pgh-story li .pgh-lu{width:13px;height:13px}
.pgh-tdnote{margin:12px 2px 0;font:600 12px/1.45 ${FB};color:rgba(255,240,220,.6)}
.pgh-tdnote.ok{color:#b9ffd0;font-size:13.5px}
/* acheter une pièce avec des lucioles */
.pgh-lock button.buy{display:inline-flex;align-items:center;gap:5px;padding:4px 12px 4px 9px;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e 55%,#ff9f4a);box-shadow:0 6px 16px rgba(255,150,60,.35),inset 0 1px 0 rgba(255,255,255,.7)}
.pgh-lock button.buy[hidden]{display:none}
.pgh-lock button.buy .pgh-lu,.pgh-buym .pgh-cta.gold .pgh-lu{width:17px;height:17px;filter:none}
.pgh-lock button.buy .pgh-lu path,.pgh-buym .pgh-cta.gold .pgh-lu path{stroke:#5a3008}
.pgh-lock button.buy .pgh-lu circle,.pgh-buym .pgh-cta.gold .pgh-lu circle{fill:#7a4a10}
.pgh-edw{display:inline-flex;align-items:center;gap:5px;padding:4px 11px 4px 7px;border-radius:999px;flex:none;background:linear-gradient(180deg,rgba(60,70,24,.5),rgba(34,24,56,.66));box-shadow:inset 0 0 0 1px rgba(225,255,140,.32);font:700 14px ${FB};color:#f4ffd0}
.pgh-edw[hidden]{display:none}
.pgh-edw b{font:700 14px ${FB};letter-spacing:0;color:#f4ffd0;display:inline}
.pgh-edw .pgh-lu{width:18px;height:18px}
.pgh-buym .pgh-mcard{position:relative;overflow:hidden;background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(255,200,120,.2),rgba(255,200,120,0) 70%),linear-gradient(180deg,#2a1c4c,#1a1232)}
.pgh-bth{position:relative;width:116px;height:116px;margin:4px auto 10px;border-radius:30px;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 62%,rgba(255,214,150,.38),rgba(255,214,150,0) 70%),linear-gradient(180deg,#3d2c6a,#22183e);box-shadow:inset 0 0 0 1px rgba(255,214,140,.32),0 12px 28px rgba(0,0,0,.4)}
.pgh-bth img{width:88%;height:88%;object-fit:contain;display:block}
.pgh-bth img.full{width:100%;height:100%;object-fit:cover;object-position:50% 8%}
.pgh-bth .ico{width:52%;height:52%;display:grid;place-items:center;color:#ffe2ad}
.pgh-bth .ico svg{width:100%;height:100%}
.pgh-bth .ico.face{width:80%;height:80%}
.pgh-bth .dot{width:54%;height:54%;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.5)}
.pgh-bth img ~ .dot,.pgh-bth img ~ .ico{display:none}
.pgh-buym .pgh-tier{margin-top:6px}
.pgh-bprice{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;font:400 32px/1 ${FD};letter-spacing:.02em;color:#f4ffd0;text-shadow:0 0 16px rgba(220,255,140,.45)}
.pgh-bprice .pgh-lu{width:32px;height:32px;filter:drop-shadow(0 0 6px rgba(225,255,130,.65))}
.pgh-bbal{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin:14px 0 0;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px rgba(255,214,140,.16)}
.pgh-bbal:empty{display:none}
.pgh-bbal div{font:600 11.5px ${FB};color:var(--soft)}
.pgh-bbal div b{display:flex;align-items:center;justify-content:center;gap:4px;margin-top:2px;font:700 19px ${FB};color:#fff3dc}
.pgh-bbal div b .pgh-lu{width:17px;height:17px}
.pgh-bbal .ar{font:700 20px ${FB};color:#ffcf8a}
.pgh-bbal .af b{color:#f4ffd0}
.pgh-bbal.poor .af b{color:#ffb4a0}
.pgh-buym p b{color:#fff3dc}
.pgh-buym p.ok{color:#c9ffda;font-size:15px}
.pgh-buym[data-st="busy"] [data-h="bok"]{opacity:.75;pointer-events:none}
.pgh-buym[data-st="busy"] [data-h="bok"]::after{content:'';width:16px;height:16px;border-radius:50%;border:2.5px solid rgba(58,26,5,.35);border-top-color:#3a1a05;animation:pghSpin .8s linear infinite}
@keyframes pghSpin{to{transform:rotate(360deg)}}
.pgh-buym[data-st="done"] .pgh-bth{animation:pghPop .7s cubic-bezier(.3,1.6,.5,1);box-shadow:0 0 0 3px #ffd36a,0 0 44px rgba(255,210,110,.75),inset 0 0 0 1px rgba(255,214,140,.32)}
.pgh-buym[data-st="done"] .pgh-bprice,.pgh-buym[data-st="done"] [data-h="bno"],.pgh-buym[data-st="poor"] [data-h="bno"],.pgh-buym[data-st="offline"] [data-h="bno"],.pgh-buym[data-st="refused"] [data-h="bno"]{display:none}
.pgh-buym[data-st="done"] h3{animation:pghPane .4s ease}
@keyframes pghPop{0%{transform:scale(.7)}55%{transform:scale(1.14)}100%{transform:scale(1)}}
.pgh-burst{position:absolute;left:50%;top:76px;width:0;height:0;pointer-events:none;z-index:2}
.pgh-burst i{position:absolute;left:-8px;top:-8px;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle,#fdffe0,#e4ff7a 38%,rgba(200,255,90,0) 70%);box-shadow:0 0 16px 2px rgba(230,255,138,.75);opacity:0;animation:pghFly 1.9s cubic-bezier(.15,.75,.3,1) forwards;animation-delay:var(--d)}
.pgh-burst i.s{width:10px;height:10px;left:-5px;top:-5px;background:radial-gradient(circle,#fff,#ffd36a 50%,rgba(255,200,90,0) 74%);box-shadow:0 0 10px #ffd36a}
@keyframes pghFly{0%{transform:translate(0,0) scale(.3);opacity:0}10%{opacity:1}70%{opacity:.9}100%{transform:translate(var(--x),var(--y)) scale(.8);opacity:0}}
.pgh-ch.got{animation:pghPop .7s cubic-bezier(.3,1.6,.5,1)}
@media (prefers-reduced-motion:reduce){.pgh-burst i,.pgh-mj,.pgh-ch.got,.pgh-buym[data-st="done"] .pgh-bth{animation:none}}
/* « Connecter le jeu Pégase » (18 oct.) : CODE COURT à usage unique de pg_link_make (8 caractères « K7Q2-9MXA », 120 s) */
.pgh-sec.pgh-lksec{padding-top:24px}
.pgh-lk{position:relative;overflow:hidden;background:radial-gradient(ellipse 80% 120% at 100% 0%,rgba(255,196,110,.16),rgba(255,196,110,0) 60%),var(--card);box-shadow:inset 0 0 0 1px rgba(255,214,140,.38),0 14px 34px rgba(0,0,0,.22)}
.pgh-lkhd{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center}
.pgh-lkic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e 55%,#ff9f4a);box-shadow:0 6px 16px rgba(255,150,60,.35),inset 0 1px 0 rgba(255,255,255,.7)}
.pgh-lkic svg{width:30px;height:30px}
.pgh-lkhd h3{margin:0;font:700 17px ${FB};color:#fff3dc}
.pgh-lkhd p{margin:4px 0 0;font:600 13px/1.45 ${FB};color:var(--soft)}
.pgh-lkbtns{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.pgh-lkbtns .pgh-cta{flex:1 1 auto;min-height:48px;padding:8px 16px}
.pgh-lkbtns .pgh-cta svg{width:20px;height:20px;flex:none}
.pgh-lk .pgh-cta.glass{backdrop-filter:none;background:rgba(40,24,66,.8)}
.pgh-lkbox{margin-top:14px;border-radius:18px;padding:14px 12px 12px;background:rgba(12,8,26,.5);box-shadow:inset 0 0 0 1px rgba(255,214,140,.22)}
.pgh-lktop{display:flex;align-items:center;gap:12px;margin:0 2px 10px}
.pgh-lkring{position:relative;width:50px;height:50px;flex:none}
.pgh-lkring svg{width:100%;height:100%;transform:rotate(-90deg)}
.pgh-lkring circle{fill:none;stroke-width:5}
.pgh-lkring .bg{stroke:rgba(255,255,255,.1)}
.pgh-lkring .fg{stroke:#ffc35e;stroke-linecap:round;transition:stroke-dashoffset 1s linear,stroke .4s}
.pgh-lkring.low .fg{stroke:#ff8a5a}
.pgh-lkring b{position:absolute;inset:0;display:grid;place-items:center;font:700 15px ${FB};color:#fff3dc;font-variant-numeric:tabular-nums}
.pgh-lktop .t{font:700 14px/1.3 ${FB};color:#ffe2ad}
.pgh-lktop .t small{display:block;font:600 12px ${FB};color:var(--soft)}
.pgh-lkcode{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) auto repeat(4,minmax(0,1fr));align-items:center;gap:clamp(4px,1.4vw,8px);max-width:440px;margin:0 auto;user-select:all;-webkit-user-select:all}
.pgh-lkcode span{display:grid;place-items:center;aspect-ratio:.8;border-radius:clamp(10px,3vw,14px);font:700 clamp(25px,8.2vw,40px)/1 ${FB};color:#fff8ea;text-shadow:0 2px 10px rgba(255,190,90,.35);background:linear-gradient(180deg,rgba(255,236,200,.17),rgba(255,236,200,.05));box-shadow:inset 0 0 0 1px rgba(255,214,140,.34),inset 0 -3px 0 rgba(0,0,0,.18),0 6px 14px rgba(0,0,0,.18);font-variant-numeric:tabular-nums}
.pgh-lkcode span:nth-child(n+6){background:linear-gradient(180deg,rgba(200,172,255,.2),rgba(190,160,255,.06));box-shadow:inset 0 0 0 1px rgba(205,180,255,.36),inset 0 -3px 0 rgba(0,0,0,.18),0 6px 14px rgba(0,0,0,.18)}
.pgh-lkcode i{font:700 clamp(20px,6vw,30px)/1 ${FB};font-style:normal;color:rgba(255,214,140,.75);padding:0 1px}
.pgh-lkbox.on .pgh-lkcode span{animation:pghLkIn .45s cubic-bezier(.3,1.5,.5,1) both}
.pgh-lkbox.on .pgh-lkcode span:nth-child(2){animation-delay:.03s}.pgh-lkbox.on .pgh-lkcode span:nth-child(3){animation-delay:.06s}.pgh-lkbox.on .pgh-lkcode span:nth-child(4){animation-delay:.09s}
.pgh-lkbox.on .pgh-lkcode span:nth-child(6){animation-delay:.14s}.pgh-lkbox.on .pgh-lkcode span:nth-child(7){animation-delay:.17s}.pgh-lkbox.on .pgh-lkcode span:nth-child(8){animation-delay:.2s}.pgh-lkbox.on .pgh-lkcode span:nth-child(9){animation-delay:.23s}
@keyframes pghLkIn{0%{transform:translateY(6px) scale(.86);opacity:0}100%{transform:none;opacity:1}}
.pgh-lknote{margin:10px 2px 0;text-align:center;font:600 12px ${FB};color:var(--soft)}
.pgh-lkbox.off .pgh-lkcode{opacity:.28;filter:grayscale(1)}
.pgh-lkhow{margin:12px 2px 0;font:600 13px/1.5 ${FB};color:#ffe9c8}
.pgh-lkhow b{color:#fff4de;white-space:nowrap}
.pgh-lkhow i{font-style:normal;color:#ffc35e}
.pgh-lkmsg{margin:12px 2px 0;font:600 13px/1.45 ${FB};color:#ffd0b0}
.pgh-lk .pgh-cta[disabled]{opacity:.55;pointer-events:none}
@media (min-width:700px){.pgh-lkbtns .pgh-cta{flex:0 1 auto}}
.pgh-emo.say.ear{box-shadow:inset 0 0 0 2px #7cf0a0,0 0 18px rgba(124,240,160,.6)}
/* écoute (hub 2.7) : l'oreille à côté du nom — « Parle-moi ! », « Je t'écoute » (ondes), « J'entends » (ondes vives), dodo, pause pendant 🎤 */
.pgh-ear{position:absolute;left:0;top:0;z-index:4;display:inline-flex;align-items:center;height:34px;min-width:34px;padding:0 7px;border:0;border-radius:999px;cursor:pointer;
  font:700 12.5px ${FB};letter-spacing:.01em;color:#e9fff0;background:rgba(18,44,36,.66);box-shadow:inset 0 0 0 1.5px rgba(124,240,160,.6),0 4px 14px rgba(0,0,0,.32);
  transition:background .3s,box-shadow .3s,color .3s,opacity .3s;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.pgh-ear[hidden]{display:none}
.pgh-ear svg{width:22px;height:22px;flex:none;overflow:visible}
.pgh-ear svg .w{opacity:.35;transform-box:fill-box;transform-origin:100% 50%}
.pgh-ear .t{max-width:0;overflow:hidden;white-space:nowrap;margin-left:0;transition:max-width .4s ease,margin .4s ease}
.pgh-ear.x .t{max-width:200px;margin-left:6px;margin-right:3px}
.pgh-ear[data-st=on] .w1,.pgh-ear[data-st=hear] .w1{animation:pghEarW 1.7s ease-out infinite}
.pgh-ear[data-st=on] .w2,.pgh-ear[data-st=hear] .w2{animation:pghEarW 1.7s ease-out .45s infinite}
.pgh-ear[data-st=hear]{background:rgba(22,84,54,.8);box-shadow:inset 0 0 0 2px #7cf0a0,0 0 20px rgba(124,240,160,.65)}
.pgh-ear[data-st=hear] .w1,.pgh-ear[data-st=hear] .w2{animation-duration:.8s}
.pgh-ear[data-st=hear] .w2{animation-delay:.2s}
.pgh-ear[data-st=invite]{color:#3a1d0a;background:linear-gradient(180deg,#fff3cf,#ffd37e);box-shadow:0 4px 14px rgba(40,16,0,.35),inset 0 0 0 1px rgba(255,255,255,.6),0 0 0 0 rgba(255,211,106,.7);animation:pghPing 1.8s infinite}
.pgh-ear[data-st=invite] svg .w{opacity:.9}
.pgh-ear[data-st=sleep],.pgh-ear[data-st=off],.pgh-ear[data-st=pause]{color:rgba(255,246,230,.82);background:rgba(30,18,52,.62);box-shadow:inset 0 0 0 1px rgba(255,255,255,.28),0 4px 14px rgba(0,0,0,.3)}
.pgh-ear[data-st=pause]{box-shadow:inset 0 0 0 1.5px rgba(255,200,110,.6),0 4px 14px rgba(0,0,0,.3)}
.pgh-ear[data-st=off] svg{opacity:.6}
.pgh-ear .z{display:none;font:800 11px ${FB};color:#cfe0ff;margin:-14px 0 0 -4px;animation:pghBob 2.4s ease-in-out infinite}
.pgh-ear[data-st=sleep] .z{display:inline}
.pgh-ear[data-st=talk]{opacity:.55}
.pgh-ear.ping{animation:pghEarPing .7s ease-out}
@keyframes pghEarW{0%{opacity:.3;transform:scale(.8)}30%{opacity:1;transform:scale(1)}100%{opacity:.25;transform:scale(1.25)}}
@keyframes pghEarPing{0%{box-shadow:inset 0 0 0 2px #ffe08a,0 0 0 0 rgba(255,224,138,.9)}100%{box-shadow:inset 0 0 0 2px #7cf0a0,0 0 0 16px rgba(255,224,138,0)}}
.pgh.editing .pgh-ear{display:none}
.pgh-earm .pgh-mcard .ic{font-size:44px;line-height:1;margin:6px 0 2px}
.pgh-earm .pgh-mcard ul{margin:10px 0 2px;padding:0;list-style:none;display:grid;gap:7px;text-align:left}
.pgh-earm .pgh-mcard li{display:flex;gap:10px;align-items:center;font:600 14px ${FB};color:#fff1da}
.pgh-earm .pgh-mcard li b{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:rgba(255,214,140,.14);font-size:18px}
.pgh-earm .pgh-mcard small{display:block;margin-top:10px;font:500 12.5px ${FB};color:rgba(255,236,210,.72)}
@media (prefers-reduced-motion:reduce){.pgh-ear,.pgh-ear .w,.pgh-ear .z{animation:none!important}.pgh-ear[data-st=on] .w,.pgh-ear[data-st=hear] .w{opacity:.85}}
@media (prefers-reduced-motion:reduce){.pgh-bg{animation:none}.pgh-hint{animation:none}.pgh-lkring .fg{transition:none}.pgh-lkbox.on .pgh-lkcode span{animation:none}}
`;

  // ---------------------------------------------------------------------------
  // la page
  // ---------------------------------------------------------------------------
  // espaces insécables de la typographie française (avant ! ? : ; », après «) — hors des balises
  const nbsp = (h) => h.replace(/(>[^<]*)/g, (m) => m.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« '));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const IMG = (n) => ROOT() + 'accueil/pegase-hub-' + n + '.webp';
  // 18 oct. : images du monde EASTLANDS (captures du jeu, tools/images.py : interface recadrée, petit étalonnage)
  const GALLERY = [
    ['arbre', 'L\'arbre sacré', 'Au bord du lac, sous ses feuilles rouges'],
    ['village', 'Ailebrune', 'Le village au bord du lac : ta maison t\'attend parmi celles des habitants'],
    ['pont', 'Le pont rouge', 'Et de l\'autre côté, le pré de Pégase…'],
    ['nuit', 'La nuit aux lanternes', 'Fenêtres allumées et lucioles sur la place'],
    ['chat', 'Le chat des toits', 'Timide : approche-toi doucement… ou zoome !'],
    ['auguste', 'Papi Auguste', 'Le maire t\'accueille et te confie tes premières missions'],
    ['fleurs', 'Les champs de fleurs', 'À l’aube, des fleurs à perte de vue jusqu’à l’arbre sacré'],
    ['biches', 'Les biches du matin', 'Elles viennent boire au bord du lac : avance sans bruit'],
    ['oies', 'Le vol des oies', 'À l’heure dorée, un grand V traverse le ciel… certains jours seulement'],
    ['cygnes', 'Les cygnes du lac', 'Au lever du soleil, ils glissent ensemble sur l’eau calme'],
    ['hibou', 'Le grand-duc', 'La nuit, il veille dans le grand arbre près de la mairie'],
    ['bouvreuil', 'Le bouvreuil', 'Un petit oiseau rare des haies, le matin : approche-toi tout doucement']
  ];
  const FUTURE = [
    ['🗓️', 'Missions de la salle', 'Une grande mission pour toute la salle chaque semaine : réussissez-la ensemble et Ailebrune s\'embellit.', 'rgba(255,200,110,.28)'],
    ['🏡', 'Chez les copains', 'Vois où se promènent tes copains dans Pégase et va visiter leur maison.', 'rgba(255,150,190,.26)'],
    ['🏆', 'Classement', 'La plus belle collection, les plus belles photos, les plus longues séries de jours.', 'rgba(255,220,120,.28)'],
    ['🎥', 'Appels vidéo', 'Appelle un copain depuis le téléphone du jeu et vois-le en vrai sur l\'écran.', 'rgba(140,240,190,.22)']
  ];
  const EMOTES = [['oui', '👍', 'Oui'], ['non', '👎', 'Non'], ['wave', '👋', 'Coucou']];
  const EMOTES_MORE = [['jump', '🎉', 'Saute'], ['laugh', '😄', 'Rigole'], ['twirl', '💫', 'Tourne']];   // dans l'éventail « … » (la rangée reste à 6 boutons)
  const EMOTES_ALL = EMOTES.concat(EMOTES_MORE);
  Object.assign(PGH_SVG, {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" stroke="none"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.2-6.5 8-6.5s7 2 8 6.5"/></svg>',
    friends: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-4 3.4-5.8 6.5-5.8s5.7 1.8 6.5 5.8"/><circle cx="17" cy="9" r="2.8"/><path d="M17 14.6c2.4.1 4 1.6 4.6 4.6"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="1.2" fill="currentColor" stroke="none"/></svg>',
    body: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.6"/><path d="M8 22l1-8-3-5h12l-3 5 1 8M9 14h6"/></svg>',
    hair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20c-1-6 0-15 7-15s8 9 7 15"/><path d="M8.5 10c2.5 0 5-1.5 6-3.5.8 1.6 2 2.8 3 3.2"/><path d="M8.5 10v4a3.5 3.5 0 0 0 7 0v-3"/></svg>',
    shirt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M8 3.5L3 6.5l2.2 4L7 9.6V21h10V9.6l1.8.9L21 6.5l-5-3c-.6 1.6-2.1 2.5-4 2.5s-3.4-.9-4-2.5z"/></svg>',
    tophat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 17.5c4 2 14 2 18 0"/><path d="M6.5 17V8.5c0-2 11-2 11 0V17"/><path d="M6.5 13.5c3.5 1.2 7.5 1.2 11 0"/></svg>'
  });
  const ACC_ICO = ['star', 'none', 'hat', 'glasses', 'horns', 'antenna'];
  // la monnaie du jeu : les LUCIOLES (symbole « LU » à deux barres, comme €) ; même dessin que ~/jdv-tools/pegase/art/luciole-symbole.svg
  const LU_DEFS = '<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs><linearGradient id="pghLuG" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#fff2a8"/><stop offset=".55" stop-color="#ffd35a"/><stop offset="1" stop-color="#b9ec6a"/></linearGradient></defs></svg>';
  const LU = (c) => '<svg class="pgh-lu' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" aria-label="lucioles" role="img">' +
    '<path d="M7.4 2.6v11.2a4.7 4.7 0 0 0 9.4 0V5.6" fill="none" stroke="url(#pghLuG)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M12.1 20.4h8.6" fill="none" stroke="url(#pghLuG)" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M3.2 8h7.6M3.2 11.6h7.6" fill="none" stroke="url(#pghLuG)" stroke-width="1.9" stroke-linecap="round"/>' +
    '<circle class="pgh-luf" cx="20.2" cy="3.6" r="1.7" fill="#eaff9a"/></svg>';
  function chipDot(kind, i) {
    const c = GR.chars[i];
    if (kind === 'body') return `<span class="dot" style="background:linear-gradient(180deg,${c.hair} 0 38%,${c.skin} 38%)"></span>`;
    if (kind === 'hair') return `<span class="dot" style="background:radial-gradient(circle at 35% 30%,${c.hair},${c.hair} 55%,${c.h2})"></span>`;
    if (kind === 'clothes') return `<span class="dot" style="background:linear-gradient(180deg,${c.c1} 0 55%,${c.c2} 55%)"></span>`;
    return `<span class="ico">${PGH_SVG[ACC_ICO[i]]}</span>`;
  }
  // ---------------------------------------------------------------------------
  // PEGAGRAM (prototype du 21 oct. 2026, atelier ~/jdv-tools/pegase/borne/hub/pegagram : NON publié, inséré dans une COPIE de
  // wrap/tail.js par integrer.js) : le réseau social PHOTO de Pégase, entre copains de la salle. Les photos se partagent depuis le JEU
  // (téléphone de l'avatar › PegaGram › ＋) ; ici on les regarde, on réagit (liste fermée d'émojis gentils), on pose un « petit mot »
  // choisi dans une liste, on signale, on retire les siennes ; les GARDIENS modèrent. Serveur : ~/jdv-tools/pegase/server/pegagram.sql
  // (NON appliqué). Borne : api.pegase.rpc (fonctions pg_gram_* à ajouter à PG_RPC), api.pegase.photo(chemin) → adresse d'image
  // (Storage privé, jeton du compte), api.pegase.photoDelete(chemins), api.pegase.onGram(cb) (signal { t: 'gram' } de jdw-room-<salle>).
  // Sans ces fonctions (borne actuelle) : l'onglet ne s'affiche pas.
  // ---------------------------------------------------------------------------
  const GRAM_RX = ['❤️', '😍', '😮', '😂', '👍', '🌟'];
  const GRAM_RX_T = { '❤️': 'J\'adore', '😍': 'Trop beau', '😮': 'Waouh', '😂': 'Trop drôle', '👍': 'Bravo', '🌟': 'Exceptionnelle' };
  const GRAM_RAR = ['commun', 'peu commun', 'rare', 'très rare', 'légendaire'];
  const GRAM_MOMENT = { aube: 'à l\'aube', matin: 'le matin', jour: '', heure_doree: 'heure dorée', coucher: 'au coucher du soleil', crepuscule: 'au crépuscule', nuit: 'la nuit' };
  const GRAM_MOTIF = { pas_gentil: 'Pas gentil', pas_du_jeu: 'Pas une photo du jeu', personnel: 'Quelque chose de personnel', autre: 'Autre chose' };
  PGH_SVG.gram = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3" y="7" width="18" height="13" rx="3.5"/><circle cx="12" cy="13.5" r="3.6"/><path d="M8.2 7l1.4-2.4h4.8L15.8 7"/>' +
    '<path d="M2.6 5.2c1.6-2.4 4.2-2.9 6-1.6-1.8.1-3 .8-3.6 2" stroke-width="1.6"/></svg>';

  function PGH_GRAM_CSS(FD, FB) {
    return `
.pgh-tab .bdg.gram{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ff9f4a);box-shadow:0 0 10px rgba(255,180,90,.5)}
.pgh-tab .bdg.gram.coeur{min-width:12px;width:12px;height:12px;padding:0;background:linear-gradient(180deg,#ff9ec4,#ff5f8f);box-shadow:0 0 8px rgba(255,110,160,.7)}
@media (max-width:430px){.pgh-tab{gap:5px;padding:6px 3px 10px;font-size:13px;letter-spacing:0}.pgh-tab svg{width:17px;height:17px}}
@media (max-width:350px){.pgh-tab svg{display:none}}
.pgg{padding:6px 0 30px}
.pgg-head{position:relative;margin:4px 14px 14px;padding:18px 18px 16px;border-radius:24px;overflow:hidden;background:radial-gradient(120% 140% at 0% 0%,rgba(255,158,196,.22),transparent 55%),radial-gradient(120% 140% at 100% 100%,rgba(255,207,115,.2),transparent 60%),var(--card);box-shadow:inset 0 0 0 1px var(--line),0 14px 30px rgba(0,0,0,.25)}
.pgg-brand{display:flex;align-items:center;gap:12px}
.pgg-logo{width:46px;height:46px;flex:none;border-radius:15px;display:grid;place-items:center;color:#3a1a05;background:linear-gradient(135deg,#ffe7a8 0%,#ffc35e 40%,#ff8fb8 100%);box-shadow:0 6px 16px rgba(255,140,120,.35),inset 0 1px 0 rgba(255,255,255,.6)}
.pgg-logo svg{width:28px;height:28px}
.pgg-word{font:700 clamp(27px,7.6vw,34px)/1 ${FB};letter-spacing:.005em;background:linear-gradient(90deg,#ffe9b0,#ffc35e 45%,#ff9ec4);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(90,44,110,.75))}
.pgg-head p{margin:10px 0 0;font:600 14px/1.45 ${FB};color:var(--soft)}
.pgg-how{margin-top:12px;display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:16px;background:rgba(16,12,34,.45);box-shadow:inset 0 0 0 1px rgba(255,214,140,.14);font:600 13px/1.45 ${FB};color:rgba(255,244,226,.84)}
.pgg-how b{color:#ffe2a6}
.pgg-how .ph{flex:none;font-size:20px;line-height:1.1}
.pgg-rooms{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.pgg-room{border:0;border-radius:999px;padding:8px 14px;font:700 13px ${FB};color:rgba(255,240,220,.8);background:rgba(255,236,210,.08);box-shadow:inset 0 0 0 1px rgba(255,214,140,.2)}
.pgg-room.on{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffb85e);box-shadow:0 4px 12px rgba(255,170,80,.3)}
.pgg-modb{position:absolute;top:14px;right:14px;border:0;border-radius:999px;padding:7px 12px;font:700 12.5px ${FB};color:#e8ddff;background:rgba(120,90,200,.35);box-shadow:inset 0 0 0 1px rgba(200,180,255,.35)}
.pgg-modb b{display:inline-block;min-width:18px;margin-left:4px;padding:0 5px;border-radius:9px;color:#fff;background:#e8455c}
.pgg-new{position:sticky;top:62px;z-index:6;display:flex;justify-content:center;align-items:flex-start;height:0;overflow:visible}
.pgg-new button{transform:translateY(4px);border:0;border-radius:999px;padding:9px 16px;font:700 13.5px ${FB};color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffb85e);box-shadow:0 8px 22px rgba(0,0,0,.4);animation:pggDrop .35s ease-out}
@keyframes pggDrop{from{opacity:0;transform:translateY(-12px)}}
@media (min-width:980px){.pgh.wide .pgg-new{justify-content:flex-end;padding-right:calc(max(0px,(100% - 1120px) / 2) + 76px)}}
.pgg-act{margin:0 14px 14px;padding:12px 14px;border-radius:20px;background:linear-gradient(180deg,rgba(255,158,196,.14),rgba(255,158,196,.06));box-shadow:inset 0 0 0 1px rgba(255,158,196,.28)}
.pgg-act h3{margin:0 0 8px;font:700 13px ${FB};letter-spacing:.06em;text-transform:uppercase;color:#ffc4dc}
.pgg-actr{display:flex;align-items:center;gap:10px;padding:5px 0;font:600 13.5px/1.35 ${FB};color:var(--ink)}
.pgg-actr img{width:38px;height:26px;object-fit:cover;border-radius:6px;flex:none;box-shadow:0 0 0 2px #fbf5ea}
.pgg-actr small{color:var(--soft);font-weight:600}
.pgg-list{display:grid;grid-template-columns:1fr;gap:16px;padding:0 14px;max-width:620px;margin:0 auto}
@media (min-width:980px){.pgh.wide .pgg-list{grid-template-columns:repeat(2,minmax(0,1fr));max-width:1120px;align-items:start}.pgh.wide .pgg-head,.pgh.wide .pgg-act,.pgh.wide .pgg-empty{max-width:1092px;margin-left:auto;margin-right:auto}}
.pgg-card{position:relative;border-radius:24px;padding:12px 12px 14px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line),0 16px 34px rgba(0,0,0,.28)}
.pgg-ch{display:flex;align-items:center;gap:10px;margin:0 2px 10px}
.pgg-av{width:40px;height:40px;flex:none;border-radius:50%;overflow:hidden;display:grid;place-items:center;font:700 16px ${FB};color:#fff;background:hsl(var(--h,200) 55% 45%);box-shadow:0 0 0 2px rgba(255,214,140,.35)}
.pgg-av img{width:100%;height:100%;object-fit:cover;object-position:50% 30%}
.pgg-who{flex:1;min-width:0}
.pgg-who b{display:block;font:700 15px ${FB};color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgg-who small{display:block;font:600 12.5px ${FB};color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgg-more{width:40px;height:40px;flex:none;border:0;border-radius:50%;font:700 20px/1 ${FB};color:rgba(255,240,220,.8);background:rgba(255,236,210,.06)}
.pgg-pol{margin:0;padding:8px 8px 0;border-radius:6px;background:#fbf5ea;box-shadow:0 10px 22px rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.4) inset;cursor:pointer;transform:rotate(var(--rot,0deg))}
.pgg-ph{position:relative;aspect-ratio:3/2;border-radius:2px;overflow:hidden;background:linear-gradient(135deg,#d9cbb5,#efe4d3)}
.pgg-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s}
.pgg-ph img.on{opacity:1}
.pgg-ph.carte{aspect-ratio:3/1;background:#f6f1e4}
.pgg-ph .hrt{position:absolute;left:50%;top:50%;font-size:92px;line-height:1;transform:translate(-50%,-50%) scale(0);opacity:0;pointer-events:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.45))}
.pgg-ph .hrt.go{animation:pggHeart .9s ease-out}
@keyframes pggHeart{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}32%{transform:translate(-50%,-50%) scale(.95)}70%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-62%) scale(1.05)}}
.pgg-pol figcaption{padding:9px 6px 11px;color:#3a2a1a}
.pgg-leg{display:block;font:700 15.5px/1.35 ${FB};word-break:break-word}
.pgg-meta{display:block;margin-top:3px;font:600 12px/1.4 ${FB};color:#86705a}
.pgg-meta .rar{display:inline-block;padding:0 7px;border-radius:9px;font-weight:700;color:#5b3fa0;background:#e7dcff}
.pgg-meta .rar.r3,.pgg-meta .rar.r4{color:#7a4b00;background:linear-gradient(90deg,#ffe7a8,#ffd06a)}
.pgg-rx{display:flex;gap:6px;margin:12px 0 0;flex-wrap:nowrap}
.pgg-rxb{flex:1 1 0;min-width:0;height:44px;border:0;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:4px;font:700 13px ${FB};color:var(--ink);background:rgba(255,236,210,.07);box-shadow:inset 0 0 0 1px rgba(255,214,140,.16);transition:transform .15s}
.pgg-rxb i{font-style:normal;font-size:21px;line-height:1}
.pgg-rxb b{font-size:12.5px;color:var(--soft)}
.pgg-rxb.mine{background:linear-gradient(180deg,rgba(255,215,140,.38),rgba(255,160,90,.24));box-shadow:inset 0 0 0 2px rgba(255,207,115,.85)}
.pgg-rxb.mine b{color:#ffe9c2}
.pgg-rxb:active{transform:scale(.93)}
.pgg-rxb[disabled]{opacity:1;cursor:default}
.pgg-rxb.zero[disabled]{opacity:.38}
.pgg-who2{margin:8px 4px 0;font:600 12.5px/1.4 ${FB};color:var(--soft)}
.pgg-mots{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;align-items:center}
.pgg-mot{display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:999px;font:600 13px ${FB};color:var(--ink);background:rgba(255,236,210,.08)}
.pgg-mot b{color:#ffe2a6}
.pgg-mot.mine{background:rgba(255,207,115,.18);box-shadow:inset 0 0 0 1px rgba(255,207,115,.5)}
.pgg-motb{border:0;border-radius:999px;padding:7px 13px;font:700 13px ${FB};color:#ffe2a6;background:transparent;box-shadow:inset 0 0 0 1.5px rgba(255,207,115,.55)}
.pgg-papi{display:flex;gap:10px;align-items:flex-start;margin:12px 0 0}
.pgg-papi .f{width:42px;height:42px;flex:none;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px #ffcf73,0 4px 10px rgba(0,0,0,.35);background:#5a3a2a}
.pgg-papi .f.au{background-repeat:no-repeat;background-size:187px 125px;background-position:-80px -26px}
.pgg-papi .f.cc{display:grid;place-items:center;font-size:22px;background:linear-gradient(180deg,#ffe7a8,#ffb85e)}
.pgg-papi .t{position:relative;flex:1;padding:9px 12px 10px;border-radius:4px 16px 16px 16px;background:linear-gradient(180deg,#fff6e6,#ffe8c4);color:#3a2a1a;font:600 13.5px/1.4 ${FB};box-shadow:0 6px 14px rgba(0,0,0,.25)}
.pgg-papi .t small{display:block;margin-bottom:2px;font:700 11.5px ${FB};letter-spacing:.05em;text-transform:uppercase;color:#a0652a}
.pgg-papi .t em{font-style:normal;margin-left:4px}
.pgg-wait{display:flex;gap:9px;align-items:center;margin:12px 2px 0;padding:10px 12px;border-radius:14px;font:600 13px/1.4 ${FB};color:#ffd9e8;background:rgba(255,120,160,.12);box-shadow:inset 0 0 0 1px rgba(255,140,180,.3)}
.pgg-card.masq .pgg-pol{filter:grayscale(.6) brightness(.8)}
.pgg-card.ann{background:radial-gradient(130% 100% at 0% 0%,rgba(255,207,115,.24),transparent 60%),var(--card)}
.pgg-ann{padding:6px 4px 2px;font:700 17px/1.4 ${FB};color:#fff1d6}
.pgg-rec{display:flex;gap:12px;align-items:center;margin:10px 0 2px;padding:10px 14px;border-radius:16px;background:rgba(120,200,255,.1);box-shadow:inset 0 0 0 1px rgba(120,200,255,.28);font:600 15px/1.35 ${FB};color:var(--ink)}
.pgg-rec .f{font-size:30px}
.pgg-rec b{color:#bfe6ff}
.pgg-rec small{display:block;font:600 13px ${FB};color:var(--soft)}
.pgg-rib{display:inline-flex;align-items:center;gap:6px;margin:0 0 8px;padding:5px 11px;border-radius:999px;font:700 12px ${FB};letter-spacing:.06em;text-transform:uppercase;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffb85e)}
.pgg-empty{margin:4px 14px;padding:26px 20px;border-radius:24px;text-align:center;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}
.pgg-empty .em{font-size:44px;line-height:1.1}
.pgg-empty h3{margin:10px 0 6px;font:400 19px ${FD};color:#ffe9c2}
.pgg-empty p{margin:0 auto 14px;max-width:420px;font:600 14px/1.5 ${FB};color:var(--soft)}
.pgg-empty .pgh-cta{display:inline-flex;margin:0 auto}
.pgg-end{margin:18px 0 0;text-align:center;font:600 13px ${FB};color:rgba(255,240,220,.45)}
.pgg-plus{display:block;margin:16px auto 0;border:0;border-radius:999px;padding:11px 20px;font:700 14px ${FB};color:#ffe2a6;background:rgba(255,236,210,.08);box-shadow:inset 0 0 0 1px rgba(255,214,140,.3)}
.pgg-skel{height:330px;border-radius:24px;background:linear-gradient(100deg,rgba(255,236,210,.05) 30%,rgba(255,236,210,.1) 50%,rgba(255,236,210,.05) 70%) 0 0/200% 100%;animation:pggSk 1.4s linear infinite}
@keyframes pggSk{to{background-position:-200% 0}}
.pgg-veil{position:absolute;inset:0;z-index:34;background:rgba(8,6,20,.62);opacity:0;transition:opacity .2s;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.pgg-veil.on{opacity:1}
.pgg-sheet{position:absolute;left:0;right:0;bottom:0;z-index:35;max-height:86%;overflow:auto;padding:10px 16px calc(18px + env(safe-area-inset-bottom));border-radius:26px 26px 0 0;background:linear-gradient(180deg,#2a1c4c,#1a1232);box-shadow:0 -14px 40px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,214,140,.25);transform:translateY(105%);transition:transform .28s cubic-bezier(.2,.9,.3,1)}
.pgg-sheet.on{transform:none}
.pgh.wide .pgg-sheet{left:50%;right:auto;bottom:auto;top:50%;width:min(480px,92%);border-radius:26px;transform:translate(-50%,-46%) scale(.96);opacity:0;transition:transform .22s,opacity .22s}
.pgh.wide .pgg-sheet.on{transform:translate(-50%,-50%);opacity:1}
.pgg-grab{width:44px;height:5px;margin:0 auto 12px;border-radius:3px;background:rgba(255,236,210,.25)}
.pgh.wide .pgg-grab{display:none}
.pgg-sheet h3{margin:4px 2px 4px;font:400 19px ${FD};color:#ffe9c2}
.pgg-sheet p{margin:0 2px 12px;font:600 13.5px/1.45 ${FB};color:var(--soft)}
.pgg-words{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.pgg-word2{border:0;border-radius:16px;padding:13px 10px;font:700 14.5px ${FB};color:var(--ink);background:rgba(255,236,210,.08);box-shadow:inset 0 0 0 1px rgba(255,214,140,.18)}
.pgg-word2.on{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffb85e)}
.pgg-row{display:flex;align-items:center;gap:12px;width:100%;border:0;border-radius:16px;margin:0 0 8px;padding:14px;font:700 15px ${FB};color:var(--ink);text-align:left;background:rgba(255,236,210,.07);box-shadow:inset 0 0 0 1px rgba(255,214,140,.16)}
.pgg-row .i{font-size:20px;width:26px;text-align:center}
.pgg-row.red{color:#ffb3be}
.pgg-row small{display:block;font:600 12.5px ${FB};color:var(--soft)}
.pgg-btns{display:flex;gap:10px;margin-top:6px}
.pgg-btns button{flex:1;border:0;border-radius:16px;padding:13px;font:700 15px ${FB}}
.pgg-btns .no{color:var(--ink);background:rgba(255,236,210,.1)}
.pgg-btns .yes{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffb85e)}
.pgg-btns .yes.red{color:#fff;background:linear-gradient(180deg,#ff7a8a,#e8455c)}
.pgg-view{position:absolute;inset:0;z-index:36;display:flex;flex-direction:column;background:#07050f;opacity:0;transition:opacity .2s}
.pgg-view.on{opacity:1}
.pgg-vtop{display:flex;align-items:center;gap:10px;padding:10px 12px;color:var(--ink)}
.pgg-vtop .pgg-who{color:var(--ink)}
.pgg-vx{width:44px;height:44px;border:0;border-radius:50%;font:700 20px ${FB};color:var(--ink);background:rgba(255,255,255,.08)}
.pgg-vimg{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;touch-action:pan-y}
.pgg-vimg img{max-width:100%;max-height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none}
.pgg-vimg .hrt{position:absolute;left:50%;top:50%;font-size:120px;transform:translate(-50%,-50%) scale(0);opacity:0;pointer-events:none}
.pgg-vimg .hrt.go{animation:pggHeart .9s ease-out}
.pgg-vnav{position:absolute;top:50%;width:48px;height:48px;margin-top:-24px;border:0;border-radius:50%;font:700 22px ${FB};color:#fff;background:rgba(255,255,255,.1)}
.pgg-vnav.p{left:12px}.pgg-vnav.n{right:12px}
.pgg-vbot{padding:10px 14px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(0deg,rgba(16,12,34,.95),rgba(16,12,34,.7))}
.pgg-vbot .pgg-leg{color:var(--ink)}
.pgg-vbot .pgg-meta{color:var(--soft)}
.pgg-mod{position:absolute;inset:0;z-index:33;overflow:auto;padding:12px 14px 30px;background:linear-gradient(180deg,#1c1640,#100c22);opacity:0;transition:opacity .2s}
.pgg-mod.on{opacity:1}
.pgg-modh{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.pgg-modh h2{flex:1;margin:0;font:400 21px ${FD};color:#e8ddff}
.pgg-modsec{margin:14px 0 0;padding:14px;border-radius:20px;background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px rgba(200,180,255,.2)}
.pgg-modsec h3{margin:0 0 6px;font:700 13px ${FB};letter-spacing:.06em;text-transform:uppercase;color:#cbbcff}
.pgg-modsec p{margin:0 0 10px;font:600 13px/1.45 ${FB};color:var(--soft)}
.pgg-modr{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.08)}
.pgg-modr:first-of-type{border-top:0}
.pgg-modr img{width:96px;height:64px;object-fit:cover;border-radius:8px;flex:none;background:#2a2050}
.pgg-modr .tx{flex:1;min-width:0;font:600 13px/1.4 ${FB};color:var(--ink)}
.pgg-modr .tx small{display:block;color:var(--soft)}
.pgg-modr .bt{display:flex;flex-direction:column;gap:6px}
.pgg-modr .bt button{border:0;border-radius:12px;padding:8px 12px;font:700 13px ${FB}}
.pgg-modr .bt .k{color:#0f2a18;background:#7cf0a0}
.pgg-modr .bt .r{color:#fff;background:linear-gradient(180deg,#ff7a8a,#e8455c)}
.pgg-ta{width:100%;box-sizing:border-box;min-height:70px;border:0;border-radius:14px;padding:10px 12px;font:600 14px/1.4 ${FB};color:var(--ink);background:rgba(0,0,0,.3);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25);resize:vertical}
.pgg-sel{display:flex;gap:8px;margin:8px 0}
@media (prefers-reduced-motion:reduce){.pgg-ph .hrt.go,.pgg-vimg .hrt.go,.pgg-new button,.pgg-skel{animation:none}.pgg-sheet,.pgg-view,.pgg-veil,.pgg-mod{transition:none}}
`;
  }

  // K = { box, $, PG, pgInfo, memberMode, on, later, every, store, toast, tone, members, report }
  function PGH_GRAM_MOUNT(K) {
    const { box, $, PG, pgInfo, memberMode, on, later, every, store, toast, tone } = K;
    const pane = $.grpane, bdg = $.grbdg, tabBtn = box.querySelector('.pgh-tab[data-tab="gram"]');
    const me = () => String(pgInfo().name || '').toUpperCase();
    const KP = () => 'jdw.pegase.gram.' + (me() || 'INVITE') + '.';
    const G = {
      st: 'idle', err: '', cat: null, posts: [], more: true, busy: false, sig: '', room: store.get('jdw.pegase.gram.salle') || 'all',
      vu: +(store.get(KP() + 'vu') || 0), vuR: +(store.get(KP() + 'vuR') || 0), news: 0, newsR: 0, lastR: 0, act: [], pend: 0,
      imgs: new Map(), rx: new Map(), mots: new Map(), sheet: null, view: null, mod: null, live: false, off: null, shown: false, at: 0,
      has: null, gardien: false, taps: new Map()
    };
    let io = null, dead = false;
    const hue = (n) => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
    const fr = (s) => String(s).replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
    const T = (s) => esc(fr(s));
    const ago = (iso) => {
      const t = Date.parse(iso); if (!t) return ''; const s = Math.max(0, (Date.now() - t) / 1000);
      if (s < 60) return 'à l\'instant'; if (s < 3600) return 'il y a ' + Math.floor(s / 60) + ' min'; if (s < 86400) return 'il y a ' + Math.floor(s / 3600) + ' h';
      if (s < 2 * 86400) return 'hier'; const d = new Date(t); return 'le ' + d.getDate() + ' ' + ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][d.getMonth()];
    };
    const has = (fn) => { try { return PG && typeof PG.has === 'function' ? PG.has(fn) : null; } catch (e) { return null; } };
    const refused = (e) => /fonction refus|Could not find the function|PGRST202|rpc inconnue/i.test(String(e && e.message || e));
    const rpc = async (fn, a) => { const r = await PG.rpc(fn, a || {}); return r; };
    const first = (r) => Array.isArray(r) ? r[0] : r;
    const mem = () => { try { return (K.members && K.members()) || []; } catch (e) { return []; } };
    const nameOf = (p) => p.r_alias || ((mem().find((m) => m.name === p.r_auteur) || {}).display) || p.r_auteur || '';
    const who = (n) => ((mem().find((m) => m.name === n) || {}).display) || n || '';
    const faceOf = (n) => { const m = mem().find((x) => x.name === n); return m && m.photo ? m.photo : null; };
    const avHtml = (n, cls) => { const ph = faceOf(n); return `<span class="pgg-av${cls ? ' ' + cls : ''}" style="--h:${hue(n)}">${ph ? `<img alt="" src="${esc(ph)}">` : esc(String(n || '?').slice(0, 1))}</span>`; };
    const papiFace = () => `<span class="f au" style="background-image:url('${esc(IMG('auguste'))}')" role="img" aria-label="Papi Auguste"></span>`;
    const pnjFace = (p) => p === 'maire' ? papiFace() : `<span class="f cc">${p === 'concours' ? '🏆' : '✨'}</span>`;
    const pnjName = (p) => (G.cat && G.cat.pnj && G.cat.pnj[p]) || (p === 'maire' ? 'Papi Auguste' : p === 'concours' ? 'Concours Pégase' : 'Pégase');
    const motT = (id) => { const m = G.cat && G.cat.mots.find((x) => x.id === id); return m ? m.t : ''; };
    const meta = (inf) => {
      if (!inf) return ''; const bits = [];
      if (inf.nom) bits.push(esc(inf.nom) + (inf.nb > 1 ? ' ×' + inf.nb : ''));
      if (inf.rar >= 2) bits.push(`<span class="rar r${inf.rar}">${esc(GRAM_RAR[inf.rar])}</span>`);
      const h = inf.heure ? inf.heure.replace(':', ' h ') : ''; const mo = inf.moment ? GRAM_MOMENT[inf.moment] || '' : '';
      if (h || mo) bits.push(esc([h, mo].filter(Boolean).join(', ')));
      if (inf.macro) bits.push('macro');
      return bits.length ? '📷 ' + bits.join(' · ') : '';
    };
    // mes choix tout de suite (comme les réactions des SMS), puis la réponse du serveur
    const effRx = (p) => {
      const list = (p.r_react || []).map((x) => ({ w: x.w, e: x.e, m: x.m }));
      const n = me(); const want = G.rx.has(p.r_id) ? G.rx.get(p.r_id) : undefined, wm = G.mots.has(p.r_id) ? G.mots.get(p.r_id) : undefined;
      if (want !== undefined || wm !== undefined) {
        let mine = list.find((x) => x.w === n); if (!mine) { mine = { w: n, e: null, m: null }; list.push(mine); }
        if (want !== undefined) mine.e = want; if (wm !== undefined) mine.m = wm;
      }
      return list;
    };

    // ---------- images (Storage privé : api.pegase.photo → adresse ; cache par chemin, une photo ne change jamais) ----------
    async function img(path) {
      if (!path) return null; if (G.imgs.has(path)) return G.imgs.get(path);
      const pr = (async () => { if (!PG || typeof PG.photo !== 'function') throw new Error('photo indisponible'); return await PG.photo(path); })();
      G.imgs.set(path, pr); pr.catch(() => G.imgs.delete(path)); return pr;
    }
    function hook(el) {
      if (!io && 'IntersectionObserver' in window) io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); load(e.target); } }, { root: $.scroll, rootMargin: '500px 0px' });
      el.querySelectorAll('img[data-src]').forEach((im) => { if (io) io.observe(im); else load(im); });
    }
    function load(im) { const p = im.dataset.src; if (!p) return; img(p).then((u) => { if (!u || dead) return; im.onload = () => im.classList.add('on'); im.src = u; if (im.complete) im.classList.add('on'); }).catch(() => { im.closest('.pgg-ph') && im.closest('.pgg-ph').classList.add('ko'); }); }

    // ---------- rendu ----------
    // 21 oct. : une CARTE POSTALE partagée (image recto | verso 3:1, r_infos.w / h) se montre entière (GramVocab.EstCarte du jeu)
    const estCarte = (p) => { const f = p && p.r_infos; return !!(f && f.w > 0 && f.h > 0 && f.w >= f.h * 2.8); };
    function card(p, i) {
      const n = me(), mine = p.r_moi, rx = effRx(p), my = rx.find((x) => x.w === n) || {};
      if (p.r_pnj) {             // annonce (concours…) : texte, détails (data) et, parfois, la photo du gagnant
        const d = p.r_data || {}, kg = d.g ? (d.g / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kg' : '';
        const rec = d.type === 'peche' ? `<div class="pgg-rec"><span class="f">🐟</span><span><b>${esc(d.nom || d.esp || 'Poisson')}</b>${d.cm ? ' · ' + Number(d.cm).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' cm' : ''}${kg ? ' · ' + kg : ''}${d.gagnant ? `<small>Gagnant : ${esc(who(d.gagnant))}</small>` : ''}</span></div>` :
          d.type === 'photo' ? `<div class="pgg-rec"><span class="f">📸</span><span><b>${esc(d.theme || 'Concours photo')}</b>${d.gagnant ? `<small>Gagnant : ${esc(who(d.gagnant))}</small>` : ''}</span></div>` : '';
        return `<article class="pgg-card ann" data-id="${p.r_id}"><div class="pgg-ch">${'<span class="pgg-papi" style="margin:0">' + pnjFace(p.r_pnj) + '</span>'}<div class="pgg-who"><b>${esc(pnjName(p.r_pnj))}</b><small>${esc(p.r_room ? (p.r_salle || '') + ' · ' : 'Pour tout le monde · ')}${ago(p.r_at)}</small></div></div>
          <span class="pgg-rib">📣 ${d.type === 'peche' ? 'Concours de pêche' : d.type === 'photo' ? 'Concours photo' : 'Annonce'}</span><div class="pgg-ann">${T(p.r_legende)}</div>${rec}
          ${p.r_photo ? `<figure class="pgg-pol" data-a="voir" style="margin-top:10px"><div class="pgg-ph"><img alt="" data-src="${esc(p.r_m)}"><i class="hrt">❤️</i></div></figure>` : ''}${rxBar(p, rx, my, false)}</article>`;
      }
      const words = rx.filter((x) => x.m).map((x) => `<span class="pgg-mot${x.w === n ? ' mine' : ''}"><b>${esc(x.w === n ? 'Toi' : who(x.w))}</b> ${T(motT(x.m))}</span>`).join('');
      // (23 oct., l'utilisateur : Papi Auguste ne COMMENTE pas les photos ; il annonce seulement les concours et les gagnants, plus haut)
      const masq = p.r_state === 'masquee';
      return `<article class="pgg-card${masq ? ' masq' : ''}" data-id="${p.r_id}" style="--rot:${(i % 3 - 1) * 0.35}deg">
        <header class="pgg-ch">${avHtml(p.r_auteur)}<div class="pgg-who"><b>${esc(mine ? 'Toi' : nameOf(p))}</b><small>${esc(p.r_salle || '')} · ${ago(p.r_at)}</small></div><button class="pgg-more" data-a="menu" aria-label="Plus d'actions">⋯</button></header>
        <figure class="pgg-pol" data-a="voir"><div class="pgg-ph${estCarte(p) ? ' carte' : ''}"><img alt="${esc(p.r_legende || 'Photo de ' + nameOf(p))}" data-src="${esc(p.r_m)}"><i class="hrt">❤️</i></div>
          <figcaption>${p.r_legende ? `<span class="pgg-leg">${T(p.r_legende)}</span>` : ''}${meta(p.r_infos) ? `<small class="pgg-meta">${meta(p.r_infos)}</small>` : ''}</figcaption></figure>
        ${masq ? '<div class="pgg-wait">⏳ <span>Des copains l\'ont signalée : elle est cachée en attendant qu\'un gardien la regarde.</span></div>' : rxBar(p, rx, my, mine)}
        ${masq ? '' : `<div class="pgg-mots">${words}${mine ? '' : `<button class="pgg-motb" data-a="mot">💬 ${my.m ? 'Changer mon mot' : 'Un petit mot'}</button>`}</div>`}</article>`;
    }
    function rxBar(p, rx, my, mine) {
      const cnt = (e) => rx.filter((x) => x.e === e).length;
      const ws = rx.filter((x) => x.e).map((x) => x.w === me() ? 'toi' : who(x.w));
      const whoT = ws.length === 0 ? '' : ws.length <= 3 ? ws.join(', ').replace(/, ([^,]*)$/, ' et $1') : ws.slice(0, 2).join(', ') + ' et ' + (ws.length - 2) + ' autres';
      return `<div class="pgg-rx" role="group" aria-label="Réactions">${GRAM_RX.map((e) => { const c = cnt(e), m = my.e === e;
        return `<button class="pgg-rxb${m ? ' mine' : ''}${c ? '' : ' zero'}" data-a="rx" data-e="${e}" ${mine ? 'disabled' : ''} aria-pressed="${m}" title="${esc(GRAM_RX_T[e])}"><i>${e}</i>${c ? `<b>${c}</b>` : ''}</button>`; }).join('')}</div>` +
        (whoT ? `<div class="pgg-who2">${esc(whoT)} ${ws.length > 1 ? 'ont' : 'a'} réagi</div>` : '');
    }
    function render(force) {
      if (dead) return;
      let h = '';
      const i = pgInfo();
      if (G.st === 'guest') {
        h = `<div class="pgg">${head(false)}<div class="pgg-empty"><div class="em">📸</div><h3>Entre dans PegaGram</h3><p>${T('PegaGram, c\'est le petit réseau photo de ta salle : tes copains y partagent leurs plus belles photos de Pégase, et tu peux réagir. Crée ton compte pour y entrer.')}</p><button class="pgh-cta gold" data-a="acct">Créer mon compte</button></div></div>`;
      } else if (G.st === 'err' && !G.posts.length) {
        h = `<div class="pgg">${head(true)}<div class="pgg-empty"><div class="em">📡</div><h3>Pas de réseau ?</h3><p>${T('Impossible de charger PegaGram pour l\'instant. Vérifie ta connexion puis réessaie.')}</p><button class="pgh-cta glass" data-a="retry">Réessayer</button></div></div>`;
      } else if ((G.st === 'load' || G.st === 'idle') && !G.posts.length) {
        h = `<div class="pgg">${head(true)}<div class="pgg-list"><div class="pgg-skel"></div><div class="pgg-skel"></div></div></div>`;
      } else {
        const list = G.posts.filter((p) => G.room === 'all' || String(p.r_room) === String(G.room) || !p.r_room);
        const actH = actHtml();
        h = `<div class="pgg">${head(true)}${G.pend > 0 ? `<div class="pgg-new"><button data-a="nouv">↑ ${G.pend} nouvelle${G.pend > 1 ? 's' : ''} photo${G.pend > 1 ? 's' : ''}</button></div>` : ''}${actH}` +
          (list.length ? `<div class="pgg-list">${list.map(card).join('')}</div>` + (G.more ? `<button class="pgg-plus" data-a="plus">Voir les photos plus anciennes</button>` : '<div class="pgg-end">C\'est tout pour l\'instant ✦</div>') :
            `<div class="pgg-empty"><div class="em">🖼️</div><h3>Pas encore de photo</h3><p>${T('Lance-toi : prends une belle photo dans Pégase, puis touche « Partager sur PegaGram ». Tes copains de la salle la verront ici.')}</p></div>`) + '</div>';
      }
      if (!force && h === G.sig) return; G.sig = h;
      const sc = $.scroll, keep = sc.scrollTop;
      pane.innerHTML = nbsp(h); sc.scrollTop = keep; hook(pane); hookAct();
    }
    function head(full) {
      const rooms = roomList();
      return `<header class="pgg-head"><div class="pgg-brand"><span class="pgg-logo">${PGH_SVG.gram}</span><span class="pgg-word">PegaGram</span></div>
        ${G.gardien ? `<button class="pgg-modb" data-a="mod">🛡️ Gardien${G.modN ? `<b>${G.modN}</b>` : ''}</button>` : ''}
        <p>${T('Les plus belles photos de ta salle, prises dans Pégase. Seuls tes copains de la salle les voient.')}</p>
        ${full && !G.posts.some((p) => p.r_moi) ? `<div class="pgg-how"><span class="ph">📱</span><span>${T('Pour partager : dans le jeu, sors ton téléphone › ')}<b>PegaGram</b>${T(' › ＋, choisis une photo de ton album et écris une petite légende.')}</span></div>` : ''}
        ${full && rooms.length > 1 ? `<div class="pgg-rooms">${[['all', 'Toutes mes salles']].concat(rooms.map((r) => [String(r.id), r.name])).map(([id, n]) => `<button class="pgg-room${String(G.room) === id ? ' on' : ''}" data-a="room" data-r="${esc(id)}">${esc(n)}</button>`).join('')}</div>` : ''}
      </header>`;
    }
    function roomList() {
      const m = new Map(); const r0 = pgInfo().room; if (r0 && r0.id) m.set(String(r0.id), { id: r0.id, name: r0.name });
      for (const p of G.posts) if (p.r_room && !m.has(String(p.r_room))) m.set(String(p.r_room), { id: p.r_room, name: p.r_salle });
      return [...m.values()];
    }
    function actHtml() {
      const fresh = G.act.filter((a) => a.r_seq > G.vuR && !a.r_pnj).slice(0, 3); if (!fresh.length) return '';   // jamais d'avis d'habitant (23 oct.)
      return `<section class="pgg-act"><h3>Sur tes photos</h3>${fresh.map((a) => `<div class="pgg-actr"><img alt="" data-src="${esc(a.r_m || '')}"><span>`
        + `<b>${esc(who(a.r_qui))}</b> ${a.r_mot ? 'a écrit « ' + esc(motT(a.r_mot)) + ' »' : 'a réagi ' + (a.r_emoji || '')} <small>· ${ago(a.r_at)}</small></span></div>`).join('')}</section>`;
    }
    function hookAct() { pane.querySelectorAll('.pgg-actr img[data-src]').forEach((im) => { if (im.dataset.src) load(im); }); }
    function badge() {
      if (!bdg) return;
      const n = G.news, r = G.newsR;
      bdg.classList.toggle('on', G.st !== 'off' && !G.shown && (n > 0 || r > 0));   // sur l'onglet : la bulle « ↑ nouvelles photos » suffit
      bdg.classList.toggle('coeur', n === 0 && r > 0);
      bdg.textContent = n > 0 ? (n > 9 ? '9+' : String(n)) : '';
      bdg.setAttribute('aria-label', n > 0 ? n + ' nouvelles photos' : r > 0 ? 'nouvelles réactions sur tes photos' : '');
    }
    function setOff() {
      G.st = 'off'; if (pane) pane.innerHTML = ''; badge();
      if (tabBtn) { const was = tabBtn.classList.contains('on'); tabBtn.hidden = true; tabBtn.style.display = 'none'; if (was && K.setTab) K.setTab('moi'); }
    }

    // ---------- chargements ----------
    async function catalogue() {
      if (G.cat) return G.cat;
      const r = first(await rpc('pg_gram_catalogue', {}));
      G.cat = r; G.gardien = !!(r && r.gardien); return r;
    }
    async function loadFil(more) {
      if (!PG) return setOff();
      if (!memberMode()) { G.st = 'guest'; render(); badge(); return; }
      if (G.has === null) G.has = has('pg_gram_fil');
      if (G.has === false) return setOff();
      if (G.busy) return; G.busy = true;
      if (!G.posts.length && G.st !== 'ok') { G.st = 'load'; render(); }
      try {
        await catalogue();
        const before = more && G.posts.length ? G.posts[G.posts.length - 1].r_id : null;
        const rows = (await rpc('pg_gram_fil', { p_room: null, p_before: before, p_limit: 12 })) || [];
        if (more) { const ids = new Set(G.posts.map((p) => p.r_id)); G.posts = G.posts.concat(rows.filter((r) => !ids.has(r.r_id))); }
        else G.posts = rows.concat(G.posts.filter((p) => rows.length && p.r_id < rows[rows.length - 1].r_id));
        G.more = rows.length >= 12; G.st = 'ok'; G.err = ''; G.at = Date.now(); G.pend = 0;
        for (const p of rows) { if (G.rx.has(p.r_id) && (p.r_react || []).some((x) => x.w === me() && x.e === G.rx.get(p.r_id))) G.rx.delete(p.r_id); if (G.mots.has(p.r_id) && (p.r_react || []).some((x) => x.w === me() && x.m === G.mots.get(p.r_id))) G.mots.delete(p.r_id); }
        if (G.shown) seen();
        if (G.gardien) modCount();
        loadAct();
      } catch (e) {
        if (refused(e)) { G.busy = false; return setOff(); }
        if (e && e.guest) { G.st = 'guest'; } else { G.st = 'err'; G.err = String(e && e.message || e); }
      }
      G.busy = false; render(); badge();
    }
    async function loadAct() {
      try { G.act = (await rpc('pg_gram_activite', { p_after: 0, p_limit: 20 })) || []; if (G.shown) render(); } catch (e) { /* rien : la liste reste */ }
    }
    async function quoiDeNeuf() {
      if (G.st === 'off' || !PG || !memberMode() || G.has === false) return;
      G.qAt = Date.now();
      try {
        if (G.has === null) G.has = has('pg_gram_nouveau'); if (G.has === false) return setOff();
        const r = first(await rpc('pg_gram_nouveau', { p_vu: G.vu, p_vu_react: G.vuR })); if (!r) return;
        G.news = r.posts || 0; G.newsR = r.reacts || 0; G.lastR = r.dernier_react || 0;
        if (G.shown && r.dernier > ((G.posts[0] && G.posts[0].r_id) || 0)) { G.pend = Math.max(1, r.posts || 1); render(); }
        if (G.shown && G.newsR > 0) loadAct();
        badge();
      } catch (e) { if (refused(e)) setOff(); }
    }
    function seen() {
      const top = G.posts.reduce((a, p) => Math.max(a, p.r_id), 0);
      if (top > G.vu) { G.vu = top; store.set(KP() + 'vu', String(top)); }
      G.news = 0; badge();
      // les réactions sur mes photos : vues quand l'onglet est ouvert (la bande « Sur tes photos » reste jusqu'au prochain passage)
      later(() => { if (!G.shown) return; const r = G.act.reduce((a, x) => Math.max(a, x.r_seq), G.lastR || 0); if (r > G.vuR) { G.vuR = r; store.set(KP() + 'vuR', String(r)); } G.newsR = 0; badge(); }, 4000);
    }

    // ---------- gestes ----------
    async function react(id, e) {
      const p = G.posts.find((x) => x.r_id === id); if (!p || p.r_moi) return;
      const cur = (effRx(p).find((x) => x.w === me()) || {}).e || null, nx = cur === e ? null : e;
      G.rx.set(id, nx); render(true); tone(nx ? 660 : 420, nx ? 880 : 360);
      if (nx) heart(id, nx);
      try { await rpc('pg_gram_reagir', { p_post: id, p_emoji: nx }); later(loadFil, 400); }
      catch (err) { G.rx.delete(id); render(true); toast(/trop d essais/.test(err.message) ? 'Doucement ! Réessaie dans un instant.' : /photo inconnue/.test(err.message) ? 'Cette photo n\'est plus là.' : 'Pas de réseau : réaction pas envoyée.'); }
    }
    function heart(id, e) {
      const el = pane.querySelector(`.pgg-card[data-id="${id}"] .hrt`) || (G.view != null ? box.querySelector('.pgg-vimg .hrt') : null);
      for (const h of [el, G.view != null ? box.querySelector('.pgg-vimg .hrt') : null]) { if (!h) continue; h.textContent = e; h.classList.remove('go'); void h.offsetWidth; h.classList.add('go'); }
    }
    async function setMot(id, m) {
      G.mots.set(id, m); render(true); closeSheet(); tone(620, 840);
      try { await rpc('pg_gram_mot', { p_post: id, p_mot: m }); later(loadFil, 400); toast(m ? 'Petit mot envoyé !' : 'Petit mot retiré.'); }
      catch (err) { G.mots.delete(id); render(true); toast('Pas de réseau : petit mot pas envoyé.'); }
    }
    async function retirer(id) {
      closeSheet();
      try {
        const r = first(await rpc('pg_gram_retirer', { p_post: id }));
        G.posts = G.posts.filter((p) => p.r_id !== id); render(true); toast('Ta photo est retirée de PegaGram. Elle reste dans l\'album de ton jeu.');
        if (r && r.effacer && PG.photoDelete) PG.photoDelete(r.effacer).catch(() => {});
      } catch (err) { toast('Impossible pour l\'instant : réessaie.'); }
    }
    // gardien : cacher une photo pour tout le monde (rien n'est effacé : « Garder » ou « Retirer » ensuite, dans le panneau du gardien)
    async function cacher(id) {
      closeSheet();
      try { await rpc('pg_gram_gardien_decider', { p_post: id, p_action: 'cacher' }); G.posts = G.posts.filter((p) => p.r_id !== id); render(true); toast('Cachée pour tout le monde. À toi de décider dans « Gardien ».'); modCount(); }
      catch (err) { toast('Impossible pour l’instant : réessaie.'); }
    }
    async function signaler(id, motif) {
      closeSheet();
      try { await rpc('pg_gram_signaler', { p_post: id, p_motif: motif }); G.posts = G.posts.filter((p) => p.r_id !== id); render(true); toast('Merci ! Tu ne la verras plus. Un gardien va la regarder.'); }
      catch (err) { toast(/trop d essais/.test(err.message) ? 'Tu as déjà beaucoup signalé aujourd\'hui.' : 'Impossible pour l\'instant : réessaie.'); }
    }

    // ---------- feuilles (petit mot, menu, signaler, retirer) ----------
    function sheet(html) {
      closeSheet(true);
      const v = document.createElement('div'); v.className = 'pgg-veil'; const s = document.createElement('div'); s.className = 'pgg-sheet'; s.setAttribute('role', 'dialog');
      s.innerHTML = nbsp('<div class="pgg-grab"></div>' + html); box.appendChild(v); box.appendChild(s); G.sheet = { v, s };
      requestAnimationFrame(() => { v.classList.add('on'); s.classList.add('on'); });
      v.addEventListener('click', () => closeSheet());
      s.addEventListener('click', onSheet);
      const f = s.querySelector('button'); if (f && !K.touch) f.focus({ preventScroll: true });
      return s;
    }
    function closeSheet(now) {
      const S = G.sheet; if (!S) return; G.sheet = null;
      S.v.classList.remove('on'); S.s.classList.remove('on');
      const rm = () => { S.v.remove(); S.s.remove(); }; if (now) rm(); else later(rm, 300);
    }
    function onSheet(e) {
      const b = e.target.closest('[data-s]'); if (!b) return; const id = +b.dataset.id;
      const a = b.dataset.s;
      if (a === 'mot') setMot(id, b.dataset.m || null);
      else if (a === 'sig') sheetSignal(id);
      else if (a === 'motif') signaler(id, b.dataset.m);
      else if (a === 'ret') sheetRetirer(id);
      else if (a === 'retok') retirer(id);
      else if (a === 'cacher') cacher(id);
      else if (a === 'close') closeSheet();
    }
    function sheetMot(id) {
      const p = G.posts.find((x) => x.r_id === id); if (!p) return; const cur = (effRx(p).find((x) => x.w === me()) || {}).m || null;
      sheet(`<h3>Un petit mot pour ${esc(nameOf(p))}</h3><p>Choisis-en un : il s'affiche sous sa photo.</p><div class="pgg-words">${(G.cat ? G.cat.mots : []).map((m) => `<button class="pgg-word2${cur === m.id ? ' on' : ''}" data-s="mot" data-id="${id}" data-m="${esc(m.id)}">${T(m.t)}</button>`).join('')}</div>` +
        (cur ? `<div class="pgg-btns"><button class="no" data-s="mot" data-id="${id}" data-m="">Retirer mon mot</button></div>` : ''));
    }
    function sheetMenu(id) {
      const p = G.posts.find((x) => x.r_id === id); if (!p) return;
      if (p.r_moi) sheet(`<h3>Ta photo</h3><button class="pgg-row red" data-s="ret" data-id="${id}"><span class="i">🗑️</span><span>Retirer ma photo<small>Tes copains ne la verront plus.</small></span></button><button class="pgg-row" data-s="close"><span class="i">✕</span>Annuler</button>`);
      else sheet(`<h3>Photo de ${esc(nameOf(p))}</h3><button class="pgg-row" data-s="sig" data-id="${id}"><span class="i">🚩</span><span>Signaler cette photo<small>Elle disparaît pour toi, et un gardien la regarde.</small></span></button>` +
        (G.gardien && p.r_auteur ? `<button class="pgg-row" data-s="cacher" data-id="${id}"><span class="i">🛡️</span><span>Cacher (gardien)<small>Elle disparaît pour tout le monde ; tu décides ensuite dans « Gardien ».</small></span></button>` : '') +
        `<button class="pgg-row" data-s="close"><span class="i">✕</span>Annuler</button>`);
    }
    function sheetSignal(id) {
      sheet(`<h3>Qu'est-ce qui ne va pas ?</h3><p>Personne ne saura que c'est toi.</p>${Object.entries(GRAM_MOTIF).map(([k, t]) => `<button class="pgg-row" data-s="motif" data-id="${id}" data-m="${k}"><span class="i">${{ pas_gentil: '😠', pas_du_jeu: '🚫', personnel: '🔒', autre: '❔' }[k]}</span>${esc(t)}</button>`).join('')}<button class="pgg-row" data-s="close"><span class="i">✕</span>Annuler</button>`);
    }
    function sheetRetirer(id) {
      sheet(`<h3>Retirer ta photo ?</h3><p>Elle disparaît de PegaGram pour tout le monde (elle reste dans l'album de ton jeu).</p><div class="pgg-btns"><button class="no" data-s="close">Garder</button><button class="yes red" data-s="retok" data-id="${id}">Retirer</button></div>`);
    }

    // ---------- photo en grand ----------
    function viewList() { return G.posts.filter((p) => p.r_photo && p.r_state === 'publiee' && (G.room === 'all' || String(p.r_room) === String(G.room))); }
    function openView(id) {
      const L = viewList(); const i = L.findIndex((p) => p.r_id === id); if (i < 0) return;
      G.view = i; let v = box.querySelector('.pgg-view');
      if (!v) { v = document.createElement('div'); v.className = 'pgg-view'; v.setAttribute('role', 'dialog'); box.appendChild(v); v.addEventListener('click', onView); swipe(v); }
      drawView(); requestAnimationFrame(() => v.classList.add('on'));
    }
    function drawView() {
      const v = box.querySelector('.pgg-view'); if (!v) return; const L = viewList(); const p = L[G.view]; if (!p) return closeView();
      const rx = effRx(p), my = rx.find((x) => x.w === me()) || {};
      v.innerHTML = nbsp(`<div class="pgg-vtop">${avHtml(p.r_auteur)}<div class="pgg-who"><b>${esc(p.r_moi ? 'Toi' : nameOf(p))}</b><small>${esc(p.r_salle || '')} · ${ago(p.r_at)}</small></div><button class="pgg-vx" data-v="x" aria-label="Fermer">✕</button></div>
        <div class="pgg-vimg" data-v="img"><img alt="${esc(p.r_legende || '')}"><i class="hrt">❤️</i>${G.view > 0 ? '<button class="pgg-vnav p" data-v="p" aria-label="Photo précédente">‹</button>' : ''}${G.view < L.length - 1 ? '<button class="pgg-vnav n" data-v="n" aria-label="Photo suivante">›</button>' : ''}</div>
        <div class="pgg-vbot">${p.r_legende ? `<span class="pgg-leg">${T(p.r_legende)}</span>` : ''}${meta(p.r_infos) ? `<small class="pgg-meta">${meta(p.r_infos)}</small>` : ''}${rxBar(p, rx, my, p.r_moi)}</div>`);
      const im = v.querySelector('.pgg-vimg img'); let big = false;
      img(p.r_m).then((u) => { if (u && !big) im.src = u; }).catch(() => {});          // la vignette d'abord (déjà là), puis la grande
      img(p.r_g).then((u) => { if (u) { big = true; im.src = u; } }).catch(() => {});
    }
    function closeView() { const v = box.querySelector('.pgg-view'); G.view = null; if (v) { v.classList.remove('on'); later(() => v.remove(), 220); } }
    function onView(e) {
      const b = e.target.closest('[data-v],[data-a]'); if (!b) return;
      const L = viewList(), p = L[G.view];
      if (b.dataset.v === 'x') closeView();
      else if (b.dataset.v === 'p' && G.view > 0) { G.view--; drawView(); }
      else if (b.dataset.v === 'n' && G.view < L.length - 1) { G.view++; drawView(); }
      else if (b.dataset.a === 'rx' && p) { react(p.r_id, b.dataset.e).then(() => {}); later(drawView, 30); }
      else if (b.dataset.v === 'img' && p) tap(p.r_id, () => {});
    }
    function swipe(v) {
      let x0 = null, y0 = 0;
      v.addEventListener('pointerdown', (e) => { if (e.target.closest('.pgg-vimg')) { x0 = e.clientX; y0 = e.clientY; } });
      v.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) { const L = viewList(); if (dx < 0 && G.view < L.length - 1) { G.view++; drawView(); } else if (dx > 0 && G.view > 0) { G.view--; drawView(); } } });
    }
    // un toucher = ouvrir ; deux touchers rapprochés = ❤️ (comme partout)
    function tap(id, single) {
      const t = G.taps.get(id);
      if (t) { clearTimeout(t); G.taps.delete(id); const p = G.posts.find((x) => x.r_id === id); if (p && !p.r_moi) { const cur = (effRx(p).find((x) => x.w === me()) || {}).e; if (cur !== '❤️') react(id, '❤️'); else heart(id, '❤️'); } return; }
      G.taps.set(id, setTimeout(() => { G.taps.delete(id); if (!dead) single(); }, 260));
    }

    // ---------- GARDIEN : modération, ménage, annonce ----------
    async function modCount() { try { const L = (await rpc('pg_gram_gardien_liste', {})) || []; G.modN = L.length; G.modL = L; render(); } catch (e) { /* rien */ } }
    async function openMod() {
      let m = box.querySelector('.pgg-mod'); if (!m) { m = document.createElement('div'); m.className = 'pgg-mod'; m.setAttribute('role', 'dialog'); box.appendChild(m); m.addEventListener('click', onMod); }
      m.innerHTML = '<div class="pgg-modh"><h2>🛡️ Gardien de PegaGram</h2><button class="pgg-vx" data-m="x" aria-label="Fermer">✕</button></div><div class="pgg-skel"></div>';
      requestAnimationFrame(() => m.classList.add('on'));
      let L = [], men = [];
      try { L = (await rpc('pg_gram_gardien_liste', {})) || []; men = (await rpc('pg_gram_gardien_menage', {})) || []; } catch (e) { toast('Modération indisponible pour l\'instant.'); }
      G.modL = L; G.modN = L.length; G.menage = men.map((r) => r.r_path);
      m.innerHTML = nbsp(`<div class="pgg-modh"><h2>🛡️ Gardien de PegaGram</h2><button class="pgg-vx" data-m="x" aria-label="Fermer">✕</button></div>
        <section class="pgg-modsec"><h3>Photos signalées (${L.length})</h3><p>${L.length ? T('« Garder » : elle revient pour tout le monde. « Retirer » : elle disparaît pour de bon (ses fichiers sont effacés).') : T('Rien à vérifier : tout va bien !')}</p>
        ${L.map((r) => `<div class="pgg-modr" data-id="${r.r_id}"><img alt="" data-src="${esc(r.r_m || '')}"><div class="tx"><b>${esc(r.r_auteur || '')}</b> · ${esc(r.r_salle || '')}<small>${r.r_signaux} signalement${r.r_signaux > 1 ? 's' : ''} : ${esc((r.r_motifs || []).map((k) => GRAM_MOTIF[k] || k).join(', '))}${r.r_state === 'masquee' ? ' · cachée pour tous' : ''}</small>${r.r_legende ? `<small>« ${esc(r.r_legende)} »</small>` : ''}</div><div class="bt"><button class="k" data-m="garder" data-id="${r.r_id}">Garder</button><button class="r" data-m="retirer" data-id="${r.r_id}">Retirer</button></div></div>`).join('')}</section>
        <section class="pgg-modsec"><h3>Ménage des fichiers</h3><p>${men.length ? T(men.length + ' fichier' + (men.length > 1 ? 's' : '') + ' de photos retirées prennent encore de la place sur le serveur.') : T('Aucun fichier inutile sur le serveur.')}</p>${men.length ? '<button class="pgh-cta glass" data-m="menage">Effacer ces fichiers</button>' : ''}</section>
        <section class="pgg-modsec"><h3>Annonce pour tous</h3><p>${T('Un concours, une nouveauté ? Elle s\'affiche en haut de PegaGram, signée « Concours Pégase » ou « Papi Auguste ». Texte seulement (200 caractères).')}</p>
        <textarea class="pgg-ta" maxlength="200" data-h2="anntxt" placeholder="Concours de la semaine : le plus bel oiseau du lac !"></textarea>
        <div class="pgg-sel"><button class="pgg-room on" data-m="pnj" data-p="concours">🏆 Concours Pégase</button><button class="pgg-room" data-m="pnj" data-p="maire">👴 Papi Auguste</button></div>
        <button class="pgh-cta gold" data-m="annonce">Publier l'annonce</button></section>`);
      m.querySelectorAll('img[data-src]').forEach(load);
    }
    async function onMod(e) {
      const b = e.target.closest('[data-m]'); if (!b) return; const m = box.querySelector('.pgg-mod'); const a = b.dataset.m;
      if (a === 'x') { m.classList.remove('on'); later(() => m.remove(), 220); return; }
      if (a === 'pnj') { m.querySelectorAll('[data-m="pnj"]').forEach((x) => x.classList.toggle('on', x === b)); return; }
      try {
        if (a === 'garder' || a === 'retirer') {
          const r = first(await rpc('pg_gram_gardien_decider', { p_post: +b.dataset.id, p_action: a }));
          if (r && r.effacer && PG.photoDelete) await PG.photoDelete(r.effacer).catch(() => {});
          toast(a === 'garder' ? 'Photo gardée : elle revient.' : 'Photo retirée pour tout le monde.'); openMod(); loadFil();
        } else if (a === 'menage') {
          if (PG.photoDelete) await PG.photoDelete(G.menage || []); toast('Ménage fait !'); openMod();
        } else if (a === 'annonce') {
          const ta = m.querySelector('[data-h2="anntxt"]'); const t = ta.value.trim(); if (!t) { toast('Écris d\'abord ton annonce.'); return; }
          const pnj = (m.querySelector('[data-m="pnj"].on') || {}).dataset ? m.querySelector('[data-m="pnj"].on').dataset.p : 'concours';
          await rpc('pg_gram_gardien_annonce', { p_texte: t, p_room: null, p_pnj: pnj }); ta.value = ''; toast('Annonce publiée !'); loadFil();
        }
      } catch (err) { toast('Impossible : ' + String(err.message || err).replace(/^.*?: /, '')); }
    }

    // ---------- clics de l'onglet ----------
    on(pane, 'click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return; const c = b.closest('.pgg-card'); const id = c ? +c.dataset.id : 0;
      const a = b.dataset.a;
      if (a === 'rx') react(id, b.dataset.e);
      else if (a === 'voir') tap(id, () => openView(id));
      else if (a === 'mot') sheetMot(id);
      else if (a === 'menu') sheetMenu(id);
      else if (a === 'room') { G.room = b.dataset.r; store.set('jdw.pegase.gram.salle', G.room); render(true); }
      else if (a === 'plus') loadFil(true);
      else if (a === 'nouv') { G.pend = 0; $.scroll.scrollTop = $.hero.offsetHeight; loadFil(); }
      else if (a === 'retry') loadFil();
      else if (a === 'acct') { try { PG.account(); } catch (er) { /* rien */ } }
      else if (a === 'mod') openMod();
    });
    on(box, 'keydown', (e) => { if (e.key !== 'Escape') return; if (G.sheet) { closeSheet(); e.stopPropagation(); } else if (G.view != null) { closeView(); e.stopPropagation(); } else if (box.querySelector('.pgg-mod')) { const m = box.querySelector('.pgg-mod'); m.classList.remove('on'); later(() => m.remove(), 220); e.stopPropagation(); } }, true);

    // ---------- direct + relève ----------
    const atTop = () => $.scroll.scrollTop <= $.hero.offsetHeight + 60;
    if (PG && typeof PG.onGram === 'function') { try { G.off = PG.onGram(() => { G.live = true; later(() => (G.shown && atTop() ? loadFil() : quoiDeNeuf()), 300); }); } catch (e) { G.off = null; } }
    // relève de secours (le direct prévient d'habitude) : onglet ouvert 60 s (30 s sans direct) ; ailleurs, les pastilles toutes les 2 min
    // (4 min avec le direct) — lectures limitées à 300 / 10 min par pseudo, jeu et hub ensemble
    every(() => { if (G.st === 'off' || document.hidden) return; if (G.shown) { if (Date.now() - G.at > (G.off ? 60e3 : 30e3)) loadFil(); } else if (Date.now() - (G.qAt || 0) > (G.off ? 240e3 : 120e3)) quoiDeNeuf(); }, 15000);
    if (!PG || typeof PG.photo !== 'function' || has('pg_gram_fil') === false) setOff(); else later(quoiDeNeuf, 2500);

    return {
      show() { G.shown = true; if (G.st === 'off') { if (K.setTab) K.setTab('moi'); return; } if (!G.posts.length || Date.now() - G.at > 20e3) loadFil(); else { render(); seen(); } },
      hide() { G.shown = false; closeSheet(true); badge(); },
      state() { return { st: G.st, n: G.posts.length, room: G.room, news: G.news, newsR: G.newsR, vu: G.vu, vuR: G.vuR, gardien: G.gardien, view: G.view, sheet: !!G.sheet, rx: [...G.rx], mots: [...G.mots], pend: G.pend }; },
      test: { react, setMot, openView, closeView, sheetMot, sheetMenu, sheetSignal, openMod, quoiDeNeuf, loadFil, tap },
      destroy() { dead = true; if (io) io.disconnect(); if (G.off) { try { G.off(); } catch (e) { /* rien */ } } for (const t of G.taps.values()) clearTimeout(t); closeSheet(true); }
    };
  }

  // ===== CARTES POSTALES dans Messages (21 oct. 2026, session « reseau-social » ; inséré par pegagram/integrer.js, PROTOTYPE) =====
  // Un message de joueur qui porte une carte (r_data.type = « carte », image jointe r_photo = « ph/<id> » dans le Storage PRIVÉ) se montre
  // en CARTE : v2 (cartes personnalisées, cartes-perso.sql) = image recto | verso, la bulle montre le recto ; un toucher la RETOURNE
  // (verso : le message dans son écriture et son encre, l'adresse, le timbre, le coup de tampon) ; v1 (cartes à mot, cartes.sql) = la
  // photo et le mot. Image : api.pegase.photo (patch de la borne shell2-pegagram.patch) ; sans lui, une simple ligne « Carte postale ».
  function PGH_CARTES_CSS(FD, FB) {
    return `
.pgc-bub{background:none!important;box-shadow:none!important;padding:4px 2px 2px!important;max-width:none!important}
.pgc-bub small{display:block;margin-top:4px;color:rgba(255,240,220,.62)!important}
.pgc-c{position:relative;width:min(280px,68vw);aspect-ratio:3/2;perspective:1000px;cursor:pointer;margin:2px 0 6px;outline:none}
.pgh-bub.me .pgc-c{margin-left:auto}
.pgc-in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .62s cubic-bezier(.3,.75,.25,1);transform:rotate(-1.4deg)}
.pgh-bub.me .pgc-in{transform:rotate(1.4deg)}
.pgc-c.flip .pgc-in{transform:rotate(-1.4deg) rotateY(180deg)}
.pgh-bub.me .pgc-c.flip .pgc-in{transform:rotate(1.4deg) rotateY(180deg)}
.pgc-f{position:absolute;inset:0;border-radius:9px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#FBF8F0;
  box-shadow:0 8px 22px rgba(0,0,0,.42),0 1px 0 rgba(255,255,255,.5) inset}
.pgc-f.v{transform:rotateY(180deg)}
.pgc-f img{position:absolute;top:0;left:0;height:100%;width:200%;max-width:none;opacity:0;transition:opacity .35s;display:block}
.pgc-f.v img{left:-100%}
.pgc-c.v1 .pgc-f img{width:100%;object-fit:cover}
.pgc-f img.on{opacity:1}
.pgc-f .ld{position:absolute;inset:0;display:grid;place-items:center;font:600 13px ${FB};color:rgba(90,70,50,.55)}
.pgc-f img.on+.ld{display:none}
.pgc-leg{display:block;font:italic 12.5px ${FB};color:rgba(255,240,220,.72);margin:2px 4px 0}
.pgh-bub.me .pgc-leg{text-align:right}
.pgc-mot{display:block;font:700 15px ${FB};color:#fff4e0;margin:2px 4px 0}
.pgc-c:focus-visible .pgc-f{outline:3px solid #fac55e;outline-offset:3px}
@media (prefers-reduced-motion:reduce){.pgc-in{transition:none}}
`;
  }
  function PGH_CARTES_MOUNT(ctx) {
    const { PG, esc, members } = ctx;
    // le nom de SALLE de l'expéditeur, comme l'en-tête du fil (smsWho : members().display), sinon son pseudo (vu par hub-09, 21 oct.)
    const nom = (p) => { try { const x = p && typeof members === 'function' ? members().find((y) => y.name === p) : null; return (x && x.display) || p; } catch (e) { return p; } };
    const can = !!(PG && typeof PG.photo === 'function');
    const est = (m) => !!(m && !m.pnj && m.ph && m.data && m.data.type === 'carte');
    function bulle(m, tm) {
      const v2 = (m.data.v | 0) >= 2, ph = String(m.ph).replace(/\/+$/, ''), src = ph + '/m.jpg';
      const leg = v2 ? (m.mine ? 'Ta carte postale' : 'Carte postale de ' + esc(nom(m.from) || '?')) + ' · touche pour la retourner' : '';
      const face = (k) => `<div class="pgc-f ${k}">${can ? `<img alt="" data-cs="${esc(src)}">` : ''}<span class="ld">${can ? '📮 La carte arrive…' : '📮 Carte postale'}</span></div>`;
      return `<div class="pgh-bub ${m.mine ? 'me' : 'th'} pgc-bub"><div class="pgc-c${v2 ? '' : ' v1'}" ${v2 ? 'tabindex="0" role="button" aria-label="Retourner la carte"' : ''}><div class="pgc-in">${face('r')}${v2 ? face('v') : ''}</div></div>` +
        (v2 ? `<span class="pgc-leg">${leg}</span>` : m.b ? `<span class="pgc-mot">${esc(m.b)}</span>` : '') + `<small>${tm}</small></div>`;
    }
    const cache = new Map();
    function photo(p) { if (!cache.has(p)) { const pr = PG.photo(p); cache.set(p, pr); pr.catch(() => cache.delete(p)); } return cache.get(p); }
    function hook(L) {
      if (!can) return;
      L.querySelectorAll('img[data-cs]').forEach((im) => {
        photo(im.dataset.cs).then((u) => { if (!u) return; im.onload = () => im.classList.add('on'); im.src = u; if (im.complete && im.naturalWidth) im.classList.add('on'); })
          .catch(() => { const ld = im.nextElementSibling; if (ld) ld.textContent = '📮 Carte postale'; });
      });
    }
    function retourner(c) { if (c && !c.classList.contains('v1')) c.classList.toggle('flip'); }
    // un toucher retourne la carte (capture : avant les autres gestes du fil) ; Entrée / Espace aussi
    const onClick = (e) => { const c = e.target.closest && e.target.closest('.pgc-c'); if (!c) return; e.stopImmediatePropagation(); retourner(c); };
    const onKey = (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const c = e.target.closest && e.target.closest('.pgc-c'); if (!c) return; e.preventDefault(); e.stopImmediatePropagation(); retourner(c); };
    let L = null;
    function attach(list) { if (L === list) return; detach(); L = list; L.addEventListener('click', onClick, true); L.addEventListener('keydown', onKey, true); }
    function detach() { if (!L) return; L.removeEventListener('click', onClick, true); L.removeEventListener('keydown', onKey, true); L = null; }
    return { est, bulle, hook: (list) => { attach(list); hook(list); }, destroy: detach };
  }

  // ---------------------------------------------------------------------------
  // LE GRAND LIVRE DES ESPÈCES (prototype du 21 oct. 2026, session « livre » — atelier ~/jdv-tools/pegase/borne/hub/livre : NON publié,
  // inséré dans une COPIE de wrap/tail.js par livre/integrer.js). Mlle Iris donne le livre dans le JEU ; chaque photo valide d'un animal
  // (net, pas caché, assez grand) remplit sa case. Ici : « Mon livre » (onglet Moi), « Les livres de mes amis » (onglet Amis : ceux qui ont
  // au moins une salle en commun avec moi), et le livre ouvert en LECTURE SEULE (double page sur grand écran, une page à la fois sur
  // téléphone ; rubans = chapitres ; photos avec coins photo et nom écrit à la main ; case vide = « ? » sans le nom de l'espèce).
  // Serveur : ~/jdv-tools/pegase/server/livre.sql (NON appliqué) → pg_livre_amis (aucun argument). Borne (livre/borne/shell2-livre.patch) :
  // api.pegase.has, api.pegase.photo(« ph/<uuid>/m.jpg ») (Storage privé ; une photo n'est demandée que quand sa page est à l'écran),
  // api.pegase.onLivre (signal du direct quand un ami remplit une case). Sans ces fonctions, ou si le serveur ne les a pas : RIEN ne
  // s'affiche (jamais de faux). Catalogue (noms, chapitres, couleurs, ordre des pages) : livre-especes/catalogue-livre.json, embarqué par
  // integrer.js ; les NOMBRES (total, chapitres, médaille) viennent du serveur. Polices : Cormorant Garamond et Caveat (SIL OFL 1.1),
  // sous-ensembles WOFF2 embarqués par integrer.js (livre/polices.py ; licences à la fin du module).
  // ---------------------------------------------------------------------------
  const LIVRE_CAT = {"version":1,"medailles":[{"id":"apprenti","nom":"Apprenti naturaliste","seuil":10},{"id":"naturaliste","nom":"Naturaliste","seuil":25},{"id":"grand","nom":"Grand naturaliste","seuil":45},{"id":"gardien","nom":"Gardien de l'île","seuil":0}],"chapitres":[{"id":"oiseaux","titre":"Les oiseaux","onglet":"Oiseaux","sousTitre":"des jardins, des bois et du lac","icone":"oiseau","couleur":"#7A9A5A","bientotTexte":"","sections":[{"id":"jardins","titre":"Villages, bois et champs","especes":[{"id":"moineau","nom":"Moineau domestique","rarete":"Commun"},{"id":"pigeon","nom":"Pigeon biset","rarete":"Commun"},{"id":"pie","nom":"Pie bavarde","rarete":"Commun"},{"id":"mesange","nom":"Mésange charbonnière","rarete":"Commun"},{"id":"geai","nom":"Geai des chênes","rarete":"Commun"},{"id":"corneille","nom":"Corneille mantelée","rarete":"Commun"},{"id":"choucas","nom":"Choucas des tours","rarete":"PeuCommun"},{"id":"martinet","nom":"Martinet noir","rarete":"PeuCommun"},{"id":"pic_epeiche","nom":"Pic épeiche","rarete":"PeuCommun"},{"id":"faisan","nom":"Faisan de Colchide","rarete":"PeuCommun"},{"id":"perdrix","nom":"Perdrix grise","rarete":"PeuCommun"},{"id":"rossignol","nom":"Rossignol philomèle","rarete":"PeuCommun"},{"id":"grand_corbeau","nom":"Grand corbeau","rarete":"PeuCommun"},{"id":"rouge_gorge","nom":"Merle d'Amérique","rarete":"PeuCommun"},{"id":"chardonneret","nom":"Chardonneret jaune","rarete":"PeuCommun"},{"id":"bouvreuil","nom":"Bouvreuil pivoine","rarete":"Rare"},{"id":"cardinal","nom":"Cardinal rouge","rarete":"Rare"},{"id":"caille","nom":"Caille des blés","rarete":"Rare"},{"id":"coucou","nom":"Coucou gris","rarete":"Rare"},{"id":"grand_tetras","nom":"Grand tétras","rarete":"TresRare"}],"bientot":[]},{"id":"rapaces","titre":"Rapaces et oiseaux de nuit","especes":[{"id":"milan_noir","nom":"Milan noir","rarete":"PeuCommun"},{"id":"chouette_hulotte","nom":"Chouette hulotte","rarete":"PeuCommun"},{"id":"autour","nom":"Autour des palombes","rarete":"Rare"},{"id":"hibou","nom":"Grand-duc d'Europe","rarete":"Rare"},{"id":"faucon","nom":"Faucon pèlerin","rarete":"Rare"},{"id":"pygargue","nom":"Pygargue à queue blanche","rarete":"TresRare"}],"bientot":[]},{"id":"eau","titre":"Au bord de l'eau","especes":[{"id":"canard","nom":"Canard colvert","rarete":"Commun"},{"id":"goeland","nom":"Goéland argenté","rarete":"Commun"},{"id":"bergeronnette","nom":"Bergeronnette grise","rarete":"PeuCommun"},{"id":"cane_domestique","nom":"Cane domestique","rarete":"PeuCommun"},{"id":"caneton","nom":"Canetons","rarete":"PeuCommun"},{"id":"cormoran","nom":"Grand cormoran","rarete":"PeuCommun"},{"id":"oie_rieuse","nom":"Oies rieuses (vol en V)","rarete":"PeuCommun"},{"id":"cygne","nom":"Cygne tuberculé","rarete":"Rare"},{"id":"mandarin","nom":"Canard mandarin","rarete":"Rare"}],"bientot":[]},{"id":"nids","titre":"Les nids","especes":[{"id":"oeuf_cane","nom":"Nid de cane colvert (œufs)","rarete":"Rare"},{"id":"oeuf_faisan","nom":"Nid de faisane (œufs)","rarete":"Rare"},{"id":"oeuf_caille","nom":"Nid de caille (œufs tachetés)","rarete":"Rare"}],"bientot":[]}]},{"id":"ferme","titre":"La ferme et le village","onglet":"Ferme","sousTitre":"nos voisins de tous les jours","icone":"poule","couleur":"#C9925A","bientotTexte":"","sections":[{"id":"ferme","titre":"","especes":[{"id":"chat","nom":"Le chat des toits","rarete":"Commun"},{"id":"poule","nom":"Poule","rarete":"Commun"},{"id":"coq","nom":"Coq","rarete":"Commun"},{"id":"poussin","nom":"Poussins","rarete":"PeuCommun"},{"id":"cheval","nom":"Cheval","rarete":"Commun"},{"id":"vache","nom":"Vache","rarete":"Commun"},{"id":"highland","nom":"Vache Highland","rarete":"PeuCommun"},{"id":"chevre","nom":"Chèvre","rarete":"Commun"},{"id":"cochon","nom":"Cochon","rarete":"Commun"},{"id":"mouton","nom":"Mouton","rarete":"Commun"}],"bientot":[]}]},{"id":"sauvages","titre":"Les animaux sauvages","onglet":"Sauvages","sousTitre":"des prés, des forêts et de la montagne","icone":"cerf","couleur":"#A27A4A","bientotTexte":"","sections":[{"id":"sauvages","titre":"","especes":[{"id":"lapin","nom":"Lapin de garenne","rarete":"Commun"},{"id":"biche","nom":"La biche","rarete":"PeuCommun"},{"id":"cerf","nom":"Le cerf","rarete":"PeuCommun"},{"id":"sanglier","nom":"Sanglier","rarete":"Rare"},{"id":"bouquetin","nom":"Bouquetin","rarete":"Rare"},{"id":"loup","nom":"Loup","rarete":"TresRare"},{"id":"ours","nom":"Ours brun","rarete":"TresRare"}],"bientot":[{"id":"chauve_souris","nom":"Chauve-souris"}]}]},{"id":"reptiles","titre":"Reptiles et amphibiens","onglet":"Reptiles","sousTitre":"au soleil et dans l'herbe humide","icone":"lezard","couleur":"#4F8A8A","bientotTexte":"","sections":[{"id":"reptiles","titre":"","especes":[{"id":"lezard","nom":"Lézard vert","rarete":"PeuCommun"},{"id":"tortue","nom":"Tortue (tortue-boîte)","rarete":"Rare"},{"id":"salamandre","nom":"Salamandre tachetée","rarete":"Rare"}],"bientot":[]}]},{"id":"petites_betes","titre":"Les petites bêtes","onglet":"Petites bêtes","sousTitre":"sous la terre et dans les fleurs","icone":"papillon","couleur":"#B06A8A","bientotTexte":"Libellules, scarabées, sauterelles… arrivent bientôt dans ce livre.","sections":[{"id":"papillons","titre":"Les papillons","especes":[{"id":"petite_tortue","nom":"Petite tortue","rarete":"Commun"},{"id":"paon_du_jour","nom":"Paon-du-jour","rarete":"Commun"},{"id":"machaon","nom":"Machaon","rarete":"PeuCommun"},{"id":"porte_queue_maack","nom":"Porte-queue de Maack","rarete":"PeuCommun"},{"id":"mormon","nom":"Mormon écarlate","rarete":"Rare"},{"id":"morpho","nom":"Morpho bleu","rarete":"Rare"},{"id":"thecla","nom":"Thécla couronné","rarete":"Rare"},{"id":"uranie","nom":"Uranie de Madagascar","rarete":"TresRare"},{"id":"morphotenaris","nom":"Morphotenaris","rarete":"TresRare"},{"id":"ornithoptere","nom":"Ornithoptère de la reine Alexandra","rarete":"TresRare"}],"bientot":[]},{"id":"herbe","titre":"Dans l'herbe et les fleurs","especes":[{"id":"coccinelle","nom":"Coccinelle à sept points","rarete":"Commun"},{"id":"escargot","nom":"Escargot","rarete":"PeuCommun"}],"bientot":[]},{"id":"petites_betes","titre":"Sous la terre","especes":[{"id":"ver_de_terre","nom":"Ver de terre","rarete":"Commun"}],"bientot":[]}]},{"id":"poissons","titre":"Les poissons","onglet":"Poissons","sousTitre":"de la fontaine, de la rivière et du lac","icone":"poisson","couleur":"#3F6F9A","bientotTexte":"Les autres poissons se photographient sous l'eau : bientôt, quand tu sauras nager. Et après, la mer !","sections":[{"id":"poissons","titre":"","especes":[{"id":"poisson_rouge","nom":"Poisson rouge","rarete":"Commun"},{"id":"truite","nom":"Truite fario","rarete":"PeuCommun"},{"id":"perche","nom":"Perche","rarete":"Commun"},{"id":"carpe","nom":"Carpe commune","rarete":"Commun"},{"id":"koi","nom":"Carpe koï","rarete":"PeuCommun"},{"id":"brochet","nom":"Brochet","rarete":"PeuCommun"},{"id":"doree","nom":"La Dorée","rarete":"Legendaire"}],"bientot":[{"id":"roi_du_lac","nom":"Le roi du lac (arapaïma géant)"}]}]},{"id":"champignons","titre":"Les champignons","onglet":"Champignons","sousTitre":"au pied des arbres, dans les bois","icone":"champignon","couleur":"#A0583C","bientotTexte":"","sections":[{"id":"champignons","titre":"","especes":[{"id":"cepe","nom":"Cèpe de Bordeaux","rarete":"PeuCommun"},{"id":"amanite","nom":"Amanite tue-mouches","rarete":"Rare"},{"id":"coulemelle","nom":"Coulemelle","rarete":"PeuCommun"},{"id":"pied_bleu","nom":"Pied bleu","rarete":"PeuCommun"},{"id":"lactaire","nom":"Lactaire délicieux","rarete":"Commun"},{"id":"armillaire","nom":"Armillaire couleur de miel","rarete":"Commun"}],"bientot":[]}]},{"id":"legendes","titre":"Les légendes","onglet":"Légendes","sousTitre":"on dit qu'ils vivent sur l'île…","icone":"etoile","couleur":"#8A6AB0","bientotTexte":"","sections":[{"id":"legendes","titre":"","especes":[{"id":"licorne","nom":"La licorne","rarete":"Legendaire"},{"id":"pegase","nom":"Pégase","rarete":"Legendaire"}],"bientot":[]}]}]};
  const LIVRE_LEG = new Set(((LIVRE_CAT.chapitres || []).find((c) => c.id === 'legendes') || { sections: [] }).sections.flatMap((x) => (x.especes || []).map((e) => e.id || e)));   // 23 oct. : les légendes (cases vides floues)
  const LIVRE_FONTS = "@font-face{font-family:PgLivreT;src:url(data:font/woff2;base64,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) format('woff2');font-weight:100 900;font-style:normal;font-display:swap}\n@font-face{font-family:PgLivreI;src:url(data:font/woff2;base64,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) format('woff2');font-weight:100 900;font-style:italic;font-display:swap}\n@font-face{font-family:PgLivreM;src:url(data:font/woff2;base64,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) format('woff2');font-weight:100 900;font-style:normal;font-display:swap}\n";
  // dessins du jeu (livre-especes : médailles, icônes des chapitres, couverture, tampon du musée, ornement, silhouettes), WEBP réduits par
  // livre/images.py, embarqués par integrer.js ; absents = repli sur les dessins ci-dessous (CSS, émojis)
  const LIVRE_IMG = {"med":{"apprenti":"data:image/webp;base64,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","naturaliste":"data:image/webp;base64,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","grand":"data:image/webp;base64,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","gardien":"data:image/webp;base64,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"},"ico":{"oiseau":"data:image/webp;base64,UklGRoYDAABXRUJQVlA4THkDAAAvP8APENXQliRbta38/1fXw5Yz57zIa+My7hm4XF0Xh8lp3Ad3RIQEBgAItkln27Zt27Zt27Zt27Zt27Z3s5wAvZwGABwIIL799gPgK+6NKF1ZsV6UtOHAgnCiCcUbI1gkAbdaSdDiSi8fwM7yQhuGoCvWCoGEL7e2gQAC+AtgoHYzj4xqpRB09NiZ7bOdae4RVKwTASajzvbVv5hZcLVsACdifbRvmImWapEAQRjwK9s3Mql7kQohxpPbA6hV1QJREsZcun3zNutIa8GSvqIq3R7LDzLAU0wqBZac2+nhDOyIGRGC/qN2toe2OaOLll+3ZpSEFRd2enD/cl9bU0sQUNjO9uA2+7eqmlAh+FmwgXj4YSqjND5KwuZ9Z3t8Gj/tYVESLJ8eTk8Eav6hohpVEszEcWen5/Dzg2ElKMnm0c72pLe+HhV6zrad7cltvsKhGBHACXe++GhPb/8L55AAXjgCdHrBNteQ3ySidkjo89PpFdOMgXxVVOkUlG95cXvJw+SodDFKEmhfoU4wVcy95faaaVy0L0mQov8N49zz13YDOg4gvUCbP89V50ofkvm2b5g9Lc0lxIpzIaiwxQUvQkmnZFNEMdkkE/Yr8XQDtHse2QGchv+DGil8dc5p/4uArokCfu86u/fekjDlwz0l/RSE0PioEjz0u6cAfEM1QdIW3Hx2j0sz9mnEnNibeuewNg/wKTS5hOrv3YM6+Y+ZSrNDkHDrHJT+S6UFIOXG7hzQhxkEI2IFyL5qru3sm6TNBowqrQARr0xCidcfdl4DNNv8JusHhZaAhS/YSDDc57eB5rlO28yhKIVWLGH6KjTxQEKOMfvoExvgr1iBrQKgRUhnAnhFlT4inkv7yPaTN1EGSdpaMkKbEWK1JZUEHSGc2N0sQ6t/7sDRqnHHNgoqnYYEOxH08cvm6m/aaCYMjogV7kAV6q/dKs4othRoPbHNE/no3mnFByS8uSlk9sElKTZwwuFg9hkHz5gmFRLFtBCcfKf80zcFvK4N4DbxGDyABExwPvk8FoggxWYKdEVFxTmFvr7V6daCEaBRl/7y0dZN41RLlig20OSCPhpo+xGmKyK0bAh984Of9tu/kU0otmApzi0cepVJ1pBDmv6PuUFYAg5ErQ9Av/z/nQQSksT8DMUO3ZNvlKokIQiX7hEppKitez7uuZfJAA==","poule":"data:image/webp;base64,UklGRpgDAABXRUJQVlA4TIwDAAAvP8APELVQciTJkST1/z+thyKdEbV7tyE2saRmm4YN9fUISQAAGEK0yrZt27Zt2+bLtm27zrb5yrZtt9MEaG6Q0p88/MiB3lIVvIyygq7qVoDLQoxTHqiHyDdiCRJkcWcPwDx08k1Yb7jx8RPX4ADOMVfdggUtPTld4QXE9nyuNzqzVndWGING46oeVSICAN5JssIvKCeQ5OtA9IWNdE67uSXwAaox5Y0BFlL5GhdNWTm/8r7lEZaeWFhUwqprS6hyAuhzXIWfBHwcUkKTLtIZT36RB5V8waY+4DlPMVNUqzQQWCiykvzolVBcFyzYWDzX4RIt1BEuD7Ce+BHuAEnW+oGu6gyo8Fidc69oauwWweE+Z8HDY4gK+MRgDPLwdIFTlGoPsWjuda77xzfdJZURZjeACxwhLpARFsTMps9lhU6o5V1bZKZz4RW1YSz3pXQ+oy1JqHJwKSvEao+QRVHWpXR+00vq/3DwOZ0reALmQTAwFvBLWUk+Md+dyx02EZBHqPT3x/Sl9HrKY7nF8gGqIbJIeromSfd1HUK0h9ibioBf99inkD+OGu4G0aAaIgtKyrMGrNAhj1GJnHA/hEdgGmXUOUmP4D0k8hgZAl5njWAcmmEl/AB9XIdjFFSDLOj4l3VYOoRpD1KJqB6wQvgM6H9PH8Z9yFKNAjY0fMwaQJs8Sluk5umwFRJVw8rUHAcIh0iOAxYYj7OOWuHlZ2uYi94BT3iohmmLyMNWmIRBHldCgsP0IR1u8X+AShMCg9KadUQvrkmQPUMJeQ66D1ihUbam9GYgT4/qp7D/U6U5QYXj9+5LnV69ku8EqjSr7yRz252ke62cZY8FUm1PU/rJ2ZlTzptlPjJDO+LQgWhiG3pGsgJoblhnnlKMOaRiw7AfoMmBhQ2HSUICbDBJdLEArYDLc8nCmgtwjj5AIu3CYOGlrdldm48vmICpbEHBFL8gLuDZVCIq+GhLKlEcjAVWtT0Z0tzRZZ/BdvEJZk0PrB//MQWVgCX9S1PCb2opo4ZM5KYSsGjjDimQe9l3VBlNwhXvacHAM9kQ8yIEPECnFh38x/8L33hJEGTyRCU0OOWedRrwRO5ryX/TJn0liApMayIbIgYSjll+Z//7Z8SEBkqgWxKYNa0tMkINQxxgBS+WhGMMHbAkuUoTlzDkkkRtClhHVqe2Zrcwx0WWSSVm30u3a+mu2y1JLv3xAw==","cerf":"data:image/webp;base64,UklGRr4DAABXRUJQVlA4TLIDAAAvP8APELXQjiTJkVyt/kr7x9GdViBBCv3Iwo4YpkAbHSEBAACybYLZtm3btm3btm3btm3etm2bwTIBuT6wMnZleJyYUkMRYsdpqAo1cdK/ZyhcCtVQTI2TRKkp7gGNg4I2JVne8hunQkGsVGcRAgIeJYVsyTPTYkYKEpnbC2PIa5hUosKhPeY5UzVGqlCb//4VTc6EPLohAgpjl5zWhTv4kP+ikBohoIh214v/Bdn4o5LsIKlwddTt76slXKOkgkmKT1DvzaIAjhIkweNZt+Tchln5Aney/1JL1hgr+Jzt3e27cjRZNUAVUiM9u2e3RYrJul7VU1bY+j93d+/ZPstCkWuvlWStekwhs9az753dVhjUdSq5oQQnWQ+tounX3ojuCXuZvfsH39yuEdIyzNv+q51NAlp1zxnVPfvBn/784wvrnM8GrFOcd333hz4iFyBZa61biHvdu3d/NKdduTBmzLlRyRVB4fnSL/A5X7o9lUUGee7eDPbs3q0GlKtXcLrRsL67Z7ePNjSp0KqBo8a9d+/2nXLA57nWWlc4w6F3P7jhfe/su7OdQl2Va98iesMe6t7z5eXlZe/7FGXl6kgjq6GPefRunykc48OzzTZ+Vq5/i4h+eZ69/2GZdYAVkj4gdu9ngPc3ZFUHqJyWe3bvJ+3tJ4OsHHFFKmJOSD95tvqqC3AQ1v616xxdavjcTxCS8yiffGkjoelbd8/HtP/Ms45C9msrWez+8cZlSD9ytoN3YB2FjX9TQBS0LHQsNfjU+77tP9esHBMcYe0n3Sj+TSz56e4Du93GFOBBVn5N93CEn6s/gSBcHt8zN6xN3ioHreD2wQHKMHMKQwqphZ7du3u2lJxHSc4vVlaoO4U5ZyT37N2ueNN+0co6zIouO2eouvotZz751rB2gYiZdh/LBajDnJHtNMpQ9YhkVtA4g9g+fIietvnxQCuC3MIcuj4xygKW7m79KRX9K5UDcT3JhQWEd4HPCyC+obwSKW24DnRGIIx58HipNuvMt/aD9gWIsFaR8zgrNCAfLwBS+76RCpL8aR9eE74t8EgVom0LeQkwTT5nGL+4/z35BGUZ0HESjDoMY87dFYr+OUZVEeAXlWMlyJKqSuXVHzPrFlEQqseqyv0VIm96LsAtyhB0j/XIFbIwHSmkVuHjMGqDwPqs3wnnAg/Cr3/WGVZbd2qIChV/LCGpUID4QesCrDGweuMe2hQqjR6KHwWLZ80tKwsDigyKTLW30lMZGtVKkhpo/DoE","lezard":"data:image/webp;base64,UklGRrQCAABXRUJQVlA4TKcCAAAvP8APEDVIchtJkqT4/6eJ3CKREX3rWcwiZNG2ZUhSvIzKtm3btm3bNse2bdu2bePLtu2ZzIinsG3bJilQQ927N+QXwAnoTwBgZ94IkrZXgEE4mmaZdLA5gzynHJBJ6RS7AMgg9EzwyiWNjAfZB5rwsoXsuanCqGwD4BQSHYO4E/oKuAGUAJIsr5RCpoOwvjliAH9qk9EULaHJukJEKbb5B+uTM+Zrl8KdHjWKSZdQAlhWqBJs8QW29ccnt5yw0yqLLDBOq3zRXKgOkqwUgkzxEE6d5Jf3ThothvZSETa6nfEflkxKEgxe7rdrhrE7Z3ZVc02oS7fem2eEFwtsPTeK6bVDsy47F212TEBvwC2l62DAbZL1x9vOAIwFjBaeTkDROATJnTqGQ5cFDwLWiUrwDoNe+HNGU+itFnRNITAIZfUO+IhDF7ia85IBa+2Sfm7DzxCEqmWw9d8ODoPQdwBic1hIclIZ+hk2Ykl47ZVMPHvA0GpY7A3ihlD/KglAoT+YCbcbCQyC6vT+BTYlO8P1o2zkwVoqkMF9CSLYKVgcvhRymfMgKMiHFFbWOuc3dNMotpcChEFo6ecp7Dz4D11j9620ABFCHdZkgyRa4HmjsLZrVgUekoFOQmeFs2H4KVG2UeEn8rk6gDiIuokldZKCv7fQN9cNI345N8wYE6bbqxXj9yyPHVzAICbh9cpe1eDrezCdSRaePgxzRi3lc2PwMEODvYYzQz+R13Pg+G3HkTEnrissKY1BqLNa+7Jo9h/vJY0ZhHgfEpqApa8rTTcgXv+8NJs1yKMnIItfJiuhO8qlct73NKPRB3oj6DoH+74Xwv2EHlihlubG7wUL93yCnuulvtG42yrDTfONEzMI2GashQ0iQhOR1t7fWVDCPnW/xK6Sv00eAA==","papillon":"data:image/webp;base64,UklGRgoFAABXRUJQVlA4TP4EAAAvP8APEJemoG0jJ/xJ34+OgzD/808gaYu/7Yrctm2Q22b7DNgMsA1Q+rpl6YDAbwCf41EMAhcXlLkfZwQ4KNzwBCX/TY+WhJIX98KfxWD5DQC0Jdk2bVut97HW3vvYtm3btq9t27Zt27Z1jLVH7+2X1lxjzH39GNH/CcB/Qa1Uq5Wg8meSUKlWK0EKBA1V/iyiyBy07awLTt04HID+KUSBLguOO++CU5dUIVBM+Zz1Pz6wpgKVtlNg2IVvHyXJeK0IqjiDx1prrU62PjIZkLZStDv5G5KxVqvx1/aQKs71Gkl6JH86UaFtIopxT5BmTtL9j06QgDWtXkd6JG/pBW0DEWz8hmYsNL5YAQRd36UXkG58eSy0NIWedYSRDY0nQgHBrYwNSOOnsxFKUrRcQxobOg/Oqgs4lZZA4/crEApUiqRA0OUOujPlyz4QQLH6GD2Bxl+WIdR1bSrq3QxA0PF+GlONTzcDgGDC3jQaf1iIAMGwHhAAOqY9IGh3K43JkTdCCnp9kUHjV1Ohgv4jCtqPVIhUrqEx3XgGQkH7F2hpjHxvGBQdJigA9BoIUZxP8wz3bVDUhwezGPlcd4iM71w3uAsUu2vuTHceWV6kuDGPkbc1KQYPg6B5ZEWxZC+dWftnNrqOMcuNZ0I6Tw1A36HA8E9ozNs7odGVJdB9/zLojJ7ApJ7S/lEaS/htFKQu4LwyaHy3H0ZOROd5VZxGYxnfDmh0Eq0ERl4r3Rbp8GmY/qt7KZ/0KFKsafUy3I6swlJMGtLuWRpLND7ZhEJB/69oJdD4Tpf1p53V5SQayzkboQCidzKWQeMpF/Lj+V/Sy3AemAktCljX6uX4B1fby9fTWabxmSZB444vMpZBxgM8dthZpse4GdpIsOwQo5dRulvkIy0ijSA4YT/pXoKTXoKRfGkIBKmC+Q/8xj9v/OisHhCkC2TC1mfof4qfL1nRBxDkqmLz1/7nOHZfbwRBdsDWSOef9MXukqeY/D0j/6SR16lKhqD/GzTmO0n3PLd4MjRNpP1DNJbuWXQ/sAqSpDiekdnutVcOk19+R8+i8cPekLSLyjDesOqw8961++hZ7t8PzpAN5lnGZztO2u+8CbsOm+cYX2hJE1xGyzF+MRK9PqIfL7iEluP8bjQ0QTD7N3qGW+t2hPCA75sD7foKPYPG25skQXE1jZnGR5o04Hx+3hsByw+7Zzj3DYc0Ekx/nZ7m3D8XKpi79+aKQMPdtDTnoYvbI1Uw7Ct6kvGeIAAwvz8EinkHmG68FOkiXT6gJXltJbSuWKpP0JIiT0IlSbH8MJOd73eD1KnUBZyQ4w9XIWlbmB55PRSpgol76SnGF9uniXS+wT3F4yaEjPav0BKcXy6EIFkw4g96I+f3QyBJUFzFmBB5NRTpim3HLMH80QoyFWtq7gn+fEeRJJGeb5I0r3Nr5ZkIGYL+31g0rzMn4x6EJMXlPPL7YdJJJ/nNSGgGRK4kSWf9H3v53WhogmJVfGzZqIWX/Ux3fvPqk4shyELXq1576xidfGrrxImn7X2yWaWBYtCXtzQDwOyvjI8P7tAEQamdOuw8GP3KJgBY8Os50AaCu55vQRCtYCc/GwpAUaYIgAv4cicE0Qo2/DgNWqCY//lEKADRltMXQEVQsqi0P2M2FIAE3HR/ECnavQOKxoK2FtSL9L6iDwqAAEGxqKJtRQWJAY0Ff0XB/4Q=","poisson":"data:image/webp;base64,UklGRqIDAABXRUJQVlA4TJYDAAAvP8APELVQkiTJkeT0/z9th2ZV2R/wXcAR4AnWvjQQERIAACDbpnZn27Zt27Zt27Zt29Zt27aNaAJ0NBjQeum2XrjblhCBar+GLQkiLrAzhp/6NSQM8aSUFj5xjh/swvgSLcTp5jXIzW+cwUG9HGghz6MkwECpqbACbjn/TtBvqcnNKb5jpF7Hklqo8xekcn/CLZTUy6hlw8IsCGAerdCwjn+XW6Sk8thwC3Z5iRZWrGGohsTBPJHZeAjsEm/9Et5gJkz5nWd3GAPjFSyI7OzwEHHKUs8AhzdIdC+B6M/Z4RRnAvxMKiTp3ee1cAJIJkfO8AJfqU+zMOBHJjMHJAGiBwHZp8HHy0wOngm3/pJ8Tgs5vh6X7PxNHnj5JLJTObESat7tEyzYuHNOgGvIUJ/QQp9fmVMy8xEb9XFvERWgnFzhJoLqw1q0BPCs7DAKoUEfZP3OaoBOmwL4S30YTFzLnJYKh1Dax7QQ5+MKqY2/wPqQtzDk3xITnmMn+xh8M1lxwncSpT7gR5EagCVSGaohy0eQtkpmwjBU+ylwIiy1SGaHKrefwz2zSqb4R4D6mRaSvMyskskHpNV37CsL4p8gQMtkh6l3+6pbN61/OLnSFAAJasmWYEfBN75yYqXM8IdouSX0qOUq77C8oCwLGudSs04m/CVSgkQ1v5JwDbxs/cLZAGblCT+xhoWJZH8OS2BtX1Df2azwir8LZcIDTqdmwnc01bLEfFhAjyeZdTJJZWrIEmhJFsEUQ0GIj0tlKqnQA95XN+Hj4dRKSSrswyzrpsG0KAgwYM3MrFLhDpJq3QdtGOncuQk0S1T4hJHA6FELHDaUs8x5nvPhZ5BUnTY7m1C1Hrek79DhR/wja3zL2VMJ70l3+wmpW9ff0aKAC3NvDphKeEsjcheUdaRtg5EEmTaQuZWpSTLXVQW4J/lEI3IXlKzDwWL5lRY6uXRn8zUJUOVhHlGLrASmdXQLK37m/oTjqBD25l9SfOfLd95wh9OsMkQTufghIHXreLAiMQB7A9/YYVCCijXhxOGBBgrIIAILNAgX1HW3zmwROJO7OxSD/lEPu8G2dW4LJ/5nrmYy+/8Lqt3vd3f7Wgu2MObXjUlmeI+UWotbKPP1avITH3boeFvroXRV+UwCZ8JZBNQvsrPJMXZ/ISTrBVDky+zw53ddW+u30ONvwjWcJDdY6wUtJD7xgmo4Zb0wJMhS67VtvbStxQE=","etoile":"data:image/webp;base64,UklGRugCAABXRUJQVlA4TNsCAAAvP8APEHVQciNJkiT9/9WSS6SHL909c1RzC3WLkAPZtmlbtfFs27btFzOzmdrMbNvIbNuMbNvv+++zGbhtpKjLmzm+WfiC/nUBAPzL60If+7VVkChiTGu7YOeI38gJsLLEDWoiBFqnEt1QswEGLExo8xsGUjisKywyofw7pnGhMbycOmDMK5ICrCrxgPLfznXGQDF0FcsFWGdt25VYCrTM+qtjKt/NZdaXzDwgKsCKEvcPv4Q04QIvIMFYSyyCYoE1RgkD/QkFwXw+tij6lr8FhXMEiABW2eBMFwJcQ1uZuUEAeLkdV1XE/UusdN37Fv7fslU897daIHDdmsKOUKKLEY744EkkGWTRTgtnMNVSlWjZhwwiAx8cMUqEEvY7WxCh5FBIJ+3Ms8YuL8lf/kGHw1Emuw/zm04KySEU9PO6MeSo+Yj8h5xzMutOlXnOifbtcLR/PkAINhrM34REfcJ4Vp8QkTINT8MZgBLpNsQTQ9ikS9We3XDnA5rzlN64624wAQtDjqH8m6Vjjrey40dHhtlZ1XSdLjew4KAWCplhEqZWnV4ElEiecPqwt1S9fge6nH7C+UcGEbAwZG8spmMPDmEgIcX4CAw/OTyAWLBS3h/DWRPGH2CJ/F6YflSl8QAGkN2vJ+YM38lmbzN8pqQSivxw599b3o8mNFJ4jZiUcoYo6fff45ghAIj1kWyDANMJ//MezCUwn1rUHZhKPjVm6LLzBkwhjV4+SIJFhHFnSDTBPJI2I+h97wQ5OuxsgkkkwlwSrO8QYwknDj+dDTCBXHtpQfbHSwElRCmFOmF+wATyvUV2cVZriLCEA2tQ8/8KxgkkDUMufDfzSoAEO+n8gibkAkYJf2yWsGr0NjsxYQrqPQpSFIV5Jw7WrqE5LBHFIxTmjAkgdkwvGp/e7hERFXqh7AwtIUvocIq/RuYFS3hvdFQj5UFpcGit0j4a+/XHx3Wv36ZW6P9FEAA=","champignon":"data:image/webp;base64,UklGRsYDAABXRUJQVlA4TLoDAAAvP8APEIXkNpIkSSr9lSY6O8s9YvZ8RkiAJMm0rd19tm2b37Zt27Zt27Zt27bNZxvbDcFtG0mS6pxUYcZ9xLX7hUf8hxTyVX7dWvmVH57dKhmy5MyLCxsm1C3lZ3c8giF38TqbZa39rnnmumO2WmmeyQapy/pMfjIq0Bz3/JSNqSiSYJcq1Lmen4oy19EdGhEhFUT0zVR+PxYUZo20KxK6W4Vit3Vm+SMzFrp4BAg4KIAozTYVqT0szZWO1/7hxDt1lotHlHg/kMZxARrNJ9cYqPDMFxVc5LgajiRmdiHgBvRLhS1CvVsCCg3aopPsw26wifGiHkGMbTxtB3jKfwdzm2ALStfofNxUcV6uPzgteLugu7RNBUBH+K9TnplVV8LWpbcWR/g8glxXQU7KmXeSbPs06gdMh6sO5lpird0S8lcD+mmn9VaYoSGrNl+4KcmAt9sNN3kzZFDMkzyREsiKqEfw9qLhLf/LyZsxM+fK6Da6SUCwrw3fRRZ5x5h5qmKY3W5ap7sYdgM3/AoR6VsNKx/VHQmiLPfAXyWIKMdX5/Rl+akDlPGjIVmTR+RV3s4gvr1VuvHMPrWjvcwCKDY0a2NtLQ00wCsgzVhmJFkxA6Hli4VZlWp+Ax01SdH1EWR9++3o2HfubkAfRVkUjTYfMynw8azjMa+IZs55JuE9gHz56CqnivJ+dXwXG6Ux4sDdBAUvlNqlj6mGsK0resrtSNWi3VtjAV6KzB4ljvkINetpozMUaSG+cZQtSdWRtcPdfAAto7IyRtYFvBP4CLIi0NsJjrF5BJlg61hAgloD1PBvglf8Mjw9fgNKDB9gmGKYnFjKZ4T4gvBWZAWDupuyDCfI0jGjjJ+J71laRvbOHgbVlIxmUhI+C6sI9XGGtQyjNCOVQkCqZhWNJM9wMSeHBUkZgEkVnWXP8Ijnh5DXtiO0szijoj8znGCb4O5uxj0eDb5eTMMJXp5kfBXRYOnADPOjcbB2OOOzkPrmWjCCNi6Ko6zIuM+9btRfAcL2vTUzYz/Liqr+QAf8US1jgEKEaAk9733E814W20E/RWU0kBicmwYzXivpsdii6FIL6XSR7xyPjGjfvoJuUUr0Pztb4amfHV7LxvAXiHRPrNGVf8luVoa4K++eKPbBCoEj52QqWEerPJSMiLQENy3SnC/DgTBeejklBVGG68aKZjz75+HsY8hLfbNcd8lktbmRo9P9yGCvmd32asPt0jCbXGo4c7w1kMNLY8EiCJwGyK2ueDsW2taq/iPKIwA="},"couv":"data:image/webp;base64,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","tampon":"data:image/webp;base64,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","orn":"data:image/webp;base64,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","sil":"accueil/pegase-hub-livre-silhouettes.webp","silCols":8,"silRows":11,"silIds":{"autour":[0,0],"bergeronnette":[1,0],"biche":[2,0],"bouquetin":[3,0],"bouvreuil":[4,0],"brochet":[5,0],"caille":[6,0],"canard":[7,0],"cane_domestique":[0,1],"caneton":[1,1],"cardinal":[2,1],"carpe":[3,1],"cerf":[4,1],"chardonneret":[5,1],"chat":[6,1],"cheval":[7,1],"chevre":[0,2],"choucas":[1,2],"chouette_hulotte":[2,2],"cochon":[3,2],"coq":[4,2],"cormoran":[5,2],"corneille":[6,2],"coucou":[7,2],"cygne":[0,3],"faisan":[1,3],"faucon":[2,3],"geai":[3,3],"goeland":[4,3],"grand_corbeau":[5,3],"grand_tetras":[6,3],"hibou":[7,3],"highland":[0,4],"koi":[1,4],"lapin":[2,4],"lezard":[3,4],"licorne":[4,4],"loup":[5,4],"machaon":[6,4],"mandarin":[7,4],"martinet":[0,5],"mesange":[1,5],"milan_noir":[2,5],"moineau":[3,5],"mormon":[4,5],"morpho":[5,5],"morphotenaris":[6,5],"mouton":[7,5],"oeuf_caille":[0,6],"oeuf_cane":[1,6],"oeuf_faisan":[2,6],"oie_rieuse":[3,6],"ornithoptere":[4,6],"ours":[5,6],"paon_du_jour":[6,6],"pegase":[7,6],"perche":[0,7],"perdrix":[1,7],"petite_tortue":[2,7],"pic_epeiche":[3,7],"pie":[4,7],"pigeon":[5,7],"poisson_rouge":[6,7],"porte_queue_maack":[7,7],"poule":[0,8],"poussin":[1,8],"pygargue":[2,8],"roi_du_lac":[3,8],"rossignol":[4,8],"rouge_gorge":[5,8],"salamandre":[6,8],"sanglier":[7,8],"thecla":[0,9],"tortue":[1,9],"truite":[2,9],"uranie":[3,9],"vache":[4,9],"ver_de_terre":[5,9],"cepe":[6,9],"amanite":[7,9],"coulemelle":[0,10],"pied_bleu":[1,10],"lactaire":[2,10],"armillaire":[3,10]}};
  const LIVRE_PAPIER = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'><filter id=\'p\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/><feColorMatrix values=\'0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .3  0 0 0 .55 0\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23p)\'/></svg>")';
  const LIVRE_CUIR = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'220\' height=\'220\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/><feColorMatrix values=\'0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\'/></svg>")';
  const LIVRE_TRAIT = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'10\'><path d=\'M2 5 Q100 1 200 5 T398 5\' stroke=\'%237a5c3e\' stroke-width=\'1.3\' fill=\'none\'/><circle cx=\'200\' cy=\'5\' r=\'2.6\' fill=\'%237a5c3e\'/></svg>")';
  const LIVRE_AILES = '<svg class="emb" viewBox="0 0 200 200" aria-hidden="true"><g fill="none" stroke="#e9c06a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">' +
    '<circle cx="100" cy="100" r="86"/><path d="M96 118C84 96 64 74 34 62c10 12 16 22 20 30-10-4-18-4-26-2 12 8 20 14 28 20-8 0-14 2-20 6 14 4 26 6 36 8-6 2-10 6-14 10 14 0 28-6 38-16z"/>' +
    '<path d="M104 118c12-22 32-44 62-56-10 12-16 22-20 30 10-4 18-4 26-2-12 8-20 14-28 20 8 0 14 2 20 6-14 4-26 6-36 8 6 2 10 6 14 10-14 0-28-6-38-16z"/></g>' +
    '<path fill="#e9c06a" d="M100 40l5 11 12 1.4-9 8.2 2.6 11.8L100 66l-10.6 6.4 2.6-11.8-9-8.2 12-1.4z"/></svg>';
  const LIVRE_FLEURON = '<svg class="fleur" viewBox="0 0 120 24" aria-hidden="true"><g fill="none" stroke="#9a7a52" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M4 12h31c7 0 9-6.5 15-6.5 4.6 0 6.4 3.6 3.6 6.2"/><path d="M116 12H85c-7 0-9-6.5-15-6.5-4.6 0-6.4 3.6-3.6 6.2"/>' +
    '<path d="M35 12c7 0 9 6.5 15 6.5 4.6 0 6.4-3.6 3.6-6.2"/><path d="M85 12c-7 0-9 6.5-15 6.5-4.6 0-6.4-3.6-3.6-6.2"/></g>' +
    '<path d="M60 4.6l4.4 7.4-4.4 7.4-4.4-7.4z" fill="#9a7a52"/><circle cx="3.4" cy="12" r="1.6" fill="#9a7a52"/><circle cx="116.6" cy="12" r="1.6" fill="#9a7a52"/></svg>';
  const LIVRE_CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.2h3.2l1.7-2.4h7.2l1.7 2.4h3.2v11H3.5z"/><circle cx="12" cy="13.4" r="3.7"/></svg>';

  function PGH_LIVRE_CSS(FD, FB) {
    const u = (n) => `calc(var(--u)*${n})`, I = LIVRE_IMG || {};
    const imgs = Object.entries(I.med || {}).map(([k, v]) => `.pgl-mi.mi-${k}{background-image:url(${v})}`).concat(Object.entries(I.ico || {}).map(([k, v]) => `.pgl-ic.i-${k}{background-image:url(${v})}`)).join('\n') +
      (I.couv ? `
.pgl-couv.img{background:url(${I.couv}) center/100% 100% no-repeat}
.pgl-couv.img::before{display:none}` : '') +
      (I.tampon ? `
.pgl-tampon{background-image:url(${I.tampon})}` : '') +
      (I.orn ? `
.pgl-orn,.pgl-trait.img{background-image:url(${I.orn})}` : '') +
      (I.sil ? `
.pgl-vide .sil{background-image:url(${/^data:/.test(I.sil) ? I.sil : ROOT() + I.sil});background-size:${(I.silCols || 8) * 100}% ${(I.silRows || 8) * 100}%}` : '');
    return LIVRE_FONTS + `
.pgl-mi,.pgl-ic{display:inline-block;flex:none;vertical-align:middle;background:center/contain no-repeat}
.pgl-mi{width:22px;height:22px;margin:-3px 0}
.pgl-ic{width:18px;height:18px}
.pgh{--pglT:PgLivreT,'Cormorant Garamond',Georgia,'Times New Roman',serif;--pglI:PgLivreI,'Cormorant Garamond',Georgia,serif;--pglM:PgLivreM,Caveat,'Segoe Print','Bradley Hand',cursive}
/* ---------- couverture (petite : cartes ; grande : « Mon livre ») ---------- */
.pgl-couv{position:relative;display:block;flex:none;width:74px;height:98px;padding:0;border:0;border-radius:4px 9px 9px 4px;isolation:isolate;
  background:radial-gradient(120% 90% at 30% 18%,rgba(255,255,255,.13),transparent 55%),radial-gradient(100% 120% at 80% 100%,rgba(0,0,0,.35),transparent 60%),linear-gradient(135deg,#3b6145,#26412e 55%,#1b2e21);
  box-shadow:0 7px 14px rgba(0,0,0,.5),inset 6px 0 7px -4px rgba(0,0,0,.65),inset -1px 0 0 rgba(255,255,255,.06)}
.pgl-couv::before{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;opacity:.3;mix-blend-mode:overlay;background-image:${LIVRE_CUIR}}
.pgl-couv .cad{position:absolute;inset:6px 6px 6px 8px;border:1px solid rgba(233,192,106,.72);border-radius:3px}
.pgl-couv .cad::after{content:'';position:absolute;inset:3px;border:1px solid rgba(233,192,106,.3);border-radius:2px}
.pgl-couv .tr{position:absolute;right:-4px;top:5px;bottom:5px;width:4px;border-radius:0 3px 3px 0;background:repeating-linear-gradient(180deg,#f3e6c6 0 1px,#d9c49a 1px 2px);box-shadow:1px 0 2px rgba(0,0,0,.35)}
.pgl-couv .t{position:absolute;left:2px;right:0;top:15px;text-align:center;font:600 13.5px/1 var(--pglT);letter-spacing:.02em;
  background:linear-gradient(180deg,#fff0bd 0%,#e9c06a 48%,#a8772a 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 1px 0 rgba(0,0,0,.55))}
.pgl-couv .emb{position:absolute;left:50%;top:47px;width:30px;height:30px;margin-left:-14px;opacity:.95;filter:drop-shadow(0 1px 0 rgba(0,0,0,.5))}
.pgl-couv .sig{position:absolute;left:18px;bottom:-12px;width:8px;height:22px;background:linear-gradient(90deg,#8e1f24,#c2393e 50%,#8e1f24);clip-path:polygon(0 0,100% 0,100% 100%,50% 80%,0 100%)}
.pgl-couv .rb{position:absolute;left:30px;bottom:-10px;display:flex;gap:2px}
.pgl-couv .rb i{display:block;width:5px;height:16px;background:linear-gradient(90deg,#b8862f,#ffe7a8 50%,#b8862f);clip-path:polygon(0 0,100% 0,100% 100%,50% 80%,0 100%)}
.pgl-couv .seau{position:absolute;right:-9px;bottom:-9px;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:17px;line-height:1;
  background:radial-gradient(circle at 40% 35%,#fff3cc,#e9c06a 55%,#a8772a);box-shadow:0 3px 8px rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,248,220,.55)}
.pgl-couv .seau.gardien{background:radial-gradient(circle at 40% 35%,#fff9e0,#f2c75c 50%,#b8741c);box-shadow:0 0 0 2px rgba(255,236,170,.9),0 0 16px rgba(255,200,90,.75)}
.pgl-couv.grand{width:120px;height:158px;border-radius:5px 12px 12px 5px}
.pgl-couv.grand .cad{inset:9px 9px 9px 12px}
.pgl-couv.grand .t{left:3px;top:22px;font-size:8.6px;letter-spacing:.14em;white-space:nowrap}
.pgl-couv.grand .t b{display:block;margin-top:5px;font:600 18px/1 var(--pglT);letter-spacing:.01em}
.pgl-couv.grand .emb{top:70px;width:50px;height:50px;margin-left:-23px}
.pgl-couv.grand .sig{left:26px;width:10px;height:30px;bottom:-16px}
.pgl-couv.grand .rb{left:42px;bottom:-14px}
.pgl-couv.grand .rb i{width:6px;height:20px}
.pgl-couv.grand .seau{width:42px;height:42px;font-size:23px;right:-12px;bottom:-12px}
.pgl-couv .seau.img,.pgl-couv .seau.img.gardien{width:38px;height:38px;right:-13px;bottom:-12px;background:none;box-shadow:none;border-radius:0;filter:drop-shadow(0 3px 4px rgba(0,0,0,.55))}
.pgl-couv.grand .seau.img{width:54px;height:54px;right:-18px;bottom:-16px}
.pgl-couv .seau.img .pgl-mi{width:100%;height:100%;margin:0}
.pgl-couv.img{box-shadow:0 7px 14px rgba(0,0,0,.5),inset 4px 0 6px -3px rgba(0,0,0,.6)}
button.pgl-couv{cursor:pointer;transition:transform .2s}
button.pgl-couv:hover{transform:translateY(-2px) rotate(-1deg)}
/* ---------- médailles ---------- */
.pgl-med{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:4px 12px 4px 8px;border-radius:999px;font:800 12.5px/1.2 ${FB};letter-spacing:.01em;white-space:nowrap;
  box-shadow:0 3px 10px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.55)}
.pgl-med i{font-style:normal;font-size:16px;line-height:1}
.pgl-med .pgl-mi{width:24px;height:24px;margin:-5px 0 -5px -3px}
.pgl-med.m-rien .pgl-mi{width:20px;height:20px;margin:-4px 0}
.pgl-med.m-bronze{background:linear-gradient(#f6d4b0,#b8763f);color:#35200f}
.pgl-med.m-argent{background:linear-gradient(#f9fbfc,#aab5c0);color:#23303b}
.pgl-med.m-or{background:linear-gradient(#ffeaa8,#d9a441);color:#3b2608}
.pgl-med.m-gardien{background:linear-gradient(135deg,#fff6cf,#f2c75c 45%,#d08a28);color:#3a2106;box-shadow:0 0 0 1.5px rgba(255,240,190,.95),0 0 18px rgba(255,200,90,.55),inset 0 1px 0 rgba(255,255,255,.7)}
.pgl-med.m-rien{padding:4px 11px;background:rgba(255,236,210,.07);color:var(--soft);box-shadow:inset 0 0 0 1px rgba(255,214,140,.22);font-weight:700}
.pgl-med.m-rien i{font-size:14px}
/* ---------- « Mon livre » (onglet Moi) ---------- */
.pgl-hn{font:700 12.5px ${FB};color:#ffe2a6}
.pgl-mine{margin-top:16px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px 20px;align-items:center;padding:20px 18px 18px;
  background:radial-gradient(ellipse 70% 90% at 0% 0%,rgba(110,170,110,.16),rgba(0,0,0,0) 60%),var(--card)}
.pgl-mine h3{margin:0;font:600 23px/1.1 var(--pglT);letter-spacing:.01em;color:#f6e3b8}
.pgl-mine .pgl-cnt{margin:6px 0 9px;font:600 14px ${FB};color:#e9dcc6}
.pgl-mine .pgl-cnt b{font-size:20px;color:#fff3dc}
.pgl-next{margin:9px 0 0;font:600 12.5px/1.4 ${FB};color:var(--soft)}
.pgl-next b{color:#ffe2a6}
.pgl-nw{white-space:nowrap}
.pgl-vide0{grid-column:1 / -1;margin:0;font:600 13.5px/1.5 ${FB};color:var(--soft)}
.pgl-chs{grid-column:1 / -1;display:grid;grid-template-columns:1fr;gap:8px;padding:14px 2px 2px;box-shadow:0 -1px 0 rgba(255,214,140,.12)}
@media (min-width:700px){.pgl-chs{grid-template-columns:1fr 1fr;column-gap:26px}}
@media (min-width:980px){.pgl-mine{grid-template-columns:auto minmax(0,.85fr) minmax(0,1.15fr);column-gap:24px}
  .pgl-mine .pgl-chs{grid-column:3;grid-row:1 / span 2;grid-template-columns:1fr;align-self:center;padding:2px 0 2px 26px;box-shadow:none;border-left:1px solid rgba(255,214,140,.14)}
  .pgl-mine .pgl-vide0,.pgl-mine .pgl-mbtn{grid-column:1 / 3}}
.pgl-ch{display:grid;grid-template-columns:22px minmax(0,9.8em) 1fr auto;gap:9px;align-items:center;font:600 13px ${FB};color:#e3d6c2}
.pgl-ch .e{font-size:16px;line-height:1;text-align:center}
.pgl-ch .e .pgl-ic,.pgl-mini .e .pgl-ic{display:block;margin:0 auto;opacity:.9}
.pgl-mini .e .pgl-ic{width:16px;height:16px}
.pgl-ch .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgl-ch .k{font-size:12.5px;color:var(--soft);min-width:3.6em;text-align:right;white-space:nowrap}
.pgl-ch.plein .k{color:#ffd98e}
.pgl-bar{display:block;height:7px;border-radius:6px;background:rgba(255,236,210,.1);overflow:hidden}
.pgl-bar b{display:block;height:100%;width:var(--p,0%);border-radius:6px;background:linear-gradient(90deg,#b98a3c,#ffd27a)}
.pgl-ch.plein .pgl-bar b,.pgl-mini .plein b{background:linear-gradient(90deg,#ffe7a8,#ffc35e);box-shadow:0 0 8px rgba(255,200,100,.6)}
.pgl-mbtn{grid-column:1 / -1;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px}
.pgl-mbtn .pgh-cta{flex:0 0 auto;min-height:48px;padding:8px 20px}
.pgl-mbtn .pgl-der{margin:0}
/* ---------- « Les livres de mes amis » (onglet Amis) ---------- */
.pgl-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px;margin-top:16px}
.pgl-card{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:start;width:100%;padding:15px 15px 16px 16px;border:0;border-radius:20px;
  text-align:left;color:inherit;background:var(--card);box-shadow:inset 0 0 0 1px var(--line),0 12px 26px rgba(0,0,0,.24);transition:transform .15s,box-shadow .2s}
.pgl-card:hover{box-shadow:inset 0 0 0 1px rgba(255,214,140,.45),0 14px 30px rgba(0,0,0,.3)}
.pgl-card:active{transform:scale(.985)}
.pgl-card.neuf{animation:pglNeuf 1.8s ease 3}
@keyframes pglNeuf{0%,100%{box-shadow:inset 0 0 0 1px var(--line),0 12px 26px rgba(0,0,0,.24)}45%{box-shadow:inset 0 0 0 2px rgba(255,214,140,.95),0 0 32px rgba(255,200,110,.5)}}
.pgl-ctx{display:block;min-width:0;padding-top:1px}
.pgl-nm{display:block;font:700 17px/1.2 ${FB};color:#fff3dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgl-salle{display:block;margin-top:1px;font:600 11.5px ${FB};color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgl-card .pgl-cnt{display:block;margin:3px 0 8px;font:600 13.5px ${FB};color:#e3d6c2}
.pgl-card .pgl-cnt b{font-size:16px;color:#fff3dc}
.pgl-mini{display:grid;grid-template-columns:auto 1fr auto;gap:5px 8px;align-items:center;margin-top:10px;font:600 12px ${FB};color:#cbbfae}
.pgl-mini .e{font-size:14px;line-height:1}
.pgl-mini .k{min-width:3.2em;text-align:right;white-space:nowrap}
.pgl-mini .plein .k,.pgl-mini .k.plein{color:#ffd98e}
.pgl-mini .pgl-bar{height:6px}
.pgl-der{display:block;margin-top:10px;font:600 12px/1.4 ${FB};color:var(--soft)}
.pgl-der b{color:#ffe2a6;font-weight:700}
.pgl-der.ok{color:#ffe2a6}
.pgl-rien{margin-top:16px;display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center}
.pgl-rien .em{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;font-size:28px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25)}
.pgl-rien h3{margin:0;font:700 16px ${FB};color:#fff3dc}
.pgl-rien p{margin:4px 0 0;font:600 13px/1.45 ${FB};color:var(--soft)}
.pgl-off{margin:10px 2px 0;font:600 12.5px/1.4 ${FB};color:#ffd2a0}
/* ---------- le livre ouvert (lecture seule) ---------- */
.pgl-view{position:absolute;inset:0;z-index:38;display:none;flex-direction:column;overflow:hidden;color:#f6ecdb;
  background:radial-gradient(90% 80% at 50% 46%,#3d3126,#1a140f 78%);opacity:0;transition:opacity .25s ease}
.pgl-view.vis{display:flex}
.pgl-view.on{opacity:1}
.pgl-vtop{position:relative;z-index:5;flex:none;display:flex;align-items:center;gap:12px;min-height:62px;padding:9px 14px 6px;padding-top:max(9px,env(safe-area-inset-top))}
.pgl-vx{width:44px;height:44px;flex:none;border:0;border-radius:50%;display:grid;place-items:center;padding:0;color:#f1e6d2;font:400 20px/1 ${FB};background:rgba(0,0,0,.35);box-shadow:inset 0 0 0 1px rgba(233,192,106,.32)}
.pgl-vx:hover{background:rgba(0,0,0,.5)}
.pgl-vt{flex:1;min-width:0}
.pgl-vt b{display:block;font:600 23px/1.08 var(--pglT);letter-spacing:.01em;color:#f3dfb0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgl-vt small{display:block;margin-top:2px;font:600 12.5px ${FB};color:#cdbfa8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgl-vtop .pgl-med{flex:none}
.pgl-view.simple .pgl-vtop .pgl-med{display:none}
.pgl-stage{position:relative;flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;touch-action:pan-y;overflow:hidden}
.pgl-view.haut .pgl-stage{align-items:flex-start;overflow-y:auto;overscroll-behavior:contain;padding:calc(var(--u)*12) 0 18px}
.pgl-book{position:relative;display:flex;flex:none;filter:drop-shadow(0 22px 30px rgba(0,0,0,.6))}
.pgl-book::before{content:'';position:absolute;inset:${u(-2.6)} ${u(-3)};border-radius:${u(2.2)};
  background:radial-gradient(120% 90% at 30% 20%,rgba(255,255,255,.08),transparent 55%),linear-gradient(135deg,#3b6145,#26412e 55%,#1b2e21);
  box-shadow:inset 0 0 0 ${u(0.45)} rgba(233,192,106,.42),inset 0 0 ${u(3)} rgba(0,0,0,.45)}
.pgl-pages{position:relative;display:flex}
.pgl-page{position:relative;width:${u(100)};height:${u(150)};padding:${u(7)} ${u(7)} ${u(10)};overflow:hidden;color:#4a3420;
  background:radial-gradient(140% 100% at 50% 0%,rgba(255,255,255,.35),transparent 60%),radial-gradient(80% 60% at 20% 90%,rgba(150,110,60,.1),transparent 70%),linear-gradient(#f4e7c9,#ead8ae)}
.pgl-page::before{content:'';position:absolute;inset:0;opacity:.28;mix-blend-mode:multiply;background-image:${LIVRE_PAPIER};pointer-events:none}
.pgl-page > *{position:relative}
.pgl-page.g{border-radius:${u(1.6)} ${u(0.4)} ${u(0.4)} ${u(1.6)};box-shadow:inset ${u(-8)} 0 ${u(8.5)} ${u(-5.5)} rgba(80,50,20,.55),${u(-1.2)} 0 0 ${u(-0.4)} #e2cfa4,${u(-2)} ${u(0.4)} 0 ${u(-0.6)} #d5c094}
.pgl-page.d{border-radius:${u(0.4)} ${u(1.6)} ${u(1.6)} ${u(0.4)};box-shadow:inset ${u(8)} 0 ${u(8.5)} ${u(-5.5)} rgba(80,50,20,.55),${u(1.2)} 0 0 ${u(-0.4)} #e2cfa4,${u(2)} ${u(0.4)} 0 ${u(-0.6)} #d5c094}
/* page tournée : un voile couleur papier s'efface PAR-DESSUS (le contenu n'est jamais animé : les silhouettes « multiplier » restent justes) */
.pgl-page::after{content:'';position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;border-radius:inherit;
  background:radial-gradient(140% 100% at 50% 0%,#f8edd6,transparent 60%),linear-gradient(#f4e7c9,#ead8ae)}
.pgl-view.tourne-n .pgl-page::after,.pgl-view.tourne-p .pgl-page::after{animation:pglVoile .4s ease-out}
.pgl-view.tourne-n .pgl-page.d::after,.pgl-view.tourne-p .pgl-page.g::after{animation-delay:.06s;animation-fill-mode:backwards}
@keyframes pglVoile{from{opacity:1}to{opacity:0}}
.pgl-num{position:absolute;bottom:${u(3.4)};font:500 ${u(3.6)}/1 var(--pglT);color:#7a5c3e}
.pgl-page.g .pgl-num{left:${u(7)}}
.pgl-page.d .pgl-num{right:${u(16)}}
.pgl-coin{position:absolute;right:0;bottom:0;width:${u(11)};height:${u(11)};border-radius:0 0 ${u(1.6)} 0;pointer-events:none;
  background:linear-gradient(315deg,transparent 48%,#d9c49a 50%,#f2e3c2 70%,#e2cfa4);box-shadow:${u(-0.6)} ${u(-0.6)} ${u(1.2)} rgba(80,50,20,.25)}
/* en-tête de chapitre (28 u), section (8 u), rang de 2 cases (41,5 u), mot de la fin (17 u) : la pagination de PGH_LIVRE_MOUNT compte pareil */
.pgl-tete{height:${u(28)};overflow:hidden}
.pgl-tete h3{margin:0;font:600 ${u(8.6)}/1 var(--pglT);color:#3c2814;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgl-tete small{display:block;margin-top:${u(0.9)};font:600 ${u(4.8)}/1.1 var(--pglM);color:#7a5c3e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgl-prog{display:flex;align-items:center;gap:${u(2.4)};margin:${u(2)} 0 0;font:600 ${u(3.5)}/1 var(--pglT);color:#7a5c3e;white-space:nowrap}
.pgl-prog i{flex:1;height:${u(1.5)};border-radius:${u(1)};background:rgba(122,92,62,.18);overflow:hidden}
.pgl-prog i b{display:block;height:100%;width:var(--p,0%);border-radius:${u(1)};background:linear-gradient(90deg,#c99a43,#e9c06a)}
.pgl-prog .ok{padding:${u(0.6)} ${u(1.8)};border-radius:${u(1)};font:700 ${u(3)}/1 var(--pglT);color:#5a3a08;background:linear-gradient(#ffeaa8,#d9a441);box-shadow:0 ${u(0.3)} ${u(0.8)} rgba(90,60,10,.3)}
.pgl-trait{height:${u(2.2)};margin:${u(2.2)} 0 0;background:${LIVRE_TRAIT} center/100% 100% no-repeat;opacity:.9}
.pgl-trait.img{height:${u(3.6)};margin-top:${u(1.6)};background:center/contain no-repeat;opacity:1}
.pgl-orn{display:block;width:${u(46)};height:${u(3.6)};margin:${u(1.5)} auto 0;background:center/contain no-repeat}
.pgl-sect{display:flex;align-items:center;gap:${u(2.2)};height:${u(8)};font:italic 500 ${u(4.5)}/1 var(--pglI);color:#5a3f24;white-space:nowrap}
.pgl-sect::before,.pgl-sect::after{content:'';flex:1;min-width:${u(4)};height:1px;background:rgba(122,92,62,.38)}
.pgl-rang{display:grid;grid-template-columns:1fr 1fr;column-gap:${u(5)};height:${u(41.5)};padding-top:${u(1.6)}}
.pgl-case{min-width:0;text-align:center}
.pgl-cl{position:relative;width:90%;margin:0 auto;aspect-ratio:4 / 3;padding:${u(1.1)};background:#2a2016;box-shadow:0 ${u(0.7)} ${u(1.6)} rgba(60,35,10,.38)}
.pgl-cl .ph{position:relative;display:block;width:100%;height:100%;overflow:hidden;background:linear-gradient(110deg,#3a2c1e 30%,#4a3826 50%,#3a2c1e 70%) 0 0/200% 100%;animation:pglSk 1.6s linear infinite}
@keyframes pglSk{to{background-position:-200% 0}}
.pgl-cl img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .45s}
.pgl-cl img.on{opacity:1}
.pgl-cl .ph.ko,.pgl-cl .ph.sans{animation:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${u(0.8)};color:#7a5c3e;background:linear-gradient(#efe0bf,#ddc89e)}
.pgl-cl .ph svg{width:${u(9)};height:${u(9)};opacity:.7}
.pgl-cl .ph em{font:600 ${u(3.3)}/1.05 var(--pglM);font-style:normal;text-align:center;padding:0 ${u(2)}}
.pgl-cl .ph.ko img{display:none}
.pgl-cl .c{position:absolute;width:${u(4.2)};height:${u(4.2)};background:#3b2a19;opacity:.94}
.pgl-cl .c1{left:${u(-0.8)};top:${u(-0.8)};clip-path:polygon(0 0,100% 0,0 100%)}
.pgl-cl .c2{right:${u(-0.8)};top:${u(-0.8)};clip-path:polygon(0 0,100% 0,100% 100%)}
.pgl-cl .c3{left:${u(-0.8)};bottom:${u(-0.8)};clip-path:polygon(0 0,0 100%,100% 100%)}
.pgl-cl .c4{right:${u(-0.8)};bottom:${u(-0.8)};clip-path:polygon(100% 0,0 100%,100% 100%)}
.pgl-cl.r1{transform:rotate(-1.6deg)}.pgl-cl.r2{transform:rotate(1.2deg)}.pgl-cl.r3{transform:rotate(-.7deg)}.pgl-cl.r4{transform:rotate(1.8deg)}
.pgl-nom{margin-top:${u(1.5)};padding:0 ${u(0.6)};font:600 ${u(5.4)}/1.04 var(--pglM);color:#3a2614;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgl-date{margin-top:${u(0.4)};font:italic 500 ${u(3.2)}/1.1 var(--pglI);color:#7a5c3e;white-space:nowrap}
.pgl-date .rar{font-style:normal;font-size:.82em;letter-spacing:.14em;color:#b8862f}
.pgl-vide{position:relative;width:90%;margin:0 auto;aspect-ratio:4 / 3;display:grid;place-items:center;border:${u(0.45)} dashed rgba(122,92,62,.38);border-radius:${u(1)};background:rgba(255,255,255,.14)}
.pgl-vide b{position:relative;font:700 ${u(11)}/1 var(--pglT);color:rgba(90,62,36,.42)}
.pgl-vide .sil{position:absolute;inset:7%;background-repeat:no-repeat;mix-blend-mode:multiply}
.pgl-vide.s b{font-size:${u(8)};color:rgba(70,46,24,.5);text-shadow:0 0 ${u(1.2)} rgba(244,231,201,.9)}
.pgl-bts{height:${u(16)};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${u(1.4)}}
.pgl-bts .l{font:600 ${u(4)}/1 var(--pglM);color:rgba(90,62,36,.6)}
.pgl-bts .r{display:flex;gap:${u(1.8)}}
.pgl-bts .r i{width:${u(9)};height:${u(6.8)};border-radius:${u(0.8)};border:${u(0.3)} dashed rgba(122,92,62,.32);background:repeating-linear-gradient(135deg,rgba(122,92,62,.07) 0 ${u(0.9)},transparent ${u(0.9)} ${u(1.8)})}
.pgl-note{margin-top:${u(2.5)};padding:${u(2.4)} ${u(3.2)};border-left:${u(0.6)} solid rgba(122,92,62,.4);background:rgba(255,255,255,.22);font:600 ${u(4.3)}/1.15 var(--pglM);color:#5a3f24}
.pgl-note small{display:block;margin-top:${u(0.8)};text-align:right;font-size:.88em;color:#7a5c3e}
/* page de garde, page de fin */
.pgl-garde{display:flex;flex-direction:column;align-items:center;text-align:center;height:100%}
.pgl-garde .fleur,.pgl-fin .fleur,.pgl-finch .fleur{display:block;width:${u(30)};height:${u(6)};margin:${u(1.5)} auto 0}
.pgl-garde .app{margin:${u(1.5)} 0 0;font:italic 500 ${u(5)}/1.1 var(--pglI);color:#6a4c30}
.pgl-garde .qui{margin:${u(1)} 0 0;max-width:100%;font:600 ${u(12.5)}/1.05 var(--pglM);color:#33210f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgl-garde .seau{margin-top:${u(3)};width:${u(23)};height:${u(23)};border-radius:50%;display:grid;place-items:center;font-size:${u(11)};line-height:1;
  background:radial-gradient(circle at 40% 35%,#fff3cc,#e9c06a 55%,#a8772a);box-shadow:0 ${u(1)} ${u(2.4)} rgba(80,50,10,.45),inset 0 0 0 ${u(0.8)} rgba(255,248,220,.6),0 0 0 ${u(1.2)} rgba(185,140,60,.35)}
.pgl-garde .seau.gardien{box-shadow:0 0 ${u(5)} rgba(255,200,90,.85),inset 0 0 0 ${u(0.8)} rgba(255,248,220,.7),0 0 0 ${u(1.2)} rgba(220,170,70,.6)}
.pgl-garde .seau.img{background:none;box-shadow:none;border-radius:0;width:${u(26)};height:${u(26)};filter:drop-shadow(0 ${u(0.8)} ${u(1.2)} rgba(80,50,10,.35))}
.pgl-garde .seau.img .pgl-mi{width:100%;height:100%;margin:0}
.pgl-tampon{position:absolute;right:${u(3)};top:${u(27)};width:${u(24)};height:${u(24)};background:center/contain no-repeat;opacity:.5;transform:rotate(14deg);mix-blend-mode:multiply;pointer-events:none}
.pgl-garde .seau.vide{background:rgba(122,92,62,.12);box-shadow:inset 0 0 0 ${u(0.5)} rgba(122,92,62,.35);color:#9a7a52;font:400 ${u(9)}/1 var(--pglT)}
.pgl-garde .mn{margin:${u(2)} 0 0;font:600 ${u(5.4)}/1.1 var(--pglT);color:#4a2f14}
.pgl-garde .tot{margin:${u(0.8)} 0 0;font:italic 500 ${u(4.2)}/1.1 var(--pglI);color:#6a4c30}
.pgl-garde .tot b{font:600 ${u(5.2)}/1 var(--pglT);font-style:normal;color:#3c2814}
.pgl-som{list-style:none;margin:${u(4)} 0 0;padding:0;width:100%}
.pgl-som li + li{border-top:1px solid rgba(122,92,62,.18)}
.pgl-som button{width:100%;display:grid;grid-template-columns:${u(7)} 1fr auto;gap:${u(2.4)};align-items:center;min-height:${u(7.4)};padding:${u(0.8)} ${u(1)};border:0;background:none;text-align:left;color:#4a3420;cursor:pointer}
.pgl-som button:hover{background:rgba(255,255,255,.2)}
.pgl-som .sq{display:grid;place-items:center;width:${u(6.2)};height:${u(6.2)};border-radius:${u(1.2)};font-style:normal;font-size:${u(3.6)};line-height:1;background:var(--c);box-shadow:inset 0 0 0 ${u(0.3)} rgba(255,255,255,.25)}
.pgl-som .sq .pgl-ic{width:${u(4.4)};height:${u(4.4)}}
.pgl-som .tt{font:600 ${u(4.2)}/1.1 var(--pglT);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgl-som em{font:italic 500 ${u(3.8)}/1 var(--pglI);color:#7a5c3e;white-space:nowrap}
.pgl-som .plein em{font-style:normal;font-weight:700;color:#8a5a12}
.pgl-fin{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;color:#6a4c30}
.pgl-fin .fleur{width:${u(40)};height:${u(8)}}
.pgl-finch{height:${u(12)};display:flex;align-items:center;justify-content:center;opacity:.8}
.pgl-fin p{margin:${u(3)} ${u(4)} 0;font:600 ${u(5.4)}/1.2 var(--pglM)}
/* rubans = chapitres (à droite du livre sur grand écran ; onglets au-dessus sur téléphone) */
.pgl-rubans{position:absolute;z-index:3;display:flex;gap:${u(1.6)}}
.pgl-ruban{position:relative;display:grid;place-items:center;padding:0;border:0;font-size:${u(4.4)};line-height:1;background:var(--c);cursor:pointer;
  box-shadow:${u(0.6)} ${u(0.4)} ${u(1)} rgba(0,0,0,.35),inset 0 0 0 ${u(0.25)} rgba(255,255,255,.18);transition:width .2s,height .2s,filter .2s}
.pgl-ruban.plein{box-shadow:${u(0.6)} ${u(0.4)} ${u(1)} rgba(0,0,0,.35),inset 0 0 0 ${u(0.5)} #f2cf7a}
.pgl-ruban.plein::after{content:'✓';position:absolute;right:${u(0.4)};top:${u(0.2)};font:800 ${u(2.6)}/1 ${FB};color:#ffe7a8;text-shadow:0 1px 1px rgba(0,0,0,.5)}
.pgl-ruban:hover{filter:brightness(1.12)}
.pgl-ruban .pgl-ic{width:${u(5.6)};height:${u(5.6)};filter:drop-shadow(0 ${u(0.2)} ${u(0.3)} rgba(0,0,0,.35))}
.pgl-view.double .pgl-rubans{left:100%;top:${u(8)};margin-left:${u(2.6)};flex-direction:column}
.pgl-view.double .pgl-ruban{width:${u(30)};height:${u(8.6)};border-radius:0 ${u(2)} ${u(2)} 0;display:flex;align-items:center;justify-content:flex-start;gap:${u(1.4)};padding-left:${u(2.2)}}
.pgl-rub-nom{font:700 ${u(2.7)}/1.05 ${FB};color:#fff8ea;text-shadow:0 1px 1px rgba(0,0,0,.45);white-space:nowrap;letter-spacing:.01em}  /* 21 oct. : le nom du chapitre sur l'onglet (demande de l'utilisateur) */
.pgl-view.double .pgl-ruban.on{width:${u(33)}}
.pgl-rub-t{display:flex;flex-direction:column;align-items:flex-start;gap:${u(0.5)}}
.pgl-rub-n{font:600 ${u(2.1)}/1 ${FB};color:#fff8ea;opacity:.9;text-shadow:0 1px 1px rgba(0,0,0,.45);white-space:nowrap}
.pgl-view.simple .pgl-ruban{flex-direction:column;gap:${u(0.3)}}
.pgl-view.simple .pgl-rub-n{font-size:${u(1.8)}}
.pgl-vide.leg .sil{filter:blur(${u(1.6)});opacity:.7}
.pgl-view.simple .pgl-rubans{bottom:100%;left:${u(4)};right:${u(4)};margin-bottom:${u(2.4)};justify-content:space-between;align-items:flex-end}
.pgl-view.simple .pgl-ruban{width:${u(11.4)};height:${u(9.4)};border-radius:${u(2)} ${u(2)} 0 0}
.pgl-view.simple .pgl-ruban.on{height:${u(12)}}
/* navigation */
.pgl-nav{position:absolute;top:50%;z-index:4;width:48px;height:48px;margin-top:-24px;border:0;border-radius:50%;display:grid;place-items:center;padding:0 0 4px;
  color:#f1e6d2;font:400 34px/1 var(--pglT);background:rgba(0,0,0,.38);box-shadow:inset 0 0 0 1px rgba(233,192,106,.3)}
.pgl-nav:hover{background:rgba(0,0,0,.55)}
.pgl-nav.p{left:14px}.pgl-nav.n{right:14px}
.pgl-nav[disabled],.pgl-nav2[disabled]{opacity:.22;pointer-events:none}
.pgl-view.simple .pgl-nav{display:none}
.pgl-vbot{position:relative;z-index:5;flex:none;display:flex;align-items:center;justify-content:center;gap:16px;min-height:44px;padding:4px 14px 10px;padding-bottom:max(10px,env(safe-area-inset-bottom));font:600 12.5px ${FB};color:#cdbfa8;text-align:center}
.pgl-nav2{width:46px;height:40px;border:0;border-radius:14px;display:none;place-items:center;padding:0 0 3px;color:#f1e6d2;font:400 30px/1 var(--pglT);background:rgba(0,0,0,.35);box-shadow:inset 0 0 0 1px rgba(233,192,106,.3)}
.pgl-view.simple .pgl-nav2{display:grid}
.pgl-pos{min-width:9em}
.pgl-pos small{display:block;font-weight:600;font-size:11.5px;color:#a8988a}
@media (prefers-reduced-motion:reduce){.pgl-card.neuf,.pgl-cl .ph,.pgl-view.tourne-n .pgl-page::after,.pgl-view.tourne-p .pgl-page::after{animation:none}.pgl-view{transition:none}}
` + imgs + '\n';   // images en DERNIER : leurs règles passent devant les raccourcis « background » ci-dessus
  }

  // K = { box, $, PG, pgInfo, memberMode, on, later, every, store, toast, tone, members, touch }
  function PGH_LIVRE_MOUNT(K) {
    const { box, $, PG, pgInfo, memberMode, on, later, every, toast, tone } = K;
    const secMe = $.lvme, secFr = $.lvfr;
    const L = { st: 'idle', books: [], at: 0, busy: false, again: false, err: '', tab: 'moi', off: null, live: false, prev: null, neufs: new Set(),
      imgs: new Map(), sigMe: '', sigFr: '', view: null, pokeT: 0, ro: null };
    let dead = false;

    const typo = (x) => String(x == null ? '' : x).replace(/'/g, '’');   // apostrophe typographique (Cormorant : « l'île » se cognait)
    // ---------- le catalogue (embarqué) : chapitres, sections, espèces, ordre des pages ----------
    const ICO = { oiseau: '🐦', poule: '🐓', cerf: '🦌', lezard: '🦎', papillon: '🦋', poisson: '🐟', etoile: '✨', champignon: '🍄' };
    const RARN = { Commun: 1, PeuCommun: 2, Rare: 3, TresRare: 4, Legendaire: 5 };
    const COURT = { ferme: 'Ferme et village', sauvages: 'Animaux sauvages', reptiles: 'Reptiles', petites_betes: 'Petites bêtes' };
    const ESP = new Map(), CH = [];
    for (const c of (LIVRE_CAT && LIVRE_CAT.chapitres) || []) {
      const ch = { id: c.id, titre: typo(c.titre), onglet: typo(c.onglet || c.titre), sous: typo(c.sousTitre), ico: ICO[c.icone] || '📖', icone: c.icone, coul: c.couleur || '#7a9a5a', note: typo(c.bientotTexte),
        sections: [], sur: 0, bt: 0 };
      ch.court = COURT[c.id] || ch.titre.replace(/^(les|la|le)\s+/i, '').replace(/^./, (x) => x.toUpperCase());
      for (const s of c.sections || []) {
        const se = { titre: typo(s.titre), cases: [] };
        for (const e of s.especes || []) { ESP.set(e.id, { id: e.id, nom: typo(e.nom), rar: RARN[e.rarete] || 1, ch: c.id, open: true }); se.cases.push(e.id); ch.sur++; }
        for (const e of s.bientot || []) { ESP.set(e.id, { id: e.id, nom: typo(e.nom), rar: 0, ch: c.id, open: false }); ch.bt++; }
        ch.sections.push(se);
      }
      CH.push(ch);
    }
    const CHM = new Map(CH.map((c) => [c.id, c]));
    const SUR = CH.reduce((a, c) => a + c.sur, 0);
    const MED = { apprenti: ['🥉', 'bronze'], naturaliste: ['🥈', 'argent'], grand: ['🥇', 'or'], gardien: ['🏆', 'gardien'] };
    const MEDL = ((LIVRE_CAT && LIVRE_CAT.medailles) || []).filter((m) => MED[m.id]);
    const IMG = LIVRE_IMG || {};
    const medI = (id) => (IMG.med && IMG.med[id] ? `<i class="pgl-mi mi-${id}" aria-hidden="true"></i>` : `<i aria-hidden="true">${MED[id][0]}</i>`);
    const icoI = (c) => (IMG.ico && IMG.ico[c.icone] ? `<i class="pgl-ic i-${c.icone}" aria-hidden="true"></i>` : c.ico);
    const ORN = IMG.orn ? '<i class="pgl-orn" aria-hidden="true"></i>' : LIVRE_FLEURON;
    const medNom = (id) => { const m = MEDL.find((x) => x.id === id); return m ? typo(m.nom) : ''; };
    const prochaine = (t, sur) => { for (const m of MEDL.slice().sort((a, b) => (a.seuil || 1e9) - (b.seuil || 1e9))) { const s = m.seuil || sur; if (s > 0 && t < s) return { id: m.id, reste: s - t }; } return null; };
    // pages : en-tête de chapitre 28 u, titre de section 8 u, rang de deux cases 41,5 u, bande « bientôt » 16 u, mot de Mlle Iris 17 u,
    // fleuron de fin de chapitre 12 u (seulement s'il reste la place) ; une page = 133 u utiles
    const PAGES = (() => {
      const B = 133, HT = 28, HS = 8, HR = 41.5, HB = 16, HN = 17, HF = 12, P = [{ k: 'garde' }];
      for (const ch of CH) {
        let pg = { k: 'chap', ch, b: [{ t: 'tete' }] }, used = HT;
        const neuve = () => { P.push(pg); pg = { k: 'chap', ch, b: [] }; used = 0; };
        for (const se of ch.sections) {
          if (se.titre && ch.sections.length > 1) { if (used + HS + HR > B) neuve(); pg.b.push({ t: 'sec', titre: se.titre }); used += HS; }
          for (let i = 0; i < se.cases.length; i += 2) { if (used + HR > B) neuve(); pg.b.push({ t: 'rang', cases: se.cases.slice(i, i + 2) }); used += HR; }
        }
        if (ch.bt) { if (used + HB > B) neuve(); pg.b.push({ t: 'bientot', n: ch.bt }); used += HB; }
        if (ch.note) { if (used + HN > B) neuve(); pg.b.push({ t: 'note' }); used += HN; }
        if (used + HF <= B) pg.b.push({ t: 'finch' });
        P.push(pg);
      }
      return P;
    })();
    const premiere = (id) => PAGES.findIndex((p) => p.k === 'chap' && p.ch.id === id);

    // ---------- petits outils ----------
    const has = (fn) => { try { return PG && typeof PG.has === 'function' ? !!PG.has(fn) : false; } catch (e) { return false; } };
    const refused = (e) => /fonction refus|Could not find the function|PGRST202|rpc inconnue/i.test(String(e && e.message || e)) || (e && e.status === 404);
    const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const dateCourte = (iso) => { const t = Date.parse(iso); if (!t) return ''; const d = new Date(t); return d.getDate() + ' ' + MOIS[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); };
    const moment = (h) => h < 5 ? 'la nuit' : h < 12 ? 'matin' : h < 18 ? 'après-midi' : 'soir';
    function quand(iso) {
      const t = Date.parse(iso); if (!t) return '';
      const d = new Date(t), n = new Date(), j0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime(), jd = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dj = Math.round((j0 - jd) / 86400e3), h = d.getHours();
      if (dj <= 0) { const s = (Date.now() - t) / 1000; if (s < 90) return 'à l\'instant'; if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min'; return h < 5 ? 'cette nuit' : h < 12 ? 'ce matin' : h < 18 ? 'cet après-midi' : 'ce soir'; }
      if (dj === 1) { const m = moment(h); return m === 'la nuit' ? 'hier, la nuit' : 'hier ' + m; }
      if (dj < 7) return 'il y a ' + dj + ' jours';
      return 'le ' + dateCourte(iso);
    }
    const nomCourt = (s) => String(s).replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    const pct = (n, s) => (s > 0 ? Math.round(Math.min(1, n / s) * 1000) / 10 : 0) + '%';
    const vivant = () => !dead && L.st !== 'off';

    // ---------- les livres reçus du serveur ----------
    function bookOf(r) {
      const esp = new Map();
      for (const x of Array.isArray(r.r_especes) ? r.r_especes : []) {
        if (!x || typeof x.esp !== 'string') continue;
        esp.set(x.esp, { at: x.at || null, photo: typeof x.photo === 'string' && /^ph\/[0-9a-f-]{36}\/m\.jpg$/.test(x.photo) ? x.photo : null });
      }
      const chap = {};
      for (const c of CH) { const v = r.r_chapitres && r.r_chapitres[c.id]; chap[c.id] = { n: v && Number.isFinite(+v.n) ? +v.n : [...esp.keys()].filter((k) => (ESP.get(k) || {}).ch === c.id).length, sur: v && +v.sur > 0 ? +v.sur : c.sur }; }
      return { name: String(r.r_name), moi: !!r.r_moi, alias: r.r_alias ? String(r.r_alias) : null, salle: r.r_salle ? String(r.r_salle) : null,
        total: Math.max(0, r.r_total | 0), sur: (r.r_sur | 0) > 0 ? r.r_sur | 0 : SUR, medaille: MED[r.r_medaille] ? r.r_medaille : null, chap,
        dernier: r.r_dernier && typeof r.r_dernier.esp === 'string' ? { esp: r.r_dernier.esp, at: r.r_dernier.at } : null, esp, maj: r.r_maj || null };
    }
    const membre = (n) => { try { return ((K.members && K.members()) || []).find((m) => m.name === n) || null; } catch (e) { return null; } };
    const nomDe = (b) => { if (b.moi) return pgInfo().display || b.name; const m = membre(b.name); return (m && m.display) || b.alias || b.name; };
    const sigOf = (b) => [b.name, b.total, b.medaille, b.maj, b.dernier && b.dernier.esp, [...b.esp].map(([k, v]) => k + (v.photo ? '*' + v.photo.slice(3, 11) : '')).join(',')].join('|');

    async function load(force) {
      if (!vivant()) return;
      if (!PG || typeof PG.rpc !== 'function' || !has('pg_livre_amis') || !memberMode()) return setOff();
      if (L.busy) { L.again = true; return; }
      const age = Date.now() - L.at;
      if (age < (force ? 4000 : 15000)) { if (force) { clearTimeout(L.pokeT); L.pokeT = later(() => load(true), 4100 - age); } return; }
      L.busy = true;
      try {
        const rows = await PG.rpc('pg_livre_amis', {});
        if (dead) return;
        const books = (Array.isArray(rows) ? rows : []).filter((r) => r && r.r_name).map(bookOf);
        nouveautes(books);
        L.books = books; L.st = 'ok'; L.err = ''; L.at = Date.now();
      } catch (e) {
        L.busy = false;
        if (dead) return;
        if (refused(e) || (e && e.guest)) return setOff();
        L.err = e && e.offline ? 'offline' : 'err'; L.at = Date.now();
      }
      L.busy = false;
      render();
      if (L.again) { L.again = false; later(() => load(true), 600); }
    }
    // un ami a trouvé une nouvelle espèce depuis la dernière lecture : sa carte s'illumine, une seule bulle
    function nouveautes(books) {
      const prev = L.prev; L.prev = new Map(books.map((b) => [b.name, b.total]));
      if (!prev) return;
      let dit = false;
      for (const b of books) {
        if (b.moi) continue;
        const p = prev.has(b.name) ? prev.get(b.name) : 0;
        if (b.total > p) {
          L.neufs.add(b.name);
          if (!dit && b.dernier && ESP.has(b.dernier.esp)) { dit = true; toast('📖 ' + nomDe(b) + ' a trouvé une nouvelle espèce : ' + nomCourt(ESP.get(b.dernier.esp).nom) + ' !', 3600); tone(660, 990); }
        }
      }
      if (L.neufs.size) later(() => { L.neufs.clear(); }, 6000);
    }
    function setOff() {
      if (L.st === 'off') return;
      L.st = 'off'; L.books = [];
      for (const s of [secMe, secFr]) if (s) { s.hidden = true; s.innerHTML = ''; }
      closeBook(true);
      if (L.off) { try { L.off(); } catch (e) { /* rien */ } L.off = null; }
    }

    // ---------- rendu des deux sections ----------
    function couv(b, grand) {
      const pleins = CH.filter((c) => b.chap[c.id] && b.chap[c.id].sur > 0 && b.chap[c.id].n >= b.chap[c.id].sur).length;
      const m = b.medaille ? MED[b.medaille] : null;
      if (IMG.couv) return `<span class="tr"></span><span class="sig"></span>${pleins ? `<span class="rb" title="${pleins} chapitre${pleins > 1 ? 's' : ''} complet${pleins > 1 ? 's' : ''}">${'<i></i>'.repeat(pleins)}</span>` : ''}` +
        (m ? `<span class="seau img">${medI(b.medaille)}</span>` : '');
      return `<span class="cad"></span><span class="tr"></span><span class="t">${grand ? 'LE GRAND LIVRE<b>des Espèces</b>' : 'Grand<br>livre'}</span>${LIVRE_AILES}` +
        `<span class="sig"></span>${pleins ? `<span class="rb" title="${pleins} chapitre${pleins > 1 ? 's' : ''} complet${pleins > 1 ? 's' : ''}">${'<i></i>'.repeat(pleins)}</span>` : ''}` +
        (m ? `<span class="seau${b.medaille === 'gardien' ? ' gardien' : ''}" aria-hidden="true">${m[0]}</span>` : '');
    }
    function medHtml(b) {
      if (b.medaille) return `<span class="pgl-med m-${MED[b.medaille][1]}">${medI(b.medaille)}${esc(medNom(b.medaille))}</span>`;
      const nx = prochaine(b.total, b.sur);
      return nx ? `<span class="pgl-med m-rien" title="${esc(medNom(nx.id))}">Encore ${nx.reste} pour ${medI(nx.id)}</span>` : '';
    }
    function derHtml(b) {
      const d = b.dernier; if (!d || !ESP.has(d.esp)) return '';
      const e = ESP.get(d.esp), c = CHM.get(e.ch), k = c && b.chap[c.id];
      if (k && k.sur > 0 && k.n >= k.sur && (Date.now() - Date.parse(d.at || 0)) < 7 * 86400e3) return `<span class="pgl-der ok">Chapitre « ${esc(c.titre)} » complet ✓</span>`;
      return `<span class="pgl-der">Dernière trouvaille : <b>${esc(nomCourt(e.nom))}</b> · ${esc(quand(d.at))}</span>`;
    }
    function chRow(b, c, mini) {
      const k = b.chap[c.id] || { n: 0, sur: c.sur }, plein = k.sur > 0 && k.n >= k.sur;
      if (mini) return `<span class="e" aria-hidden="true">${icoI(c)}</span><span class="pgl-bar${plein ? ' plein' : ''}" style="--p:${pct(k.n, k.sur)}"><b></b></span><span class="k${plein ? ' plein' : ''}">${k.n}/${k.sur}</span>`;
      return `<div class="pgl-ch${plein ? ' plein' : ''}"><span class="e" aria-hidden="true">${icoI(c)}</span><span class="n">${esc(c.court)}</span><span class="pgl-bar" style="--p:${pct(k.n, k.sur)}"><b></b></span><span class="k">${k.n} / ${k.sur}${plein ? ' ✓' : ''}</span></div>`;
    }
    function renderMe() {
      const me = L.books.find((b) => b.moi);
      if (!secMe) return;
      if (!me) { if (!secMe.hidden) { secMe.hidden = true; secMe.innerHTML = ''; L.sigMe = ''; } return; }
      const nom = nomDe(me), nx = prochaine(me.total, me.sur);
      const h = `<div class="pgh-frhead"><h2 class="pgh-h2">Mon livre</h2><span class="pgl-hn">${me.total} / ${me.sur} espèces</span></div>
        <p class="pgh-sub">Le Grand livre des espèces de Mlle Iris : chaque belle photo d'un animal prise dans Pégase remplit sa case.</p>
        <div class="pgh-card pgl-mine">
          <button class="pgl-couv grand${IMG.couv ? ' img' : ''}" data-l="${esc(me.name)}" aria-label="Ouvrir mon livre">${couv(me, true)}</button>
          <div class="pgl-mtx"><h3>Le livre de ${esc(nom)}</h3><div class="pgl-cnt"><b>${me.total}</b> / ${me.sur} espèces</div>${medHtml(me)}
            ${nx && me.medaille ? `<p class="pgl-next">Encore <b>${nx.reste}</b> espèce${nx.reste > 1 ? 's' : ''} pour <span class="pgl-nw">${medI(nx.id)} ${esc(medNom(nx.id))}</span></p>` : ''}
            ${!nx ? '<p class="pgl-next">Toutes les cases sont remplies : bravo, <b>Gardien de l’île</b> !</p>' : ''}</div>
          ${me.total === 0 ? '<p class="pgl-vide0">Ton livre est encore vide : dans Pégase, photographie un animal de près (net, bien visible), et sa case se remplit toute seule.</p>' : ''}
          <div class="pgl-chs">${CH.map((c) => chRow(me, c, false)).join('')}</div>
          <div class="pgl-mbtn"><button class="pgh-cta gold" data-l="${esc(me.name)}">📖 <span>Ouvrir mon livre</span></button>${derHtml(me)}</div>
        </div>`;
      const s = nbsp(h); if (s === L.sigMe) return; L.sigMe = s;
      secMe.innerHTML = s; secMe.hidden = false;
    }
    function card(b) {
      const nom = nomDe(b), salle = !membre(b.name) && b.salle ? `<span class="pgl-salle">salle ${esc(typo(b.salle))}</span>` : '';
      const chs = ['oiseaux', 'ferme', 'sauvages'].map((id) => CHM.get(id)).filter(Boolean);
      return `<button class="pgl-card${L.neufs.has(b.name) ? ' neuf' : ''}" data-l="${esc(b.name)}" aria-label="Le livre de ${esc(nom)} : ${b.total} espèces sur ${b.sur}">
        <span class="pgl-couv${IMG.couv ? ' img' : ''}">${couv(b, false)}</span>
        <span class="pgl-ctx"><b class="pgl-nm">${esc(nom)}</b>${salle}<span class="pgl-cnt"><b>${b.total}</b> / ${b.sur} espèces</span>${medHtml(b)}
          <span class="pgl-mini">${chs.map((c) => chRow(b, c, true)).join('')}</span>${derHtml(b)}</span></button>`;
    }
    function renderFriends() {
      if (!secFr) return;
      const amis = L.books.filter((b) => !b.moi);
      const off = L.err === 'offline' ? '<p class="pgl-off">Pas de réseau : les livres se mettront à jour au retour de la connexion.</p>' : '';
      const h = `<div class="pgh-frhead"><h2 class="pgh-h2">Les livres de mes amis</h2>${amis.length ? `<span class="pgh-frcount">${amis.length} livre${amis.length > 1 ? 's' : ''}</span>` : ''}</div>
        <p class="pgh-sub">${amis.length ? 'Touche un livre pour le feuilleter (sans rien y changer). Seulement tes amis : ceux d\'une de tes salles.' : 'Le Grand livre des espèces de tes amis : ceux d\'une de tes salles.'}</p>${off}
        ${amis.length ? `<div class="pgl-cards">${amis.map(card).join('')}</div>` :
          '<div class="pgh-card pgl-rien"><span class="em">📖</span><div><h3>Pas encore de livre chez tes amis</h3><p>Dès qu\'un ami de tes salles photographiera des animaux dans Pégase, son Grand livre des espèces apparaîtra ici.</p></div></div>'}`;
      const s = nbsp(h); if (s === L.sigFr) return; L.sigFr = s;
      secFr.innerHTML = s; secFr.hidden = false;
    }
    function render() {
      if (dead) return;
      if (L.st !== 'ok') return;
      renderMe(); renderFriends();
      if (L.view) { const b = L.books.find((x) => x.name === L.view.name); if (!b) closeBook(); else if (sigOf(b) !== L.view.sig) { L.view.book = b; L.view.sig = sigOf(b); drawView(0); } }
    }

    // ---------- le livre ouvert ----------
    let V = null;   // éléments du lecteur (créé une fois)
    function viewEl() {
      if (V) return V;
      const v = document.createElement('div'); v.className = 'pgl-view'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
      v.innerHTML = `<header class="pgl-vtop"><button class="pgl-vx" data-v="x" aria-label="Fermer le livre">✕</button><div class="pgl-vt"><b data-w="ti"></b><small data-w="st"></small></div><span data-w="med"></span></header>
        <div class="pgl-stage" data-w="stage"><button class="pgl-nav p" data-v="p" aria-label="Pages précédentes">‹</button>
          <div class="pgl-book" data-w="book"><div class="pgl-rubans" data-w="rub" role="tablist" aria-label="Chapitres"></div><div class="pgl-pages" data-w="pages"></div></div>
          <button class="pgl-nav n" data-v="n" aria-label="Pages suivantes">›</button></div>
        <footer class="pgl-vbot"><button class="pgl-nav2 p" data-v="p" aria-label="Page précédente">‹</button><span class="pgl-pos" data-w="pos"></span><button class="pgl-nav2 n" data-v="n" aria-label="Page suivante">›</button></footer>`;
      box.appendChild(v);
      V = { v }; v.querySelectorAll('[data-w]').forEach((n) => { V[n.dataset.w] = n; });
      v.addEventListener('click', onView);
      swipe(V.stage);
      return V;
    }
    function openBook(name) {
      const b = L.books.find((x) => x.name === name); if (!b) return;
      const W = viewEl();
      L.view = { name, book: b, sig: sigOf(b), page: 0, double: null };
      W.v.classList.add('vis'); W.v.setAttribute('aria-label', b.moi ? 'Mon livre' : 'Le livre de ' + nomDe(b));
      fit(); drawView(0);
      requestAnimationFrame(() => { if (V && L.view) V.v.classList.add('on'); });
      const x = W.v.querySelector('.pgl-vx'); if (x && !K.touch) x.focus({ preventScroll: true });
      tone(523, 784);
    }
    function closeBook(now) {
      if (!V || !L.view) { L.view = null; return; }
      L.view = null; const v = V.v; v.classList.remove('on');
      const fin = () => { if (!L.view) { v.classList.remove('vis'); V.pages.innerHTML = ''; } };
      if (now) fin(); else later(fin, 260);
    }
    // taille : une page = 100 u × 150 u ; deux pages côte à côte si l'écran est large
    function fit() {
      if (!V || !L.view) return;
      const r = V.v.getBoundingClientRect(), top = 64, bot = 48;
      const dbl = r.width >= 700 && r.width > r.height * 1.12;
      let w;
      // (hub 0.9) les rubans (jusqu'à ~36 u à droite du livre) ne passent jamais sous la flèche « page suivante » (76 px du bord) :
      // à 1024 × 768, la flèche recouvrait le ruban « Légendes »
      if (dbl) w = Math.min((r.width - 2 * 76 - 70) / 2, (r.width / 2 - 76) / 1.36, (r.height - top - bot - 34) / 1.5);
      else w = Math.min(r.width - 30, (r.height - top - bot - 54) / 1.5);
      const tiny = w < 300 && !dbl;
      w = Math.max(dbl ? 230 : 250, Math.floor(w));
      V.book.style.setProperty('--u', (w / 100).toFixed(3) + 'px');
      V.v.style.setProperty('--u', (w / 100).toFixed(3) + 'px');
      V.v.classList.toggle('double', dbl); V.v.classList.toggle('simple', !dbl); V.v.classList.toggle('haut', tiny);
      if (L.view.double !== dbl) { const had = L.view.double !== null; L.view.double = dbl; if (dbl) L.view.page -= L.view.page % 2; if (had) drawView(0); }
    }
    const lastPage = () => (L.view && L.view.double ? (PAGES.length % 2 ? PAGES.length : PAGES.length - 1) : PAGES.length - 1);
    function drawView(dir) {
      if (!V || !L.view) return;
      const b = L.view.book, dbl = L.view.double, i = L.view.page;
      const idx = dbl ? [i, i + 1] : [i];
      V.ti.textContent = b.moi ? 'Mon livre' : 'Le livre de ' + nomDe(b);
      V.st.textContent = b.total + ' / ' + b.sur + ' espèces' + (dbl ? (b.moi ? '' : b.salle && !membre(b.name) ? ' · salle ' + typo(b.salle) : '') + ' · en lecture seule'
        : b.medaille ? ' · ' + medNom(b.medaille) : ' · lecture seule');
      V.med.innerHTML = b.medaille ? `<span class="pgl-med m-${MED[b.medaille][1]}">${medI(b.medaille)}${esc(medNom(b.medaille))}</span>` : '';
      V.pages.innerHTML = nbsp(idx.map((k, j) => pageHtml(k, b, dbl ? (j === 0 ? 'g' : 'd') : (k % 2 ? 'd' : 'g'))).join(''));
      const chCur = (PAGES[idx.find((k) => PAGES[k] && PAGES[k].k === 'chap')] || {}).ch;
      V.rub.innerHTML = CH.map((c) => { const k = b.chap[c.id] || { n: 0, sur: c.sur }, plein = k.sur > 0 && k.n >= k.sur;
        return `<button class="pgl-ruban${chCur === c ? ' on' : ''}${plein ? ' plein' : ''}" style="--c:${c.coul}" data-v="ch" data-c="${c.id}" role="tab" aria-selected="${chCur === c}" title="${esc(c.titre)} : ${k.n} / ${k.sur}" aria-label="${esc(c.titre)}">${icoI(c)}${dbl ? `<span class="pgl-rub-t"><span class="pgl-rub-nom">${esc(c.onglet)}</span>${k.sur > 0 ? `<span class="pgl-rub-n">${k.n} / ${k.sur}</span>` : ''}</span>` : (k.sur > 0 ? `<span class="pgl-rub-n">${k.n}/${k.sur}</span>` : '')}</button>`; }).join('');   // 23 oct. : le nombre trouvé / ouvert sur chaque onglet
      const last = lastPage();
      V.v.querySelectorAll('[data-v="p"]').forEach((x) => { x.disabled = i <= 0; });
      V.v.querySelectorAll('[data-v="n"]').forEach((x) => { x.disabled = (dbl ? i + 2 : i + 1) > last; });
      const n = PAGES.length + (dbl && PAGES.length % 2 ? 1 : 0);
      V.pos.innerHTML = dbl ? `Pages ${i + 1}–${Math.min(i + 2, n)} sur ${n}<small>${K.touch ? 'Glisse le doigt ou touche ‹ ›' : 'Flèches ← → du clavier, ou ‹ ›'} · les rubans = les chapitres</small>` : `Page ${i + 1} sur ${n}`;
      V.v.classList.remove('tourne-n', 'tourne-p'); if (dir) { void V.v.offsetWidth; V.v.classList.add(dir > 0 ? 'tourne-n' : 'tourne-p'); }
      chargePhotos(V.pages); ajuste(V.pages);
    }
    function pageHtml(k, b, cote) {
      const p = PAGES[k], num = `<span class="pgl-num">${k + 1}</span>`, coin = cote === 'd' ? '<span class="pgl-coin"></span>' : '';
      if (!p) return `<div class="pgl-page ${cote}"><div class="pgl-fin">${ORN}<p>À suivre… De nouvelles espèces arriveront avec les mises à jour de Pégase.</p></div>${coin}</div>`;
      if (p.k === 'garde') return `<div class="pgl-page ${cote}">${gardeHtml(b)}${num}${coin}</div>`;
      const c = p.ch; let n = 0;
      const inner = p.b.map((x) => {
        if (x.t === 'tete') { const k2 = b.chap[c.id] || { n: 0, sur: c.sur }, plein = k2.sur > 0 && k2.n >= k2.sur;
          return `<div class="pgl-tete"><h3 class="fit">${esc(c.titre)}</h3><small>${esc(c.sous)}</small><div class="pgl-prog">${k2.n} / ${k2.sur} trouvée${k2.n > 1 ? 's' : ''} <i><b style="--p:${pct(k2.n, k2.sur)}"></b></i>${plein ? '<span class="ok">complet ✓</span>' : ''}</div><div class="pgl-trait${IMG.orn ? ' img' : ''}"></div></div>`; }
        if (x.t === 'sec') return `<div class="pgl-sect">${esc(x.titre)}</div>`;
        if (x.t === 'note') return `<div class="pgl-note">${esc(c.note)}<small>— Mlle Iris</small></div>`;
        if (x.t === 'bientot') return `<div class="pgl-bts"><span class="l">${x.n > 1 ? x.n + ' cases arrivent bientôt dans ce chapitre' : 'une case arrive bientôt dans ce chapitre'}</span><div class="r">${'<i></i>'.repeat(x.n)}</div></div>`;
        if (x.t === 'finch') return `<div class="pgl-finch">${ORN}</div>`;
        return `<div class="pgl-rang">${x.cases.map((id) => caseHtml(id, b, k * 7 + n++)).join('')}</div>`;
      }).join('');
      return `<div class="pgl-page ${cote}">${inner}${num}${coin}</div>`;
    }
    function caseHtml(id, b, i) {
      const e = ESP.get(id); if (!e) return '<div class="pgl-case"></div>';
      const f = b.esp.get(id);
      if (!f) {
        const sx = IMG.sil && IMG.silIds && IMG.silIds[id], cx = IMG.silCols || 8, cy = IMG.silRows || 8;
        const sil = sx ? `<i class="sil" style="background-position:${(sx[0] / (cx - 1) * 100).toFixed(4)}% ${(sx[1] / (cy - 1) * 100).toFixed(4)}%"></i>` : '';
        return `<div class="pgl-case"><div class="pgl-vide${sil ? ' s' : ''}${LIVRE_LEG.has(id) ? ' leg' : ''}" aria-label="Pas encore trouvée">${sil}<b>?</b></div></div>`;   // 23 oct. : légendes floues
      }
      const leg = e.ch === 'legendes', rar = leg ? '✦' : '●●●●○○○○'.slice(4 - Math.min(4, e.rar), 8 - Math.min(4, e.rar));
      const ph = f.photo ? `<span class="ph"><img alt="${esc(e.nom)}" data-src="${esc(f.photo)}" decoding="async"></span>` : `<span class="ph sans">${LIVRE_CAM}<em>photo pas encore en ligne</em></span>`;
      return `<div class="pgl-case"><div class="pgl-cl r${(i % 4) + 1}">${ph}<i class="c c1"></i><i class="c c2"></i><i class="c c3"></i><i class="c c4"></i></div>` +
        `<div class="pgl-nom fit" title="${esc(e.nom)}">${esc(nomCourt(e.nom))}</div><div class="pgl-date">${esc(dateCourte(f.at))} · <span class="rar">${rar}</span></div></div>`;
    }
    function gardeHtml(b) {
      const m = b.medaille;
      return `<div class="pgl-garde">${IMG.tampon ? '<i class="pgl-tampon" aria-hidden="true"></i>' : ''}${ORN}<p class="app">Ce livre appartient à</p><p class="qui fit">${esc(nomDe(b))}</p>
        <div class="seau${m ? (IMG.med ? ' img' : m === 'gardien' ? ' gardien' : '') : ' vide'}" aria-hidden="true">${m ? (IMG.med ? medI(m) : MED[m][0]) : '✦'}</div>
        <p class="mn">${m ? esc(medNom(m)) : 'Pas encore de médaille'}</p><p class="tot"><b>${b.total}</b> espèce${b.total > 1 ? 's' : ''} sur ${b.sur}</p>
        <ul class="pgl-som">${CH.map((c) => { const k = b.chap[c.id] || { n: 0, sur: c.sur }, plein = k.sur > 0 && k.n >= k.sur;
          return `<li class="${plein ? 'plein' : ''}"><button data-v="ch" data-c="${c.id}"><span class="sq" style="--c:${c.coul}" aria-hidden="true">${icoI(c)}</span><span class="tt">${esc(c.titre)}</span><em>${k.n} / ${k.sur}${plein ? ' ✓' : ''}</em></button></li>`; }).join('')}</ul></div>`;
    }
    // un nom trop long pour sa case : la police rapetisse (jamais coupé tant qu'on peut le lire)
    function ajuste(root) {
      // largeur VRAIE du texte (au dixième de pixel : scrollWidth est arrondi, et le navigateur met « … » dès qu'il manque une fraction)
      const trop = (el) => { const cs = getComputedStyle(el), place = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width > place - 0.5; };
      const go = () => { if (dead || !root.isConnected) return; root.querySelectorAll('.fit').forEach((el) => {
        el.style.fontSize = ''; let fs = parseFloat(getComputedStyle(el).fontSize) || 12; const min = fs * 0.62;
        for (let k = 0; k < 16 && trop(el) && fs > min; k++) { fs *= 0.95; el.style.fontSize = fs.toFixed(2) + 'px'; }
      }); };
      go();
      polices.then(() => requestAnimationFrame(go)).catch(() => {});
      later(go, 450);
    }
    // les trois polices du livre (embarquées) : demandées dès l'ouverture du hub, pour que les noms se mesurent avec la bonne police
    const polices = (() => { try { return document.fonts && document.fonts.load ? Promise.all(['600 20px PgLivreT', 'italic 500 20px PgLivreI', '600 20px PgLivreM'].map((f) => document.fonts.load(f))) : Promise.resolve(); } catch (e) { return Promise.resolve(); } })();
    // photos : demandées seulement quand leur page est à l'écran (api.pegase.photo : Storage privé + cache de la borne)
    function photo(path) {
      if (L.imgs.has(path)) return L.imgs.get(path);
      const pr = (async () => { if (!PG || typeof PG.photo !== 'function') throw new Error('photo indisponible'); return await PG.photo(path); })();
      L.imgs.set(path, pr); pr.catch(() => L.imgs.delete(path));
      return pr;
    }
    function chargePhotos(root) {
      root.querySelectorAll('img[data-src]').forEach((im) => {
        const p = im.dataset.src; im.removeAttribute('data-src');
        const ko = () => { const s = im.closest('.ph'); if (s && !s.classList.contains('ko')) { s.classList.add('ko'); s.insertAdjacentHTML('beforeend', LIVRE_CAM + '<em>photo indisponible</em>'); } };
        photo(p).then((u) => { if (dead || !u) return; im.onload = () => im.classList.add('on'); im.onerror = ko; im.src = u; if (im.complete && im.naturalWidth) im.classList.add('on'); }).catch(ko);
      });
    }
    function va(dir) {
      if (!L.view) return;
      const st = L.view.double ? 2 : 1, nx = L.view.page + dir * st;
      if (nx < 0 || nx > lastPage()) return;
      L.view.page = nx; drawView(dir); tone(dir > 0 ? 620 : 520, dir > 0 ? 760 : 640);
    }
    function onView(e) {
      const t = e.target.closest('[data-v]'); if (!t || !L.view) return;
      const a = t.dataset.v;
      if (a === 'x') { closeBook(); tone(520, 392); }
      else if (a === 'p') va(-1);
      else if (a === 'n') va(1);
      else if (a === 'ch') { let k = premiere(t.dataset.c); if (k < 0) return; if (L.view.double) k -= k % 2; const d = k > L.view.page ? 1 : k < L.view.page ? -1 : 0; L.view.page = k; drawView(d); tone(660, 880); }
    }
    function swipe(el) {
      let x0 = null, y0 = 0;
      el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' || e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; });
      el.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) va(dx < 0 ? 1 : -1); });
      el.addEventListener('pointercancel', () => { x0 = null; });
    }
    on(box, 'keydown', (e) => {
      if (!L.view) return;
      if (e.key === 'Escape') { closeBook(); e.stopPropagation(); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') { va(1); e.stopPropagation(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { va(-1); e.stopPropagation(); e.preventDefault(); }
    }, true);

    // ---------- clics des deux sections ----------
    const ouvre = (e) => { const b = e.target.closest('[data-l]'); if (b) openBook(b.dataset.l); };
    if (secMe) on(secMe, 'click', ouvre);
    if (secFr) on(secFr, 'click', ouvre);

    // ---------- direct + relève ----------
    if (PG && typeof PG.onLivre === 'function') { try { L.off = PG.onLivre(() => { L.live = true; clearTimeout(L.pokeT); L.pokeT = later(() => load(true), 1200); }); } catch (e) { L.off = null; } }
    // relève de secours (le direct prévient d'habitude) : onglet Moi / Amis ou livre ouvert : 2 min sans direct, 10 min avec (lectures limitées
    // à 120 / 10 min par pseudo côté serveur)
    every(() => { if (!vivant() || document.hidden) return; if (!(L.view || L.tab === 'amis' || L.tab === 'moi')) return; if (Date.now() - L.at > (L.off ? 600e3 : 120e3)) load(true); }, 20000);
    if (typeof ResizeObserver === 'function') { L.ro = new ResizeObserver(() => { if (L.view) { fit(); } }); L.ro.observe(box); } else on(window, 'resize', () => { if (L.view) fit(); });
    if (!PG || !has('pg_livre_amis')) setOff(); else later(() => load(true), 1300);

    return {
      tab(t) { L.tab = t; if (!vivant() || !L.at) return; if ((t === 'amis' || t === 'moi') && Date.now() - L.at > 30000) load(); else render(); },   // 1re lecture : 1,3 s après l'ouverture
      state() { return { st: L.st, n: L.books.length, amis: L.books.filter((b) => !b.moi).map((b) => b.name), at: L.at, err: L.err, live: !!L.off, view: L.view ? { name: L.view.name, page: L.view.page, double: L.view.double } : null, pages: PAGES.length, neufs: [...L.neufs] }; },
      // 23 oct. (onglet Amis en tuiles) : le livre de chaque ami (nombre d'espèces), et l'ouvrir depuis sa tuile ou sa fiche
      amis() { return L.books.filter((b) => !b.moi).map((b) => ({ name: b.name, total: b.total | 0, sur: b.sur | 0, neuf: L.neufs.has(b.name) })); },
      ouvrir(name) { if (!L.books.some((b) => b.name === name)) return false; openBook(name); return true; },
      test: { load, openBook, closeBook, va, pages: () => PAGES.map((p) => p.k === 'garde' ? 'garde' : p.ch.id + ':' + p.b.map((x) => x.t === 'rang' ? x.cases.length : x.t[0]).join('')) },
      destroy() { dead = true; clearTimeout(L.pokeT); if (L.off) { try { L.off(); } catch (e) { /* rien */ } L.off = null; } if (L.ro) L.ro.disconnect(); if (V) { V.v.remove(); V = null; } }
    };
  }
  // Polices embarquées ci-dessus (sous-ensembles WOFF2, livre/polices.py) : « Livre Titres » et « Livre Italique » = Cormorant Garamond,
  // « Livre Main » = Caveat. Licence SIL Open Font License 1.1 (texte complet ci-dessous, comme la licence le demande).
  /*
Copyright 2015 the Cormorant Project Authors (github.com/CatharsisFonts/Cormorant)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.

Copyright 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded, 
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
  */

  function buildPage(FD, FB, who) {
    const steps = [
      ['dl', 'Télécharge', 'Le fichier <q data-h="zipn">Pegase-PC.zip</q> arrive dans ton dossier <q>Téléchargements</q>.'],
      ['zip', 'Extrais-le', 'Clic droit sur le fichier, puis <q>Extraire tout…</q> et <q>Extraire</q>.'],
      ['play', 'Lance Pegase.exe', 'Dans le dossier <q>Pegase</q>, double-clique sur <q>Pegase.exe</q>. Bon voyage !']
    ];
    return `<style>${PGH_CSS(FD, FB)}${PGH_LIVRE_CSS(FD, FB)}${PGH_GRAM_CSS(FD, FB)}${PGH_CARTES_CSS(FD, FB)}</style>` + LU_DEFS + nbsp(`
<div class="pgh-scroll" data-h="scroll">
  <section class="pgh-hero" data-h="hero">
    <img class="pgh-bg" data-h="bg" alt="" src="${IMG('lac')}" fetchpriority="high" decoding="async">
    <div class="pgh-veil"></div>
    <canvas class="pgh-fly" data-h="fly"></canvas>
    <canvas class="pgh-gl" data-h="gl" tabindex="-1" aria-label="Ton avatar : glisse pour le faire tourner, touche-le pour qu'il réagisse"></canvas>
    <div class="pgh-wait" data-h="wait"><i></i><span data-h="waitt">Ton avatar arrive…</span><b><u data-h="waitb"></u></b></div>
    <div class="pgh-name" data-h="name">${esc(who)}</div>
    <div class="pgh-hint" data-h="hint">👆 Touche-moi !</div>
    <button class="pgh-ear" data-h="ear" type="button" hidden aria-label="Parle à ton avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="w w2" d="M3.2 7.4a6.6 6.6 0 0 0 0 9.2"/><path class="w w1" d="M5.9 9.9a3.1 3.1 0 0 0 0 4.2"/><path fill="currentColor" fill-opacity=".16" d="M9 10c0-3.6 2.6-6.2 5.8-6.2 3.3 0 5.9 2.6 5.9 6 0 2.5-1.2 3.7-2.4 4.8-1.1 1-1.4 2-1.7 3.3-.5 1.9-1.9 3.3-3.9 3.3-1.5 0-2.7-.8-3.2-2"/><path d="M12.3 10.4c0-1.6 1.1-2.9 2.6-2.9s2.7 1.2 2.7 2.8c0 1.3-.8 1.9-1.6 2.5-.6.5-.9 1.1-.9 1.8"/></svg><i class="z">z</i><span class="t" data-h="eart"></span></button>
    <div class="pgh-copy">
      <span class="pgh-eye"><i></i>Nouveau monde · PC et Android<b class="pgh-jour" style="font-weight:inherit"></b></span>
      <h1 class="pgh-title">Pégase</h1>
      <p class="pgh-pitch">Ta petite vie dans un monde magique… et quelque part dans le ciel, <b>Pégase</b>, le cheval ailé.</p>
      <div class="pgh-ctas2"><button class="pgh-cta gold" data-h="go-av2">${PGH_SVG.edit}<span data-h="avlab2">Créer mon avatar</span></button><button class="pgh-cta glass" data-h="go-dl">${PGH_SVG.dl}<span>Télécharger le jeu</span></button></div>
    </div>
    <div class="pgh-bottom">
      <div class="pgh-mprog" data-h="mprog" hidden aria-live="polite"><span data-h="mprogt"></span><b><u data-h="mprogb"></u></b></div>
      <div class="pgh-emotes" data-h="emotes">${EMOTES.map(([k, e, t]) => `<button class="pgh-emo" data-emo="${k}" aria-label="${t}" title="${t}">${e}<small>${t}</small></button>`).join('')}<div class="pgh-emowrap"><button class="pgh-emo more" data-h="emomore" aria-label="Autres gestes" title="Autres gestes" aria-expanded="false"><span>⋯</span></button><div class="pgh-emofan" data-h="emofan">${EMOTES_MORE.map(([k, e, t]) => `<button class="pgh-emo" data-emo="${k}" aria-label="${t}" title="${t}">${e}<small>${t}</small></button>`).join('')}</div></div><button class="pgh-emo mic" data-h="mic" aria-label="Parler : la bouche de ton avatar suit ta voix" title="Parler (micro)"><span>🎤</span></button><button class="pgh-emo say" data-h="say" aria-label="Écouter ton avatar dire bonjour" title="Écouter ton avatar parler"><span>💬</span></button></div>
      <div class="pgh-ctas"><button class="pgh-cta gold" data-h="go-av">${PGH_SVG.edit}<span data-h="avlab">Modifier</span></button><button class="pgh-cta glass" data-h="go-dl1">${PGH_SVG.dl}<span>Télécharger</span></button></div>
      <div class="pgh-small" data-h="small">Gratuit · PC Windows · Android bientôt</div>
    </div>
  </section>
  <nav class="pgh-tabs" data-h="tabs" role="tablist" aria-label="Pégase">
    <button class="pgh-tab" role="tab" data-tab="moi">${PGH_SVG.me}<span>Moi</span></button>
    <button class="pgh-tab" role="tab" data-tab="amis">${PGH_SVG.friends}<span>Amis</span><span class="bdg" data-h="frbdg"></span><span class="bdg sms" data-h="smsbdg" aria-label="messages non lus"></span></button>
    <button class="pgh-tab" role="tab" data-tab="gram">${PGH_SVG.gram}<span>PegaGram</span><span class="bdg gram" data-h="grbdg"></span></button>
    <button class="pgh-tab" role="tab" data-tab="infos">${PGH_SVG.info}<span>Infos</span></button>
    <i class="ind" data-h="tabind"></i>
  </nav>
  <div class="pgh-pane" data-pane="moi">
    <section class="pgh-sec pgh-lksec" data-h="seclk">
      <div class="pgh-card pgh-lk" data-h="lk" aria-live="polite"></div>
    </section>
    <section class="pgh-sec pgh-today" data-h="sectd" hidden>
      <div class="pgh-frhead"><h2 class="pgh-h2">Aujourd'hui</h2><span class="pgh-tdn" data-h="tdn"></span></div>
      <p class="pgh-sub" data-h="tdsub">Tes 3 missions du jour dans Pégase et la suite de ton histoire.</p>
      <div data-h="tdbox"></div>
    </section>
    <section class="pgh-sec pgl-sec" data-h="lvme" hidden></section>
    <section class="pgh-sec" data-h="secav">
      <div class="pgh-frhead"><h2 class="pgh-h2">Mon avatar</h2><span class="pgh-wallet" data-h="wallet" hidden title="Tes lucioles (la monnaie de Pégase)">${LU('big')}<b data-h="walletn">300</b><small>lucioles</small></span></div>
      <p class="pgh-sub">Ton personnage dans Pégase : visage, coiffure, vêtements, accessoires… Crée-le comme tu veux, il te suit dans le jeu.</p>
      <div class="pgh-card pgh-me">
        <div class="pgh-me-ico" data-h="meico"><i></i><b></b><img alt="" data-h="meimg"></div>
        <div><h3 data-h="metitle">Ton avatar</h3><p data-h="mesub">Pas encore choisi : voici l'exploratrice d'Ailebrune.</p><div class="pgh-tags" data-h="metags"></div></div>
        <div class="pgh-me-actions"><button class="pgh-cta gold" data-h="go-av3">${PGH_SVG.edit}<span data-h="avlab3">Créer mon avatar</span></button>
          <button class="pgh-cta glass" data-h="go-photo" hidden>🖼️ <span>Utiliser comme photo de profil</span></button>
          <span class="pgh-sync" data-h="sync">🔄 <span data-h="synct"></span></span></div>
      </div>
      <div class="pgh-card pgh-wr">
        <h3>Ma garde-robe</h3>
        <p>Tout le pack de vêtements est là : quelques pièces sont déjà à toi, les autres se débloquent dans le jeu avec des lucioles, des missions… ou en secret. Touche une pièce pour l'essayer !</p>
        <div class="pgh-wrrow" data-h="wrrow"></div>
      </div>
      <div class="pgh-card pgh-house" data-h="house">
        <div class="hs"><canvas data-h="hcv"></canvas><div class="hph"><svg viewBox="0 0 96 96"><defs><linearGradient id="pghHw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4dc"/><stop offset="1" stop-color="#f1d6a8"/></linearGradient></defs>
          <ellipse cx="48" cy="84" rx="38" ry="6" fill="rgba(120,80,40,.25)"/><path d="M18 46L48 20l30 26v36H18z" fill="url(#pghHw)" stroke="#a0623a" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 48L48 16l36 32" fill="none" stroke="#c0482f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="41" y="58" width="14" height="24" rx="3" fill="#8a4a2a"/><rect x="25" y="52" width="11" height="10" rx="2" fill="#9fd0ff" stroke="#a0623a" stroke-width="1.6"/><rect x="60" y="52" width="11" height="10" rx="2" fill="#9fd0ff" stroke="#a0623a" stroke-width="1.6"/>
          <path d="M64 14v-3h7v10" fill="none" stroke="#a0623a" stroke-width="2.6"/><g transform="translate(62 62)"><rect width="26" height="20" rx="3" fill="#fff8e6" stroke="#c99a52" stroke-width="1.6" transform="rotate(-8)"/><path d="M5 6h13M5 11h9" stroke="#c99a52" stroke-width="1.8" transform="rotate(-8)"/><circle cx="20" cy="14" r="3.4" fill="#e0533f" transform="rotate(-8)"/></g></svg></div></div>
        <div><h3>Ma maison <span class="pgh-chip">Bientôt</span></h3><p data-h="htxt">Ta maison t'attend : obtiens le permis de construire dans le jeu, puis construis-la pièce par pièce.</p>
          <button class="pgh-cta glass" data-h="hgo">🏡 Modifier ma maison</button></div>
      </div>
    </section>
  </div>
  <div class="pgh-pane" data-pane="amis">
    <section class="pgh-sec pga-sec" data-h="secami" hidden>
      <div class="pgh-frhead"><h2 class="pgh-h2">Mes amis</h2><span class="pgh-frcount" data-h="amicount"></span></div>
      <p class="pgh-sub">Touche un ami : ses messages, son livre, son avatar et sa maison.</p>
      <div class="pga-grid" data-h="amibox"></div>
    </section>
    <section class="pgh-sec pgh-smsec" data-h="secsms" hidden>
      <div class="pgh-frhead"><h2 class="pgh-h2">Messages</h2><span class="pgh-smsn" data-h="smsn"></span></div>
      <p class="pgh-sub">Les SMS du téléphone de ton avatar : tes copains, et les habitants de Pégase.</p>
      <div class="pgh-card pgh-smbox" data-h="smbox"></div>
    </section>
    <section class="pgh-sec" data-h="secfr">
      <div class="pgh-frhead"><h2 class="pgh-h2">Les copains de la salle</h2><span class="pgh-frcount" data-h="frcount"></span></div>
      <p class="pgh-sub" data-h="frsub">Leurs avatars, et qui est là en ce moment.</p>
      <div data-h="frbox"></div>
    </section>
    <section class="pgh-sec pgl-sec" data-h="lvfr" hidden></section>
  </div>
  <div class="pgh-pane" data-pane="gram" data-h="grpane"></div>
  <div class="pgh-pane" data-pane="infos">
    <section class="pgh-sec">
      <h2 class="pgh-h2">Le monde de Pégase</h2>
      <p class="pgh-sub">Des images du jeu, en pleine création : le monde s'agrandit et s'embellit encore. Des animaux à photographier, ta maison, ton potager… et un cheval ailé que presque personne n'a vu.</p>
      <div class="pgh-gal">${GALLERY.map(([n, t, s]) => `<figure class="pgh-pol"><div class="ph"><img loading="lazy" decoding="async" alt="${esc(t)}" src="${IMG(n)}"></div><figcaption>${esc(t)}<small>${esc(s)}</small></figcaption></figure>`).join('')}</div>
    </section>
    <section class="pgh-sec" data-h="secdl">
      <h2 class="pgh-h2">Installer Pégase</h2>
      <p class="pgh-sub" data-h="dlsub">Pégase est un vrai jeu à installer, gratuit. Il marche sur ordinateur maintenant, et bientôt sur les téléphones.</p>
      <div class="pgh-card pgh-andcard" data-h="andcard" hidden>
        <div class="pgh-plat"><div class="ic">${PGH_SVG.android}</div><div><h3>Sur ce téléphone (Android)</h3><p data-h="andmeta">L'appli de la borne l'installe pour toi</p></div></div>
        <div class="pgh-dlzone" data-h="andzone"></div>
      </div>
      <div class="pgh-card pgh-dlcard">
        <div class="pgh-plat"><div class="ic">${PGH_SVG.pc}</div><div><h3>Pour PC (Windows)</h3><p>Windows 10 ou 11 · une souris ou une manette</p></div></div>
        <div class="pgh-dlzone" data-h="dlzone"><span class="pgh-meta">On cherche la dernière version…</span></div>
        <ol class="pgh-steps">${steps.map(([ic, h, p], i) => `<li class="pgh-step"><span class="n">${i + 1}</span><span class="ico">${PGH_SVG[ic]}</span><div><h4>${h}</h4><p>${p}</p></div></li>`).join('')}</ol>
        <div class="pgh-ss">
          <div><h4>${PGH_SVG.shield}Un écran bleu « Windows a protégé votre ordinateur » ?</h4>
            <p>C'est normal : Pégase est tout neuf, Windows ne le connaît pas encore. Ce n'est pas un virus, c'est notre jeu.</p>
            <ol><li>Clique sur <b>Informations complémentaires</b></li><li>puis sur <b>Exécuter quand même</b></li></ol></div>
          <div class="pgh-win" data-h="win" aria-hidden="true">
            <div class="s1"><div class="t">Windows a protégé votre ordinateur</div>Microsoft Defender SmartScreen a empêché le démarrage d'une application non reconnue…<br><span class="l">Informations complémentaires<span class="ring"></span><span class="badge">1</span></span><div class="k"><span>Ne pas exécuter</span></div></div>
            <div class="s2"><div class="t">Windows a protégé votre ordinateur</div>Application : Pegase.exe<br>Éditeur : Éditeur inconnu<div class="k"><span style="position:relative">Exécuter quand même<span class="ring"></span><span class="badge">2</span></span><span>Ne pas exécuter</span></div></div>
          </div>
        </div>
      </div>
      <div class="pgh-others" data-h="others">
        <div class="pgh-other" data-h="andsmall"><div class="ic">${PGH_SVG.android}</div><h4>Android <span class="pgh-chip" data-h="andchip">À venir</span></h4><p data-h="andp">La borne l'installera toute seule, d'un toucher, sur ton téléphone.</p></div>
        <div class="pgh-other"><div class="ic">${PGH_SVG.phone}</div><h4>iPhone et iPad <span class="pgh-chip">À venir</span></h4><p>Un peu plus tard. En attendant, prépare ton avatar ici !</p></div>
      </div>
    </section>
    <section class="pgh-sec">
      <h2 class="pgh-h2">Bientôt dans le hub</h2>
      <p class="pgh-sub">Cette page deviendra la place d'Ailebrune : tout ce qui se passe dans Pégase, depuis ton téléphone.</p>
      <div class="pgh-soongrid">${FUTURE.map(([e, t, p, g]) => `<div class="pgh-fut" style="--g:${g}"><span class="pgh-chip">Bientôt</span><div class="em">${e}</div><h4>${esc(t)}</h4><p>${esc(p)}</p></div>`).join('')}</div>
    </section>
    <div class="pgh-foot">Pégase grandit à chaque mise à jour ✦ Les images de cette page viennent du jeu.</div>
  </div>
</div>
<div class="pgh-ed" data-h="ed" role="dialog" aria-label="Modifier mon avatar">
  <div class="pgh-edtop"><div class="t"><b>Mon avatar</b><span data-h="ddesc"></span></div>
    <div class="pgh-edw" data-h="edw" hidden title="Tes lucioles">${LU()}<b data-h="edwn"></b></div>
    <button data-h="dundo" aria-label="Revenir en arrière" title="Revenir en arrière" disabled>${PGH_SVG.undo}</button><button data-h="dx" aria-label="Fermer sans enregistrer" title="Fermer">✕</button></div>
  <div class="pgh-edcats" role="tablist">${EDCATS.map((c) => `<button class="pgh-edcat" data-cat="${c.k}" role="tab">${PGH_SVG[c.ic] || ''}<span>${c.n}</span><em></em></button>`).join('')}</div>
  <div class="pgh-edsub" data-h="dsub" role="tablist"></div>
  <div class="pgh-edgrid" data-h="dgrid"></div>
  <div class="pgh-lock" data-h="lock"><span class="ic" data-h="lockic">${PGH_SVG.lock}</span><div class="t"><b><span data-h="lockn"></span><span class="pgh-tier" data-h="lockt"></span></b><p data-h="lockp"></p></div><button class="buy" data-h="lockbuy" hidden>${LU()}<span data-h="lockbuyt">Acheter</span></button><button data-h="lockx">Enlever</button></div>
  <div class="pgh-pop" data-h="dpop"></div>
  <div class="pgh-dbtns"><button class="pgh-cta glass rnd" data-h="drnd" aria-label="Au hasard" title="Au hasard">${PGH_SVG.dice}</button><button class="pgh-cta glass" data-h="dno">Annuler</button><button class="pgh-cta gold" data-h="dok">${PGH_SVG.check}<span>Enregistrer</span></button></div>
</div>
<div class="pgh-fv" data-h="fv" role="dialog" aria-label="Un copain">
  <div class="pgh-fvstage" data-h="fvstage"><video class="pgh-clvid" data-h="clvid" playsinline autoplay muted></video><div class="pgh-clpip" data-h="clpip"><video class="pgh-clme" data-h="clme" playsinline autoplay muted></video><b>Moi</b></div><div class="pgh-fvnone" data-h="fvnone"><div><div class="ped"><span class="sil"></span><span data-h="fvhead"></span></div><p data-h="fvnonet"></p></div></div></div>
  <div class="pgh-fvpanel">
    <div class="pgh-fvhead"><b data-h="fvname"></b><button class="pgh-dclose" data-h="fvx" aria-label="Fermer">✕</button></div>
    <span class="pgh-fvst" data-h="fvst"><i></i><span data-h="fvstt"></span></span>
    <p class="pgh-fvdesc" data-h="fvdesc"></p>
    <div class="pgh-fvemo" data-h="fvemo">${EMOTES_ALL.map(([k, e, t]) => `<button class="pgh-emo" data-emo="${k}" aria-label="${t}" title="${t}">${e}</button>`).join('')}</div>
    <div class="pgh-fvbtns" data-h="fvbtns"><button class="pgh-cta call" data-h="fvcall1" hidden><span>📞 Appeler</span><small>en vidéo</small></button><button class="pgh-cta gold" data-h="fvsms"><span>✉️ Messages</span><small style="color:#7a3d10" data-h="fvsmsn">un message</small></button><button class="pgh-cta glass" data-h="fvlivre" hidden><span>📖 Son livre</span><small data-h="fvlivren"></small></button><button class="pgh-cta glass" data-h="fvhouse"><span>🏡 Visiter sa maison</span><small>bientôt</small></button></div>
  </div>
  <div class="pgh-fvcall" data-h="fvcall" data-s=""><div class="pgh-cltop"><b data-h="clname"></b><span><i></i><em data-h="clst"></em></span></div>
    <div class="pgh-clbar"><button class="mute" data-h="clmute" aria-label="Couper le micro">🎙️<small>Micro</small></button><button class="cam" data-h="clcam" aria-label="Couper la caméra" hidden>📷<small>Caméra</small></button><button class="flip" data-h="clflip" aria-label="Retourner la caméra : montrer ce qu'il y a devant moi" hidden>🔄<small>Retourner</small></button><button class="no" data-h="clno" aria-label="Refuser"><span>📞</span><small>Refuser</small></button><button class="end" data-h="clend" aria-label="Raccrocher"><span>📞</span><small>Raccrocher</small></button><button class="ok" data-h="clok" aria-label="Décrocher"><span>📞</span><small>Décrocher</small></button></div></div>
</div>
<div class="pgh-modal pgh-hm" data-h="hmodal" role="dialog" aria-label="La maison d'un copain"><div class="pgh-mcard">
  <h3 data-h="hmname"></h3>
  <div class="pgh-hmplan"><canvas data-h="hmcv" role="img" aria-label="Plan de la maison, vu du ciel"></canvas></div>
  <div class="pgh-hmlv" data-h="hmlv"></div>
  <div class="pgh-hmleg" data-h="hmleg"></div>
  <div class="pgh-hmfacts" data-h="hmfacts"></div>
  <p data-h="hmtxt"></p>
  <div class="pgh-mbtns"><button class="pgh-cta glass" data-h="hmno">Fermer</button><button class="pgh-cta gold" data-h="hmsms"><span>✉️ Lui écrire</span></button></div>
</div></div>
<div class="pgh-modal" data-h="pmodal" role="dialog" aria-label="Ma photo de profil"><div class="pgh-mcard">
  <h3>Ma photo de profil</h3>
  <div class="pgh-mprev"><div class="cut"><img alt="" data-h="pimg"></div><div class="rond"><img alt="" data-h="pimg2"></div></div>
  <p data-h="ptext"></p>
  <div class="pgh-mscope" data-h="pscope"></div>
  <div class="pgh-mbtns"><button class="pgh-cta glass" data-h="pno">Annuler</button><button class="pgh-cta gold" data-h="pok">${PGH_SVG.check}<span>Utiliser cette photo</span></button></div>
</div></div>
<div class="pgh-modal pgh-buym" data-h="bmodal" role="dialog" aria-label="Acheter avec des lucioles"><div class="pgh-mcard">
  <div class="pgh-burst" data-h="bburst"></div>
  <div class="pgh-bth" data-h="bth"></div>
  <h3 data-h="bname"></h3>
  <span class="pgh-tier" data-h="btier"></span>
  <div class="pgh-bprice" data-h="bprice"></div>
  <div class="pgh-bbal" data-h="bbal"></div>
  <p data-h="bmsg"></p>
  <div class="pgh-mbtns"><button class="pgh-cta glass" data-h="bno">Pas maintenant</button><button class="pgh-cta gold" data-h="bok"></button></div>
</div></div>
<div class="pgh-modal pgh-micm" data-h="micm" role="dialog" aria-label="Le micro"><div class="pgh-mcard">
  <div class="ic">🎤</div><h3>Fais parler ton avatar</h3>
  <p>Parle, et la bouche de ton avatar bouge avec ta voix. Le son est analysé <b>ici, sur ton appareil</b> : rien n'est enregistré, rien n'est envoyé. Touche encore 🎤 pour couper le micro.</p>
  <p data-h="micwords" hidden>Et dis-lui « oui », « non » ou « salut » (ou ris, grogne « grrr », dis « pas content » ou « six-sept » !) : il te répond d’un geste, tout de suite. Les mots sont reconnus <b>ici</b>, sans rien envoyer (la borne les prépare d’avance en Wi‑Fi).</p>
  <div class="pgh-mbtns"><button class="pgh-cta glass" data-h="micno">Pas maintenant</button><button class="pgh-cta gold" data-h="micok"><span>Autoriser le micro</span></button></div>
</div></div>
<div class="pgh-modal pgh-earm" data-h="earm" role="dialog" aria-label="Parle à ton avatar"><div class="pgh-mcard">
  <div class="ic">👂</div><h3>Parle à ton avatar</h3>
  <ul><li><b>👋</b><span>Dis « salut », « coucou » ou « bonjour » : il te fait coucou et te répond.</span></li><li><b>👍</b><span>Dis « oui » : il hoche la tête.</span></li><li><b>👎</b><span>Dis « non » : il fait non de la tête.</span></li></ul>
  <small data-h="earwho">Les mots sont reconnus par ton téléphone, sans rien enregistrer. Touche l'oreille pour qu'il arrête d'écouter.</small>
  <div class="pgh-mbtns"><button class="pgh-cta glass" data-h="earno">Pas maintenant</button><button class="pgh-cta gold" data-h="earok"><span>C'est parti !</span></button></div>
</div></div>
<div class="pgh-th" data-h="th" role="dialog" aria-label="Conversation">
  <header class="pgh-thh"><button class="pgh-thx" data-h="thx" aria-label="Retour aux messages">‹</button><span class="pgh-sma" data-h="thav"></span><div class="tx"><b data-h="thname"></b><small data-h="thsub"></small></div></header>
  <div class="pgh-thl" data-h="thl" aria-live="polite"></div>
  <form class="pgh-thf" data-h="thf"><textarea data-h="tht" rows="1" maxlength="600" placeholder="Écris ton message…" aria-label="Ton message"></textarea><span class="pgh-thc" data-h="thc"></span><button class="pgh-thsend" data-h="thsend" type="submit" aria-label="Envoyer" disabled><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.5-7.5a1 1 0 0 0 0-1.8L3.4 3.6a.9.9 0 0 0-1.3 1L4 11l9 1-9 1-1.9 6.4a.9.9 0 0 0 1.3 1z"/></svg></button></form>
  <div class="pgh-thro" data-h="thro" hidden></div>
  <div class="pgh-rxveil" data-h="rxveil" hidden></div>
  <div class="pgh-rxbar" data-h="rxbar" role="menu" aria-label="Réagir à ce message" hidden></div>
</div>
<div class="pgh-toast" data-h="toast"></div>`);
  }

  // fiche de téléchargement du PC : telecharger/pegase-pc.json = { version, size, sha256, url, notes } ; absente (404) = « Bientôt »
  async function pcManifest() {
    const base = new URL(ROOT() + 'telecharger/pegase-pc.json', location.href);
    let r;
    try {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null, to = ctl ? setTimeout(() => ctl.abort(), 8000) : 0;
      r = await fetch(base.href + '?t=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      clearTimeout(to);
    } catch (e) { return { state: 'offline' }; }
    if (!r.ok) return { state: r.status === 404 ? 'soon' : 'error' };
    let j = null; try { j = await r.json(); } catch (e) { return { state: 'error' }; }
    if (!j || typeof j !== 'object' || typeof j.url !== 'string' || !j.url) return { state: 'soon' };
    let url; try { url = new URL(j.url, base).href; } catch (e) { return { state: 'error' }; }
    if (!/^https?:/.test(url)) return { state: 'error' };
    const notes = Array.isArray(j.notes) ? j.notes.filter((x) => typeof x === 'string') : typeof j.notes === 'string' && j.notes ? j.notes.split('\n').filter(Boolean) : [];
    return { state: 'ok', version: j.version != null ? String(j.version).replace(/\s*\(essai[^)]*\)\s*$/i, '') : '', size: +j.size || 0, sha256: /^[0-9a-f]{64}$/i.test(j.sha256 || '') ? String(j.sha256).toLowerCase() : '', url, notes: notes.slice(0, 8) };
  }
  const fmtSize = (n) => n >= 1e9 ? (n / 1e9).toFixed(1).replace('.', ',') + ' Go' : Math.max(1, Math.round(n / 1e6)) + ' Mo';

  // ---------------------------------------------------------------------------
  // LE CRÉATEUR : toute la garde-robe du pack (catalogue de pegase.perso.bin), TRÈS PEU de choses ouvertes au départ, le reste VISIBLE
  // avec un cadenas (prix en lucioles, récompense de mission, ou « Secret »). On peut ESSAYER une pièce verrouillée ; on n'enregistre que
  // ce qu'on possède. Possédé = FREE + ce que portait déjà l'avatar enregistré (rien n'est repris) + plus tard le serveur (pg_profile.owned).
  // ---------------------------------------------------------------------------
  const CHARS_N = ['Sally', 'Chloé', 'Mary', 'Zulle', 'Javi', 'John', 'Galvon'];
  const FREE_LOOKS = [0, 2, 4, 5];                                           // Sally, Mary, Javi, John (2 filles, 2 garçons) : ouverts dès le départ
  const LOOK_LOCK = { 1: ['rare', 450], 3: ['legend', 900] };
  // récompenses (cadeaux) et secrets (jamais dire comment)
  const REWARD = { 'hat.beanie': 'Récompense : ta première photo de Pégase', 'top.hoodie': 'Récompense : 7 jours de suite dans Pégase',
    'hb.punk': 'Récompense : 3 missions du jour réussies', 'feet.work_boots': 'Récompense : 10 animaux photographiés', cam: 'Offert par le maire à ton arrivée dans le jeu',
    'fx:blush': 'Récompense : inviter un copain dans Pégase' };
  const SECRET = new Set(['look:6', 'hacc.alien_attena', 'sk:11', 'elf', 'ey:8']);
  const SKIN_LOCK = { 9: ['rare', 300], 10: ['rare', 300] };                // peaux de fantaisie (les peaux naturelles sont toutes ouvertes)
  const EYE_FREE = new Set([0, 1, 2, 3, 4, 5]);
  const HAIRC_FREE = new Set([44, 45, 19, 46, 47, 48, 8, 49, 50, 51, 52, 5]);  // couleurs de cheveux naturelles
  const FACE_LOCK = { 3: ['commun', 120], 4: ['commun', 120], 5: ['rare', 250] };
  const RAR = { commun: 'Commun', rare: 'Rare', legend: 'Légendaire', secret: 'Secret', cadeau: 'Cadeau' };
  const TIER2 = { basique: 'commun', joli: 'rare', rare: 'legend' };
  const EDCATS = [
    { k: 'perso', n: 'Personnages', ic: 'body', fr: 'corps' }, { k: 'corps', n: 'Corps', ic: 'me', fr: 'corps' }, { k: 'visage', n: 'Visage', ic: 'face', fr: 'visage' },
    { k: 'cheveux', n: 'Coiffures', ic: 'hair', fr: 'tete' }, { k: 'barbe', n: 'Barbe', ic: 'beard', fr: 'visage' }, { k: 'maquillage', n: 'Maquillage', ic: 'makeup', fr: 'visage' }, { k: 'haut', n: 'Hauts', ic: 'shirt', fr: 'buste' }, { k: 'bas', n: 'Bas', ic: 'pants', fr: 'jambes' },
    { k: 'tenue', n: 'Robes', ic: 'dress', fr: 'corps' }, { k: 'pieds', n: 'Chaussures', ic: 'shoe', fr: 'pieds' }, { k: 'chapeau', n: 'Chapeaux', ic: 'tophat', fr: 'tete' },
    { k: 'acc', n: 'Accessoires', ic: 'glasses', fr: 'buste' }];
  const SLOT_OF_CAT = { haut: ['top'], bas: ['bot'], tenue: ['ovr'], pieds: ['feet'], chapeau: ['hat', 'hacc'], acc: ['glass', 'glov'] };
  Object.assign(PGH_SVG, {
    makeup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21h6v-8H9z"/><path d="M9.5 13l1-6.5c.2-1.2 2.8-1.2 3 0l1 6.5"/><path d="M11 6.5 12 3l1 3.5"/><path d="M18.5 6.5l1.2-1.2M19.5 10h1.6M4.5 10H2.9M5.5 6.5 4.3 5.3"/></svg>',
    face: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10.5" r="1" fill="currentColor"/><circle cx="15" cy="10.5" r="1" fill="currentColor"/><path d="M8.5 15c2 1.8 5 1.8 7 0"/></svg>',
    beard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9v3c0 5 3.2 9 7 9s7-4 7-9V9"/><path d="M8.5 14.5c1.2-1 2.2-1 3.5 0 1.3-1 2.3-1 3.5 0"/><path d="M5 9c2 1.5 4 2 7 2s5-.5 7-2"/></svg>',
    pants: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M6 3h12l1 18h-5l-2-11-2 11H5z"/></svg>',
    dress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M9 3l-1 5 2 2-5 11h14l-5-11 2-2-1-5"/><path d="M9 3c1 1.3 5 1.3 6 0"/></svg>',
    shoe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 17V8h5c0 3 2 4 5 5l6 1c1.5.3 2 1.4 2 3H3z"/><path d="M3 20h18"/></svg>',
    fem: '<svg viewBox="0 0 40 56" fill="currentColor"><circle cx="20" cy="9" r="7"/><path d="M12 19h16l6 19h-6l-1 16h-5V40h-4v14h-5l-1-16H6z"/></svg>',
    masc: '<svg viewBox="0 0 40 56" fill="currentColor"><circle cx="20" cy="9" r="7"/><path d="M9 19h22v18h-4v17h-5V39h-4v15h-5V37H9z"/></svg>',
    ear: '<svg viewBox="0 0 48 48" fill="none" stroke="#fff4de" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M16 40c6 0 6-6 10-10s8-6 8-14C34 9 29 5 23 5S12 9 12 16"/><path d="M34 12 44 3"/></svg>',
    cam: '<svg viewBox="0 0 64 64"><rect x="8" y="24" width="48" height="30" rx="7" fill="#6b4226"/><rect x="8" y="22" width="48" height="8" rx="3" fill="#d6b04c"/><rect x="14" y="16" width="12" height="8" rx="2" fill="#d6b04c"/><circle cx="34" cy="39" r="11" fill="#d6b04c"/><circle cx="34" cy="39" r="8" fill="#1a1d2e"/><circle cx="31" cy="36" r="2.5" fill="#cfe3ff"/></svg>',
    q: '<svg viewBox="0 0 48 48"><defs><radialGradient id="pghQ" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#e9d8ff"/><stop offset="1" stop-color="#7a5ac8"/></radialGradient></defs><circle cx="24" cy="24" r="18" fill="url(#pghQ)" opacity=".85"/><path d="M18.5 18.5a5.6 5.6 0 1 1 7.6 5.2c-1.4.6-2.1 1.5-2.1 3v1.3" fill="none" stroke="#2a1450" stroke-width="3.4" stroke-linecap="round"/><circle cx="24" cy="33.6" r="2.1" fill="#2a1450"/><path d="M38 8l1.2 3 3 1.2-3 1.2L38 16.4l-1.2-3-3-1.2 3-1.2z" fill="#fff6c8"/></svg>'
  });
  const FACE_N = ['Doux', 'Rieur', 'Rêveur', 'Malin', 'Costaud', 'Sage'];
  function faceSVG(i) {
    const jaw = ['M32 9C19 9 13 19 13 31c0 13 8 23 19 23s19-10 19-23C51 19 45 9 32 9z', 'M32 9C18 9 12 19 12 31c0 14 9 24 20 24s20-10 20-24C52 19 46 9 32 9z',
      'M32 9C19 9 13 19 13 31c0 13 9 22 19 22s19-9 19-22C51 19 45 9 32 9z', 'M32 9C20 9 14 18 14 30c0 12 9 25 18 25s18-13 18-25C50 18 44 9 32 9z',
      'M32 9C18 9 12 18 12 30c0 9 3 16 7 20 4 4 8 5 13 5s9-1 13-5c4-4 7-11 7-20C52 18 46 9 32 9z', 'M32 9C19 9 13 19 13 31c0 13 8 23 19 23s19-10 19-23C51 19 45 9 32 9z'][i];
    const eyes = [['M20 31q3.5-3 7 0', 'M37 31q3.5-3 7 0'], ['M20 32q3.5-5 7 0', 'M37 32q3.5-5 7 0'], ['M20 30q3.5 3 7 0', 'M37 30q3.5 3 7 0'], ['M20 32l7-2.5', 'M37 29.5l7 2.5'], ['M20 31h7', 'M37 31h7'], ['M20 30q3.5 2 7 0', 'M37 30q3.5 2 7 0']][i];
    const mouth = ['M27 43q5 3.5 10 0', 'M25 42q7 7 14 0', 'M28 43q4 2 8 0', 'M27 44q6 2 11-2', 'M27 44h10', 'M28 44q4-1 8 0'][i];
    return `<svg viewBox="0 0 64 64"><path d="${jaw}" fill="#f2c7a3" stroke="#c48a66" stroke-width="1.4"/><circle cx="20" cy="38" r="3.2" fill="#f19a8e" opacity=".45"/><circle cx="44" cy="38" r="3.2" fill="#f19a8e" opacity=".45"/>
      <path d="${eyes[0]}M${eyes[1].slice(1)}" stroke="#3a2416" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="${mouth}" stroke="#8a3a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`;
  }
  const browSVG = (thick) => `<svg viewBox="0 0 64 64"><path d="M10 30q12-10 22-4M34 26q10-6 22 4" stroke="#4a2c18" stroke-width="${thick ? 7 : 3.5}" fill="none" stroke-linecap="round"/></svg>`;
  const lashSVG = (long) => `<svg viewBox="0 0 64 64"><path d="M12 36q20-14 40 0" stroke="#2a1a14" stroke-width="3" fill="none"/>${[16, 22, 28, 34, 40, 46].map((x) => `<path d="M${x} ${x < 32 ? 33 - (x - 12) * 0.35 : 33 - (52 - x) * 0.35}l${(x - 32) / 6} -${long ? 12 : 6}" stroke="#2a1a14" stroke-width="2.2" stroke-linecap="round"/>`).join('')}<circle cx="32" cy="42" r="7" fill="#5a3a24"/></svg>`;

  // ---------------------------------------------------------------------------
  // MISSIONS DU JOUR (lecture seule) : modèles ~/jdv-tools/pegase/server/missions-jour.json (injectés par tools/assemble.js) et TIRAGE
  // partagé avec le jeu (référence : server/missions-jour-tirage.js ; règle dans CLAUDE.md « Missions du jour : le tirage »).
  //   graine = FNV-1a 32 bits des octets UTF-8 de « jour|PSEUDO » (pg_me.day, pg_me.name) ; suite = LCG s = s·1664525 + 1013904223 (mod 2^32),
  //   valeur = s >>> 8 ; 1) mélange (Fisher-Yates) des sortes actives, 2) mélange des modèles de chaque sorte, 3) un tirage par paramètre
  //   de chaque modèle (ordre du fichier) ; liste = sortes reçues aujourd'hui, puis les premières faisables (needs ⊆ missions faites), 3 au plus.
  // ---------------------------------------------------------------------------
  const MJOUR = {"v":1,"note":"Missions du jour de Pégase : modèles (MISSIONS.md §3) et tirage PARTAGÉ par le jeu et le hub de la borne. Règle complète : jdv/CLAUDE.md « Missions du jour : le tirage ». Ne pas réordonner (l'ordre fait partie du tirage) : ajouter à la fin, ou mettre actif:false.","sortes":[{"id":"jour_photo","nom":"Photo","ico":"📷","actif":true,"min":25,"max":70,"tpl":[{"k":"1","n":1,"t":"Photographie le chat {0}","p":[[["toit","sur un toit"],["dort","endormi"],["oiseau","avec un oiseau"]]],"lu":60,"needs":["m1"]},{"k":"2","n":2,"t":"Photographie {0} à {1}","p":[[["cerf","un cerf"],["sanglier","un sanglier"],["lapin","un lapin"],["bouquetin","un bouquetin"]],[["aube","l'aube"],["doree","l'heure dorée"]]],"lu":40,"needs":["m1"]},{"k":"4","n":4,"t":"Photographie {0} papillons en gros plan","p":[[["2","2"],["3","3"]]],"lu":50,"needs":["m1"]},{"k":"5","n":5,"t":"Photographie un oiseau en vol","p":[],"lu":50,"needs":["m1"]},{"k":"6","n":6,"t":"Photographie deux espèces différentes sur la même photo","p":[],"lu":50,"needs":["m1"]},{"k":"8","n":8,"t":"Photographie le moulin {0}","p":[[["coucher","au coucher du soleil"],["nuit","sous les étoiles"]]],"lu":30,"needs":["m1"]},{"k":"11","n":11,"t":"Photographie une espèce que tu n'as jamais eue","p":[],"lu":70,"needs":["m1"]},{"k":"34","n":34,"t":"Photographie {0} lampyres la nuit","p":[[["3","3"],["5","5"]]],"lu":50,"needs":["m1"]},{"k":"4f","n":4,"t":"Photographie un papillon posé sur {0}","p":[[["colza","un colza"],["iris","un iris"],["coquelicot","un coquelicot"],["lys","un lys de la paix"]]],"lu":55,"needs":["m5"]},{"k":"60","n":60,"t":"Photographie le grand-duc","p":[],"lu":70,"needs":["m14"]},{"k":"61","n":61,"t":"Fais une photo qui vaut {0} points au concours","p":[[["60","60"],["90","90"]]],"lu":50,"needs":["m15"]},{"k":"62","n":62,"t":"Photographie {0} avec un animal","p":[[["fontaine","la fontaine"],["mairie","la mairie"],["musee","le musée"]]],"lu":45,"needs":["m15"]}]},{"id":"jour_ferme","nom":"Potager","ico":"🌱","actif":true,"min":25,"max":70,"tpl":[{"k":"14r","n":14,"t":"Récolte {0} radis","p":[[["5","5"],["8","8"]]],"lu":40,"needs":["m4"]},{"k":"14t","n":14,"t":"Récolte {0} tomates","p":[[["3","3"],["5","5"]]],"lu":40,"needs":["m6"]},{"k":"15","n":15,"t":"Arrose ton potager {0} fois aujourd'hui","p":[[["2","2"],["3","3"]]],"lu":25,"needs":["m4"]},{"k":"16","n":16,"t":"Plante {0} sortes de graines","p":[[["2","2"]]],"lu":35,"needs":["m6"]},{"k":"18","n":18,"t":"Laboure {0} cases de terre neuves","p":[[["4","4"],["6","6"]]],"lu":30,"needs":["m4"]}]},{"id":"jour_marche","nom":"Marché","ico":"🧺","actif":true,"min":30,"max":80,"tpl":[{"k":"19","n":19,"t":"Mets {0} légumes en vente au marché","p":[[["3","3"],["5","5"]]],"lu":30,"needs":["m7"]},{"k":"22","n":22,"t":"Mets un tableau en vente","p":[],"lu":30,"needs":["m10"]}]},{"id":"jour_maison","nom":"Maison","ico":"🏡","actif":true,"min":25,"max":30,"tpl":[{"k":"25","n":25,"t":"Pose un nouveau meuble chez toi","p":[],"lu":30,"needs":["m3"]},{"k":"26","n":26,"t":"Change de tenue au dressing","p":[],"lu":25,"needs":["m3"]},{"k":"27","n":27,"t":"Accroche un tableau dans ta maison","p":[],"lu":30,"needs":["m10"]}]},{"id":"jour_social","nom":"Copains","ico":"💌","actif":false,"min":25,"max":50,"tpl":[{"k":"28","n":28,"t":"Rends visite à la maison d'un copain","p":[],"lu":40,"needs":["m3"]},{"k":"29","n":29,"t":"Offre un cadeau à un copain","p":[],"lu":50,"needs":["m3"]}]},{"id":"jour_balade","nom":"Balade","ico":"🥾","actif":true,"min":20,"max":50,"tpl":[{"k":"33","n":33,"t":"Assieds-toi sur un banc {0} au coucher du soleil","p":[[["lac","au bord du lac"],["place","sur la place"]]],"lu":30,"needs":["m1"]},{"k":"36","n":36,"t":"Fais le tour du lac à pied","p":[],"lu":30,"needs":["m1"]},{"k":"37","n":37,"t":"Va dire bonjour à {0}","p":[[["rosalie","Rosalie"],["basile","Basile"],["iris","Mlle Iris"],["auguste","Papi Auguste"]]],"lu":20,"needs":["m1"]},{"k":"38","n":38,"t":"Apporte 2 tomates à {0}","p":[[["auguste","Papi Auguste"],["rosalie","Rosalie"]]],"lu":50,"needs":["m6"]},{"k":"39","n":39,"t":"Marche {0} dans le monde","p":[[["1km","1 km"],["2km","2 km"]]],"lu":25,"needs":["m1"]},{"k":"40","n":40,"t":"Joue avec le chat : suis-le {0} sans le perdre","p":[[["20","20 secondes"],["30","30 secondes"]]],"lu":40,"needs":["m1"]}]},{"id":"jour_peche","nom":"Pêche","ico":"🎣","actif":true,"min":30,"max":60,"tpl":[{"k":"46","n":46,"t":"Pêche 3 poissons {0}","p":[[["lac","au lac"],["riviere","en rivière"],["mer","en mer"]]],"lu":40,"needs":["m9b"]},{"k":"47","n":47,"t":"Pêche un poisson {0}","p":[[["nuit","de nuit"],["aube","à l'aube"]]],"lu":50,"needs":["m9b"]},{"k":"48","n":48,"t":"Pêche un poisson de plus de {0} cm","p":[[["30","30"],["40","40"]]],"lu":60,"needs":["m9b"]},{"k":"49","n":49,"t":"Creuse {0} vers, puis pêche avec","p":[[["3","3"],["5","5"]]],"lu":30,"needs":["m9b"]}]},{"id":"jour_nature","nom":"Pelle et filet","ico":"🦋","actif":true,"min":35,"max":50,"tpl":[{"k":"50","n":50,"t":"Trouve {0} trésors enfouis à la pelle","p":[[["2","2"]]],"lu":50,"needs":["m9"]},{"k":"51","n":51,"t":"Attrape {0} insectes différents au filet","p":[[["3","3"]]],"lu":40,"needs":["m5"]},{"k":"52","n":52,"t":"Attrape un insecte {0}","p":[[["eau","sur l'eau"],["tronc","sur un tronc"],["fleurs","dans les fleurs"]]],"lu":35,"needs":["m5"]}]},{"id":"jour_musee","nom":"Musée","ico":"🏛️","actif":true,"min":25,"max":70,"tpl":[{"k":"53","n":53,"t":"Donne une nouvelle espèce au musée de Mlle Iris","p":[],"lu":60,"needs":["m5b"]}]},{"id":"jour_pegagram","nom":"PegaGram","ico":"📸","actif":true,"min":25,"max":40,"tpl":[{"k":"57","n":57,"t":"Partage ta plus belle photo sur PegaGram","p":[],"lu":30,"needs":["m1"]}]}]};
  // modèles pas encore réalisables dans le jeu : 22 (tableau en vente), 27 (tableau accroché), 36 (tour du lac à pied), 8 (moulin),
  // 46 « en mer » (pas de pêche en mer) — copie exacte de PegaseDaily.Jouable (jeu) et de JOUABLE (server/missions-jour-tirage.js)
  const mjJouable = (k, ids) => !(k === '22' || k === '27' || k === '36' || k === '8' || (k === '46' && ids.length > 0 && ids[0] === 'mer'));
  function mjDraw(mj, day, name, done, today) {
    if (!mj || !Array.isArray(mj.sortes)) return [];
    const by = new TextEncoder().encode(String(day) + '|' + String(name));
    let s = 2166136261;
    for (const b of by) { s ^= b; s = Math.imul(s, 16777619) >>> 0; }
    const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s >>> 8; };
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = next() % (i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    const S = mj.sortes.filter((x) => x.actif);
    const order = shuffle(S.slice());
    const tord = new Map(); for (const x of S) tord.set(x.id, shuffle(x.tpl.slice()));
    const pix = new Map(); for (const x of S) for (const t of x.tpl) pix.set(x.id + '/' + t.k, t.p.map((P) => next() % P.length));
    const D = new Set(done || []), T = new Set(today || []);
    // 21 oct. 2026 : même règle que le jeu (Daily.Draw « jouable », PegaseDaily.Jouable) : un modèle pas encore faisable dans le jeu est
    // sauté comme un modèle aux missions requises pas faites (même graine, mêmes mélanges : seul le choix passe au suivant)
    const avail = (x, t) => (t.needs || []).every((m) => D.has(m)) && mjJouable(t.k, pix.get(x.id + '/' + t.k).map((ix, i) => t.p[i][ix][0]));
    const pickT = (x) => tord.get(x.id).find((t) => avail(x, t)) || null;
    const out = [];
    for (const x of order) if (out.length < 3 && T.has(x.id)) out.push(x);
    for (const x of order) if (out.length < 3 && !T.has(x.id) && pickT(x)) out.push(x);
    out.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return out.map((x) => {
      const t = pickT(x) || tord.get(x.id)[0], ix = pix.get(x.id + '/' + t.k), p = t.p.map((P, i) => P[ix[i]]);
      return { sorte: x.id, nom: x.nom, ico: x.ico, min: x.min, max: x.max, tpl: t.n, k: t.k, p: p.map((v) => v[0]),
        text: t.t.replace(/\{(\d)\}/g, (m, i) => (p[+i] ? p[+i][1] : '')), lu: Math.max(x.min, Math.min(x.max, t.lu)), done: T.has(x.id) };
    });
  }
  // jour Pégase (change à 5 h, heure de Paris) quand pg_me ne le donne pas
  function pgDayLocal() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() - 5 * 3600e3)); }
    catch (e) { const d = new Date(Date.now() - 5 * 3600e3); return d.toISOString().slice(0, 10); }
  }
  // l'histoire d'arrivée (histoire.json du jeu) ; titres de secours si pg_mission_catalog ne répond pas
  const STORY = ['m1', 'm2', 'm3', 'm4', 'm5', 'm5b', 'm6', 'm7', 'm8', 'm9', 'm9b', 'm9c', 'm9d', 'm10', 'm11'];
  const QUESTS = ['g1', 'b1', 'i1'];
  const STORY_FB = { m1: ['Le chat des toits', 'auguste', 150], m2: ['Où poser ses valises ?', 'auguste', 50], m3: ['Quatre murs et un toit', 'auguste', 80],
    m4: ['Les graines du maire', 'auguste', 40], m5: ['La réserve de Mlle Iris', 'auguste', 0], m5b: ['Un papillon pour le musée', 'iris', 60],
    m6: ['Première récolte', 'auguste', 60], m7: ['Mon premier étal', 'auguste', 60], m8: ['L\'échoppe de Rosalie', 'rosalie', 30],
    m9: ['Le vieux Gaspard', 'auguste', 0], m9b: ['Trois vers de terre', 'gaspard', 50], m9c: ['Ta première prise', 'gaspard', 40],
    m9d: ['L\'aquarium de Mlle Iris', 'iris', 60], m10: ['Un tableau pour la mairie', 'auguste', 120], m11: ['Le bruit de la cascade', 'auguste', 100],
    g1: ['Le bon appât', 'gaspard', 60], b1: ['Le marché aux poissons', 'basile', 60], i1: ['Les ailes de la réserve', 'iris', 80] };
  const GIVER = { auguste: ['Papi Auguste', '🎩'], iris: ['Mlle Iris', '🦋'], gaspard: ['le vieux Gaspard', '🎣'], basile: ['Basile', '🧺'], rosalie: ['Rosalie', '🌻'] };
  const SEED_N = { radis: 'radis', tomate: 'tomate', carotte: 'carotte' };
  // achats : réponses « normales » du serveur (r_why de pg_unlock_buy)
  const RMAP = { commun: 'commun', rare: 'rare', legend: 'legend', cadeau: 'cadeau', secret: 'secret' };
  const rid = (n) => { const a = new Uint8Array(n), c = 'abcdefghijklmnopqrstuvwxyz0123456789'; try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < n; i++) a[i] = Math.random() * 256; } return Array.from(a, (x) => c[x % 36]).join(''); };
  const fmtN = (n) => Number(n).toLocaleString('fr-FR');

  function mountHub(root, api) {
    const FD = (api && api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif", FB = (api && api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const mm = (q) => typeof matchMedia === 'function' && matchMedia(q).matches;
    const touch = mm('(pointer: coarse)') || mm('(any-pointer: coarse)') || ((navigator.maxTouchPoints || 0) > 0 && !mm('(any-pointer: fine)'));
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '') || (touch && Math.min(screen.width || 9999, screen.height || 9999) < 900);
    const pl = (api && api.player) || {}, guest = !pl.name || pl.name === 'INVITÉ';
    const who = guest ? 'TOI' : String(pl.name).slice(0, 14);
    const KEY = 'jdw.pegase.garde.' + (guest ? 'INVITE' : String(pl.name).toUpperCase().replace(/[^A-Z0-9À-ÖØ-Þ_ -]/g, '').slice(0, 16));
    const PG = api && api.pegase && typeof api.pegase.info === 'function' ? api.pegase : null;
    const pgInfo = () => { try { return (PG && PG.info()) || {}; } catch (e) { return {}; } };
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    root.textContent = '';
    const box = document.createElement('div'); box.className = 'pgh';
    box.innerHTML = buildPage(FD, FB, who);
    root.appendChild(box);
    const $ = {}; box.querySelectorAll('[data-h]').forEach((n) => { $[n.dataset.h] = n; }); $.copy = box.querySelector('.pgh-copy');
    const listeners = [], timers = new Set(), ivals = new Set(); let dead = false;
    const on = (t, ty, fn, o) => { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); };
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };
    const every = (fn, ms) => { const id = setInterval(() => { if (!dead) fn(); }, ms); ivals.add(id); return id; };
    const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* rien */ } } };
    const report = (msg, detail) => { try { const err = new Error(msg); err.stack = detail || msg; const ev = new Event('unhandledrejection'); ev.reason = err; ev.promise = Promise.resolve(); window.dispatchEvent(ev); } catch (e) { /* rien */ } };
    const tone = (a, b) => { try { api && api.audio && api.audio.tone(a, 0.12, 'sine', 0.045, b); } catch (e) { /* rien */ } };
    let toastT = 0;
    const toast = (s, ms) => { $.toast.textContent = String(s).replace(/« /g, '« ').replace(/ ([»!?:;])/g, ' $1'); toastPlace(); $.toast.classList.add('on'); later(toastPlace, 60); later(toastPlace, 320); clearTimeout(toastT); toastT = later(() => $.toast.classList.remove('on'), ms || 2800); };
    // place du toast (1.20.5) : le 1er espace LIBRE en partant du haut (entre ce qui est affiché dans sa colonne : étiquette, titre, phrase, nom
    // de l'avatar, progression, gestes, boutons) ; rien de libre : en haut comme avant
    function toastPlace() {
      try {
        const R = ($.toast.offsetParent || box).getBoundingClientRect(), h = $.toast.offsetHeight || 40, w = Math.min($.toast.offsetWidth || 240, R.width * 0.88), x0 = R.width / 2 - w / 2 - 6, x1 = R.width / 2 + w / 2 + 6;
        const els = [...box.querySelectorAll('.pgh-copy > *, .pgh-name.on, .pgh-mprog:not([hidden]), .pgh-emotes, .pgh-ctas, .pgh-ear:not([hidden])')];
        const bars = [];
        for (const el of els) { const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue; const op = +getComputedStyle(el).opacity; if (op < 0.1 || getComputedStyle(el.closest('.pgh-copy,.pgh-bottom') || el).opacity < 0.1) continue;
          const a = r.top - R.top, b = r.bottom - R.top, l = r.left - R.left, rr = r.right - R.left; if (b < 0 || a > R.height || rr < x0 || l > x1) continue; bars.push([a - 8, b + 8]); }
        // hub 2.10 : jamais sur le VISAGE de l'avatar (gros plan du micro 🎤 : la bulle « 👎 non » tombait au milieu de la figure)
        const fr = STG && STG.ready && STG.ready() && STG.faceRect ? STG.faceRect() : null;
        if (fr) { const a = fr.top - R.top, b = fr.bottom - R.top, l = fr.left - R.left, rr = fr.right - R.left; if (!(b < 0 || a > R.height || rr < x0 || l > x1)) bars.push([a - 6, b + 6]); }
        bars.sort((u, v) => u[0] - v[0]);
        let y = 14, top = 14;
        for (const [a, b] of bars) { if (a - y >= h) break; y = Math.max(y, b); }
        top = y + h <= R.height - 10 ? y : 14;
        $.toast.style.setProperty('--tt', Math.round(top) + 'px');
        if (window.JDW_PG_TEST) window.__pgTOAST = { R: [R.top, R.height], h, w, bars, top };
      } catch (e) { $.toast.style.setProperty('--tt', '14px'); }
    }
    const memberMode = () => { const i = pgInfo(); return !!PG && !i.guest && !!i.name; };

    // ---------- le catalogue (dans pegase.perso.bin) ----------
    let CAT = null, ITEMS = null;
    const catReady = needPack('perso').then(() => { const b = STORE.files.get('perso/catalog.json'); CAT = JSON.parse(new TextDecoder().decode(b)); ITEMS = new Map(CAT.items.map((i) => [i.id, i])); return CAT; });
    catReady.catch(() => {});
    const palHex = (i) => (CAT && CAT.palette[i] ? CAT.palette[i][1] : '#888');

    // ---------- l'avatar enregistré ----------
    // format (garde-robe.json du jeu + l'apparence complète du créateur) : { v: 1, tenue: o, desc: "…", look: { … } }
    const readSaved = () => { const s = store.get(KEY); if (!s) return null; try { const j = JSON.parse(s); if (!j || !Number.isInteger(j.tenue) || j.tenue < 0 || j.tenue > 2057) return null; return { tenue: j.tenue, look: j.look && typeof j.look === 'object' ? j.look : null, desc: String(j.desc || '') }; } catch (e) { return null; } };
    let SV = readSaved();                      // ce qui est enregistré (null : rien encore)
    let D = null, S = null;                    // D = apparence affichée / en cours ; S = apparence enregistrée (objet)
    let preset = SV ? SV.tenue % 7 : 0;        // personnage de départ (tenue du jeu = ce numéro)
    const GRAND = new Set();                   // ce que portait déjà l'avatar enregistré : à lui pour toujours
    const OWNED = new Set();                   // débloqué par le serveur (plus tard : pg_profile.owned)
    const lookCopy = (d) => JSON.parse(JSON.stringify(d));
    function keysOf(d) {
      const k = [];
      if (!d) return k;
      for (const [slot, v] of Object.entries(d.it || {})) if (v && v[0]) k.push(slot === 'cam' ? 'cam' : v[0]);
      k.push('sk:' + d.sk, 'ey:' + d.ey, 'fc:' + d.fc, 'pu:' + d.pu, 'hc:' + d.hc, 'hc:' + (d.hc2 == null ? d.hc : d.hc2));
      for (const f of d.fx || []) k.push('fx:' + f);
      if (d.elf) k.push('elf'); if (d.so && d.so[0]) k.push('so:' + d.so[0]);
      return k;
    }
    const MKP = () => (PGM && PGM.MAKEUP) || {};   // maquillage (hub 2.10, src/maquillage.js)
    let FREE = null;
    function freeSet() {
      if (FREE || !CAT) return FREE || new Set();
      FREE = new Set(['brow.stylized_basic_brows', 'brow.stylized_thick_brows', 'lash.stylized_long_lashes', 'lash.stylized_short_lashes', 'teeth.stylized_basic_teeth', 'pu:basic', 'fc:0', 'fc:1', 'fc:2']);
      for (const i of FREE_LOOKS) { const L = CAT.looks[['Sally', 'Chloe', 'Mary', 'Zulle', 'Javi', 'John', 'Galvon'][i]]; for (const v of Object.values(L.it)) if (v && v[0]) FREE.add(v[0]); FREE.add('look:' + i); }
      for (let i = 0; i < 9; i++) FREE.add('sk:' + i);
      for (const i of EYE_FREE) FREE.add('ey:' + i);
      for (const i of HAIRC_FREE) FREE.add('hc:' + i);
      return FREE;
    }
    const owned = (k) => freeSet().has(k) || GRAND.has(k) || OWNED.has(k);
    // rareté / prix / façon de l'obtenir d'une clé verrouillée
    function lockOf(k) {
      if (owned(k)) return null;
      const u = UCAT.get(k);
      if (u) {
        if (u.r_rarity === 'secret' || (SECRET.has(k) && u.r_price == null)) return { r: 'secret' };
        if (u.r_starter) return null;                                   // lot de départ : à tout le monde
        if (u.r_price != null && +u.r_price > 0) return { r: RMAP[u.r_rarity] || 'commun', p: +u.r_price, needs: u.r_needs || '' };
        return { r: 'cadeau', how: u.r_how || REWARD[k] || 'Se gagne dans le jeu' };
      }
      if (SECRET.has(k)) return { r: 'secret' };
      if (REWARD[k]) return { r: 'cadeau', how: REWARD[k] };
      if (k.startsWith('look:')) { const [r, p] = LOOK_LOCK[+k.slice(5)] || ['rare', 450]; return { r, p }; }
      if (k.startsWith('sk:')) { const [r, p] = SKIN_LOCK[+k.slice(3)] || ['rare', 300]; return { r, p }; }
      if (k.startsWith('ey:')) return { r: 'rare', p: 200 };
      if (k.startsWith('hc:')) return { r: 'rare', p: 120 };
      if (k.startsWith('fc:')) { const [r, p] = FACE_LOCK[+k.slice(3)] || ['commun', 120]; return { r, p }; }
      if (k.startsWith('pu:')) return { r: 'commun', p: 80 };
      if (k === 'elf') return { r: 'legend', p: 400 };
      if (k.startsWith('fx:') && MKP()[k.slice(3)] && MKP()[k.slice(3)].r) { const m = MKP()[k.slice(3)]; return { r: m.r, p: m.p }; }   // maquillage (hub 2.10)
      if (k.startsWith('fx:') || k.startsWith('so:')) { const l = CAT && CAT.layers[k.slice(3)]; return { r: TIER2[(l && l.tier) || 'basique'] || 'commun', p: Math.max(40, (l && l.price) || 0) }; }
      if (k === 'cam') return { r: 'cadeau', how: REWARD.cam };
      const it = ITEMS && ITEMS.get(k); if (!it) return { r: 'commun', p: 60 };
      return { r: TIER2[it.tier] || 'commun', p: Math.max(40, it.price || 0) };
    }
    const lockedIn = (d) => keysOf(d).filter((k) => !owned(k)).concat(owned('look:' + preset) ? [] : ['look:' + preset]);
    function keyName(k) {
      if (k.startsWith('look:')) return CHARS_N[+k.slice(5)];
      if (k.startsWith('sk:')) return 'Peau ' + ((CAT && CAT.skin[+k.slice(3)]) || ['?'])[0];
      if (k.startsWith('ey:')) return 'Yeux ' + ((CAT && CAT.eyes[+k.slice(3)]) || ['?'])[0];
      if (k.startsWith('hc:')) return 'Cheveux ' + ((CAT && CAT.palette[+k.slice(3)]) || ['?'])[0];
      if (k.startsWith('fc:')) return 'Visage ' + FACE_N[+k.slice(3)];
      if (k.startsWith('pu:')) return 'Pupilles de chat';
      if (k === 'elf') return 'Oreilles d\'elfe';
      if (k === 'cam') return 'Appareil photo d\'explorateur';
      if (k.startsWith('fx:') && MKP()[k.slice(3)]) return MKP()[k.slice(3)].n;
      if (k.startsWith('fx:') || k.startsWith('so:')) { const l = CAT && CAT.layers[k.slice(3)]; return (l && l.name) || k; }
      const it = ITEMS && ITEMS.get(k); return it ? it.name : k;
    }
    // ce qui est verrouillé revient à l'enregistré (ou disparaît)
    function stripLocked(d, base) {
      d = lookCopy(d); base = base || {};
      for (const [slot, v] of Object.entries(d.it || {})) { const k = slot === 'cam' ? 'cam' : v && v[0]; if (k && !owned(k)) { if (base.it && base.it[slot] && owned(slot === 'cam' ? 'cam' : base.it[slot][0])) d.it[slot] = base.it[slot].slice(); else delete d.it[slot]; } }
      for (const [f, dv] of [['sk', 4], ['ey', 0], ['fc', 0], ['pu', 'basic']]) if (!owned(f + ':' + d[f])) d[f] = base[f] != null && owned(f + ':' + base[f]) ? base[f] : dv;
      if (!owned('hc:' + d.hc)) d.hc = base.hc != null && owned('hc:' + base.hc) ? base.hc : 48;
      if (d.hc2 != null && !owned('hc:' + d.hc2)) d.hc2 = d.hc;
      d.fx = (d.fx || []).filter((f) => owned('fx:' + f));
      if (d.elf && !owned('elf')) d.elf = 0;
      if (d.so && d.so[0] && !owned('so:' + d.so[0])) d.so = null;
      // une robe verrouillée retirée : on remet le haut et le bas (ou la robe) enregistrés
      const bi = base.it || {};
      if (!d.it.ovr) {
        if (!d.it.top && !d.it.bot && bi.ovr && owned(bi.ovr[0])) d.it.ovr = bi.ovr.slice();
        else { if (!d.it.top && bi.top && owned(bi.top[0])) d.it.top = bi.top.slice(); if (!d.it.bot && bi.bot && owned(bi.bot[0])) d.it.bot = bi.bot.slice(); }
      }
      return d;
    }
    function describe(d) {
      if (!d || !ITEMS) return '';
      const n = (s) => { const v = d.it && d.it[s]; const it = v && ITEMS.get(v[0]); return it ? it.name : ''; };
      return [CHARS_N[preset], n('hb') || n('hf'), n('ovr') || [n('top'), n('bot')].filter(Boolean).join(' et '), n('hat') || n('hacc') || n('glass')].filter(Boolean).join(' · ');
    }
    const canon = (d) => ({ v: 1, tenue: preset, desc: describe(d).replace(/"/g, '\''), look: d });

    // ---------- lucioles (porte-monnaie : onglet Moi et créateur), ce qu'on possède, catalogues du serveur ----------
    // pg_me (phase 2b) : ecus, owned (= anciens objets + déblocages), unlocks, missions { done, started, today, week, jour_left, keys }, day, name
    let wallet = null, ME = null, meErr = '';
    const UCAT = new Map();                    // pg_unlock_catalog : r_id → { r_kind, r_label, r_rarity, r_price, r_starter, r_needs, r_how }
    let MCAT = new Map();                      // pg_mission_catalog : r_id → { r_label, r_giver, r_lucioles, r_min, r_max, r_items… }
    function renderWallet() {
      const i = pgInfo(), show = memberMode() && i.online !== false && wallet != null;
      $.wallet.hidden = !show; $.edw.hidden = !show;
      if (wallet != null) { $.walletn.textContent = fmtN(wallet); $.edwn.textContent = fmtN(wallet); }
    }
    // le solde qui monte / descend en douceur (après un achat)
    function walletTo(v) {
      const a = wallet == null ? v : wallet, t0 = performance.now(); wallet = v; renderWallet();
      if (a === v) return;
      const f = (t) => { if (dead) return; const k = Math.min(1, (t - t0) / 700), x = Math.round(a + (v - a) * (1 - Math.pow(1 - k, 3))); $.walletn.textContent = fmtN(x); $.edwn.textContent = fmtN(x); if (k < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }
    async function loadWallet() {
      if (!memberMode()) { renderWallet(); renderToday(); return; }
      try {
        const r = await PG.rpc('pg_me', {}); if (dead) return;
        const j = Array.isArray(r) ? r[0] : r;
        if (j && typeof j === 'object') {
          ME = j; meErr = '';
          if (Number.isFinite(+j.ecus) && !(BUY && BUY.st === 'busy')) wallet = +j.ecus;
          for (const f of ['owned', 'unlocks']) if (Array.isArray(j[f])) for (const x of j[f]) if (typeof x === 'string') OWNED.add(x);
        }
      } catch (e) { if (dead) return; meErr = e && (e.offline || e.guest) ? 'offline' : 'fail'; }
      renderWallet(); ownedChanged(); renderToday();
    }
    async function loadCatalogs() {
      if (!memberMode()) return;
      const C = STORE.pgcat || (STORE.pgcat = { at: 0, u: null, m: null });
      if (!C.u || Date.now() - C.at > 600000) {
        try {
          const [u, m] = await Promise.all([PG.rpc('pg_unlock_catalog', {}), PG.rpc('pg_mission_catalog', {})]);
          if (Array.isArray(u) && u.length) C.u = u; if (Array.isArray(m) && m.length) C.m = m; C.at = Date.now();
        } catch (e) { /* hors ligne, vieille borne : les prix et titres du hub */ }
      }
      if (dead) return;
      UCAT.clear(); for (const r of C.u || []) if (r && typeof r.r_id === 'string') UCAT.set(r.r_id, r);
      MCAT = new Map((C.m || []).filter((r) => r && typeof r.r_id === 'string').map((r) => [r.r_id, r]));
      ownedChanged(); renderToday();
    }
    function ownedChanged() { if (editing) renderEd(); if (tab === 'moi') renderShowcase(); }
    const meMissions = () => (ME && ME.missions && typeof ME.missions === 'object' ? ME.missions : null);
    const arr = (a) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []);
    const doneSet = () => new Set(arr((meMissions() || {}).done));

    // ---------- AUJOURD'HUI : missions du jour + histoire (lecture seule : on les fait et on les récupère dans le jeu) ----------
    let TODAY = null;                          // dernier tirage affiché (pour les essais)
    const mTitle = (id) => { const c = MCAT.get(id); return (c && c.r_label) || (STORY_FB[id] || [id.toUpperCase()])[0]; };
    const mGiver = (id) => { const c = MCAT.get(id); return GIVER[(c && c.r_giver) || (STORY_FB[id] || [])[1]] || null; };
    function unlockName(id) {
      const u = UCAT.get(id); if (u && u.r_label) return u.r_label;
      if (/^obj:/.test(id)) { const n = id.slice(4).replace(/_/g, ' '); return n[0].toUpperCase() + n.slice(1); }
      return keyName(id);
    }
    function rewardHTML(id) {
      const c = MCAT.get(id), fb = STORY_FB[id] || [];
      const lu = c ? (c.r_lucioles | 0) : (fb[2] | 0), out = [];
      if (lu > 0) out.push(`<span class="lu">+${fmtN(lu)} ${LU()}</span>`);
      for (const x of (c && Array.isArray(c.r_items) ? c.r_items : [])) {
        if (x && x.unlock) out.push(`<span>🎁 ${esc(unlockName(x.unlock))}</span>`);
        else if (x && x.item) { const g = /^graine:(.+)$/.exec(x.item); out.push(`<span>🌱 ${esc(g ? (x.qty || 1) + ' graines de ' + (SEED_N[g[1]] || g[1]) : x.item)}</span>`); }
      }
      return out.join('');
    }
    // 22 oct. (jeu, session habitants) : le début de l'histoire (M1 + M2 : arrivée, chat, affiches, permis, parcelle, maison, photos) est UNE
    // mission, « S'installer » (histoire.json › partie.mission ; réussie quand M2 l'est) : le hub la compte comme une seule, étape en dessous
    const START = { name: 'S\'installer', ids: ['m1', 'm2'] };
    function storyHTML(done, started) {
      const list = ['start'].concat(STORY.filter((m) => !START.ids.includes(m)));
      const i = list.findIndex((m) => (m === 'start' ? !done.has('m2') : !done.has(m))), n = list.length;
      if (i === 0) {
        const cur = done.has('m1') ? 'm2' : 'm1', k = START.ids.indexOf(cur), g = mGiver(cur), st = started.has(cur) || k > 0;
        const sub = 'Étape ' + (k + 1) + ' sur ' + START.ids.length + ' : « ' + mTitle(cur) + ' »' + (g ? ', avec ' + g[0] : '') + (k === 0 && !st ? '. Le maire t\'attend à Ailebrune.' : '');
        const rw = START.ids.filter((m) => !done.has(m)).map(rewardHTML).join('');
        return `<div class="pgh-card pgh-story" data-h2="story" data-cur="${cur}"><span class="bk">${g ? g[1] : '📜'}</span><div><small>Ton histoire · mission 1 sur ${n}</small><h3>« ${esc(START.name)} »<span class="st${st ? ' go' : ''}">${st ? 'en cours' : 'à faire'}</span></h3><p>${esc(sub)}</p></div>` +
          `<div class="bar" style="--p:${Math.round(k / START.ids.length / n * 100)}%"><i></i></div>${rw ? `<div class="rw">Récompense : ${rw}</div>` : ''}</div>`;
      }
      if (i < 0) {
        const q = QUESTS.map((m) => { const ok = done.has(m), g = mGiver(m), c = MCAT.get(m), lu = c ? c.r_lucioles | 0 : (STORY_FB[m] || [])[2] | 0;
          return `<li class="${ok ? 'ok' : ''}">${g ? g[1] : '✦'} « ${esc(mTitle(m))} »${g ? ' · ' + esc(g[0]) : ''}<em>${ok ? '✓ faite' : '+' + fmtN(lu) + ' ' + LU()}</em></li>`; }).join('');
        return `<div class="pgh-card pgh-story" data-h2="story" data-cur="fin"><span class="bk">🏆</span><div><small>Ton histoire · ${n} / ${n}</small><h3>L'histoire d'arrivée est finie !</h3><p>Bravo : tu fais partie d'Ailebrune. Les habitants ont encore des quêtes pour toi :</p></div><div class="bar" style="--p:100%"><i></i></div><ul>${q}</ul></div>`;
      }
      const id = list[i], g = mGiver(id), st = started.has(id);
      const sub = (g ? 'Avec ' + g[0] + ' · ' : '') + (st ? 'tu l\'as commencée' : 'à faire dans le jeu');
      return `<div class="pgh-card pgh-story" data-h2="story" data-cur="${id}"><span class="bk">${g ? g[1] : '📜'}</span><div><small>Ton histoire · mission ${i + 1} sur ${n}</small><h3>« ${esc(mTitle(id))} »<span class="st${st ? ' go' : ''}">${st ? 'en cours' : 'à faire'}</span></h3><p>${esc(sub)}</p></div>` +
        `<div class="bar" style="--p:${Math.round(i / n * 100)}%"><i></i></div>${rewardHTML(id) ? `<div class="rw">Récompense : ${rewardHTML(id)}</div>` : ''}</div>`;
    }
    function renderToday() {
      if (!$.sectd) return;
      if (!PG) { $.sectd.hidden = true; return; }
      let h = '', count = '', all = false;
      if (!memberMode()) {
        h = `<div class="pgh-card pgh-tdmsg"><span class="em">🗓️</span><div><h3>Tes missions du jour</h3><p>Avec un compte (gratuit), retrouve ici chaque jour 3 petites missions à faire dans Pégase, les lucioles à gagner et la suite de ton histoire.</p></div><button class="pgh-cta gold" data-h2="tdacct">Créer mon compte</button></div>`;
        TODAY = null;
      } else if (!ME) {
        h = meErr ? `<div class="pgh-card pgh-tdmsg"><span class="em">📡</span><div><h3>Pas de réseau</h3><p>Tes missions du jour reviendront avec la connexion.</p></div></div>`
          : '<div class="pgh-mjs">' + [0, 1, 2].map(() => '<div class="pgh-mj sk"><span class="ic"></span><div><i></i><i></i></div><span></span></div>').join('') + '</div>';
      } else if (!meMissions() || !MJOUR) { $.sectd.hidden = true; return; }
      else {
        const M = meMissions(), done = new Set(arr(M.done)), started = new Set(arr(M.started)), today = arr(M.today);
        const list = mjDraw(MJOUR, ME.day || pgDayLocal(), ME.name || pgInfo().name || '', [...done], today);
        for (const m of list) { const c = MCAT.get(m.sorte); if (c && c.r_min != null && c.r_max != null) m.lu = Math.max(c.r_min, Math.min(c.r_max, m.lu)); }
        TODAY = list;
        const nd = list.filter((m) => m.done).length;
        if (!list.length) h += `<div class="pgh-card pgh-tdmsg"><span class="em">🌅</span><div><h3>Bientôt tes missions du jour</h3><p>Elles s'ouvrent après ta première mission, « ${esc(mTitle('m1'))} ». Papi Auguste t'attend à Ailebrune !</p></div></div>`;
        else {
          h += '<div class="pgh-mjs">' + list.map((m) => `<div class="pgh-mj s-${esc(m.sorte)}${m.done ? ' done' : ''}" data-m="${esc(m.sorte)}" data-k="${esc(m.k)}"><span class="ic">${m.ico || '✦'}</span><div><small>${esc(m.nom || '')}</small><b>${esc(m.text)}</b></div>` +
            `<span class="rw">${m.done ? '✓ Reçue' : '+' + fmtN(m.lu) + ' ' + LU()}</span></div>`).join('') + '</div>';
          count = nd + ' / ' + list.length + ' faite' + (nd > 1 ? 's' : ''); all = nd >= list.length;
          if (all) h += '<p class="pgh-tdnote ok">🎉 Bravo, tout est fait pour aujourd\'hui ! De nouvelles missions arrivent demain à 5 h.</p>';
        }
        h += storyHTML(done, started);
        h += '<p class="pgh-tdnote">Les missions se font dans le jeu : tes lucioles arrivent quand tu les récupères dans le téléphone de ton personnage.</p>';
      }
      $.sectd.hidden = false;
      if ($.tdbox.innerHTML !== h) $.tdbox.innerHTML = h;
      $.tdn.textContent = count; $.tdn.classList.toggle('all', all);
    }
    on($.sectd, 'click', (e) => { if (e.target.closest('[data-h2="tdacct"]')) { try { PG && PG.account && PG.account(); } catch (x) { /* rien */ } } });

    // ---------- ACHETER une pièce verrouillée (pg_unlock_buy : prix du serveur, jamais de solde négatif ; même p_op = même réponse) ----------
    let BUY = null;                            // { k, L, st }
    const BUYK = KEY + '.achat';               // achat parti sans réponse (réseau coupé) : on renvoie le MÊME numéro, rien n'est payé deux fois
    const canBuy = (L) => !!(L && L.p && L.r !== 'secret' && (!L.needs || doneSet().has(L.needs)));
    function openBuy(k) {
      const L = lockOf(k); if (!canBuy(L)) return;
      BUY = { k, L, st: '' };
      const src = box.querySelector(`.pgh-ed [data-key="${CSS.escape ? CSS.escape(k) : k}"] .th`) || box.querySelector(`[data-key="${CSS.escape ? CSS.escape(k) : k}"] .th`);
      $.bth.innerHTML = src ? src.innerHTML : ''; $.bth.querySelectorAll('.lock,.rb').forEach((x) => x.remove());
      $.bname.textContent = keyName(k); $.btier.textContent = RAR[L.r] || ''; $.btier.className = 'pgh-tier ' + L.r;
      $.bprice.innerHTML = LU() + '<span>' + fmtN(L.p) + '</span>';
      $.bburst.innerHTML = '';
      const i = pgInfo();
      buyState(!memberMode() ? 'guest' : i.online === false ? 'offline' : wallet != null && wallet < L.p ? 'poor' : 'ask');
      $.bmodal.classList.add('on'); tone(660, 990);
    }
    function buyState(st, msg) {
      const B = BUY; if (!B) return;
      B.st = st; $.bmodal.dataset.st = st;
      const p = B.L.p, w = wallet, m = memberMode() && w != null && /^(ask|poor|busy|retry)$/.test(st);
      $.bbal.className = 'pgh-bbal' + (m && w < p ? ' poor' : '');
      $.bbal.innerHTML = m ? `<div>Tes lucioles<b>${LU()}${fmtN(w)}</b></div><span class="ar">→</span><div class="af">${w < p ? 'Il te manque' : 'Après l\'achat'}<b>${LU()}${fmtN(w < p ? p - w : w - p)}</b></div>` : '';
      const ok = $.bok; ok.disabled = false; $.bno.textContent = 'Pas maintenant';
      $.bmsg.className = '';
      if (st === 'ask' || st === 'busy' || st === 'retry') {
        $.bmsg.innerHTML = msg || 'Il sera à toi pour toujours : dans le hub et dans le jeu.';
        ok.innerHTML = st === 'retry' ? '<span>Réessayer</span>' : `<span>Acheter</span>${LU()}<span>${fmtN(p)}</span>`;
      } else if (st === 'poor') {
        $.bmsg.innerHTML = `Pas assez de lucioles pour l'instant : il t'en manque <b>${fmtN(Math.max(1, p - (w || 0)))}</b>. Gagne-les dans Pégase avec les missions du jour, le marché et le musée… puis reviens !`;
        ok.innerHTML = '<span>D\'accord</span>';
      } else if (st === 'guest') {
        $.bmsg.innerHTML = 'Tu peux l\'essayer autant que tu veux ! Pour l\'acheter avec tes lucioles, il faut un compte (gratuit).';
        ok.innerHTML = '<span>Créer mon compte</span>';
      } else if (st === 'offline') {
        $.bmsg.innerHTML = 'Pas de réseau : l\'achat se fait en ligne. Réessaie quand tu seras connecté.';
        ok.innerHTML = '<span>D\'accord</span>';
      } else if (st === 'refused') {
        $.bmsg.innerHTML = msg || 'L\'achat n\'a pas marché.';
        ok.innerHTML = '<span>D\'accord</span>';
      } else if (st === 'done') {
        $.bname.textContent = '✨ ' + keyName(B.k) + ' est à toi !';
        $.bmsg.className = 'ok'; $.bmsg.innerHTML = msg || 'Enregistre ton avatar pour le garder sur toi.';
        ok.innerHTML = '<span>Super !</span>';
      }
    }
    function closeBuy() {
      if (!BUY || BUY.st === 'busy') return;
      const B = BUY; BUY = null; $.bmodal.classList.remove('on'); $.bburst.innerHTML = '';
      if (B.st === 'done') {
        if (editing) { renderEd(); const t = $.dgrid.querySelector(`[data-key="${CSS.escape ? CSS.escape(B.k) : B.k}"]`); if (t) t.classList.add('got'); }
        if (STG) STG.gesture('jump');
      }
    }
    function burst() {
      let h = '';
      for (let i = 0; i < 36; i++) {   // deux vagues de lucioles qui s'envolent de la pièce
        const w = i >= 22, a = (i / (w ? 14 : 22)) * Math.PI * 2 + Math.random() * 0.35, r = (w ? 120 : 80) + Math.random() * 80;
        h += `<i class="${i % 3 === 2 ? 's' : ''}" style="--x:${Math.round(Math.cos(a) * r)}px;--y:${Math.round(Math.sin(a) * r * 0.85 + 20)}px;--d:${((w ? 0.45 : 0) + Math.random() * 0.15).toFixed(2)}s"></i>`;
      }
      $.bburst.innerHTML = h;
    }
    async function doBuy() {
      const B = BUY; if (!B || !/^(ask|retry)$/.test(B.st)) return;
      let pend = null; try { pend = JSON.parse(store.get(BUYK) || 'null'); } catch (e) { pend = null; }
      const op = pend && pend.k === B.k && /^ub-[a-z0-9]{12}$/.test(pend.op || '') && Date.now() - (+pend.t || 0) < 864e5 ? pend.op : 'ub-' + rid(12);
      store.set(BUYK, JSON.stringify({ k: B.k, op, t: Date.now() }));
      buyState('busy'); tone(620, 930);
      let r = null;
      try { const rows = await PG.rpc('pg_unlock_buy', { p_unlock: B.k, p_op: op }); r = Array.isArray(rows) ? rows[0] : rows; }
      catch (e) {
        if (dead || BUY !== B) return;
        const t = String((e && e.message) || '');
        if (e && (e.offline || /trop d essais/.test(t))) { buyState('retry', e.offline ? 'Pas de réseau : ton achat n\'est pas parti. Réessaie dans un instant (tu ne paieras qu\'une fois).' : 'Trop d\'essais d\'un coup : réessaie dans quelques minutes.'); return; }
        store.set(BUYK, ''); buyState('refused', 'L\'achat n\'a pas marché. Réessaie un peu plus tard.'); return;
      }
      if (dead) return;
      try { localStorage.removeItem(BUYK); } catch (e) { /* rien */ }
      if (!r || typeof r !== 'object') { if (BUY === B) buyState('refused', 'Le serveur n\'a pas répondu : réessaie un peu plus tard.'); return; }
      if (Number.isFinite(+r.r_ecus)) walletTo(+r.r_ecus);
      if (r.r_ok || r.r_why === 'deja a toi') {
        OWNED.add(B.k);
        if (BUY === B) { buyState('done', r.r_ok ? null : 'Tu l\'avais déjà : il est à toi !'); burst(); }
        tone(784, 1318); later(() => tone(1046, 1568), 160);
        if (BUY !== B) toast('✨ ' + keyName(B.k) + ' est à toi !');
        if (editing) renderEd(); renderShowcase();
        later(() => { if (BUY === B) closeBuy(); }, 3400);
      } else if (BUY === B) {
        if (r.r_why === 'pas assez d ecus') buyState('poor');
        else if (r.r_why === 'mission requise') buyState('refused', 'Celui-ci se débloque après une mission de l\'histoire : continue dans le jeu, puis reviens l\'acheter !');
        else buyState('refused', 'Celui-ci ne s\'achète pas : il se gagne dans le jeu (mission, cadeau… ou secret).');
        tone(440, 330);
      }
      loadWallet();
    }
    on($.bmodal, 'click', (e) => {
      const h = e.target.closest('[data-h]');
      if (h && h.dataset.h === 'bno') { closeBuy(); return; }
      if (h && h.dataset.h === 'bok') {
        const st = BUY && BUY.st;
        if (st === 'ask' || st === 'retry') doBuy();
        else if (st === 'guest') { closeBuy(); try { PG && PG.account && PG.account(); } catch (x) { /* rien */ } }
        else closeBuy();
        return;
      }
      if (e.target === $.bmodal) closeBuy();
    });

    // ---------- carte « Mon avatar » ----------
    function renderMe() {
      const has = !!SV;
      $.metitle.textContent = has ? (guest ? 'Ton avatar' : 'L\'avatar de ' + who) : 'Ton avatar';
      $.mesub.textContent = has ? (SV.desc || describe(S) || 'Prêt pour le jeu.') : 'Pas encore choisi : voici Sally, l\'exploratrice.';
      const d = S || D, tags = [];
      if (d && CAT) {
        const it = (s) => { const v = d.it && d.it[s]; return v && ITEMS.get(v[0]); };
        tags.push([CHARS_N[preset], (CAT.skin[d.sk] || CAT.skin[3])[1]]);
        const h = it('hb') || it('hf'); if (h) tags.push([h.name, palHex(d.hc)]);
        const c = it('ovr') || it('top'); if (c) tags.push([c.name, palHex((d.it.ovr || d.it.top)[1])]);
        const a = it('hat') || it('glass') || it('hacc'); if (a) tags.push([a.name, '#ffd36a']);
      }
      $.metags.innerHTML = tags.map(([t, c]) => `<span class="pgh-tag" style="--c:${c}"><i></i>${esc(t)}</span>`).join('');
      const lab = has ? 'Modifier mon avatar' : 'Créer mon avatar';
      for (const k of ['avlab2', 'avlab3']) if ($[k]) $[k].textContent = lab;
      renderSync();
    }
    let srvState = 'local';
    function renderSync() {
      const m = memberMode();
      $.synct.innerHTML = !m ? '<b>Gardé sur cet appareil.</b> Crée un compte pour le retrouver partout.' : srvState === 'ok' ? '<b>Gardé sur ton compte</b> : tu le retrouves sur tous tes appareils (et bientôt dans le jeu).'
        : srvState === 'wait' ? '<b>Gardé sur cet appareil</b> : envoyé sur ton compte dès le retour du réseau.' : '<b>Ton compte</b> : on vérifie…';
    }

    // ---------- mise en page (portrait / paysage / ordinateur) ----------
    let wide = false, short = false, W0 = 0, H0 = 0;
    function relayout() {
      const w = root.clientWidth || box.clientWidth || 390, h = root.clientHeight || box.clientHeight || 700;
      W0 = w; H0 = h;
      wide = w >= 600 && w > h * 1.05; short = h < 520;
      box.classList.toggle('wide', wide); box.classList.toggle('short', short);
      $.fv.classList.toggle('wide', wide);
      const heroH = wide ? Math.max(340, Math.min(h, 820)) : Math.max(560, Math.min(Math.round(h * 0.94), 900));
      $.hero.style.setProperty('--heroH', heroH + 'px');
      box.style.setProperty('--sunX', wide ? '72%' : '50%');
      flySize(); placeStage(); tabInd();
    }
    // où se tient l'avatar (rectangle du canevas, en points)
    function heroFocus() {
      const w = $.hero.offsetWidth, h = $.hero.offsetHeight;
      if (editing) {
        if (wide) { const L = $.ed.offsetLeft; return { x: 8, y: short ? 6 : 16, w: Math.max(160, L - 16), h: Math.min(h, box.clientHeight) - (short ? 12 : 32) }; }
        const top = $.ed.offsetTop; return { x: 0, y: 4, w, h: Math.max(160, top - 30) };
      }
      const r = $.hero.getBoundingClientRect();
      if (wide) { const top = short ? 8 : 30, bot = short ? h - 8 : $.emotes.getBoundingClientRect().top - r.top - 8; const x0 = w * 0.48, x1 = short ? $.emotes.getBoundingClientRect().left - r.left - 4 : w * 0.98; return { x: x0, y: top, w: x1 - x0, h: Math.max(160, bot - top) }; }
      // sous la phrase du haut, en laissant la place de l'étiquette du nom (mesurée), jusqu'aux gestes : l'avatar s'adapte à l'espace libre
      const cp = $.copy.getBoundingClientRect(), nh = ($.name.offsetHeight || 28) + 6;
      const top = cp.bottom - r.top + Math.max(30, nh + 8), bot = $.emotes.getBoundingClientRect().top - r.top - 6;
      return { x: 0, y: top, w, h: Math.max(180, bot - top) };
    }
    // ce qu'on a mesuré pour cadrer : relu chaque seconde (polices arrivées en retard, barre d'Android, texte qui passe sur 3 lignes…)
    let LAY = { copyB: 0, emoT: 0, heroH: 0, heroW: 0 };
    function layMeasure() {
      const r = $.hero.getBoundingClientRect();
      return { copyB: wide ? -1e4 : Math.round($.copy.getBoundingClientRect().bottom - r.top), emoT: Math.round($.emotes.getBoundingClientRect().top - r.top), heroH: Math.round(r.height), heroW: Math.round(r.width) };
    }
    function layCheck() {
      if (dead || editing || friendOn || !heroVis || document.hidden || box.classList.contains('editing')) return;
      const m = layMeasure();
      if (Math.abs(m.copyB - LAY.copyB) > 1.5 || Math.abs(m.emoT - LAY.emoT) > 1.5 || Math.abs(m.heroH - LAY.heroH) > 1.5 || Math.abs(m.heroW - LAY.heroW) > 1.5) relayout();
      else if (STG && STG.view && $.gl.parentNode === $.hero) { const g = $.gl.getBoundingClientRect(); if (Math.abs(g.width - STG.view.w) > 1.5 || Math.abs(g.height - STG.view.h) > 1.5) placeStage(); }
    }
    function fvFocus() { const r = $.fvstage.getBoundingClientRect(); if (CALL.c && CALL.c.ui) return { x: r.width * 0.06, y: r.height * (wide ? 0.13 : 0.22), w: r.width * 0.88, h: r.height * (wide ? 0.66 : 0.5) }; return { x: r.width * 0.05, y: wide ? 24 : 12, w: r.width * 0.9, h: r.height - (wide ? 48 : 18) }; }
    let STG = null, PGM = null, editing = false, friendOn = null;
    const CALL = { c: null, seen: new Map(), polling: false, off: null, lk: null, at: 0, ringT: 0, pt: 0, off404: false };   // appels (hub 2.15, plus bas)
    // la toile 3D ne couvre que la BANDE où se tient l'avatar (+ marges pour le saut, les étincelles et l'étiquette) : beaucoup moins de
    // pixels à dessiner et à composer sur les téléphones ; plein cadre pendant le créateur et chez un copain
    let GLB = { x: 0, y: 0, w: 0, h: 0, full: true };
    function glBand(f) {
      const hw = $.hero.offsetWidth, hh = $.hero.offsetHeight;
      if (friendOn || editing || $.gl.parentNode !== $.hero) return { x: 0, y: 0, w: hw, h: hh, full: true };
      const padT = Math.round(Math.max(70, f.h * 0.22)), padB = Math.round(Math.max(24, f.h * 0.07)), padX = wide ? Math.round(Math.max(40, f.w * 0.12)) : 0;
      const x = Math.max(0, Math.floor(f.x - padX)), y = Math.max(0, Math.floor(f.y - padT));
      return { x, y, w: Math.min(hw, Math.ceil(f.x + f.w + padX)) - x, h: Math.min(hh, Math.ceil(f.y + f.h + padB)) - y, full: false };
    }
    function placeStage() {
      const f = friendOn ? fvFocus() : heroFocus();
      if (!friendOn) {
        LAY = layMeasure();
        const B = glBand(f), st = $.gl.style;
        if (B.full) { if (!GLB.full) { st.left = st.top = '0px'; st.width = st.height = '100%'; } }
        else { st.left = B.x + 'px'; st.top = B.y + 'px'; st.width = B.w + 'px'; st.height = B.h + 'px'; }
        if (B.x !== GLB.x || B.y !== GLB.y || B.full !== GLB.full) lastNX = -1;   // l'étiquette du nom suit la bande
        GLB = B;
        if (STG) STG.setFocus(B.full ? f : { x: f.x - B.x, y: f.y - B.y, w: f.w, h: f.h });
      } else {
        if (!GLB.full) { const st = $.gl.style; st.left = st.top = '0px'; st.width = st.height = '100%'; GLB = { x: 0, y: 0, w: 0, h: 0, full: true }; }
        if (STG) STG.setFocus(f);
      }
      $.wait.style.left = (f.x + f.w / 2) + 'px'; $.wait.style.top = (f.y + f.h * 0.52) + 'px';
      if (CALL.c && CALL.c.ui) pipPlace();
    }

    // ---------- Pégase qui passe dans le ciel (2D) ----------
    const fx = $.fly.getContext('2d');
    let flyW = 0, flyH = 0;
    function flySize() { const dpr = Math.min(1.5, window.devicePixelRatio || 1); flyW = $.hero.offsetWidth; flyH = $.hero.offsetHeight; $.fly.width = Math.round(flyW * dpr); $.fly.height = Math.round(flyH * dpr); fx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    let flyBlank = false;
    function flyDraw(t) {
      const w = flyW, h = flyH;
      const P = 14, k = (t % P) / P;
      if (k > 0.62) { if (!flyBlank) { fx.clearRect(0, 0, w, h); flyBlank = true; } return; }   // ciel vide : rien à redessiner (ni à envoyer à l'écran)
      fx.clearRect(0, 0, w, h); flyBlank = false;
      const q = k / 0.62, u = Math.min(h, w * 0.62), s = Math.max(0.55, Math.min(1.1, u / 520));
      const y0 = wide ? h * 0.2 : h * 0.33, px = w * (1.12 - q * 1.3), py = y0 - Math.sin(q * Math.PI) * h * 0.08 + Math.sin(t * 2.2) * 4;
      for (let i = 1; i < 30; i++) { const kk = q - i * 0.0055; if (kk < 0) break; const tx = w * (1.12 - kk * 1.3) + 12 * s, ty = y0 - Math.sin(kk * Math.PI) * h * 0.08 + Math.sin((t - i * 0.05) * 2.2) * 4 + 3 + i * 0.25;
        const a = (1 - i / 30) * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)); fx.fillStyle = `rgba(255,232,180,${a})`; fx.beginPath(); fx.arc(tx + Math.sin(i * 2.1 + t) * 3, ty, Math.max(0.5, (1.8 - i * 0.05) * s), 0, TAU); fx.fill(); }
      horse(fx, px, py, s, Math.sin(t * 6) * 0.5 + 0.2, -1);
    }
    let flyRaf = 0, flyOn = false; const flyT0 = performance.now() - 4000;
    const flyLoop = () => { flyRaf = 0; if (!flyOn || dead) return; flyDraw((performance.now() - flyT0) / 1000); flyRaf = requestAnimationFrame(flyLoop); };
    const flySet = (v) => { v = !!v && !dead; if (v === flyOn) return; flyOn = v; if (v && !flyRaf) flyRaf = requestAnimationFrame(flyLoop); if (!v) { if (flyRaf) cancelAnimationFrame(flyRaf); flyRaf = 0; fx.clearRect(0, 0, flyW, flyH); } };

    // ---------- l'avatar 3D ----------
    let heroVis = true, stgFail = false, hintDone = !!store.get('jdw.pegase.hubhint'), lastNX = -1, lastNY = -1;
    const env = { mobile, touch, need: (n, p) => needPack(n, p), file: (n) => STORE.files.get(n), fileAsync: (n) => fileOf(n), report, build: PG_BUILD };
    function activeSync() {
      const vis = !document.hidden;
      const vidOnly = !!(CALL.c && CALL.c.ui && $.fv.classList.contains('vid') && $.fv.classList.contains('cam'));   // appel vidéo des deux côtés
      if (STG) STG.setActive(vis && !vidOnly && (editing || !!friendOn || heroVis));
      flySet(vis && heroVis && !editing && !friendOn && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches));
      if (!vis) earBilan();
      earSync();
    }
    function onHead(x, y) {
      if (editing || friendOn) return;
      if (Math.abs(x - lastNX) < 0.4 && Math.abs(y - lastNY) < 0.4) return; lastNX = x; lastNY = y;
      x += GLB.full ? 0 : GLB.x; y += GLB.full ? 0 : GLB.y;   // toile → haut de page
      const fy = (STG && STG.view.focus) ? STG.view.focus.y + (GLB.full ? 0 : GLB.y) + 26 : 26;
      // jamais sur le titre ni la phrase du haut : le bas de l'étiquette reste sous la phrase + sa propre hauteur (mesurée, relue chaque seconde)
      y = Math.max(fy, y, wide ? -1e4 : LAY.copyB + ($.name.offsetHeight || 28) + 10);
      $.name.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
      $.hint.style.transform = `translate(${(x + 46).toFixed(1)}px,${(y + 34).toFixed(1)}px)`;
      NAMEXY.x = x; NAMEXY.y = y; earPlace();
    }
    // l'oreille (écoute) : juste à droite de l'étiquette du nom (à gauche si elle sortirait de l'écran)
    const NAMEXY = { x: -1, y: -1 };
    function earPlace() {
      if (!$.ear || $.ear.hidden || NAMEXY.x < 0) return;
      // largeur FINALE (l'étiquette s'ouvre en glissant : offsetWidth serait celle du moment)
      const nw = $.name.offsetWidth || 80, nh = $.name.offsetHeight || 28, W = root.clientWidth || 400;
      const ew = 36 + ($.ear.classList.contains('x') ? $.eart.scrollWidth + 9 : 0);
      let ex = NAMEXY.x + nw / 2 + 8; if (ex + ew > W - 8) ex = Math.max(8, NAMEXY.x - nw / 2 - 8 - ew);
      $.ear.style.transform = `translate(${ex.toFixed(1)}px,${(NAMEXY.y - nh / 2 - 17).toFixed(1)}px)`;
    }
    function hintOff() { if (!hintDone) { hintDone = true; store.set('jdw.pegase.hubhint', '1'); } $.hint.classList.remove('on'); }
    function noGL() { try { const c = document.createElement('canvas'); return !(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return true; } }
    function fallback(why) {
      stgFail = true; $.wait.classList.remove('on'); $.gl.style.display = 'none';
      $.emotes.style.display = 'none'; $.name.classList.remove('on');
      if (why) report('Pégase hub : 3D impossible : ' + why);
      renderFriends();
    }
    async function start3D() {
      if (dead) return;
      if (noGL()) { fallback(''); return; }
      $.wait.classList.add('on');
      const prog = { m: 0, p: 0, g: 0 };
      const upd = () => { $.waitb.style.width = Math.round(4 + 96 * (prog.m * 0.2 + prog.p * 0.6 + prog.g * 0.2)) + '%'; };
      try {
        await loadThree((k) => { prog.m = k; upd(); });
        if (dead) return;
        needPack('perso', (k) => { prog.p = k; upd(); }).catch(() => {});
        needPack('garde.' + ['sally', 'chloe', 'mary', 'zulle', 'javi', 'john', 'galvon'][preset], (k) => { prog.g = k; upd(); }).catch(() => {});
        const mod = PG_FACTORY((n) => (n === 'three' ? window.JDW_PG3 : { env })); PGM = mod; if (window.JDW_PG_TEST) window.__pgPGM = mod; if (CAT) try { renderShowcase(); } catch (e) { /* rien */ }   // noms et vignettes du maquillage (hub 2.10)
        const SG = await mod.create($.gl, { onFrame: onHead, onGesture: gestured, keep: !!window.JDW_PG_TEST });
        if (dead) { SG.dispose(); return; }
        STG = SG; placeStage(); activeSync();
        await catReady;
        initLooks();
        await SG.setLook(D);
        if (dead) return;
        $.wait.classList.remove('on'); $.gl.classList.add('on'); if (!editing && !friendOn) $.name.classList.add('on');
        earSync();
        if (!hintDone) later(() => { if (!dead && !editing) $.hint.classList.add('on'); later(() => $.hint.classList.remove('on'), 7000); }, 1200);
        meShot();
        later(() => { if (STG && !editing && !friendOn) STG.gesture('wave'); }, 900);
        later(wordsPreload, 2500);   // mots (oui / non / salut / rire) préparés en arrière-plan
        window.JDW_PG_HUB = { stage: SG, edShow: (k) => showKey(k), state: () => ({ saved: SV, look: D, preset, editing, friend: friendOn && friendOn.name, wide, short, tab, sms: { st: SMS.st, unread: SMS.unread, th: SMS.th && SMS.th.w, live: !!SMS.off, pend: SMS.pend.length, rx: !!(SMS.th && SMS.th.rx), rxRpc: SMS.rxRpc, rxOpen: RXS.open }, info: SG.info(), ready: SG.ready(),
          friends: FR.list.length, thumbs: STORE.thumbs.size, srv: Object.assign({ state: srvState }, srv), wallet, locked: lockedIn(D), owned: [...OWNED], today: TODAY, buy: BUY && { k: BUY.k, st: BUY.st, p: BUY.L.p }, ucat: UCAT.size, mcat: MCAT.size,
          voice: MIC.on ? { label: MIC.label, f0: Math.round(MIC.f0), f0m: Math.round(MIC.f0m), flat: +MIC.flat.toFixed(2), vis: MIC.mouth ? MIC.mouth.shown : null, emo: Object.fromEntries(Object.entries(MIC.emo).map(([k, v]) => [k, +v.toFixed(2)])) } : null }) };
        thumbPump();
        gardePull();
      } catch (e) {
        if (dead) return;
        fallback((e && e.message) || String(e));
      }
    }
    // D et S au départ : l'apparence enregistrée (ancien format : numéro de tenue seul) ou Sally
    function initLooks() {
      if (D) return;
      const base = SV ? (SV.look ? STG.normalize(SV.look) : STG.descOf(SV.tenue)) : STG.descOf(0);
      D = base; S = SV ? lookCopy(base) : null;
      if (S) for (const k of keysOf(S)) GRAND.add(k);
      renderMe();
    }
    // portrait (carte « Mon avatar », photo de profil)
    let lastShot = '';
    function meShot() { if (!STG || !STG.ready() || stgFail) return ''; try { lastShot = STG.portrait(); } catch (e) { lastShot = ''; } if (lastShot) { $.meimg.src = lastShot; $.meico.classList.add('img'); } updPhotoBtn(); return lastShot; }
    const PP = api && api.profilePhoto && typeof api.profilePhoto.set === 'function' ? api.profilePhoto : null;
    function updPhotoBtn() { if (!PP) return; $['go-photo'].hidden = false; $['go-photo'].disabled = !STG || !STG.ready() || stgFail; }
    let pScope = 'all';
    async function openPhoto() {
      if (!PP) return;
      const inf = (PP.info && PP.info()) || {};
      if (STG && STG.ready()) await STG.setLook(S || D);
      const shot = (STG && STG.ready()) ? meShot() : '';
      if (!shot) { toast('Ton avatar n’est pas encore prêt'); return; }
      $.pimg.src = shot; $.pimg2.src = shot;
      if (inf.guest) {
        $.ptext.textContent = 'Crée un compte (ou connecte-toi) pour mettre ton avatar en photo de profil : il faut un compte pour avoir une tête dans la salle.';
        $.pscope.innerHTML = ''; $.pok.hidden = true;
      } else {
        $.pok.hidden = false; pScope = 'all';
        $.ptext.textContent = 'Ton avatar devient ta tête dans la borne : les copains le verront dans les jeux, le classement et le chat.';
        $.pscope.innerHTML = inf.room ? `<button data-sc="all" class="on">Partout</button><button data-sc="room">Seulement dans « ${esc(inf.room)} »</button>`.replace(/« /g, '« ').replace(/ »/g, ' »') : '';
      }
      $.pmodal.classList.add('on'); tone(523, 784);
    }
    on($.pmodal, 'click', async (e) => {
      if (e.target === $.pmodal) { $.pmodal.classList.remove('on'); return; }
      const sc = e.target.closest('[data-sc]'); if (sc) { pScope = sc.dataset.sc; $.pscope.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === sc)); return; }
      const h = e.target.closest('[data-h]'); if (!h) return;
      if (h.dataset.h === 'pno') $.pmodal.classList.remove('on');
      else if (h.dataset.h === 'pok' && !h.disabled) {
        h.disabled = true;
        let r = null; try { r = await PP.set(lastShot, pScope); } catch (x) { r = null; }
        if (dead) return; h.disabled = false; $.pmodal.classList.remove('on');
        if (r && r.ok) { toast(r.sent === false ? '✓ Photo gardée sur cet appareil (envoi au retour du réseau)' : '✓ Ton avatar est ta photo de profil !'); tone(784, 1318); if (STG) STG.gesture('jump'); }
        else toast(r && r.why === 'guest' ? 'Il faut un compte pour avoir une photo de profil' : 'La photo n’a pas pu être enregistrée');
      }
    });
    on($['go-photo'], 'click', openPhoto);
    function gestured(k) {
      hintOff(); earWake();
      const b = box.querySelector(`.pgh-emotes .pgh-emo[data-emo="${k}"]`); if (b) { b.classList.add('hit'); later(() => b.classList.remove('hit'), 600); }
      tone(k === 'jump' ? 660 : k === 'laugh' ? 880 : k === 'non' ? 520 : 740, k === 'jump' ? 990 : k === 'non' ? 400 : 1180);
    }
    const fan = (o) => { $.emofan.classList.toggle('on', o); $.emomore.classList.toggle('on', o); $.emomore.setAttribute('aria-expanded', String(o)); };
    on($.emotes, 'click', (e) => {
      const b = e.target.closest('.pgh-emo'); if (!b || b === $.mic || b === $.say) return;
      if (b === $.emomore) { fan(!$.emofan.classList.contains('on')); tone(600, 820); return; }
      if (b.closest('.pgh-emofan')) later(() => fan(false), 250);
      if (!STG || !STG.ready()) return; const k = STG.gesture(b.dataset.emo); gestured(k);
    });
    on(document, 'pointerdown', (e) => { if ($.emofan.classList.contains('on') && !e.target.closest('.pgh-emowrap')) fan(false); }, true);

    // ---------- MICRO : la bouche de l'avatar suit ta voix. Analyse du son SUR L'APPAREIL (Web Audio), rien n'est enregistré ni envoyé.
    // Bouche (hub 2.3, src/levres.js) : VISÈMES du français devinés dans le son — formants F1/F2/F3 par prédiction linéaire (A, É/È, I, O,
    // OU/U, EU), friction (S/Z, CH/J, F/V), fermetures (M/B/P : F2 qui tombe avant le silence) — puis formes BoZo, mâchoire et lèvres à part,
    // coarticulation, attaque 40 ms / relâche 80 ms, petite asymétrie, micro-mouvements au repos. Les expressions s'ajoutent par-dessus.
    const MIC = { on: false, busy: false };
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    function micUi() { $.mic.classList.toggle('on', MIC.on); $.mic.title = MIC.on ? 'Couper le micro' : 'Parler (micro)'; if (!MIC.on) $.mic.style.setProperty('--lv', 0); }
    function micStop() {
      const was = MIC.on; MIC.on = false; wordsStop(); if (STG) { STG.setTalk(null); if (was) { STG.setHome(false); STG.setFrame(editing ? (FR_CAT[cat] || 'corps') : 'corps'); } }
      try { if (MIC.stream) MIC.stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* rien */ }
      try { if (MIC.ctx) MIC.ctx.close(); } catch (e) { /* rien */ }
      MIC.stream = MIC.ctx = MIC.an = null; micUi();
      if (was) { MIC.zeroT = 0; MIC.had = false; earSync(); }
    }
    async function micStart() {
      if (MIC.busy || MIC.on) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('🎤 Ce navigateur ne donne pas accès au micro'); return; }
      if (!STG || !STG.ready()) { toast('Ton avatar arrive…'); return; }
      MIC.busy = true;
      let earWas = false;
      try {
        const AC = window.AudioContext || window.webkitAudioContext; MIC.ctx = new AC();          // créé dans le toucher (iPhone)
        // écoute des mots en cours (reconnaissance d'Android) : on la referme AVANT d'ouvrir le micro de la page (jamais deux ouvertures en même
        // temps) ; elle reprend ensuite, micro ouvert, et on vérifie que les deux entendent (sinon : pause de l'écoute pendant le micro)
        earWas = !!EAR.cur; earSync(); if (earWas) await new Promise((r) => setTimeout(r, 380));
        if (dead) { micStop(); return; }
        MIC.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } });
        if (dead) { micStop(); return; }
        if (MIC.ctx.state === 'suspended') await MIC.ctx.resume();
        const src = MIC.ctx.createMediaStreamSource(MIC.stream), an = MIC.ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0.3; src.connect(an);
        Object.assign(MIC, { an, src, td: new Float32Array(an.fftSize), fd: new Float32Array(an.frequencyBinCount), floor: 0.004, env: 0, slow: 0, w: 0, quiet: 9, press: 0, brow: 0, lvUi: -1,
          s: {}, on: true,
          fr: 0, f0: 0, f0m: 0, flat: 0, hist: [], emo: { rire: 0, surprise: 0, calme: 0, chuchote: 0, colere: 0 }, typ: 0, typN: 0, angOn: false, angT: 0, talkT: 0, laughOn: false, laughT: 0, sur: 0, onsetT: -9, onsetF0: 0, label: 'silence', bob: 0 });
        MIC.lip = PGM.createLipSync(MIC.ctx.sampleRate); MIC.mouth = PGM.createMouth(); MIC.x = {};
        if (window.JDW_PG_TEST) window.__pgMIC = MIC; sayStop(); STG.setTalk(micTalk); micUi(); hintOff(); store.set('jdw.pegase.micok', '1'); tone(660, 990);
        if (STG) { STG.setFrame('parle'); STG.setHome(true); }
        wordsStart();   // « oui / non / salut » sur le même flux (chargé la 1re fois, rien ne casse sans)
      } catch (e) {
        micStop(); toast(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? '🎤 Micro refusé : autorise-le dans les réglages du navigateur' : '🎤 Micro indisponible');
        if (EAR.via) earDiag('mic:gum', 'micro 🎤 de la page impossible (' + (e && e.name || '?') + (earWas ? ', juste après l\'écoute' : '') + ')');
      }
      finally { MIC.busy = false; earSync(); }
    }
    function micTalk(dt) {
      const an = MIC.an; if (!an || !MIC.on) return null;
      an.getFloatTimeDomainData(MIC.td); let q = 0; for (let i = 0; i < MIC.td.length; i++) q += MIC.td[i] * MIC.td[i];
      const rms = Math.sqrt(q / MIC.td.length);
      MIC.zeroT = q === 0 ? (MIC.zeroT || 0) + dt : 0; if (q > 0) MIC.had = true;   // son EXACTEMENT nul = capture coupée par Android (pas un silence)
      MIC.floor = rms < MIC.floor ? MIC.floor * 0.85 + rms * 0.15 : MIC.floor * 0.9995 + rms * 0.0005;   // bruit de fond qui s'adapte
      MIC.pkr = Math.max(rms, (MIC.pkr || 0.03) * Math.exp(-dt / 2.5), 0.012);                        // crête récente (gain automatique)
      const L = Math.pow(Math.min(1, Math.max(0, rms - MIC.floor * 1.6) / Math.max(0.008, MIC.pkr * 0.8 - MIC.floor * 1.6)), 0.7);
      const now = performance.now() / 1000;
      if ((MIC.fr = MIC.fr + 1) % 2 === 0) { let f = L > 0.08 ? pitchOf(MIC.td, MIC.ctx.sampleRate) : 0; const pv = MIC.f0 || MIC.f0p || 0; if (f && pv) { const q = f / pv; if (q > 1.75 && q < 2.3) f /= 2; else if (q > 0.43 && q < 0.57) f *= 2; } if (f) MIC.f0p = f; MIC.f0 = f; }   // une image sur deux ; sauts d'octave corrigés   // une image sur deux (téléphone)
      const att = 1 - Math.exp(-dt / 0.03), rel = 1 - Math.exp(-dt / 0.1);
      MIC.env += (L - MIC.env) * (L > MIC.env ? att : rel);
      MIC.slow += (MIC.env - MIC.slow) * (1 - Math.exp(-dt / 0.45));
      // spectre : énergies de 3 bandes
      an.getFloatFrequencyData(MIC.fd); const hz = MIC.ctx.sampleRate / an.fftSize;
      const band = (a, b) => { let e = 0; for (let k = Math.floor(a / hz), n = Math.min(MIC.fd.length - 1, Math.ceil(b / hz)); k <= n; k++) e += Math.pow(10, MIC.fd[k] / 10); return e; };
      const e1 = band(250, 900), e2 = band(900, 2500), e3 = band(2500, 7000);
      const r2 = e2 / (e1 + e2 + 1e-12), r3 = e3 / (e1 + e2 + e3 + 1e-12);
      // planéité du spectre 300–6000 Hz (souffle, rire, chuchotement : proche de 1 ; voyelle chantée : proche de 0)
      { let sl = 0, sa = 0, n = 0; for (let k = Math.floor(300 / hz), e = Math.min(MIC.fd.length - 1, Math.ceil(6000 / hz)); k <= e; k++) { const p = Math.pow(10, MIC.fd[k] / 10) + 1e-14; sl += Math.log(p); sa += p; n++; }
        const fl = n ? Math.exp(sl / n) / (sa / n) : 0; MIC.flat += (fl - MIC.flat) * 0.25; }
      const emo = emotions(now, dt, L, r2, r3, rms);
      laughTick(dt);
      if (WD.hint && STG && STG.A && STG.A.prep) STG.A.prep(WD.hint);   // mot-clé entendu mais pas encore sûr : le geste s'esquisse
      // VISÈMES : analyse des 30 dernières ms (formants, friction, fermetures) → forme de la bouche (déjà lissée, avec coarticulation)
      const ft = MIC.lip.analyze(MIC.td, dt, MIC.f0), mo = MIC.mouth.step(dt, ft);
      const E = MIC.env;
      // sourcils sur les syllabes fortes
      if (L - MIC.slow > 0.5 && MIC.brow < 0.3) MIC.brow = Math.min(1, MIC.brow + 0.7); MIC.brow = Math.max(0, MIC.brow - dt / 0.6);
      const wh = 1 - 0.5 * emo.chuchote, er = emo.rire, es = emo.surprise, ec = emo.calme * (1 - emo.colere), ea = emo.colere;
      // EXPRESSIONS (lissées) par-dessus la bouche ; pendant un rire / une surprise, c'est l'expression qui mène la bouche
      const X = { Jaw_Open: er * 0.12 + es * 0.28, Mouth_Oh: es * 0.6, Mouth_Pucker: emo.chuchote * 0.12, Mouth_Wide: er * 0.5 + ec * 0.2 * (1 - Math.min(1, E * 1.5)) + ea * E * 0.2,
        Mouth_Press: emo.chuchote * 0.2 + ea * 0.3 * (1 - E), Brows_Raised: Math.max(MIC.brow * 0.45, es, er * 0.35) * (1 - ea),
        Mouth_Happy: (er * 1 + ec * 0.42 * (1 - 0.6 * Math.min(1, E * 1.5))) * (1 - ea), Eyes_LowerClosed: er * 0.7 + ec * 0.1 + ea * 0.5, Eyes_UpperClosed: er * 0.28 + ea * 0.12, Eyes_UpperOpen: es * (1 - ea), Eyes_LowerOpen: es * 0.6,
        Brow_Angry: ea * 1, Brows_Lowered: ea * 1, Mouth_Sad: ea * 0.35, Mouth_Grimace: 0 };
      const ka = 1 - Math.exp(-dt / 0.04), kr = 1 - Math.exp(-dt / 0.08);
      for (const k in X) { const c = MIC.x[k] || 0; MIC.x[k] = c + (X[k] - c) * (X[k] > c ? ka : kr); }
      const lead = 1 - 0.45 * Math.max(er, es);
      for (const k in X) MIC.s[k] = MIC.x[k] + (mo[k] || 0) * lead * (k === 'Jaw_Open' || k === 'Mouth_Wide' ? wh : 1);
      // poids de la parole : monte vite, retombe doucement après ~0,5 s de silence (sans tomber à 0 : les lèvres bougent un peu au repos)
      MIC.quiet = E > 0.06 ? 0 : MIC.quiet + dt;
      MIC.w += ((MIC.quiet < 0.5 ? 1 : 0.3) - MIC.w) * (1 - Math.exp(-dt / (MIC.quiet < 0.5 ? 0.08 : 0.35)));
      const lv = Math.round(Math.min(1, L * 1.2) * 20) / 20; if (lv !== MIC.lvUi) { MIC.lvUi = lv; $.mic.style.setProperty('--lv', lv); }
      // écoute des mots en même temps : ta voix est là (bouche qui bouge) ; la page n'entend plus rien du tout → Android a coupé sa capture
      if (MIC.w > 0.5 && E > 0.12) { EAR.lastAct = performance.now(); if (EAR.cur && EAR.cur.mic) EAR.cur.micV += dt; }
      if (MIC.had && MIC.zeroT > 1.2 && EAR.cur && EAR.cur.mic) earConflict('micro de la page muet');
      MIC.bob += dt * 7; const lw = Math.max(MIC.w, er, es, ec * 0.8);
      return { w: Math.max(lw, ea), v: MIC.s, asym: MIC.mouth.asym, nod: (MIC.env - MIC.slow) * (0.11 + ea * 0.12) + er * 0.06 * Math.max(0, MIC.env - MIC.slow + 0.2) * Math.sin(MIC.bob) - es * 0.08 + ea * 0.05,
        tilt: Math.sin(performance.now() / 1300) * 0.04 * lw + er * 0.05 + ea * 0.06 * Math.sin(MIC.bob * 1.7) * Math.max(0, MIC.env - MIC.slow) * 3 };
    }
    // hauteur de la voix : autocorrélation normalisée (1 échantillon sur 2), 75–480 Hz ; 0 = pas de voix nette (souffle, bruit)
    function pitchOf(td, sr) {
      const N = td.length >> 1, x = MIC.px || (MIC.px = new Float32Array(N)); let m = 0;
      for (let i = 0; i < N; i++) { x[i] = td[i * 2]; m += x[i]; } m /= N; let r0 = 0; for (let i = 0; i < N; i++) { x[i] -= m; r0 += x[i] * x[i]; }
      if (r0 < 1e-7) return 0;
      const s2 = sr / 2, l0 = Math.floor(s2 / 480), l1 = Math.min(N - 64, Math.ceil(s2 / 75)); let best = 0, bl = 0;
      for (let l = l0; l <= l1; l++) { let r = 0, e2 = 0; for (let i = 0; i < N - l; i++) { r += x[i] * x[i + l]; e2 += x[i + l] * x[i + l]; } const c = r / Math.sqrt(r0 * e2 + 1e-12); if (c > best) { best = c; bl = l; } }
      if (best <= 0.62 || bl <= l0) return 0;
      const hl = Math.round(bl / 2); if (hl >= l0) { let r = 0, e2 = 0; for (let i = 0; i < N - hl; i++) { r += x[i] * x[i + hl]; e2 += x[i + hl] * x[i + hl]; } if (r / Math.sqrt(r0 * e2 + 1e-12) > best * 0.97) bl = hl; }
      return s2 / bl;
    }
    // EXPRESSIONS devinées dans la voix (rien d'enregistré) : rire = rafales RÉGULIÈRES de 3,5 à 9 par seconde avec des creux nets ;
    // surprise = attaque forte après un silence + voix qui MONTE (« oh ! », « quoi ?! ») ; chuchotement = du son sans hauteur, soufflé ;
    // parole douce = voix posée et pas forte. Poids lissés + hystérésis (pas de clignotement).
    function emotions(now, dt, L, r2, r3, rms) {
      const H = MIC.hist; H.push([now, MIC.env, MIC.f0, MIC.flat, L, r2, r3]); while (H.length && now - H[0][0] > 1.8) H.shift();
      if (MIC.f0 > 0 && MIC.sur < 0.2) { MIC.f0m = MIC.f0m ? MIC.f0m + (MIC.f0 - MIC.f0m) * 0.02 : MIC.f0; MIC.f0n = (MIC.f0n || 0) + 1; }
      // rafales (rire)
      const pk = [], pki = []; let mn = 1;
      for (let i = 1; i < H.length; i++) { const e = H[i][4]; mn = Math.min(mn, e); if (e > 0.5 && mn < 0.25 && (!pk.length || H[i][0] - pk[pk.length - 1] > 0.09)) { pk.push(H[i][0]); pki.push(i); mn = e; } }
      let laugh = 0;
      const rec = pk.filter((t) => now - t < 1.6), ri = pki.slice(pk.length - rec.length);
      // au milieu de chaque rafale : hauteur et voyelle
      const mid = ri.map((i) => H[Math.min(H.length - 1, i + 3)]), hf0 = mid.map((h) => h[2]).filter((v) => v > 0), vr = mid.map((h) => h[5]);
      const hm = hf0.slice().sort((p, q) => p - q)[hf0.length >> 1] || 0, hf = hf0.map((v) => { while (v < hm / 1.45) v *= 2; while (v > hm * 1.45) v /= 2; return v; });   // octaves repliées
      const spread = (a) => { if (a.length < 3) return 9; const m = a.reduce((p, q) => p + q, 0) / a.length; return Math.sqrt(a.reduce((p, q) => p + (q - m) * (q - m), 0) / a.length) / (Math.abs(m) + 1e-6); };
      // 1.20.5 : « même hauteur » assouplie (un rire DESCEND : 150 → 115 Hz), rire SOUFFLÉ accepté (rafales presque sans hauteur, son plat),
      // rythme moins régulier (un rire ralentit) ; la parole reste dehors : ses syllabes changent de voyelle et de hauteur, sans creux nets
      const flats = mid.map((h) => h[3]), fm = flats.length ? flats.reduce((a, b) => a + b, 0) / flats.length : 0;
      const voicedSame = hf.length >= Math.max(3, rec.length - 2) && spread(hf) < 0.18 && spread(vr) < 0.6;
      const breathy = rec.length >= 4 && hf.length <= Math.floor(rec.length / 2) && fm > 0.1 && spread(vr) < 0.6 && (MIC.emo.chuchote || 0) < 0.4;   // pas pendant un chuchotement
      if (rec.length >= 4 && (voicedSame || breathy)) {
        const d = []; for (let i = 1; i < rec.length; i++) d.push(rec[i] - rec[i - 1]);
        const m = d.reduce((a, b) => a + b, 0) / d.length, sd = Math.sqrt(d.reduce((a, b) => a + (b - m) * (b - m), 0) / d.length), cv = sd / m, rate = 1 / m;
        laugh = sm(3.4, 4.0, rate) * (1 - sm(9.5, 11, rate)) * (1 - sm(0.22, 0.34, cv)) * Math.min(1, (rec.length - 2.5) / 2) * (0.75 + 0.5 * sm(0.08, 0.3, MIC.flat));
        if (window.JDW_PG_TEST && laugh > 0.5 && !MIC.laughOn) (window.__pgLAUGHWHY = window.__pgLAUGHWHY || []).push({ v: voicedSame, b: breathy, n: rec.length, rate: +rate.toFixed(2), cv: +cv.toFixed(2), shf: +spread(hf).toFixed(3), svr: +spread(vr).toFixed(2), fm: +fm.toFixed(3), nhf: hf.length });
      }
      if (MIC.angOn || (MIC.angS || 0) > 0.3) laugh *= 0.3;   // voix en colère (forte, tendue) : ce n'est pas un rire
      if (laugh > 0.5) { MIC.laughOn = true; MIC.laughT = now; } else if (MIC.laughOn && laugh < 0.25 && now - MIC.laughT > 0.7) MIC.laughOn = false;
      // surprise : attaque après un silence, puis la voix monte (ou très haute / très forte)
      const before = H.filter((h) => now - h[0] > 0.1 && now - h[0] < 0.7), quiet = before.length > 6 && before.every((h) => h[4] < 0.12);
      if (quiet && L > 0.6) MIC.onsetT = now;
      const ended = H.length > 8 && H.slice(-7).every((h) => h[4] < 0.15);
      if (now - MIC.onsetT > 1.15) MIC.onsetT = -9;                                    // trop long : c'est une phrase, pas un « oh ! »
      else if (ended && now - MIC.onsetT > 0.3) {
        const med = (a) => { const b = a.filter((v) => v > 0).sort((p, q) => p - q); return b.length >= 3 ? b[b.length >> 1] : 0; };
        const vs = H.filter((h) => h[0] >= MIC.onsetT - 0.06 && h[2] > 0).map((h) => h[2]), f1 = med(vs.slice(0, 7)), f2 = med(vs.slice(-7));
        const rise = f1 && f2 ? f2 / f1 : 1, high = f2 && MIC.f0m && MIC.f0n > 40 ? f2 / MIC.f0m : 1;
        if (!MIC.laughOn && (rise > 1.18 || high > 1.4)) MIC.sur = 1;
        MIC.onsetT = -9;
      }
      MIC.sur = Math.max(0, MIC.sur - dt / 1.6);
      const voicedNow = MIC.f0 > 0 && L > 0.3, act5 = H.filter((h) => now - h[0] < 0.6 && h[4] > 0.3), vfr = act5.length > 5 ? act5.filter((h) => h[2] > 0).length / act5.length : 0;
      let ang = -1;
      if (L > 0.3 && vfr > 0.3) {
        const ratio = MIC.typ ? rms / MIC.typ : 1, hfr = H.slice(-20).filter((h) => h[4] > 0.3).reduce((a, h, i, A) => a + h[6] / A.length, 0);
        ang = sm(1.7, 2.8, ratio) * (0.55 + 0.45 * sm(0.06, 0.2, hfr)) * (MIC.typN > 30 ? 1 : 0);
        if (ang < 0.3 && !MIC.laughOn && voicedNow) { MIC.typ = MIC.typ ? MIC.typ + (rms - MIC.typ) * (MIC.typN < 60 ? 0.05 : 0.006) : rms; MIC.typN++; }   // ta voix habituelle (apprise en parlant)
      }
      if (ang >= 0) MIC.angS = (MIC.angS || 0) + (ang - (MIC.angS || 0)) * (1 - Math.exp(-dt / 0.25)); else MIC.angS = (MIC.angS || 0) * Math.exp(-dt / 1.2);   // entre deux cris : retombe lentement
      if (MIC.angS > 0.5) { MIC.angOn = true; MIC.angT = now; } else if (MIC.angOn && now - MIC.angT > 1.4) MIC.angOn = false;
      MIC.talkT = MIC.w > 0.5 ? MIC.talkT + dt : 0;
      // chuchotement : du son, pas de hauteur, soufflé ; parole douce : voix posée, pas forte
      const act = H.filter((h) => h[4] > 0.3), un = act.length > 20 ? act.filter((h) => !h[2] && h[3] > 0.02).length / act.length : 0;
      const voiced = act.length > 10 ? act.filter((h) => h[2] > 0).length / act.length : 0, avg = act.length ? act.reduce((a, h) => a + h[1], 0) / act.length : 0;
      const T = { rire: MIC.laughOn ? 1 : 0, surprise: Math.min(1, MIC.sur * 1.6), chuchote: !MIC.laughOn && un > 0.8 ? 1 : 0, colere: MIC.angOn && !MIC.laughOn ? 1 : 0 };
      T.calme = !T.rire && !T.chuchote && !T.colere && MIC.sur < 0.1 && voiced > 0.45 && MIC.talkT > 1.2 ? 1 : 0;      // parler posément : petit sourire
      for (const k in T) { const c = MIC.emo[k], up = T[k] > c; MIC.emo[k] = c + (T[k] - c) * (1 - Math.exp(-dt / (up ? (k === 'surprise' ? 0.07 : k === 'colere' ? 0.15 : 0.18) : (k === 'rire' ? 0.5 : k === 'colere' ? 0.9 : 0.35)))); }
      const best = Object.entries(MIC.emo).sort((a, b) => b[1] - a[1])[0];
      MIC.label = best[1] > 0.45 ? best[0] : MIC.w > 0.5 ? 'parle' : 'silence';
      return MIC.emo;
    }
    // ---------- MOTS (hub 2.8, borne 1.20.4) : pendant le micro 🎤, « oui / ouais » → il hoche la tête, « non / nan » → il fait non,
    // « salut / coucou » → il lève la main, TOUT DE SUITE (~0,15 s après la fin du mot), pendant que sa bouche continue d'imiter la tienne
    // (aucune voix de synthèse). src/mots.js : Vosk (WebAssembly) + modèle français sur l'appareil, MÊME flux que la bouche (pas de 2e micro).
    // Chargé au 1er micro (assets/mots.vosk.bin ~6 Mo + assets/mots-fr-<v>.tgz, gardés par le navigateur) ; données mobiles : pas de
    // téléchargement (« ça arrive en Wi-Fi »). Journal discret (catégorie + latence, jamais de son ni de texte).
    const WD = { w: null, st: 'off', rep: new Set(), repN: 0, said: false, metSaid: false, frT: 0, n: 0, hint: '', pg: 0, pgT: 0, pgShown: 0, pgOn: false, pre: false, laughD: 0, laughAt: -9, lfT: 0 };
    if (window.JDW_PG_TEST) window.__pgWD = WD;
    const wordsOk = () => !!PGM && typeof PGM.createWords === 'function' && typeof WebAssembly === 'object' && typeof Worker !== 'undefined' && !(window.JDW_PG_TEST && window.JDW_PG_NOMOTS);
    const metered = () => { try { const c = navigator.connection; return !!c && (!!c.saveData || c.type === 'cellular'); } catch (e) { return false; } };
    const absUrl = motsAbs;
    function wordsDiag(key, msg, extra) {   // une fois par sorte et par séance, 12 au plus (+ bilans) ; JAMAIS de texte entendu
      if (WD.rep.has(key) || (WD.repN >= 12 && !/^bilan/.test(key))) return; WD.rep.add(key); WD.repN++;
      const d = Object.assign({ app: UAAPP || 'web', android: UAAND, v: MOTS_V, sr: MIC.ctx ? MIC.ctx.sampleRate : 0 }, extra || {});
      try { report('Pégase hub : ' + msg, JSON.stringify(d)); } catch (e) { /* rien */ }
      if (window.JDW_PG_TEST) (window.__pgWDLOG = window.__pgWDLOG || []).push(['Pégase hub : ' + msg, d]);
    }
    function wordsState(st) {
      WD.st = st; $.mic.classList.toggle('mload', st === 'load' && MIC.on);
      if (st === 'load') progSet(MOTS.inst ? null : 4);
      if (st === 'ready') { progSet(100); if (MIC.on && !WD.said && !store.get(MOTS_KEY + '.dit')) { WD.said = true; store.set(MOTS_KEY + '.dit', '1'); later(() => toast('🎤 Dis « oui », « non » ou « salut » : je te réponds d’un geste !', 3200), WD.pgOn ? 1300 : 0); } }
      if (st === 'fail') progSet(-1);
    }
    // PROGRESSION du 1er chargement (seulement micro ouvert) : « Je prépare l'écoute… 40 % » (téléchargement : octets ; ensuite : étapes du
    // moteur, avec une petite avance régulière entre deux étapes), puis « ✓ Je t'écoute ! » 1,2 s
    const PG_STEP = { vosk: 8, sync: 22, fetch: 26, save: 84, model: 90 };
    function progSet(v) {
      if (v === -1) { WD.pg = 0; WD.pgOn = false; $.mprog.hidden = true; $.mprog.classList.remove('ok'); return; }
      if (v != null) WD.pg = Math.max(WD.pg, v);
      if (!MIC.on) { if (!WD.pgOn) return; }
      if (WD.pg >= 100) { if (WD.pgOn) { $.mprogt.textContent = '✓ Je t’écoute !'; $.mprog.classList.add('ok'); clearTimeout(WD.pgT); WD.pgT = later(() => { $.mprog.hidden = true; $.mprog.classList.remove('ok'); WD.pgOn = false; }, 1200); } return; }
      if (!WD.pgOn && MIC.on && WD.st === 'load') { WD.pgOn = true; WD.pgShown = WD.pg; $.mprog.hidden = false; $.mprog.classList.remove('ok'); clearTimeout(WD.pgT); progTick(); }
    }
    function progTick() {
      if (!WD.pgOn || WD.pg >= 100) return;
      if (!MIC.on) { $.mprog.hidden = true; WD.pgOn = false; return; }
      const nx = [8, 22, 26, 84, 90, 99].find((x) => x > WD.pg + 0.5) || 99;
      WD.pg = Math.min(nx - 1, WD.pg + (nx - WD.pg) * 0.035);                       // avance douce vers l'étape suivante
      WD.pgShown += (WD.pg - WD.pgShown) * 0.35;
      const n = Math.max(1, Math.min(99, Math.round(WD.pgShown)));
      $.mprogt.textContent = 'Je prépare l’écoute… ' + n + ' %'; $.mprogb.style.width = n + '%';
      later(progTick, 120);
    }
    function onProg(phase, frac) {
      if (phase === 'dl' && frac != null) progSet(26 + 58 * frac);
      else if (PG_STEP[phase] != null) progSet(PG_STEP[phase]);
    }
    // le moteur des mots du hub (créé une fois ; le modèle reste chargé tant que le hub est ouvert)
    async function wordsMake() {
      if (WD.w) return true;
      const U = motsUrls(), have = store.get(MOTS_KEY);
      let cached = have === String(MOTS_V); if (!cached) cached = await motsHas(U.model);
      if (dead || WD.w) return !!WD.w;
      if (!cached && !MOTS.inst && metered()) {
        if (MIC.on && !WD.metSaid) { WD.metSaid = true; toast('🎤 Les gestes à la voix (oui, non, salut) arriveront en Wi‑Fi', 3200); }
        wordsDiag('metered', 'mots : pas téléchargés (données mobiles)'); return false;
      }
      // ancienne version du modèle gardée par le navigateur : place libérée avant la nouvelle (jamais pendant une installation)
      if (have && have !== String(MOTS_V) && !cached && !MOTS.inst) { try { indexedDB.deleteDatabase('/vosk'); } catch (e) { /* rien */ } }
      WD.w = PGM.createWords({ voskUrl: U.vosk, modelUrl: U.model, cached, wait: MOTS.inst, slow: (window.JDW_PG_TEST && +window.JDW_PG_SLOW) || 0, onWord: wordHeard, onState: wordsState, diag: wordsDiag, onProgress: onProg,
        onHint: (c) => { WD.hint = c === 'oui' || c === 'non' || c === 'salut' ? c : ''; }, onGrowl: growlHold, onVoice: (v, ms) => { if (!MIC.on || !STG || !STG.A || !STG.A.listen || editing || friendOn) return; if (v) STG.A.listen(); else if (ms < 1300) STG.A.ack(); } });
      if (MOTS.inst) { const off = motsListen((ph, f) => onProg(ph, f)); MOTS.inst.then(off, off); }
      return true;
    }
    async function wordsStart() {
      if (!wordsOk() || !MIC.on || !MIC.ctx || !MIC.src) return;
      if (!(await wordsMake())) return;
      if (!MIC.on || dead) return;
      if (WD.st === 'load') progSet(null);
      const ctx = MIC.ctx, src = MIC.src, ok = await WD.w.start(ctx, src);
      if (ok) store.set(MOTS_KEY, String(MOTS_V));
      if (!MIC.on || MIC.ctx !== ctx) { if (WD.w) WD.w.stop(); }   // micro coupé pendant le chargement
      $.mic.classList.remove('mload');
    }
    // à l'ouverture du hub : moteur préparé EN AVANCE (déjà installé : ~1-3 s en arrière-plan, le 1er 🎤 est immédiat) si l'appareil a de la
    // mémoire (≥ 4 Go annoncés) ; pas installé + Wi-Fi : installation d'abord (même chose que la borne au calme)
    function wordsPreload() {
      if (WD.pre || dead || !wordsOk() || document.hidden || (window.JDW_PG_TEST && window.JDW_PG_NOPRELOAD)) return; WD.pre = true;
      const mem = navigator.deviceMemory;
      if (!(mem >= 4) && !(window.JDW_PG_TEST && window.JDW_PG_PRELOAD)) { wordsDiag('pre-mem', 'mots : pas préparés d’avance (mémoire ' + (mem || '?') + ' Go)'); return; }
      (async () => {
        const U = motsUrls(); let has = store.get(MOTS_KEY) === String(MOTS_V) && await motsHas(U.model);
        if (!has && !metered()) { const r = await motsWarm({ from: 'hub' }); has = !!(r && (r.ok || r.deja)); }
        if (!has || dead || WD.w) return;
        if (!(await wordsMake()) || dead) return;
        const t0 = performance.now(), ok = await WD.w.preload();
        if (ok) wordsDiag('pre', 'mots : préparés d’avance à l’ouverture du hub (' + Math.round(performance.now() - t0) + ' ms)');
      })().catch(() => {});
    }
    function wordsStop() {
      if (!WD.w) return; WD.w.stop(); $.mic.classList.remove('mload');
      WD.hint = ''; progSet(-1);
      const st = WD.w.stats(); if (st.morceaux > 25) wordsDiag('bilan' + (WD.rep.has('bilan') ? '-' + (++WD.n) : ''), 'bilan des mots', { st });
    }
    function wordHeard(cat, info) {
      if (dead || !MIC.on || !STG || !STG.ready() || editing || friendOn) return;
      if (info.son) wordsDiag('heard:grr-son', 'mots : grognement « grrr » entendu au son');
      else wordsDiag('heard:' + cat, 'mots : entendu « ' + cat + ' » (' + (info.fin == null ? '?' : info.fin) + ' ms après le mot)', { fin: info.fin, calc: info.calc, final: info.final });
      if (window.JDW_PG_TEST) (window.__pgWORDS = window.__pgWORDS || []).push([cat, info.fin, info.calc, performance.now()]);
      if (cat === 'rire') { laughGo('mot', 1); return; }
      WD.hint = '';
      const k = cat === 'salut' ? 'wave' : cat;
      if (k === 'grr' && STG.A && STG.A.laughT > 0) STG.A.laughT = Math.min(STG.A.laughT, 0.3);   // il grogne : le rire s'arrête
      if (!STG.gesture(k)) return;
      hintOff();
      if (window.JDW_PG_TEST) (window.__pgGEST = window.__pgGEST || []).push([k, performance.now(), info.son ? 'son' : 'mot']);
      const b = box.querySelector(`.pgh-emotes .pgh-emo[data-emo="${k}"]`); if (b) { b.classList.add('hit'); later(() => b.classList.remove('hit'), 600); }
      // micro ouvert = gros plan sur la tête : on recule un peu le temps du coucou, de « pas content » (poings sur les hanches) et du six-sept
      // (les mains), puis on revient ; « grr » reste en gros plan (les dents se voient)
      const back = { wave: 2500, fache: 3700, sixsept: 3100 }[k];
      if (back) { STG.setFrame('geste'); clearTimeout(WD.frT); WD.frT = later(() => { if (MIC.on && STG && !editing && !friendOn && !(STG.A && STG.A.busy && (STG.A.facheT > 0.4 || STG.A.ssT > 0.4))) STG.setFrame('parle'); }, back); }
      // hub 2.10 : PLUS d'étiquette du mot (« 👍 oui »…) devant l'avatar — elle cachait le visage ; le geste seul suffit (journal d'essai : __pgGEST)
    }
    // grognement entendu au SON qui dure : l'avatar continue de grogner tant que tu grognes
    function growlHold() {
      if (dead || !MIC.on || !STG || !STG.ready() || editing || friendOn || !STG.A || !STG.A.grrHold) return;
      if (STG.A.grrT > 0) STG.A.grrHold();
    }

    // RIRE (1.20.5) : rire entendu au micro (au TON : MIC.laughOn, ou aux MOTS : « haha », « hihi », « mdr ») → l'avatar RIT : yeux plissés,
    // bouche ouverte souriante, tête qui bascule en arrière, épaules qui sautillent, main sur le ventre si ça dure ; plan « geste » le temps du
    // rire (le haut du corps se voit), puis retour au gros plan. Jamais de voix.
    function laughGo(src, k) {
      if (dead || !MIC.on || !STG || !STG.ready() || editing || friendOn || !STG.A) return;
      const A = STG.A, fresh = !(A.laughT > 0);
      if (fresh) {
        STG.gesture('laugh'); A.laughK = k; WD.laughAt = performance.now();
        const b = box.querySelector('.pgh-emotes .pgh-emo[data-emo="laugh"]'); if (b) { b.classList.add('hit'); later(() => b.classList.remove('hit'), 600); }
        wordsDiag('rire:' + src, 'rire : l’avatar rit (' + (src === 'mot' ? 'mot' : 'ton de la voix') + ')');
        if (window.JDW_PG_TEST) (window.__pgLAUGH = window.__pgLAUGH || []).push([src, performance.now()]);
      } else A.laughHold(k);
      STG.setFrame('geste'); clearTimeout(WD.lfT); WD.lfT = later(laughEnd, 400);
    }
    function laughEnd() {
      if (dead || !STG || !STG.A) return;
      if (STG.A.laughT > 0 || (MIC.on && MIC.laughOn)) { WD.lfT = later(laughEnd, 300); return; }
      WD.lfT = later(() => { if (MIC.on && STG && !editing && !friendOn && !(STG.A.laughT > 0)) STG.setFrame('parle'); }, 700);
    }
    function laughTick(dt) {
      if (MIC.laughOn && WD.w && WD.w.rough && WD.w.rough()) { WD.laughD = 0; return; }   // hub 2.10 : un « grrr » roulé n'est pas un rire
      if (MIC.laughOn && STG && STG.A && STG.A.grrT > 0) { WD.laughD = 0; return; }
      if (MIC.laughOn) { WD.laughD += dt; laughGo('ton', Math.min(1, 0.45 + WD.laughD * 0.6)); } else WD.laughD = 0;
    }

    // ---------- PARLER (démo) : la voix du navigateur dit une phrase ; la bouche suit le TEXTE (règles du français → visèmes), recalée MOT À MOT
    // sur les évènements « boundary » de la voix (sinon au rythme moyen). Phrases fixes : rien de personnel n'est donné à la voix.
    const SAY = { on: false, n: -1 };
    // 1.20.3 (demande de l'utilisateur : « je ne veux pas que l'avatar parle », « l'oreille, c'est long ») : PAS de voix de l'avatar (💬 caché,
    // aucune réponse dite) et PAS d'écoute en boucle (pas d'oreille). Le code reste, coupé ; les essais peuvent le rallumer :
    // window.JDW_PG_SAY = 1 (💬 + réponses dites), window.JDW_PG_EAR = 1 (écoute en boucle), seulement avec window.JDW_PG_TEST.
    const PG_SAY = !!(window.JDW_PG_TEST && window.JDW_PG_SAY), PG_EAR = !!(window.JDW_PG_TEST && window.JDW_PG_EAR);
    const PHRASES = ['Salut ! Moi, c’est ton avatar. Tu viens jouer avec moi ?', 'Bonjour ! On fait une partie sur la borne, ce soir ?', 'Coucou ! Regarde, je parle avec ma bouche, maintenant.'];
    const OPEN = { A: 0.8, E: 0.45, I: 0.15, O: 0.45, OU: 0.1, EU: 0.35 };
    function sayVoice() {
      let vs = []; try { vs = speechSynthesis.getVoices().filter((v) => /^fr/i.test(v.lang)); } catch (e) { /* rien */ }
      return vs.find((v) => v.localService && /fr.FR/i.test(v.lang)) || vs.find((v) => v.localService) || vs.find((v) => /fr.FR/i.test(v.lang)) || vs[0] || null;
    }
    // appli de la borne 1.9 : la voix du TÉLÉPHONE (api.natif.voice, Voix.java) quand la WebView n'a pas speechSynthesis
    const NV = api && api.natif && api.natif.voice && typeof api.natif.voice.speak === 'function' ? api.natif.voice : null;   // (NT est défini plus bas)
    let nvOff = null; const NVL = { on: false, t: 0 };
    const nvUse = () => !!NV && (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined' || !sayVoice()) && NV.canSpeak();
    // évènements du téléphone : voix (tts) → la phrase en cours ; écoute (stt) → l'écoute continue (EAR) si elle tourne, sinon le « oui / non » après une question
    if (NV) nvOff = NV.onEvent((ev) => { if (dead) return; if (ev.state === 'tts' && SAY.nv) SAY.nv(ev); else if (ev.state === 'stt') { if (EAR.cur && EAR.cur.via === 'natif') earEvent(ev); else nvHeard(ev); } });
    function nvListen() {   // après une question (💬), écoute continue coupée : un seul « oui » / « non » (comme l'appli 1.9 l'a toujours fait)
      if (!NV || !NV.canListen() || NVL.on || MIC.on || editing || friendOn || EAR.cur) return;
      if (NV.listen() !== 'ok') return;
      NVL.on = true; NVL.t = performance.now(); $.say.classList.add('ear');
      later(() => { if (NVL.on && performance.now() - NVL.t > 7900) { NVL.on = false; $.say.classList.remove('ear'); try { NV.stopListen(); } catch (e) { /* rien */ } } }, 8000);
    }
    function nvHeard(ev) {
      if (!NVL.on) return;
      if (ev.ev === 'result' || ev.ev === 'error') { NVL.on = false; $.say.classList.remove('ear'); }
      if (ev.ev !== 'result' || !STG || !STG.ready()) return;
      const it = earIntent(Array.isArray(ev.words) ? ev.words[0] : '') || (ev.answer === 'oui' || ev.answer === 'non' ? { k: ev.answer, w: ev.answer } : null);
      if (it) earReact(it, 'question');
    }
    function sayStop() {
      if (!SAY.on) return; const wasReply = SAY.reply; SAY.on = false; SAY.lip = null; SAY.u = null; SAY.nv = null; SAY.reply = false;
      if (SAY.nvId) { SAY.nvId = ''; try { NV.stopSpeak(); } catch (e) { /* rien */ } }
      try { speechSynthesis.cancel(); } catch (e) { /* rien */ }
      $.say.classList.remove('on');
      if (STG) {
        if (MIC.on) { STG.setTalk(micTalk); STG.setFrame('parle'); STG.setHome(true); }   // réponse dite micro ouvert : la bouche suit de nouveau ta voix
        else { STG.setTalk(null); STG.setHome(false); STG.setFrame(editing ? (FR_CAT[cat] || 'corps') : 'corps'); }
      }
      // l'écoute reprend un peu APRÈS la fin de la phrase (jamais la voix de l'avatar prise pour la tienne)
      EAR.holdUntil = performance.now() + (wasReply ? 650 : 500); later(earSync, wasReply ? 680 : 530); earUi();
    }
    // sayStart() = une phrase de démo (bouton 💬) ; sayStart(texte, { reply: true }) = réponse à ce qu'on vient d'entendre (« Salut ! ») :
    // plan plus large (le bras du coucou se voit), le micro 🎤 reste ouvert (la bouche reprend ta voix après)
    function sayStart(text, o) {
      o = o || {};
      const native = nvUse();
      if (!native && (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined')) { if (!o.reply) toast('🗣️ Ce navigateur ne sait pas parler'); return false; }
      if (!STG || !STG.ready() || !PGM) { if (!o.reply) toast('Ton avatar arrive…'); return false; }
      if (SAY.on) sayStop();
      if (MIC.on && !o.reply) micStop();
      if (!text) text = PHRASES[(SAY.n = (SAY.n + 1) % PHRASES.length)];
      const words = PGM.frenchVisemes(text), VIS = PGM.VIS;
      const lip = { words, wi: -1, wt: 0, unit: 0.072, started: false, ended: false, bnd: 0, lastB: 0, t: 0, p: new Float32Array(VIS.length), mouth: PGM.createMouth() };
      const u = native ? {} : new SpeechSynthesisUtterance(text);
      if (!native) { u.lang = 'fr-FR'; const v = sayVoice(); if (v) u.voice = v; u.rate = 1; u.pitch = 1.05; }
      u.onstart = () => { if (SAY.lip !== lip) return; lip.started = true; lip.wi = 0; lip.wt = 0; lip.t = 0; };
      u.onboundary = (e) => {
        if (SAY.lip !== lip || (e.name && e.name !== 'word')) return;
        const k = words.findIndex((w) => w.i + w.w.length > e.charIndex); if (k < 0) return;
        // vitesse réelle de la voix : durée du mot d'avant / sa longueur prévue
        if (lip.bnd && k === lip.wi + 1) { const units = words[lip.wi].v.reduce((a, x) => a + x[1], 0), spent = lip.t - lip.lastB; if (spent > 0.05 && units > 0) lip.unit += (Math.max(0.04, Math.min(0.14, spent / (units + 0.6))) - lip.unit) * 0.5; }
        lip.wi = k; lip.wt = 0; lip.bnd++; lip.lastB = lip.t; lip.started = true;
      };
      u.onend = u.onerror = () => { if (SAY.lip === lip) { lip.ended = true; later(() => { if (SAY.lip === lip) { sayStop(); if (native && !o.reply && /\?\s*$/.test(text) && !EAR.want) nvListen(); } }, 350); } };
      // voix du téléphone : mêmes évènements, venus du pont (start, word = position du mot dans le texte, done / stop / error)
      if (native) SAY.nv = (ev) => { if (ev.id && ev.id !== SAY.nvId) return; if (ev.ev === 'start') u.onstart(); else if (ev.ev === 'word') u.onboundary({ name: 'word', charIndex: +ev.start || 0 }); else if (/^(done|stop|error)$/.test(ev.ev)) u.onend(); };
      if (EAR.cur) EAR.cur.taint = true;   // ce que l'écoute en cours entendra maintenant, c'est la voix de l'avatar
      SAY.on = true; SAY.reply = !!o.reply; SAY.lip = lip; SAY.u = u; SAY.text = text; $.say.classList.add('on'); hintOff(); if (window.JDW_PG_TEST) window.__pgSAY = SAY;   // SAY.u : sinon Chrome peut oublier la phrase et ne jamais dire « fin »
      earSync();   // l'avatar parle : on n'écoute plus (reprise après la phrase)
      STG.setFrame(o.reply ? 'geste' : 'parle'); STG.setHome(true);
      STG.setTalk((dt) => {
        if (!SAY.on || SAY.lip !== lip) return null;
        lip.t += dt; let cur = 'sil';
        // fin sans évènement « end » (certains navigateurs) : la voix ne parle plus depuis 0,4 s
        let speaking = true; try { speaking = native ? !lip.ended : speechSynthesis.speaking; } catch (e) { /* rien */ }
        lip.quiet = lip.started && !speaking && lip.t > 1 ? (lip.quiet || 0) + dt : 0; if (lip.quiet > 0.4 && !lip.ended) { lip.ended = true; later(() => { if (SAY.lip === lip) sayStop(); }, 300); }
        if (lip.started && !lip.ended && lip.wi >= 0 && lip.wi < words.length) {
          lip.wt += dt; const W = words[lip.wi]; let a = 0; const x = lip.wt / lip.unit;
          for (const [c, d] of W.v) { if (x < a + d) { cur = c; break; } a += d; }
          if (cur === 'sil' && !lip.bnd && x > a + 0.6 && lip.wi < words.length - 1) { lip.wi++; lip.wt = 0; }   // pas d'évènements de mots : au rythme moyen
          if (cur === 'sil' && x < a + 0.6) cur = 'T';
        }
        lip.p.fill(0); lip.p[VIS.indexOf(cur)] = 1;
        const mo = lip.mouth.step(dt, { p: lip.p, L: cur === 'sil' ? 0 : 0.85, open: OPEN[cur] || 0 });
        const talking = cur !== 'sil' ? 1 : 0;
        if (window.JDW_PG_TEST) { SAY.vis = cur; SAY.jaw = +(mo.Jaw_Open || 0); SAY.jawMax = Math.max(SAY.jawMax || 0, SAY.jaw); }
        return { w: 1, v: Object.assign({}, mo, { Brows_Raised: 0.18 * talking + 0.1 }), asym: lip.mouth.asym, nod: Math.sin(lip.t * 5.3) * 0.025 * talking, tilt: Math.sin(lip.t * 0.9) * 0.05 };
      });
      if (native) { SAY.nvId = NV.speak(text); if (!SAY.nvId) { sayStop(); if (!o.reply) toast('🗣️ Pas de voix française sur ce téléphone'); return false; } }
      else try { speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { sayStop(); if (!o.reply) toast('🗣️ La voix du navigateur ne répond pas'); return false; }
      // voix muette (aucun début au bout de 2,5 s) : on mime quand même la phrase au rythme moyen
      later(() => { if (SAY.lip === lip && !lip.started) { lip.started = true; lip.wi = 0; lip.wt = 0; later(() => { if (SAY.lip === lip) sayStop(); }, 6000); } }, 2500);
      return true;
    }
    on($.say, 'click', (e) => { e.stopPropagation(); if (SAY.on) { sayStop(); return; } sayStart(); });
    // pas de voix sur cet appareil (WebView d'Android : pas de speechSynthesis ; ou aucune voix) : 💬 caché (🎤 reste), noté une fois dans le journal
    (function sayCheck() {
      // 1.20.3 : l'avatar ne parle plus (demande de l'utilisateur) → 💬 toujours caché ; le code reste (essais : window.JDW_PG_SAY = 1)
      if (!PG_SAY) { $.say.hidden = true; $.say.style.display = 'none'; return; }
      const hide = (why) => { $.say.hidden = true; $.say.style.display = 'none'; try { if (!store.get('jdw.pegase.saylog')) { store.set('jdw.pegase.saylog', '1'); report('Pégase hub : bouton 💬 caché (' + why + ')'); } } catch (e) { /* rien */ } };
      if (NV && NV.canSpeak()) return;   // appli 1.9 : la voix du téléphone
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { hide('pas de speechSynthesis'); return; }
      let n = 0; try { n = speechSynthesis.getVoices().length; } catch (e) { n = 0; }
      if (n) return;
      const ok = () => { try { return speechSynthesis.getVoices().length > 0; } catch (e) { return false; } };
      try { speechSynthesis.addEventListener('voiceschanged', () => { if (ok()) { $.say.hidden = false; $.say.style.display = ''; } }); } catch (e) { /* rien */ }
      later(() => { if (!ok()) hide('aucune voix'); }, 3000);
    })();
    on($.mic, 'click', (e) => { e.stopPropagation(); if (MIC.on) { micStop(); tone(520, 360); return; } if (store.get('jdw.pegase.micok')) micStart(); else $.micm.classList.add('on'); });
    on($.micm, 'click', (e) => { const h = e.target.closest('[data-h]'); if (e.target === $.micm || (h && h.dataset.h === 'micno')) { $.micm.classList.remove('on'); return; } if (h && h.dataset.h === 'micok') { $.micm.classList.remove('on'); micStart(); } });
    on(document, 'visibilitychange', () => { if (document.hidden && MIC.on) micStop(); if (document.hidden) sayStop(); });

    // ---------- ÉCOUTE : « parle à ton avatar » (hub 2.7, borne 1.21) ----------
    // Appli de la borne 1.9+ (api.natif.voice : SpeechRecognizer d'Android en français, sur le téléphone de préférence) ; navigateur avec la
    // reconnaissance vocale (Chrome sur ordinateur…) seulement après « C'est parti ! ». « oui » → l'avatar hoche la tête, « non » → il fait non,
    // « salut / coucou / bonjour / bonsoir / hello » → coucou de la main + « Salut ! » (« Coucou ! », « Bonjour ! » / « Bonsoir ! » selon
    // l'heure…) à voix haute, bouche mot à mot ; « au revoir / à plus / bonne nuit… » → coucou + « À plus ! ».
    // Android écoute UNE phrase à la fois : la page relance l'écoute aussitôt (boucle) et réagit dès le mot PARTIEL. Coupée pendant que
    // l'avatar parle (+ 0,6 s), quand la page est cachée, pendant le créateur ou chez un copain ; s'endort après 45 s sans voix (rien qui
    // tourne pour rien), se réveille quand on touche l'avatar ou l'oreille. Micro 🎤 ouvert en même temps : Android peut couper l'une des
    // deux captures → détection (reconnaissance muette alors que ta voix fait bouger la bouche, ou micro de la page qui tombe à zéro) →
    // l'écoute des mots se met en pause pendant le micro (la bouche reste prioritaire), retenu sur l'appareil pour cette version d'appli.
    // Journal (report : une fois par sorte et par séance, 12 au plus + un bilan) : version d'appli, api, Android, mode de reconnaissance,
    // erreurs, catégorie comprise (oui / non / salut / aurevoir) — JAMAIS le texte entendu.
    const EAR_KEY = 'jdw.pegase.ecoute', EAR_CONF = 'jdw.pegase.ecoute.conflit', EAR_IDLE = 45000;
    const UAAPP = (navigator.userAgent.match(/BorneArcadeV\/([0-9.]+)/) || [])[1] || '', UAAND = (navigator.userAgent.match(/Android (\d+)/) || [])[1] || '';
    const SRW = /BorneArcade\//.test(navigator.userAgent) ? null : (window.SpeechRecognition || window.webkitSpeechRecognition || null);
    const EAR = { via: '', want: false, running: false, sleeping: false, cur: null, gen: 0, kickT: 0, lastAct: 0, holdUntil: 0, cool: {}, busyN: 0, errRun: 0,
      perm: false, fatal: '', mode: '', micBad: 0, micOk: false, conflict: false, local: false, R: null, lastHi: -1e9, rep: new Set(), repN: 0, bilanAt: -1, labT: 0,
      st: { sessions: 0, ready: 0, begin: 0, partial: 0, result: 0, err: {}, heard: {}, noans: 0, busy: 0, sleeps: 0, micSessions: 0, ms: 0 } };
    if (PG_EAR) try { EAR.via = NV && typeof NV.listen === 'function' ? (NV.canListen() ? 'natif' : '') : SRW ? 'web' : ''; } catch (e) { EAR.via = ''; }
    { const s = store.get(EAR_KEY); EAR.want = !!EAR.via && (s === '1' || (s == null && EAR.via === 'natif' && !!store.get('jdw.pegase.micok'))); }
    EAR.conflict = !!store.get(EAR_CONF) && store.get(EAR_CONF) === (UAAPP || 'web');
    const wordsOk0 = () => typeof WebAssembly === 'object' && typeof Worker !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext) && !(window.JDW_PG_TEST && window.JDW_PG_NOMOTS);
    if ($.micwords) $.micwords.hidden = !(PG_EAR ? EAR.via === 'natif' : wordsOk0());
    if (EAR.via === 'web' && $.earwho) $.earwho.textContent = 'Les mots sont reconnus par ton navigateur (Chrome peut passer par Google pour ça), rien n\'est enregistré. Touche l\'oreille pour qu\'il arrête d\'écouter.';
    const earSt = () => { const s = EAR.st; return { phrases: s.sessions, pretes: s.ready, voix: s.begin, partiels: s.partial, resultats: s.result, erreurs: s.err, compris: s.heard,
      sansReponse: s.noans, occupe: s.busy, dodos: s.sleeps, avecMicro: s.micSessions, secondes: Math.round(s.ms / 1000), conflit: EAR.conflict, microOk: EAR.micOk }; };
    // journal : discret (une fois par sorte et par séance), JAMAIS le texte entendu
    function earDiag(key, msg, extra) {
      if (EAR.rep.has(key) || (EAR.repN >= 12 && !/^bilan/.test(key))) return; EAR.rep.add(key); EAR.repN++;
      const d = Object.assign({ app: UAAPP || 'web', api: NV ? (+NV.api || 2) : 0, android: UAAND, via: EAR.via, mode: EAR.mode || '?', micro: MIC.on }, extra || {});
      try { report('Pégase hub : ' + msg, JSON.stringify(d)); } catch (e) { /* rien */ }
      if (window.JDW_PG_TEST) (window.__pgEARLOG = window.__pgEARLOG || []).push(['Pégase hub : ' + msg, d]);
    }
    function earBilan() { if (!EAR.st.sessions || EAR.bilanAt === EAR.st.sessions) return; EAR.bilanAt = EAR.st.sessions; earDiag('bilan' + (EAR.rep.has('bilan') ? '-' + EAR.st.sessions : ''), 'bilan de l\'écoute' + (EAR.rep.has('bilan') ? ' (suite)' : ''), { st: earSt() }); }
    if (PG_EAR && !EAR.via && NV && typeof NV.listen === 'function') earDiag('none', 'écoute impossible : pas de reconnaissance vocale sur ce téléphone (canListen)');
    // ce qu'on a dit → une sorte (le texte n'est gardé nulle part)
    const earNorm = (s) => ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
    const EAR_BYE = / (au revoir|a plus tard|a plus|a tout a l heure|a toute|a bientot|a demain|bye bye|bye|ciao|tchao|bonne nuit) /, EAR_HI = / (salut|coucou|bonjour|bonsoir|hello|hey) /;
    const EAR_YES = / (oui|ouais|ouai|ouaip|ok|okay|d accord|bien sur|carrement|volontiers|exactement|yes|yep|ouep) /, EAR_NO = / (non|nan|nope|pas du tout|surtout pas|jamais|no) /;
    const EAR_SAYW = { 'a plus': 'à plus', 'a plus tard': 'à plus tard', 'a tout a l heure': 'à tout à l\'heure', 'a toute': 'à toute', 'a bientot': 'à bientôt', 'a demain': 'à demain' };
    function earIntent(txt) {
      const t = earNorm(txt); if (!t.trim()) return null;
      let m = t.match(EAR_BYE); if (m && !(m[1] === 'a plus' && / y a plus /.test(t))) return { k: 'aurevoir', w: m[1] };
      m = t.match(EAR_HI); if (m) return { k: 'salut', w: m[1] };
      const y = t.match(EAR_YES), n = t.match(EAR_NO);
      if (y && !n) return { k: 'oui', w: y[1] }; if (n && !y) return { k: 'non', w: n[1] };
      return null;
    }
    function earReact(it, src) {
      if (!STG || !STG.ready() || dead) return false;
      const now = performance.now();
      if (EAR.cool[it.k] && now - EAR.cool[it.k] < 1500) return false;
      EAR.cool[it.k] = now; EAR.lastAct = now;
      EAR.st.heard[it.k] = (EAR.st.heard[it.k] || 0) + 1;
      earDiag('heard:' + it.k, 'entendu « ' + it.k + ' » (' + (EAR.mode || EAR.via || 'question') + ', ' + src + (MIC.on ? ', micro 🎤 ouvert' : '') + ')', { ms: EAR.cur && EAR.cur.t ? Math.round(now - EAR.cur.t) : null, phrases: EAR.st.sessions });
      $.ear.classList.remove('ping'); void $.ear.offsetWidth; $.ear.classList.add('ping'); later(() => $.ear.classList.remove('ping'), 750);
      if (window.JDW_PG_TEST) (window.__pgHEARD = window.__pgHEARD || []).push([it.k, src]);
      if (it.k === 'oui' || it.k === 'non') { const k = STG.gesture(it.k); gestured(k); toast(it.k === 'oui' ? '👍 J\'ai entendu « oui » !' : '👎 J\'ai entendu « non »'); return true; }
      const hi = it.k === 'salut', w = it.w, h = new Date().getHours();
      let r;
      if (hi) r = w === 'coucou' ? 'Coucou !' : w === 'bonjour' ? (h >= 18 || h < 4 ? 'Bonsoir !' : 'Bonjour !') : w === 'bonsoir' ? 'Bonsoir !' : w === 'hello' ? 'Hello !' : (now - EAR.lastHi < 30000 ? 'Re-salut !' : 'Salut !');
      else r = w === 'au revoir' ? 'Au revoir !' : w === 'bonne nuit' ? 'Bonne nuit !' : w === 'a demain' ? 'À demain !' : w === 'a bientot' ? 'À bientôt !' : 'À plus !';
      if (hi) EAR.lastHi = now;
      toast('👋 J\'ai entendu « ' + (EAR_SAYW[w] || w) + ' »');
      STG.gesture('wave'); hintOff();
      const b = box.querySelector('.pgh-emotes .pgh-emo[data-emo="wave"]'); if (b) { b.classList.add('hit'); later(() => b.classList.remove('hit'), 600); }
      if (PG_SAY) later(() => { if (!dead) sayStart(r, { reply: true }); }, 200);   // 1.20.3 : plus de réponse dite (l'avatar ne parle pas)
      return true;
    }
    // faut-il écouter maintenant ?
    function earShould() {
      return !!EAR.via && EAR.want && !EAR.perm && !EAR.fatal && !dead && !document.hidden && !!STG && STG.ready() && !stgFail && !editing && !friendOn && heroVis
        && !EAR.sleeping && !SAY.on && !MIC.busy && !(MIC.on && EAR.conflict);
    }
    function earSync() {
      if (dead) return;
      const run = earShould();
      if (run && !EAR.running) {
        EAR.running = true; if (!EAR.lastAct) EAR.lastAct = performance.now();
        earDiag('start', 'écoute démarrée', { auto: store.get(EAR_KEY) == null, conflitConnu: EAR.conflict });
        earKick(Math.max(60, EAR.holdUntil - performance.now()));
      } else if (!run && EAR.running) {
        EAR.running = false; clearTimeout(EAR.kickT);
        // l'avatar parle : la phrase d'écoute en cours n'est PAS refermée (sur certains téléphones, une écoute refermée trop tôt reste
        // « occupée ») ; elle est marquée et tout ce qu'elle entendra est ignoré (sa propre voix). Le reste (page cachée, créateur, micro
        // qui s'ouvre…) referme l'écoute.
        if (SAY.on && EAR.cur && EAR.cur.via === 'natif') EAR.cur.taint = true; else earHalt();
      }
      earUi();
    }
    function earHalt() {   // referme la phrase en cours (un dernier résultat du téléphone peut arriver : ignoré)
      const c = EAR.cur; EAR.cur = null; if (!c) return;
      EAR.st.ms += performance.now() - c.t;
      if (c.via === 'natif') { try { NV.stopListen(); } catch (e) { /* rien */ } } else if (EAR.R) { try { EAR.R.abort(); } catch (e) { /* rien */ } }
    }
    function earKick(ms) { clearTimeout(EAR.kickT); EAR.kickT = later(() => { if (EAR.running && !EAR.cur && earShould()) earListen(); else if (!EAR.cur) earSync(); }, Math.max(0, ms || 0)); }
    function earSleep() { if (EAR.sleeping) return; EAR.sleeping = true; EAR.st.sleeps++; earBilan(); earSync(); }
    function earWake() { if (!EAR.want || dead) return; EAR.lastAct = performance.now(); if (EAR.sleeping) { EAR.sleeping = false; EAR.errRun = 0; EAR.busyN = 0; earSync(); } }
    // une phrase d'écoute (appli : NV.listen ; navigateur : SpeechRecognition continue)
    function earListen() {
      if (!EAR.running || EAR.cur || dead) return;
      if (performance.now() - EAR.lastAct > EAR_IDLE) { earSleep(); return; }
      if (EAR.via === 'web') { earWebStart(); return; }
      let r = 'none'; try { r = String(NV.listen()); } catch (e) { r = 'none'; }
      if (r === 'busy') {   // le téléphone n'a pas fini la phrase d'avant : on la referme, on réessaie
        EAR.st.busy++; if (++EAR.busyN >= 4) { earDiag('busy', 'écoute : le téléphone reste occupé (busy)', { st: earSt() }); earSleep(); return; }
        try { NV.stopListen(); } catch (e) { /* rien */ } earKick(1200); return;
      }
      if (r !== 'ok') { EAR.fatal = 'none'; earDiag('none', 'écoute impossible (listen → ' + r + ')'); earSync(); return; }
      EAR.busyN = 0; EAR.st.sessions++; if (MIC.on) EAR.st.micSessions++;
      const c = EAR.cur = { via: 'natif', gen: ++EAR.gen, t: performance.now(), mic: MIC.on, micV: 0 };
      // aucune nouvelle du téléphone (question « micro » d'Android à l'écran, reconnaissance bloquée…) : on referme et on réessaie plus tard
      later(() => { if (EAR.cur === c && !c.any) { EAR.st.noans++; earDiag('noans', 'écoute : le téléphone ne répond pas (rien en 5 s)', { st: earSt() }); EAR.cur = null; EAR.st.ms += 5000; try { NV.stopListen(); } catch (e) { /* rien */ } if (++EAR.errRun >= 5) earSleep(); else earKick(1500); } }, 5000);
      later(() => { if (EAR.cur === c) { try { NV.stopListen(); } catch (e) { /* rien */ } } }, 15000);   // phrase trop longue : on referme (le résultat arrive)
      later(() => { if (EAR.cur === c) { EAR.cur = null; EAR.st.ms += 19000; earKick(400); } }, 19000);
      earUi();
    }
    // évènements du téléphone pendant l'écoute
    function earEvent(ev) {
      const c = EAR.cur; if (!c || c.via !== 'natif') return;
      c.any = true;
      if (ev.ev === 'ready') { c.ready = true; EAR.st.ready++; if (ev.mode) EAR.mode = String(ev.mode); earDiag('ready:' + EAR.mode, 'écoute prête (' + (EAR.mode || '?') + ')'); return; }
      if (ev.ev === 'begin') { c.begin = true; EAR.st.begin++; EAR.lastAct = performance.now(); earMicOk(c); earUi(); return; }
      if (ev.ev === 'partial' || ev.ev === 'result') {
        const ws = Array.isArray(ev.words) ? ev.words.map(String) : [];
        if (ev.ev === 'partial') EAR.st.partial++; else EAR.st.result++;
        if (ws[0] && ws[0].trim()) { c.words = true; EAR.lastAct = performance.now(); earMicOk(c); }
        earWords(ws, ev.ev === 'result', ev.answer);
        if (ev.ev === 'result') earEnd('result');
        return;
      }
      if (ev.ev === 'error') earEnd(String(ev.err || 'err'));
    }
    function earWords(ws, final, ans) {
      const c = EAR.cur; if (!c || c.done || c.taint) return;   // une seule réaction par phrase (les partiels se répètent) ; rien d'une phrase où l'avatar a parlé
      if (!EAR.running || SAY.on || performance.now() < EAR.holdUntil) return;
      let it = earIntent(ws[0]);
      if (!it && final && (ans === 'oui' || ans === 'non')) it = { k: ans, w: ans };
      if (it && earReact(it, final ? 'final' : 'partiel')) c.done = true;
    }
    function earEnd(kind) {
      const c = EAR.cur; if (!c) return; EAR.cur = null;
      const now = performance.now(); EAR.st.ms += now - c.t;
      const normal = kind === 'result' || kind === 'stop' || kind === 'silence' || kind === 'nomatch' || (kind === 'lang' && !!window.JDW_PG_TEST && !!window.__pgEARlangOk);
      if (kind !== 'result') EAR.st.err[kind] = (EAR.st.err[kind] || 0) + 1;
      if (normal) EAR.errRun = 0;
      else { EAR.errRun++; earDiag('err:' + kind, 'écoute, erreur « ' + kind + ' » (' + (EAR.mode || EAR.via) + (c.mic ? ', micro 🎤 ouvert' : '') + ')', { st: earSt() }); }
      // micro 🎤 ouvert pendant cette phrase : la reconnaissance a-t-elle entendu quelque chose ?
      if (c.mic && MIC.on) {
        if (c.words || c.begin) earMicOk(c);
        else if (c.micV > 0.6 && !EAR.micOk && ++EAR.micBad >= 2) earConflict('reconnaissance muette');
      }
      if (kind === 'perm') { EAR.perm = true; toast('🎤 Autorise le micro de l\'appli pour que je t\'entende'); earSync(); return; }
      // le français n'est pas (encore) installé pour la reconnaissance du téléphone : on le dit, on réessaie une fois 40 s plus tard
      // (Android le télécharge parfois tout seul après la 1re demande)
      if (kind === 'lang' && !(window.JDW_PG_TEST && window.__pgEARlangOk)) {   // (essai dans l'émulateur sans français : boucle quand même)
        EAR.fatal = 'lang'; earSync();
        toast('🗣️ Ton téléphone n’a pas encore le français pour reconnaître la voix. Dans ses Paramètres, cherche « reconnaissance vocale » et ajoute le français.', 8000);
        if (!EAR.langRetry) { EAR.langRetry = true; later(() => { if (EAR.fatal === 'lang') { EAR.fatal = ''; EAR.errRun = 0; EAR.lastAct = performance.now(); earSync(); } }, 40000); }
        return;
      }
      if (EAR.errRun >= 5) { earDiag('stop', 'écoute endormie après 5 erreurs de suite', { st: earSt() }); earSleep(); return; }
      if (now - EAR.lastAct > EAR_IDLE) { earSleep(); return; }
      earKick(normal ? (kind === 'result' || kind === 'stop' ? 150 : 250) : kind === 'busy' ? 1200 : kind === 'net' ? 2500 : 900);
      earUi();
    }
    // micro 🎤 ouvert ET la reconnaissance entend ta voix : les deux marchent ensemble sur ce téléphone
    function earMicOk(c) { if (!c.mic || !MIC.on || EAR.micOk) return; EAR.micOk = true; EAR.micBad = 0; earDiag('mic:ok', 'écoute + micro 🎤 en même temps : ça marche'); }
    // micro de la page et reconnaissance d'Android ne marchent pas ensemble sur ce téléphone : la bouche (🎤) garde la priorité
    function earConflict(why) {
      if (EAR.conflict) return; EAR.conflict = true; store.set(EAR_CONF, UAAPP || 'web');
      earDiag('mic:conflit', 'écoute + micro 🎤 en même temps : impossible (' + why + ') → écoute en pause pendant le micro', { st: earSt() });
      earSync();
      toast('🎤 Micro ouvert, ton téléphone m’empêche de comprendre les mots. Coupe 🎤 pour me dire « salut » !', 6000);
      later(() => { if (MIC.on && MIC.zeroT > 1.5) earDiag('mic:muet', 'micro 🎤 de la page toujours muet après la pause de l\'écoute'); }, 2500);
    }
    // navigateur (Chrome…) : reconnaissance continue, sur l'appareil quand Chrome sait le faire
    function earWebStart() {
      let R = EAR.R;
      if (!R) {
        try { R = EAR.R = new SRW(); } catch (e) { EAR.fatal = 'none'; earDiag('none', 'écoute impossible (navigateur)'); earSync(); return; }
        R.lang = 'fr-FR'; R.continuous = true; R.interimResults = true; R.maxAlternatives = 3;
        if (EAR.local) { try { R.processLocally = true; } catch (e) { /* rien */ } }
        R.onstart = () => { const c = EAR.cur; if (!c || c.via !== 'web') return; c.any = c.ready = true; EAR.st.ready++; EAR.mode = EAR.local ? 'web-appareil' : 'web'; earDiag('ready:' + EAR.mode, 'écoute prête (' + EAR.mode + ')'); };
        R.onspeechstart = () => { const c = EAR.cur; if (!c) return; c.begin = true; EAR.st.begin++; EAR.lastAct = performance.now(); earMicOk(c); earUi(); };
        R.onresult = (e) => {
          const c = EAR.cur; if (!c || c.via !== 'web') return;
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i], ws = []; for (let j = 0; j < res.length; j++) ws.push(String(res[j].transcript || ''));
            if (res.isFinal) EAR.st.result++; else EAR.st.partial++;
            if (ws[0] && ws[0].trim()) { c.words = true; EAR.lastAct = performance.now(); }
            earWords(ws, !!res.isFinal, '');
            if (res.isFinal) c.done = false;   // phrase suivante
          }
        };
        R.onerror = (e) => { const c = EAR.cur; if (c) c.err = ({ 'no-speech': 'silence', aborted: 'stop', 'audio-capture': 'micro', network: 'net', 'not-allowed': 'perm', 'service-not-allowed': 'perm', 'language-not-supported': 'lang' })[e.error] || String(e.error || 'err'); };
        R.onend = () => { const c = EAR.cur; if (c && c.via === 'web') earEnd(c.err || (c.words ? 'result' : 'silence')); };
      }
      EAR.st.sessions++; if (MIC.on) EAR.st.micSessions++;
      EAR.cur = { via: 'web', gen: ++EAR.gen, t: performance.now(), mic: MIC.on, micV: 0 };
      try { R.start(); } catch (e) { EAR.cur = null; earKick(1500); }
      earUi();
    }
    if (EAR.via === 'web') { try { if (typeof SRW.available === 'function') Promise.resolve(SRW.available({ langs: ['fr-FR'], processLocally: true })).then((a) => { EAR.local = a === 'available'; if (EAR.local && $.earwho) $.earwho.textContent = 'Les mots sont reconnus ici, sur ton appareil, sans rien enregistrer. Touche l\'oreille pour qu\'il arrête d\'écouter.'; }).catch(() => {}); } catch (e) { /* rien */ } }
    // l'oreille : état, petite étiquette qui s'ouvre puis se replie
    const EAR_LAB = { invite: 'Parle-moi !', on: 'Je t\'écoute', hear: 'J\'entends…', sleep: 'Zzz… touche-moi', off: '', pause: 'En pause (🎤)', talk: '' };
    const EAR_ARIA = { invite: 'Parle à ton avatar', on: 'Ton avatar t\'écoute : touche pour arrêter', hear: 'Ton avatar t\'entend', sleep: 'Ton avatar s\'est endormi : touche pour lui reparler', off: 'Écoute coupée : touche pour qu\'il t\'écoute', pause: 'Écoute en pause pendant le micro', talk: 'Ton avatar parle' };
    function earUi() {
      const b = $.ear; if (!b) return;
      const show = !!EAR.via && !stgFail && !!STG && STG.ready() && !editing && !friendOn && !dead;
      if (b.hidden === show) { b.hidden = !show; if (show) earPlace(); }
      if (!show) return;
      const st = !EAR.want ? (store.get(EAR_KEY) === '0' ? 'off' : 'invite') : EAR.perm || EAR.fatal ? 'off' : EAR.sleeping ? 'sleep' : SAY.on ? 'talk'
        : (MIC.on && EAR.conflict) ? 'pause' : EAR.cur && EAR.cur.begin ? 'hear' : 'on';
      if (b.dataset.st === st) return;
      const prev = b.dataset.st; b.dataset.st = st; b.setAttribute('aria-label', EAR_ARIA[st] || 'Parle à ton avatar');
      const lab = EAR_LAB[st] || '';
      // l'étiquette s'ouvre aux changements qui comptent (pas à chaque phrase : « on » ⇄ « hear » ⇄ « talk »)
      const quiet = (prev === 'on' || prev === 'hear' || prev === 'talk') && (st === 'on' || st === 'hear' || st === 'talk');
      if (lab && !quiet) { $.eart.textContent = lab; b.classList.add('x'); clearTimeout(EAR.labT); if (st !== 'invite') EAR.labT = later(() => { b.classList.remove('x'); later(earPlace, 420); }, 3200); }
      else if (!lab || !quiet) { b.classList.remove('x'); }
      earPlace(); later(earPlace, 420);
    }
    function earOn() { store.set(EAR_KEY, '1'); EAR.want = true; EAR.sleeping = false; EAR.perm = false; EAR.fatal = ''; EAR.errRun = 0; EAR.lastAct = performance.now(); tone(660, 990); toast('👂 Je t\'écoute : dis « salut », « oui » ou « non » !'); earSync(); }
    function earOff() { store.set(EAR_KEY, '0'); EAR.want = false; earSync(); tone(520, 360); toast('👂 Je n\'écoute plus. Touche l\'oreille pour me reparler.'); }
    on($.ear, 'pointerdown', (e) => e.stopPropagation());
    on($.ear, 'click', (e) => {
      e.stopPropagation(); hintOff();
      const st = $.ear.dataset.st;
      if (st === 'invite') { $.earm.classList.add('on'); return; }
      if (st === 'off') { earOn(); return; }
      if (st === 'sleep') { earWake(); tone(660, 990); toast('👂 Je t\'écoute : dis « salut », « oui » ou « non » !'); return; }
      if (st === 'pause') { toast('🎤 Micro ouvert, ton téléphone m’empêche de comprendre les mots. Coupe 🎤 pour me parler !', 4500); return; }
      earOff();
    });
    on($.earm, 'click', (e) => { const h = e.target.closest('[data-h]'); if (e.target === $.earm || (h && h.dataset.h === 'earno')) { $.earm.classList.remove('on'); return; } if (h && h.dataset.h === 'earok') { $.earm.classList.remove('on'); earOn(); } });
    on($.micm, 'click', (e) => { const h = e.target.closest('[data-h]'); if (h && h.dataset.h === 'micok' && EAR.via === 'natif' && store.get(EAR_KEY) == null) { store.set(EAR_KEY, '1'); EAR.want = true; EAR.lastAct = performance.now(); } });
    on($.gl, 'pointerdown', () => earWake());
    if (window.JDW_PG_TEST) { window.__pgEAR = EAR; window.__pgEARreact = (k, w) => earReact({ k, w: w || k }, 'essai'); window.__pgEARsync = () => { EAR.fatal = ''; EAR.errRun = 0; EAR.lastAct = performance.now(); earSync(); }; }

    // ---------- MA MAISON (pg_docs « maison » : {v, lot:[w,d], p:[[id,x,z,l,r,y]…]}, format du jeu) : petit plan vu de dessus ----------
    async function loadHouse() {
      if (!memberMode()) return;
      let rows; try { rows = await PG.rpc('pg_get_doc', { p_kind: 'maison' }); } catch (e) { return; }
      if (dead) return;
      const rr = Array.isArray(rows) ? rows[0] : rows, d = rr && rr.r_rev > 0 && rr.r_data && typeof rr.r_data === 'object' ? rr.r_data : null;
      const P = planOf(d);
      if (!P.length) return;
      drawHouse(P);
      const lv = new Set(P.map((x) => +x[3] || 0)).size;
      $.htxt.textContent = 'Ta maison : ' + P.length + ' pièce' + (P.length > 1 ? 's' : '') + (lv > 1 ? ' sur ' + lv + ' étages' : '') + '. Bientôt, tu pourras la modifier d\'ici et la faire visiter.';
    }
    function planOf(d) { return d && Array.isArray(d.p) ? d.p.filter((x) => Array.isArray(x) && typeof x[0] === 'string' && Number.isFinite(+x[1]) && Number.isFinite(+x[2])).slice(0, 4000) : []; }
    const HOUSE_K = [[/mur|wall/i, '#b9805a', 'Murs'], [/porte|door/i, '#7a3f22', 'Portes'], [/fen|window/i, '#7fbfe8', 'Fenêtres'], [/sol|floor|plancher/i, '#e8c48c', 'Sols'], [/toit|roof/i, '#c0482f', 'Toit'], [/esc|stair/i, '#9a6a46', 'Escaliers']];
    const houseK = (id) => HOUSE_K.findIndex((k) => k[0].test(id));
    function drawHouse(P) { drawPlan($.hcv, P, 1); $.house.classList.add('has'); }
    // le plan vu du ciel (264 × 220, × r pour un grand écran) : une pastille par pièce, les étages du dessus en plus clair
    function drawPlan(c, P, r) {
      const W = 264, H = 220; c.width = Math.round(W * r); c.height = Math.round(H * r); const x = c.getContext('2d'); if (r !== 1) x.scale(r, r);
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fff2d6'); g.addColorStop(1, '#f2d39f'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(150,100,50,.15)'; x.lineWidth = 1; for (let i = 0; i <= W; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j <= H; j += 16) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const p of P) { x0 = Math.min(x0, +p[1]); x1 = Math.max(x1, +p[1]); z0 = Math.min(z0, +p[2]); z1 = Math.max(z1, +p[2]); }
      const sp = Math.max(x1 - x0, z1 - z0, 1), k = Math.min((W - 40) / Math.max(1, x1 - x0 || sp), (H - 40) / Math.max(1, z1 - z0 || sp)), ox = (W - (x1 - x0) * k) / 2, oz = (H - (z1 - z0) * k) / 2;
      const col = (id) => { const k = houseK(id); return k < 0 ? '#6aa36a' : HOUSE_K[k][1]; };
      const sz = Math.max(4, Math.min(14, k * sp / 14));
      const lvls = [...new Set(P.map((p) => +p[3] || 0))].sort((a, b) => a - b);
      for (const lv of lvls) {
        x.globalAlpha = lv === lvls[0] ? 1 : 0.55;
        for (const p of P) if ((+p[3] || 0) === lv) { const px = ox + (+p[1] - x0) * k, pz = oz + (+p[2] - z0) * k; x.fillStyle = col(p[0]); x.beginPath(); x.roundRect ? x.roundRect(px - sz / 2, pz - sz / 2, sz, sz, 2) : x.rect(px - sz / 2, pz - sz / 2, sz, sz); x.fill(); }
      }
      x.globalAlpha = 1; x.strokeStyle = 'rgba(120,70,30,.55)'; x.lineWidth = 2; x.strokeRect(ox - sz, oz - sz, (x1 - x0) * k + sz * 2, (z1 - z0) * k + sz * 2);
    }
    on($.hgo, 'click', () => { toast('🏡 Bientôt : modifie ta maison d\'ici, puis fais-la visiter aux copains'); tone(660, 880); });

    // ---------- LA MAISON D'UN COPAIN (pg_room_maisons : maisons des AUTRES membres de la salle, format de « Ma maison » + parcelle « plot ») ----------
    // Borne qui ne connaît pas la fonction (has) ou serveur pas encore à jour (404) : le bouton reste « Visiter sa maison · bientôt ».
    const PLOTS = { p1: 'Terrasse du bois (sud-ouest)', p2: 'Terrasse du lac (nord)', p3: 'Terrasse du lac (nord-est)', p5: 'Lisière sud', p6: 'Bois du sud-ouest',
      p7: 'Terrasse du lac (nord-est)', p8: 'Route du pont rouge (est)', arc2: 'Le haut du Clos', arc4: 'Sous le bosquet', arc5: 'L\'entrée du chemin' };
    const HM = { rid: 0, at: 0, rows: new Map(), st: '', off: false, busy: null, tok: null, open: '', m: null, lv: 0 };
    const hmOk = () => { if (HM.off || !memberMode()) return false; try { return !!(PG && typeof PG.has === 'function' && PG.has('pg_room_maisons')); } catch (e) { return false; } };
    function plotName(pl) {
      const lb = pl && typeof pl.label === 'string' ? pl.label.trim().slice(0, 60) : '';
      if (lb) return lb;
      const id = pl ? String(pl.id || '') : '';
      return PLOTS[id] || (/^arc\d+$/.test(id) ? 'Le Clos de l\'Est' : 'Une parcelle du village');
    }
    function hmWhen(t) {
      const d = new Date(t); if (isNaN(d)) return '';
      const day = (v) => new Date(v.getFullYear(), v.getMonth(), v.getDate()).getTime(), dd = Math.round((day(new Date()) - day(d)) / 86400000);
      if (dd <= 0) return 'aujourd\'hui à ' + d.getHours() + ' h ' + String(d.getMinutes()).padStart(2, '0');
      if (dd === 1) return 'hier';
      if (dd < 7) return ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][d.getDay()] + ' dernier';
      return 'le ' + d.getDate() + ' ' + ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][d.getMonth()];
    }
    function loadMaisons(force) {
      const i = pgInfo(); if (!hmOk() || !i.room) return Promise.resolve(false);
      const rid = i.room.id;
      if (HM.rid !== rid) { HM.rid = rid; HM.rows = new Map(); HM.at = 0; HM.st = ''; }
      if (!force && HM.st === 'ok' && Date.now() - HM.at < 30000) return Promise.resolve(true);
      if (HM.busy && HM.busy.rid === rid) return HM.busy;
      if (HM.st !== 'ok') HM.st = 'load';
      const tok = { rid }; HM.tok = tok;   // jeton de CE chargement : un chargement plus ancien (autre salle) ne libère pas celui-ci
      const p = (async () => {
        try {
          const rows = await PG.rpc('pg_room_maisons', {});
          if (dead || HM.rid !== rid) return false;
          const m = new Map();
          for (const r of Array.isArray(rows) ? rows : []) {
            const n = String((r && r.r_name) || ''), d = n && r.r_maison && typeof r.r_maison === 'object' ? r.r_maison : null; if (!n) continue;
            const pl = d && d.plot && typeof d.plot === 'object' ? d.plot : null;
            m.set(n, { P: planOf(d), lot: d ? d.lot : null, plot: pl, at: r.r_at || (pl && pl.at) || null, rev: r.r_rev | 0 });
          }
          HM.rows = m; HM.at = Date.now(); HM.st = 'ok'; return true;
        } catch (e) {
          if (e && (e.status === 404 || /fonction refus|Could not find the function|PGRST202/i.test(String(e.message || e)))) HM.off = true;
          if (HM.rid === rid && HM.st !== 'ok') HM.st = e && e.offline ? 'offline' : 'err';
          return false;
        } finally { if (HM.tok === tok) { HM.tok = null; HM.busy = null; } }
      })();
      if (HM.tok === tok) { HM.busy = p; p.rid = rid; }
      return p;
    }
    // le bouton de la fiche : Voir sa maison (sa parcelle en petit) | Pas encore de maison | un instant… | réessayer | bientôt
    function fvHouseSync() {
      const b = $.fvhouse, m = friendOn; if (!b || !m) return;
      let t = 'Voir sa maison', s = '', k = 'soon', dis = false;
      if (!hmOk()) { t = 'Visiter sa maison'; s = 'bientôt'; }
      else {
        const h = HM.rows.get(m.name);
        if (h && h.P.length) { k = 'see'; s = h.plot ? plotName(h.plot).replace(/\s*\(.*\)\s*$/, '') : h.P.length + ' pièce' + (h.P.length > 1 ? 's' : ''); }
        else if (HM.st === 'ok') { k = 'none'; t = 'Pas encore de maison'; dis = true; }
        else if (HM.st === 'load') { k = 'load'; s = 'un instant…'; dis = true; }
        else { k = 'retry'; s = HM.st === 'offline' ? 'pas de réseau' : 'réessayer'; }
      }
      b.dataset.k = k; b.disabled = dis;
      b.innerHTML = `<span>🏡 ${esc(t)}</span>` + (s ? `<small>${esc(s)}</small>` : '');
    }
    function fvHouseLoad(force) {
      const m = friendOn; if (!m || !hmOk()) return;
      const p = loadMaisons(force); fvHouseSync();
      p.then(() => { if (dead || friendOn !== m) return; fvHouseSync(); if (HM.open === m.name) houseFill(m); });
    }
    // ---------- LE GRAND PLAN de la maison d'un copain : un vrai plan d'architecte, un niveau à la fois (sans le toit) ----------
    // Format du jeu (= constructeur web ~/jdv-tools/pegase/builder/web et PegaseHouseCatalog du jeu) : [id, x, z, étage, rot(, h)] ; x, z en
    // 1/20 de mètre (case = 5 m = 100), rot = quarts de tour ; sols et escaliers au centre d'une case ; murs, fenêtres et portes au milieu
    // d'un bord de case (5 m, le long de x quand rot est pair) ; parcelle « lot » = [cases en x, cases en z] à partir de 0, 0.
    // Meubles posés au sol : famille et taille au sol (dm) tirées du catalogue du constructeur (PLAN_FURN : « id famille largeur profondeur » ;
    // L lits, S salon, T tables, R rangement, C cuisine et bain, U lumières, P tapis, V plantes, O objets, J jardin ; à refaire si le catalogue
    // change : build/plan-meubles.txt de hub-maisons) ; objets accrochés aux murs ou posés sur un meuble : comptés, pas dessinés.
    const PLAN_FURN_TXT = 'dv-doublebed-mattresduvetcombo L 23 20|dv-singlebed-mattressduvet L 14 20|dv-doublebed L 20 24|dv-singlebed L 15 23|dv-pillow-a L 9 4|dv-pillow-b L 9 4|bed1 L 10 20|bed2 L 12 23|bed3 L 19 24|bed4 L 20 24|bed5 L 12 26|bed6 L 11 24|bed7 L 8 21|bed8 L 27 39|bed9 L 7 17|bed10 L 7 17|bed11 L 11 22|bed12 L 7 17|bed13 L 11 21|bed14 L 7 14|bed15 L 7 14|folding_screen1 L 29 5|mirror1 L 7 5|rocking_horse1 L 5 13|vertical_hanger1 L 5 5|dv-bench S 19 7|dv-stoolshort S 9 6|dv-stooltall S 4 5|chair1 S 9 10|chair2 S 10 9|chair3 S 10 8|chair4 S 10 9|chair5 S 8 8|chair6 S 12 10|chair7 S 10 10|chair8 S 10 8|chair12 S 6 6|chair14 S 5 5|chair17 S 6 8|chair20 S 7 7|chair24 S 6 7|chair27 S 5 7|chair28 S 5 5|chair29 S 9 3|chair30 S 23 2|chair33 S 17 3|chair34 S 13 11|chair35 S 6 7|chair38 S 8 8|chair40 S 22 9|chair41 S 5 5|chair43 S 9 5|chair45 S 13 5|chair46 S 7 7|chair47 S 7 7|chair48 S 7 7|chair49 S 9 9|chair50 S 11 10|sofa1 S 25 13|sofa2 S 24 12|sofa3 S 18 10|sofa5 S 30 23|sofa6 S 27 13|sofa7 S 25 9|sofa8 S 50 24|sofa9 S 26 13|sofa10 S 27 28|sofa11 S 17 10|sofa12 S 34 23|sofa13 S 26 12|sofa14 S 20 10|sofa15 S 39 43|sofa16 S 27 28|sofa17 S 26 12|sofa18 S 51 24|sofa19 S 27 13|sofa20 S 26 13|sofa21 S 16 10|sofa22 S 36 13|sofa23 S 26 11|clock1 S 4 3|gramophone1 S 11 10|piano1 S 21 25|piano2 S 20 7|piano3 S 20 7|piano4 S 15 4|dv-rectangulartable T 30 17|dv-roundtable T 20 20|table1 T 39 15|table2 T 17 10|table4 T 12 12|table5 T 13 6|table7 T 12 5|table8 T 11 5|table9 T 14 8|table10 T 17 10|table11 T 11 9|table12 T 13 8|table13 T 11 8|table14 T 16 7|table15 T 16 7|table16 T 15 7|table17 T 22 8|table18 T 12 4|table19 T 15 6|table20 T 19 14|table21 T 21 8|table22 T 13 6|table23 T 19 13|table24 T 27 11|table25 T 18 12|table26 T 18 8|table27 T 10 10|table28 T 19 10|table29 T 16 9|table30 T 20 10|table31 T 19 8|table32 T 24 12|table33 T 19 10|table34 T 11 11|table35 T 21 10|table36 T 11 11|table37 T 19 10|table38 T 18 10|table39 T 17 9|table40 T 9 9|table41 T 19 8|table42 T 12 12|table44 T 14 10|dv-cupboard-01 R 23 7|dv-cupboard-02 R 23 7|dv-cupboard-01-shelf R 23 6|dv-shelf-01 R 23 6|dv-chestbox R 15 10|box1 R 11 6|box3 R 9 6|box4 R 8 4|box5 R 12 8|box8 R 13 7|box10 R 7 7|box12 R 6 9|box13 R 5 9|box15 R 6 8|box18 R 9 5|box19 R 9 8|box20 R 8 7|box21 R 9 7|box22 R 8 8|closet1 R 10 10|closet2 R 19 10|closet4 R 9 4|closet5 R 14 7|closet6 R 13 7|closet7 R 8 4|closet8 R 8 8|closet9 R 25 8|closet10 R 14 10|closet11 R 17 8|closet12 R 14 7|closet13 R 18 8|closet14 R 18 7|closet15 R 19 6|closet16 R 14 10|closet17 R 14 8|closet18 R 15 9|closet19 R 29 13|closet20 R 47 13|closet21 R 13 7|closet22 R 27 6|closet23 R 24 5|closet24 R 10 4|closet25 R 22 8|closet26 R 5 6|shelf1 R 12 6|shelf3 R 13 7|shelf7 R 16 4|shelf8 R 9 4|shelf10 R 12 4|shelf11 R 13 7|shelf14 R 17 5|shelf18 R 7 4|shelf19 R 12 7|shelf20 R 14 4|shelf22 R 13 2|shelf23 R 13 4|shelf24 R 10 3|shelf25 R 8 4|shelf26 R 13 5|shelf27 R 14 9|shelf29 R 9 6|shelf30 R 13 7|shelf31 R 10 4|shelf32 R 17 5|shelf33 R 13 6|shelf34 R 15 5|shelf35 R 9 8|shelf36 R 16 5|shelf37 R 5 5|shelf38 R 12 7|shelf39 R 6 6|shelf40 R 15 9|shelf41 R 11 9|shelf42 R 17 5|shelf43 R 14 5|anvil1 C 13 5|bathroom_item1 C 25 13|bathroom_item2 C 5 9|bathroom_item4 C 16 3|bathroom_item5 C 8 8|bathroom_item6 C 22 11|bathroom_item7 C 7 3|bathroom_item8 C 7 8|bathroom_item9 C 8 3|bathroom_item10 C 7 6|bathroom_item11 C 7 1|bathroom_item12 C 29 15|bathroom_item13 C 6 9|bathroom_item15 C 8 10|bathroom_item16 C 17 6|bathroom_item17 C 15 3|bathroom_item18 C 7 5|bathroom_item20 C 10 2|bathroom_item21 C 5 5|cauldron1 C 10 10|cauldron2 C 10 13|cauldron3 C 15 14|cauldron4 C 9 9|cauldron5 C 12 12|cauldron6 C 8 7|cauldron7 C 12 14|cauldron9 C 6 8|cauldron10 C 7 7|furnace1 C 14 14|furnace2 C 14 10|furnace3 C 14 14|furnace4 C 9 10|furnace5 C 11 11|furnace6 C 16 14|furnace7 C 37 32|furnace8 C 18 9|furnace9 C 21 16|furnace10 C 20 15|furnace11 C 16 11|furnace12 C 33 10|furnace13 C 24 12|kitchen_item1 C 10 3|kitchen_item2 C 10 7|kitchen_item3 C 9 7|kitchen_item4 C 11 3|kitchen_item5 C 11 12|kitchen_item6 C 18 15|kitchen_item7 C 12 8|kitchen_item8 C 9 8|kitchen_item9 C 10 8|kitchen_item10 C 12 7|kitchen_item12 C 18 8|kitchen_item13 C 12 13|candle1 U 4 11|candle2 U 8 3|candle5 U 4 8|candle6 U 2 3|candle9 U 4 8|candle11 U 6 6|candle12 U 4 4|candle13 U 5 5|candle22 U 6 18|candle27 U 10 9|lamp2 U 6 6|lamp6 U 7 7|lamp10 U 7 7|lamp13 U 7 7|dv-rug-01 P 28 43|dv-rug-02 P 23 23|dv-rug-03 P 25 25|carpet1 P 26 25|carpet2 P 25 17|carpet3 P 7 12|carpet4 P 21 21|carpet5 P 18 24|carpet6 P 26 20|carpet7 P 20 20|carpet8 P 15 25|carpet9 P 15 15|carpet10 P 25 25|carpet11 P 24 24|carpet12 P 33 34|carpet13 P 35 35|carpet14 P 8 12|carpet15 P 54 38|carpet16 P 20 75|carpet17 P 31 18|dv-flowerplanter-01 V 30 16|dv-flowerplanter-02 V 25 14|dv-flowerplanter-03 V 50 16|flower1 V 30 15|flower2 V 16 15|flower17 V 8 8|flower19 V 8 6|flower21 V 20 20|flower22 V 8 8|flower23 V 24 23|flower24 V 17 17|flower26 V 7 6|flower27 V 28 21|flower28 V 18 19|flower29 V 21 21|flower31 V 12 6|flowerpot1 V 7 7|nature2 V 23 20|nature3 V 9 6|nature4 V 8 9|nature5 V 15 12|nature6 V 9 9|nature7 V 7 7|nature10 V 10 11|nature11 V 9 11|nature12 V 8 10|nature13 V 30 33|nature14 V 40 42|nature15 V 29 31|nature16 V 25 25|nature17 V 9 8|nature19 V 14 7|nature20 V 19 1|nature21 V 8 1|nature22 V 21 1|nature23 V 8 1|nature24 V 21 1|nature25 V 12 1|nature26 V 10 8|nature27 V 10 10|nature28 V 11 11|nature29 V 7 9|nature31 V 14 12|nature34 V 14 12|nature35 V 15 8|nature36 V 40 25|nature37 V 18 24|nature38 V 20 20|nature39 V 19 29|nature40 V 20 17|nature41 V 25 16|nature42 V 19 16|nature43 V 8 5|nature44 V 15 8|nature45 V 10 10|nature46 V 10 8|dv-bunch-01 O 7 7|bicycle1 O 6 20|bicycle2 O 6 10|cage1 O 6 7|easel1 O 12 7|easel2 O 11 7|jar3 O 7 7|jar55 O 7 7|jar58 O 7 7|jar61 O 7 7|prop6 O 7 7|prop11 O 14 2|prop13 O 7 1|prop25 O 6 7|prop51 O 6 6|prop52 O 5 3|prop78 O 7 5|prop80 O 3 11|prop82 O 9 8|prop84 O 6 8|prop86 O 27 3|prop87 O 4 5|prop88 O 10 4|prop90 O 2 10|prop100 O 10 4|prop101 O 3 10|prop104 O 3 9|prop105 O 4 14|prop106 O 12 9|prop110 O 2 9|prop111 O 10 2|prop127 O 10 9|prop128 O 15 8|prop131 O 7 1|prop184 O 8 3|telescope1 O 13 17|dv-villagefence J 33 3|dv-villagefencedoor J 9 2|dv-villagefencepost J 2 2|dv-vegetablefence J 13 1|dv-benchoutdoors J 19 8|dv-streetlight J 23 14|dv-barrel-01 J 8 8|dv-barrel-02 J 8 10|dv-barrel-03 J 8 8|dv-barrelshelf J 21 9|dv-kegholder J 9 7|dv-cratesquare J 12 11|dv-crateopen J 10 6|dv-cratehandles J 10 7|dv-basket J 7 7|dv-firewood-1 J 8 3|dv-firewood-2 J 8 3|dv-firewood-3 J 8 3|dv-treestump J 10 10|dv-treelog J 33 6|dv-haystack J 25 26|dv-sack J 9 5|dv-sackstack J 13 11|dv-trough J 17 7|dv-scarecrow J 21 7|dv-warriorstatue J 38 44|dv-ladder J 8 1|dv-pitchfork J 3 1|dv-rake J 4 1|dv-shovel J 5 1';
    let PLAN_FURN = null;
    function planFurn(id) {
      if (!PLAN_FURN) { PLAN_FURN = new Map(); for (const e of PLAN_FURN_TXT.split('|')) { const [i, k, w, d] = e.split(' '); PLAN_FURN.set(i, { k, w: w / 10, d: d / 10 }); } }
      return PLAN_FURN.get(id) || null;
    }
    const DOOR_AT = { 'porte-a': -1.26, 'porte-b': -0.06, 'porte-b3': -0.06, 'porte-c': -0.55, 'porte-d': -0.03, 'porte-d3': -0.03, 'porte-e': 0.55, 'porte-e3': 0.55 };   // centre de la porte le long du mur (m)
    const pkind = (id) => /^(plancher|dalles|terrasse|balcon|sol|floor)/.test(id) ? 'sol' : /^(porte|cloison-p|door)/.test(id) ? 'porte' : /^(fen|cloison-f|window)/.test(id) ? 'fen'
      : /^cloison/.test(id) ? 'cloison' : /^(mur|wall)/.test(id) ? 'mur' : /^(escalier|esc|stair)/.test(id) ? 'esc' : /^(toit|roof|_)/.test(id) ? '' : 'meuble';
    const lvName = (l) => (l === 0 ? 'Rez-de-chaussée' : l === 1 ? '1er étage' : l + 'e étage');
    // ce qu'on sait de la maison (une fois par version) : pièces dessinables, niveaux, surface (sols hors terrasse / balcon), meubles, cadre
    function planInfo(h) {
      if (h.info) return h.info;
      const it = [], lv = new Set(), flo = new Set();
      let area = 0, furn = 0, x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const p of h.P) {
        const k = pkind(p[0]); if (!k) continue;
        const l = Math.max(0, Math.min(9, Math.round(+p[3] || 0))), x = +p[1] * 0.05, z = +p[2] * 0.05, f = k === 'meuble' ? planFurn(p[0]) : null;
        if (k === 'meuble') { furn++; if (!f) continue; } else lv.add(l);
        if (k === 'sol') { flo.add(l); if (!/^(terrasse|balcon)/.test(p[0])) area += 25; }
        it.push({ id: p[0], k, l, x, z, r: +p[4] || 0, f });
        const e = f ? Math.max(f.w, f.d) / 2 : 2.5;
        x0 = Math.min(x0, x - e); x1 = Math.max(x1, x + e); z0 = Math.min(z0, z - e); z1 = Math.max(z1, z + e);
      }
      const lot = Array.isArray(h.lot) && h.lot.length >= 2 && h.lot.slice(0, 2).every((v) => Number.isInteger(v) && v > 0 && v <= 40) ? [h.lot[0] * 5, h.lot[1] * 5] : null;
      if (lot) { x0 = Math.min(x0, 0); z0 = Math.min(z0, 0); x1 = Math.max(x1, lot[0]); z1 = Math.max(z1, lot[1]); }
      if (!isFinite(x0)) { x0 = z0 = 0; x1 = z1 = 10; }
      const levels = [...(flo.size ? flo : lv)].sort((a, b) => a - b);
      return (h.info = { it, levels: levels.length ? levels : [0], area, furn, lot, box: [x0 - 1, z0 - 1, x1 + 1, z1 + 1] });
    }
    const PLAN_HUES = ['#c9705c', '#6f8fca', '#8db86a', '#d6a24a', '#a774c4'];
    const planHash = (s) => { let v = 7; for (const ch of String(s)) v = (v * 31 + ch.charCodeAt(0)) >>> 0; return v; };
    function drawFloorPlan(c, h, lvSel, r) {
      const W = 264, H = 220, I = planInfo(h); c.width = Math.round(W * r); c.height = Math.round(H * r);
      const x = c.getContext('2d'); x.scale(r, r);
      const [bx0, bz0, bx1, bz1] = I.box, k = Math.min((W - 16) / (bx1 - bx0), (H - 16) / (bz1 - bz0));
      const ox = (W - (bx1 - bx0) * k) / 2 - bx0 * k, oz = (H - (bz1 - bz0) * k) / 2 - bz0 * k, X = (v) => ox + v * k, Z = (v) => oz + v * k;
      const rr = (x0, z0, w, d, rad) => { x.beginPath(); if (x.roundRect) x.roundRect(x0, z0, w, d, Math.max(0, Math.min(rad, w / 2, d / 2))); else x.rect(x0, z0, w, d); };
      const disc = (cx, cz, rad) => { x.beginPath(); x.arc(cx, cz, rad, 0, Math.PI * 2); };
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fff2d6'); g.addColorStop(1, '#f2d39f'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      // la parcelle : herbe, cases de 5 m, bord en pointillés
      if (I.lot) {
        const gx = X(0), gz = Z(0), gw = I.lot[0] * k, gd = I.lot[1] * k, gg = x.createLinearGradient(0, gz, 0, gz + gd);
        gg.addColorStop(0, '#d5e6ad'); gg.addColorStop(1, '#bdd791'); x.fillStyle = gg; x.fillRect(gx, gz, gw, gd);
        x.strokeStyle = 'rgba(90,120,50,.16)'; x.lineWidth = 1; x.beginPath();
        for (let i = 5; i < I.lot[0]; i += 5) { x.moveTo(X(i), gz); x.lineTo(X(i), gz + gd); }
        for (let j = 5; j < I.lot[1]; j += 5) { x.moveTo(gx, Z(j)); x.lineTo(gx + gw, Z(j)); }
        x.stroke(); x.setLineDash([4, 3]); x.strokeStyle = 'rgba(110,80,40,.7)'; x.lineWidth = 1.2; x.strokeRect(gx, gz, gw, gd); x.setLineDash([]);
      }
      function sol(p, ghost) {
        const s = 5 * k, x0 = X(p.x - 2.5), z0 = Z(p.z - 2.5);
        if (ghost) { x.fillStyle = '#c9a77a'; x.fillRect(x0, z0, s, s); return; }
        const stone = /^dalles/.test(p.id), deck = /^(terrasse|balcon)/.test(p.id);
        x.fillStyle = stone ? '#ddd5c4' : deck ? '#d7ad74' : '#e8bf86'; x.fillRect(x0 - 0.3, z0 - 0.3, s + 0.6, s + 0.6);
        x.strokeStyle = stone ? 'rgba(120,105,80,.28)' : 'rgba(140,90,40,.22)'; x.lineWidth = 0.6; x.beginPath();
        if (stone) for (let i = 1; i < 4; i++) { x.moveTo(x0 + i * s / 4, z0); x.lineTo(x0 + i * s / 4, z0 + s); x.moveTo(x0, z0 + i * s / 4); x.lineTo(x0 + s, z0 + i * s / 4); }
        else { const n = deck ? 6 : 8, along = (Math.round(p.r) & 1) === 0; for (let i = 1; i < n; i++) { const t = i * s / n; if (along) { x.moveTo(x0, z0 + t); x.lineTo(x0 + s, z0 + t); } else { x.moveTo(x0 + t, z0); x.lineTo(x0 + t, z0 + s); } } }
        x.stroke();
      }
      function mur(p, ghost) {   // murs pleins, cloisons ; fenêtres = trumeaux + baie vitrée ; portes = ouverture de 1,6 m, battant et arc
        const a = p.r * Math.PI / 2, ux = Math.cos(a), uz = -Math.sin(a), L = 2.5;
        const seg = (t0, t1) => { x.beginPath(); x.moveTo(X(p.x + ux * t0), Z(p.z + uz * t0)); x.lineTo(X(p.x + ux * t1), Z(p.z + uz * t1)); x.stroke(); };
        const th = Math.max(2, (/^cloison/.test(p.id) ? 0.3 : 0.42) * k);
        x.lineCap = 'square'; x.strokeStyle = '#5a3a24'; x.lineWidth = th;
        if (ghost || p.k === 'mur' || p.k === 'cloison') { seg(-L, L); return; }
        if (p.k === 'fen') {
          seg(-L, -1.3); seg(1.3, L); x.lineCap = 'butt';
          x.strokeStyle = '#fdfaf2'; seg(-1.3, 1.3); x.lineWidth = Math.max(1, th * 0.4); x.strokeStyle = '#6fc0ea'; seg(-1.3, 1.3);
          return;
        }
        const dc = Math.max(-1.6, Math.min(1.6, DOOR_AT[p.id] || 0)), hw = 0.8;
        seg(-L, dc - hw); seg(dc + hw, L);
        const vx = Math.sin(a), vz = Math.cos(a), hx = X(p.x + ux * (dc - hw)), hz = Z(p.z + uz * (dc - hw)), R = 2 * hw * k;
        x.lineCap = 'round'; x.strokeStyle = '#7a4a2a'; x.lineWidth = Math.max(1, th * 0.38);
        x.beginPath(); x.moveTo(hx, hz); x.lineTo(hx + vx * R, hz + vz * R); x.stroke();
        const a0 = Math.atan2(vz, vx); let d = Math.atan2(uz, ux) - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        x.setLineDash([2, 2]); x.lineWidth = 0.8; x.beginPath(); x.arc(hx, hz, R, a0, a0 + d, d < 0); x.stroke(); x.setLineDash([]);
      }
      function escalier(p) {
        const w = (/2$/.test(p.id) ? 2.5 : 2.13) * k, d = 4.26 * k;
        x.save(); x.translate(X(p.x), Z(p.z)); x.rotate(-p.r * Math.PI / 2);
        x.fillStyle = '#f3e2c4'; x.fillRect(-w / 2, -d / 2, w, d); x.strokeStyle = '#8a5d3b'; x.lineWidth = 0.8; x.strokeRect(-w / 2, -d / 2, w, d);
        x.beginPath(); for (let i = 1; i < 9; i++) { const t = -d / 2 + i * d / 9; x.moveTo(-w / 2, t); x.lineTo(w / 2, t); }
        x.moveTo(0, d / 2 - 2); x.lineTo(0, -d / 2 + 3); x.moveTo(-2.2, -d / 2 + 5.5); x.lineTo(0, -d / 2 + 3); x.lineTo(2.2, -d / 2 + 5.5); x.stroke();
        x.restore();
      }
      function meuble(p) {
        const f = p.f, w = Math.max(1.6, f.w * k), d = Math.max(1.6, f.d * k), id = p.id, hue = PLAN_HUES[planHash(id + p.x + p.z) % PLAN_HUES.length];
        x.save(); x.translate(X(p.x), Z(p.z)); x.rotate(-p.r * Math.PI / 2);
        if (f.k !== 'P') { x.shadowColor = 'rgba(70,40,15,.3)'; x.shadowBlur = 1.6 * r; x.shadowOffsetY = 0.5 * r; }
        const flat = () => { x.shadowColor = 'transparent'; };
        if (f.k === 'P') {   // tapis
          x.globalAlpha = 0.9; x.fillStyle = hue; rr(-w / 2, -d / 2, w, d, 1.5); x.fill(); x.globalAlpha = 1;
          x.strokeStyle = 'rgba(255,248,230,.75)'; x.lineWidth = 0.7; rr(-w / 2 + 1.4, -d / 2 + 1.4, w - 2.8, d - 2.8, 1); x.stroke();
        } else if (f.k === 'L' && Math.max(f.w, f.d) < 1.2) { x.fillStyle = '#fffaf0'; rr(-w / 2, -d / 2, w, d, 1); x.fill(); }
        else if (f.k === 'L') {   // lit : cadre, drap, couverture, oreillers en haut
          x.fillStyle = '#a8774a'; rr(-w / 2, -d / 2, w, d, 1.2); x.fill(); flat();
          x.fillStyle = '#f7f0e2'; rr(-w / 2 + 0.8, -d / 2 + 0.8, w - 1.6, d - 1.6, 1); x.fill();
          x.fillStyle = hue; rr(-w / 2 + 0.8, -d / 2 + d * 0.36, w - 1.6, d * 0.64 - 0.8, 1); x.fill();
          const n = f.w > 1.6 ? 2 : 1, pw = (w - 2.4 - (n - 1) * 0.6) / n; x.fillStyle = '#ffffff';
          for (let i = 0; i < n; i++) { rr(-w / 2 + 1.2 + i * (pw + 0.6), -d / 2 + 1.3, pw, Math.max(1.2, d * 0.16), 1); x.fill(); }
        } else if (f.k === 'S') {   // canapé, banc (dossier en haut) ; chaise
          const big = Math.max(f.w, f.d) >= 1.5;
          x.fillStyle = big ? '#c97b5c' : '#b98b5d'; rr(-w / 2, -d / 2, w, d, big ? 2 : 1); x.fill(); flat();
          x.fillStyle = big ? '#a95f45' : '#8f6740'; rr(-w / 2, -d / 2, w, Math.max(0.9, d * (big ? 0.3 : 0.24)), big ? 2 : 0.8); x.fill();
        } else if (f.k === 'T') {   // table ronde ou rectangulaire, plateau plus clair
          x.fillStyle = '#b5814f';
          if (Math.abs(f.w - f.d) < 0.2) { disc(0, 0, (w + d) / 4); x.fill(); flat(); x.fillStyle = '#c99a6a'; disc(-w * 0.05, -d * 0.05, (w + d) / 4 * 0.72); x.fill(); }
          else { rr(-w / 2, -d / 2, w, d, 1); x.fill(); flat(); x.fillStyle = '#c99a6a'; rr(-w / 2 + 0.9, -d / 2 + 0.9, w - 1.8, d - 1.8, 0.8); x.fill(); }
        } else if (f.k === 'R') {   // rangement : bois foncé, deux portes
          x.fillStyle = '#7d5535'; rr(-w / 2, -d / 2, w, d, 0.8); x.fill(); flat();
          x.strokeStyle = 'rgba(255,230,190,.4)'; x.lineWidth = 0.6; x.beginPath(); x.moveTo(0, -d / 2 + 0.6); x.lineTo(0, d / 2 - 0.6); x.stroke();
        } else if (f.k === 'C') {   // cuisine et bain : chaudron, four (feu), évier / baignoire
          if (/cauldron|anvil/.test(id)) { x.fillStyle = '#4d5154'; disc(0, 0, Math.min(w, d) / 2); x.fill(); }
          else { x.fillStyle = '#b7c2c6'; rr(-w / 2, -d / 2, w, d, 1); x.fill(); flat(); x.fillStyle = /furnace/.test(id) ? '#ef8a3c' : '#eef4f6'; rr(-w / 2 + w * 0.2, -d / 2 + d * 0.2, w * 0.6, d * 0.6, 1); x.fill(); }
        } else if (f.k === 'U') {   // lumière : halo doré
          flat(); const R = Math.max(1.2, Math.max(w, d) / 2), gl = x.createRadialGradient(0, 0, 0, 0, 0, R * 2.6);
          gl.addColorStop(0, 'rgba(255,214,110,.55)'); gl.addColorStop(1, 'rgba(255,214,110,0)'); x.fillStyle = gl; disc(0, 0, R * 2.6); x.fill();
          x.fillStyle = '#ffd36a'; disc(0, 0, R); x.fill();
        } else if (f.k === 'V') {   // plante, arbre : feuillage en boules
          const R = Math.max(1.3, Math.max(w, d) / 2), t0 = planHash(id) % 7;
          x.fillStyle = '#5c9b4c'; x.beginPath(); x.moveTo(R * 0.72, 0); x.arc(0, 0, R * 0.72, 0, Math.PI * 2);
          for (let i = 0; i < 6; i++) { const t = t0 + i * Math.PI / 3, cx = Math.cos(t) * R * 0.55, cz = Math.sin(t) * R * 0.55; x.moveTo(cx + R * 0.45, cz); x.arc(cx, cz, R * 0.45, 0, Math.PI * 2); }
          x.fill(); flat(); x.fillStyle = 'rgba(170,222,128,.55)'; disc(-R * 0.22, -R * 0.22, R * 0.38); x.fill();
        } else if (f.k === 'J') {   // jardin : clôture, tonneau / souche / meule, le reste en bois
          if (Math.max(f.w, f.d) / Math.max(0.1, Math.min(f.w, f.d)) >= 4) { flat(); x.strokeStyle = '#8a6a42'; x.lineCap = 'round'; x.lineWidth = Math.max(0.9, Math.min(w, d)); x.beginPath(); if (w >= d) { x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); } else { x.moveTo(0, -d / 2); x.lineTo(0, d / 2); } x.stroke(); }
          else if (Math.abs(f.w - f.d) < 0.35) { x.fillStyle = /hay/.test(id) ? '#e2c15a' : '#a0703f'; disc(0, 0, (w + d) / 4); x.fill(); }
          else { x.fillStyle = '#9c7b52'; rr(-w / 2, -d / 2, w, d, 0.8); x.fill(); }
        } else { x.fillStyle = '#bfa889'; rr(-w / 2, -d / 2, w, d, 0.8); x.fill(); }
        x.restore();
      }
      const at = I.it.filter((p) => p.l === lvSel);
      if (lvSel > 0) {   // le niveau du dessous, en fantôme
        const below = I.it.filter((p) => p.l === lvSel - 1 && p.k !== 'meuble' && p.k !== 'esc');
        x.globalAlpha = 0.2; for (const p of below) if (p.k === 'sol') sol(p, true); for (const p of below) if (p.k !== 'sol') mur(p, true); x.globalAlpha = 1;
      }
      for (const p of at) if (p.k === 'sol') sol(p);
      for (const p of at) if (p.k === 'meuble' && p.f.k === 'P') meuble(p);
      for (const p of at.filter((q) => q.k === 'meuble' && q.f.k !== 'P').sort((a, b) => b.f.w * b.f.d - a.f.w * a.f.d)) meuble(p);
      for (const p of at) if (p.k === 'esc') escalier(p);
      for (const p of at) if (p.k === 'mur' || p.k === 'cloison' || p.k === 'fen' || p.k === 'porte') mur(p);
      // échelle « 5 m » en bas à gauche
      const sb = 5 * k;
      if (sb >= 14 && sb <= 120) {
        x.strokeStyle = 'rgba(90,58,36,.85)'; x.lineWidth = 1.2; x.lineCap = 'butt'; x.beginPath(); x.moveTo(7, H - 8); x.lineTo(7 + sb, H - 8);
        x.moveTo(7, H - 11); x.lineTo(7, H - 5); x.moveTo(7 + sb, H - 11); x.lineTo(7 + sb, H - 5); x.stroke();
        x.fillStyle = 'rgba(90,58,36,.9)'; x.font = '700 7.5px system-ui, sans-serif'; x.textBaseline = 'bottom'; x.fillText('5 m', 9 + sb, H - 4);
      }
      return { lv: lvSel, at };
    }
    function houseFill(m) {
      const h = HM.rows.get(m.name);
      if (!h || !h.P.length) { closeHouse(); return; }
      const I = planInfo(h); if (!I.levels.includes(HM.lv)) HM.lv = I.levels[0];
      $.hmname.textContent = 'La maison de ' + m.display;
      const d = drawFloorPlan($.hmcv, h, HM.lv, Math.min(4, (window.devicePixelRatio || 1) * 1.35));
      $.hmlv.innerHTML = I.levels.length > 1 ? I.levels.map((l) => `<button data-lv="${l}"${l === HM.lv ? ' class="on"' : ''}>${lvName(l)}</button>`).join('') : '';
      const has = (f) => d.at.some(f), fam = (s) => has((p) => p.k === 'meuble' && s.includes(p.f.k));
      const leg = [[has((p) => p.k === 'mur' || p.k === 'cloison' || p.k === 'porte'), '#5a3a24', 'Murs'], [has((p) => p.k === 'fen'), '#6fc0ea', 'Fenêtres'],
        [fam('LSTRCOU'), '#b5814f', 'Meubles'], [fam('P'), '#c9705c', 'Tapis'], [fam('V'), '#5c9b4c', 'Plantes'], [fam('J'), '#9c7b52', 'Jardin']];
      $.hmleg.innerHTML = leg.filter((l) => l[0]).map((l) => `<span><i style="background:${l[1]}"></i>${l[2]}</span>`).join('');
      const w = h.at ? hmWhen(h.at) : '', nl = I.levels.length;
      const size = I.area ? '📐 ' + I.area + ' m²' + (nl > 1 ? ' sur ' + nl + ' niveaux' : '') : '🧱 ' + h.P.length + ' pièce' + (h.P.length > 1 ? 's' : '');
      $.hmfacts.innerHTML = `<span class="plot">📍 ${esc(h.plot ? plotName(h.plot) : 'Au village d\'Ailebrune')}</span><span>${size}</span>` + (I.furn ? `<span>🪑 ${I.furn} meuble${I.furn > 1 ? 's' : ''}</span>` : '') + (w ? `<span>🗓️ Modifiée ${esc(w)}</span>` : '');
      $.hmtxt.textContent = 'Vue du ciel, sans le toit.';
    }
    function openHouse(m) {
      const h = HM.rows.get(m.name); if (!h || !h.P.length) return;
      HM.open = m.name; HM.m = m; HM.lv = planInfo(h).levels[0]; houseFill(m); $.hmodal.classList.add('on');
    }
    function closeHouse() { if (!HM.open) return; HM.open = ''; HM.m = null; $.hmodal.classList.remove('on'); }
    on($.hmodal, 'click', (e) => {
      const h = e.target.closest('[data-h]'), b = e.target.closest('[data-lv]');
      if (b && HM.m) { HM.lv = +b.dataset.lv; houseFill(HM.m); tone(620, 820); return; }
      if (e.target === $.hmodal || (h && h.dataset.h === 'hmno')) { closeHouse(); tone(523, 392); return; }
      if (h && h.dataset.h === 'hmsms') { const n = HM.open; closeHouse(); if (n) { openThread('p:' + n); tone(560, 840); } }
    });
    // fenêtre ouverte : relue toutes les 30 s (le copain construit peut-être en ce moment)
    every(() => { if (HM.open && friendOn && !document.hidden) fvHouseLoad(true); }, 30000);

    // ---------- l'avatar sur le serveur (pg_docs « garde », version base_rev) ; copie locale gardée (invités, hors ligne) ----------
    const SRVK = KEY + '.srv';
    let srv = (() => { try { const j = JSON.parse(store.get(SRVK) || 'null'); return j && typeof j === 'object' ? { rev: j.rev | 0, dirty: !!j.dirty, t: +j.t || 0 } : { rev: 0, dirty: false, t: 0 }; } catch (e) { return { rev: 0, dirty: false, t: 0 }; } })();
    const saveSrv = () => store.set(SRVK, JSON.stringify(srv));
    let pushing = false;
    function saveLocal() { store.set(KEY, JSON.stringify(canon(S))); SV = readSaved(); }
    async function gardePush() {
      if (!memberMode() || !S) return 'local';
      if (pushing) return 'busy'; pushing = true;
      try {
        const dev = pgInfo().device || 'borne';
        const put = (b) => PG.rpc('pg_put_doc', { p_kind: 'garde', p_data: canon(S), p_base_rev: b, p_device: dev });
        let rows = await put(srv.rev), r = Array.isArray(rows) ? rows[0] : rows;
        if (r && !r.r_ok && r.r_why === 'version') { rows = await put(r.r_rev | 0); r = Array.isArray(rows) ? rows[0] : rows; }   // le choix qu'on vient de faire est le plus récent
        if (r && r.r_ok) { srv = { rev: r.r_rev | 0, dirty: false, t: 0 }; saveSrv(); srvState = 'ok'; renderSync(); return 'ok'; }
        srvState = 'wait'; renderSync(); return 'busy';
      } catch (e) { srvState = 'wait'; renderSync(); return e && e.offline ? 'offline' : 'fail'; }
      finally { pushing = false; }
    }
    // à l'ouverture : le serveur gagne s'il est plus récent ; une modif locale pas encore envoyée part maintenant
    async function gardePull() {
      if (!memberMode()) { renderSync(); return; }
      let rows; try { rows = await PG.rpc('pg_get_doc', { p_kind: 'garde' }); } catch (e) { if (!dead) { srvState = 'wait'; renderSync(); } return; }
      if (dead) return;
      const r = Array.isArray(rows) ? rows[0] : rows; if (!r) return;
      const sr = r.r_rev | 0, data = r.r_data && typeof r.r_data === 'object' ? r.r_data : null;
      const so = data && Number.isInteger(data.tenue) && data.tenue >= 0 && data.tenue <= 2057 ? data.tenue : -1;
      if (srv.dirty && S) {
        if (sr === srv.rev || srv.t > (Date.parse(r.r_at) || 0)) { srv.rev = sr; await gardePush(); return; }
      }
      if (sr > 0 && so >= 0 && (sr !== srv.rev || !SV)) {
        srv = { rev: sr, dirty: false, t: 0 }; saveSrv(); srvState = 'ok';
        const L = data.look && typeof data.look === 'object' ? STG.normalize(data.look) : STG.descOf(so);
        preset = so % 7; S = L; for (const k of keysOf(S)) GRAND.add(k);
        saveLocal();
        if (!editing && !friendOn) { D = lookCopy(S); STG.setLook(D).then(() => { if (!dead) meShot(); }); }
        renderMe(); toast('✓ Ton avatar retrouvé depuis ton compte');
      } else if (sr === 0 && S) { srv.dirty = true; await gardePush(); }
      else { srv.rev = sr; saveSrv(); srvState = 'ok'; renderSync(); }
    }

    // ---------- le CRÉATEUR, sur place (panneau du bas ; à droite en paysage) ----------
    let cat = store.get('jdw.pegase.edcat') || 'perso', hist = [], tryKey = '';
    if (!EDCATS.some((c) => c.k === cat)) cat = 'perso';
    const FR_CAT = { perso: 'corps', corps: 'corps', visage: 'visage', cheveux: 'tete', barbe: 'visage', maquillage: 'visage', haut: 'buste', bas: 'jambes', tenue: 'corps', pieds: 'pieds', chapeau: 'tete', acc: 'buste' };
    function tile(o) {   // o : { k (clé), act, v, name, th (html vignette), ico (chemin d'icône), on, sw (pastille de couleur) }
      const L = o.free ? null : lockOf(o.k), sec = L && L.r === 'secret';
      const cls = 'pgh-ch' + (o.on ? ' on' : '') + (L ? ' lk r-' + L.r : '') + (o.sw ? ' sw' : '') + (tryKey && tryKey === o.k ? ' try' : '');
      const th = sec ? `<span class="ico q">${PGH_SVG.q}</span>` : o.ico ? `<img alt="" data-src="${esc(o.ico)}"${STORE.icons.has('perso/' + o.ico) ? ` src="${STORE.icons.get('perso/' + o.ico)}"` : ''}>${o.th || ''}` : (o.th || '');
      const price = L ? (sec ? 'Secret' : L.p ? `${L.p} ${LU()}` : '🎁 Cadeau') : '';
      return `<button class="${cls}" data-a="${o.act}" data-v="${esc(o.v)}" data-key="${esc(o.k)}"${L ? ` data-lock="${L.r}"` : ''} aria-label="${esc(sec ? 'Secret' : o.name)}${L ? ' (verrouillé)' : ''}">` +
        `<span class="th">${th}${L ? `<span class="lock">${sec ? '✦' : PGH_SVG.lock}</span>` : ''}${L ? `<i class="rb">${RAR[L.r]}</i>` : ''}</span>` +
        (o.sw ? '' : `<span>${esc(sec ? '???' : o.name)}</span>`) + (L && !o.sw ? `<span class="price">${price}</span>` : '') + '</button>';
    }
    const RANK = { commun: 1, rare: 2, cadeau: 2.5, legend: 3, secret: 9 };
    const rankOf = (o) => { if (o.free || !o.k) return 0; const L = lockOf(o.k); return L ? RANK[L.r] || 5 : 0; };
    const list = (arr) => { const h = arr.map((o, i) => [o, rankOf(o), i]).sort((x, y) => x[1] - y[1] || x[2] - y[2]).map(([o]) => tile(o)).join(''); return arr.length && arr[0].sw ? '<div class="pgh-sws">' + h + '</div>' : h; };
    const sec = (t, n) => `<h5>${esc(t)}${n != null ? ` <em>· ${n}</em>` : ''}</h5>`;
    const none = (act, on) => `<button class="pgh-ch none${on ? ' on' : ''}" data-a="${act}" data-v="" data-key="" aria-label="Rien"><span class="th"><span class="ico">${PGH_SVG.none}</span></span><span>Rien</span></button>`;
    function itemTiles(c, slot, act, withNone = true) {
      const cur = D.it[slot] && D.it[slot][0], items = CAT.items.filter((i) => i.cat === c);
      return (withNone ? none(act || 'it:' + slot, !cur) : '') + list(items.map((it) => ({ k: it.id, act: act || 'it:' + slot, v: it.id, name: it.name, ico: it.icon, on: cur === it.id })));
    }
    const countOf = (c) => CAT.items.filter((i) => i.cat === c).length;
    function catCount(k) {
      if (!CAT) return '';
      return { perso: 7, corps: 2 + CAT.skin.length, visage: 6 + CAT.eyes.length + 2 + 4 + 2, barbe: countOf('beard'), maquillage: Object.keys(MKP()).length, cheveux: countOf('hb') + countOf('hf') + CAT.hairUI.length,
        haut: countOf('top'), bas: countOf('bot'), tenue: countOf('ovr'), pieds: countOf('feet') + 6, chapeau: countOf('hat') + countOf('hacc'), acc: countOf('glass') + countOf('glov') + 1 }[k];
    }
    // ---------- PARTIES de chaque catégorie (hub 2.13, demande de l'utilisateur : « on ne pense pas à descendre pour voir le reste ») ----------
    // Sous-onglets bien visibles (Coiffures : Derrière | Devant ; Hauts : Haut | Maillot de corps…), puis EN HAUT les réglages de la partie
    // (curseur s'il y en a un, pastille de la couleur actuelle qui ouvre un sélecteur), puis la grille des pièces (elle seule défile).
    // Sous-onglet retenu par catégorie : jdw.pegase.edsub. Couleurs À PART (champs ajoutés, absents = comme avant) : d.hcf (frange),
    // d.hcb (barbe) ; longueur de la frange d.hlf (absente = suit d.hl). Le jeu Unity lit les mêmes champs (HubAvatar.cs).
    let subOf = (() => { try { const o = JSON.parse(store.get('jdw.pegase.edsub') || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } })();
    let pop = '';   // sélecteur de couleur ouvert (sa clé) ou ''
    const colName = (i) => (CAT && CAT.palette[i] && CAT.palette[i][0]) || '';
    const dotBg = (hex) => `radial-gradient(circle at 35% 30%,${hex},${hex} 50%,rgba(0,0,0,.35))`;
    const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    const pst = (label, bg, key, name) => `<button class="pgh-pst${pop === key ? ' on' : ''}" data-pop="${esc(key)}" aria-haspopup="dialog" aria-label="${esc(label)} : ${esc(name)} (changer la couleur)"><i style="background:${bg}"></i><span><small>${esc(label)}</small><b>${esc(name)}</b></span>${CHEV}</button>`;
    const slid = (label, lo, hi, min, max, val, act, off, note, aria) => `<div class="pgh-sl${off ? ' off' : ''}"><label>${esc(label)}</label><span>${lo}</span><input type="range" min="${min}" max="${max}" value="${val}" data-a="${act}"${off ? ' disabled' : ''} aria-label="${esc(aria || label)}"><span>${hi}</span>${note ? `<em>${esc(note)}</em>` : ''}</div>`;
    const noteP = (t) => `<p class="pgh-edn">${esc(t)}</p>`;
    // pastilles des couleurs de la pièce portée dans un emplacement (tissus : toutes ouvertes)
    function itemPsts(slot) {
      const v = D.it[slot], it = v && ITEMS.get(v[0]); if (!it || !it.ch || !it.ch.length || it.hair) return '';
      const h = it.ch.map((c, i) => { const p = v[i + 1] == null ? c.c : v[i + 1]; return pst(c.n || 'Couleur', dotBg(palHex(p)), 'col:' + slot + ':' + i, colName(p)); }).join('');
      return it.ch.length > 2 ? `<div class="pgh-psts">${h}</div>` : h;   // 3 couleurs ou plus : une seule ligne qui glisse (rien ne pousse la grille sous le pli)
    }
    const itemSet = (slot, what) => itemPsts(slot) || noteP(D.it[slot] ? 'Cette pièce garde ses couleurs.' : 'Choisis ' + what + ' : ses couleurs se règlent ici.');
    const fringeOk = () => !STG || !STG.A || !STG.A.hasFringe || !STG.A.hasFringe() || STG.A.hfStretch !== false;   // l'avatar dit si la frange s'allonge
    // cheveux : racines (hc) et pointes (hc2) peuvent différer (personnages du pack) → pastille en deux tons
    const hairBg = () => D.hc2 != null && D.hc2 !== D.hc ? `linear-gradient(160deg,${palHex(D.hc)} 0 42%,${palHex(D.hc2)} 62%)` : dotBg(palHex(D.hc));
    const hairCol = () => colName(D.hc) + (D.hc2 != null && D.hc2 !== D.hc ? ' et ' + colName(D.hc2) : '');
    const hairName = (own) => own == null ? hairCol() + ' · comme derrière' : colName(own);
    function partsOf(k) {
      const d = D, P = (id, n, set, grid) => ({ id, n, set, grid });
      if (k === 'perso') return [P('perso', 'Personnages', () => '', () => list(CHARS_N.map((n, i) => ({ k: 'look:' + i, act: 'look', v: i, name: n, th: `<img class="full" alt="" data-t="${i}"${STORE.thumbs.has('o' + i) ? ` src="${STORE.thumbs.get('o' + i)}"` : ''}>`, on: preset === i }))))];
      if (k === 'corps') return [P('corps', 'Corps', () => slid('Carrure', 'fine', 'ronde', 0, 100, Math.round((d.bd[2] || 0) * 100), 'w') + slid('Taille', 'petite', 'grande', 90, 108, Math.round((d.h || 1) * 100), 'h')
        + pst('Peau', `radial-gradient(circle at 35% 30%,${(CAT.skin[d.sk] || CAT.skin[3])[1]},${(CAT.skin[d.sk] || CAT.skin[3])[1]} 45%,rgba(0,0,0,.35))`, 'sk', (CAT.skin[d.sk] || [''])[0]),
      () => `<button class="pgh-ch${d.g === 'f' ? ' on' : ''}" data-a="g" data-v="f" data-key=""><span class="th"><span class="ico">${PGH_SVG.fem}</span></span><span>Fille</span></button><button class="pgh-ch${d.g === 'm' ? ' on' : ''}" data-a="g" data-v="m" data-key=""><span class="th"><span class="ico">${PGH_SVG.masc}</span></span><span>Garçon</span></button>`)];
      if (k === 'visage') {
        const eye = CAT.eyes[d.ey] || CAT.eyes[0];
        return [P('forme', 'Forme', () => '', () => list(FACE_N.map((n, i) => ({ k: 'fc:' + i, act: 'fc', v: i, name: n, th: `<span class="ico face">${faceSVG(i)}</span>`, on: d.fc === i })))),
          P('yeux', 'Yeux', () => pst('Couleur des yeux', `radial-gradient(circle at 50% 58%,${eye[2]} 0,${eye[1]} 60%,#120c14 63%)`, 'ey', eye[0]),
            () => sec('Pupilles', 2) + list(['basic', 'sharp'].map((p) => ({ k: 'pu:' + p, act: 'pu', v: p, name: CAT.layers['pupil.' + p].name, ico: CAT.layers['pupil.' + p].icon, on: d.pu === p })))),
          P('sourcils', 'Sourcils', () => noteP('Sourcils et cils prennent la couleur des cheveux.'), () => sec('Sourcils') + CAT.items.filter((i) => i.cat === 'brow').map((i) => tile({ k: i.id, act: 'br', v: i.id, name: i.name, th: `<span class="ico face">${browSVG(i.id.includes('thick'))}</span>`, on: d.br === i.id })).join('')
            + sec('Cils') + CAT.items.filter((i) => i.cat === 'lash').map((i) => tile({ k: i.id, act: 'la', v: i.id, name: i.name, th: `<span class="ico face">${lashSVG(i.id.includes('long'))}</span>`, on: d.la === i.id })).join('')),
          P('details', 'Détails', () => '', () => list([{ k: 'fx:age', act: 'fx', v: 'age', name: CAT.layers.age.name, ico: CAT.layers.age.icon, on: (d.fx || []).includes('age') },
            { k: 'elf', act: 'elf', v: 1, name: 'Oreilles d\'elfe', th: `<span class="ico">${PGH_SVG.ear}</span>`, on: !!d.elf }]))];
      }
      if (k === 'maquillage') {
        const MK = MKP(), fx = d.fx || [];
        return ((PGM && PGM.MAKEUP_ROWS) || []).map(([g, title]) => {
          const ids = Object.keys(MK).filter((id) => MK[id].g === g);
          return P('mq-' + g, title, () => ids.filter((id) => fx.includes(id) && MK[id].tint).map((id) => { const cur = PGM.makeupCols(d, id)[0]; return pst('Teinte · ' + MK[id].n, dotBg(palHex(cur)), 'fxc:' + id, colName(cur)); }).join('')
            || noteP('Choisis un maquillage : sa teinte se règle ici.'),
          () => list(ids.map((id) => ({ k: 'fx:' + id, act: 'fx', v: id, name: MK[id].n, th: mqIcon(id), on: fx.includes(id) }))));
        });
      }
      if (k === 'barbe') return [P('barbe', 'Barbe', () => pst('Couleur de la barbe', d.hcb == null ? hairBg() : dotBg(palHex(d.hcb)), 'hcb', d.hcb == null ? hairCol() + ' · comme les cheveux' : colName(d.hcb)), () => itemTiles('beard', 'beard'))];
      if (k === 'cheveux') {
        // CHAUVE (hub 2.10.1) : retire TOUTES les pièces de cheveux (coiffure ET frange) ; « Rien » de la frange ne retire que la frange.
        const bald = !d.it.hb && !d.it.hf;
        return [P('hb', 'Derrière', () => slid('Longueur', 'courts', 'longs', 70, 145, Math.round((d.hl || 1) * 100), 'hl', !d.it.hb, !d.it.hb ? (bald ? 'Chauve : pas de cheveux à allonger.' : 'Pas de coiffure derrière.') : '', 'Longueur des cheveux (derrière)')
            + pst('Couleur', hairBg(), 'hc', hairCol()),
          () => `<button class="pgh-ch none${bald ? ' on' : ''}" data-a="chauve" data-v="" data-key="" aria-label="Chauve"><span class="th"><span class="ico">${PGH_SVG.bald}</span></span><span>Chauve</span></button>` + itemTiles('hb', 'hb', null, false)),
        P('hf', 'Devant', () => { const can = !!d.it.hf && fringeOk(); return slid('Longueur', 'courte', 'longue', 70, 145, Math.round((d.hlf != null ? d.hlf : d.hl || 1) * 100), 'hlf', !can, !d.it.hf ? 'Pas de mèche devant.' : !can ? 'Cette mèche ne s’allonge pas.' : '', 'Longueur de la mèche (devant)')
            + pst('Couleur', d.hcf == null ? hairBg() : dotBg(palHex(d.hcf)), 'hcf', hairName(d.hcf)); },
          () => itemTiles('hf', 'hf'))];
      }
      // MAILLOT DE CORPS (hub 2.10 / 2.12) : sous-onglet des Hauts et des Robes
      const utPart = () => P('ut', 'Maillot de corps', () => utSet(d), () => noteP(utNote(d)));
      if (k === 'haut') return [P('top', 'Haut', () => itemSet('top', 'un haut'), () => itemTiles('top', 'top')), utPart()];
      if (k === 'bas') return [P('bot', 'Bas', () => itemSet('bot', 'un bas'), () => itemTiles('bot', 'bot'))];
      if (k === 'tenue') return [P('ovr', 'Robe', () => itemSet('ovr', 'une robe'), () => itemTiles('ovr', 'ovr')), utPart()];
      if (k === 'pieds') {
        const so = ['socks.ankle', 'socks.basic', 'socks.knee', 'socks.thigh', 'socks.stirrup', 'socks.tights'];
        return [P('feet', 'Chaussures', () => itemSet('feet', 'des chaussures'), () => itemTiles('feet', 'feet')),
          P('so', 'Chaussettes', () => d.so && d.so[0] ? pst('Couleur', dotBg(palHex(d.so[1] || 0)), 'so', colName(d.so[1] || 0)) : noteP('Choisis des chaussettes : leur couleur se règle ici.'),
            () => none('so', !(d.so && d.so[0])) + list(so.map((s) => ({ k: 'so:' + s, act: 'so', v: s, name: CAT.layers[s].name, ico: CAT.layers[s].icon, on: !!(d.so && d.so[0] === s) }))))];
      }
      if (k === 'chapeau') return [P('hat', 'Chapeaux', () => itemSet('hat', 'un chapeau'), () => itemTiles('hat', 'hat')), P('hacc', 'Cornes et antennes', () => itemSet('hacc', 'des cornes ou des antennes'), () => itemTiles('hacc', 'hacc'))];
      if (k === 'acc') return [P('glass', 'Lunettes', () => itemSet('glass', 'des lunettes'), () => itemTiles('glass', 'glass')), P('glov', 'Gants', () => itemSet('glov', 'des gants'), () => itemTiles('glov', 'glov')),
        P('cam', 'Appareil photo', () => '', () => none('cam', !d.it.cam) + tile({ k: 'cam', act: 'cam', v: 1, name: 'Appareil d\'explorateur', th: `<span class="ico">${PGH_SVG.cam}</span>`, on: !!d.it.cam }))];
      return [P('x', '', () => '', () => '')];
    }
    const subNow = (k, parts) => { const ps = parts || partsOf(k), s = subOf[k]; return ps.some((p) => p.id === s) ? s : ps[0].id; };
    // MAQUILLAGE (hub 2.10) : 4 rangées (lèvres, yeux, joues, peintures de visage) = 4 sous-onglets ; chaque calque VERROUILLÉ au départ
    // (prix du serveur, « Acheter » comme les autres pièces), on peut l'essayer ; teinte de chaque calque porté (pastille en haut).
    // Peintures « grand visage » (papillon, tigre, chat, héros) : une seule à la fois. Format : d.fx (calques) + d.fxc (teintes), voir maquillage.js
    const swatch = (i) => `radial-gradient(circle at 35% 30%,${palHex(i)},${palHex(i)} 50%,rgba(0,0,0,.35))`;
    function mqIcon(id) {
      const m = MKP()[id], c = (m && m.d || [12]).map(palHex), on = (s) => `<svg viewBox="0 0 64 64">${s}</svg>`;
      const face = '<path d="M32 8C19 8 12 18 12 31c0 14 9 25 20 25s20-11 20-25C52 18 45 8 32 8z" fill="#f2c7a3" stroke="#c48a66" stroke-width="1.4"/>';
      const eyes = '<ellipse cx="23" cy="30" rx="4" ry="3" fill="#3a2416"/><ellipse cx="41" cy="30" rx="4" ry="3" fill="#3a2416"/>', mouth = '<path d="M26 44q6 3 12 0" stroke="#8a3a2a" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      const I = {
        'lips': face + eyes + `<path d="M24 43q4-4 8-1 4-3 8 1-4 6-8 6t-8-6z" fill="${c[0]}"/>`,
        'mq.gloss': face + eyes + `<path d="M24 43q4-4 8-1 4-3 8 1-4 6-8 6t-8-6z" fill="${c[0]}" opacity=".75"/><path d="M33 46h4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
        'mq.fard': face + `<path d="M16 28q7-8 14 0M34 28q7-8 14 0" stroke="${c[0]}" stroke-width="6" fill="none" stroke-linecap="round"/>` + eyes + mouth,
        'liner': face + eyes + `<path d="M17 28q6-4 12 0l3-2M35 28q6-4 12 0l3-2" stroke="${c[0]}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` + mouth,
        'mq.paillettes': face + eyes + mouth + [[18, 24], [27, 22], [44, 23], [38, 22], [17, 38], [46, 38], [21, 41], [43, 41]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${c[0]}"/>`).join('') + `<path d="M48 18l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" fill="${c[0]}"/>`,
        'blush': face + eyes + mouth + `<ellipse cx="20" cy="39" rx="5" ry="3.4" fill="${c[0]}" opacity=".7"/><ellipse cx="44" cy="39" rx="5" ry="3.4" fill="${c[0]}" opacity=".7"/>`,
        'freckles.light': face + eyes + mouth + [[18, 37], [22, 39], [20, 35], [42, 37], [46, 39], [44, 35]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${c[0]}"/>`).join(''),
        'freckles.full': face + eyes + mouth + [[16, 36], [19, 39], [22, 36], [25, 40], [20, 33], [39, 40], [42, 36], [45, 39], [48, 36], [44, 33], [30, 36], [34, 36]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${c[0]}"/>`).join(''),
        'mq.coeur': face + eyes + mouth + `<path d="M44 44c-6-4-7-8-4-9 2-.6 3 .8 4 2 1-1.2 2-2.6 4-2 3 1 2 5-4 9z" fill="${c[0]}"/>`,
        'mq.etoiles': face + eyes + mouth + `<path d="M48 36l1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z" fill="${c[0]}"/><circle cx="45" cy="27" r="1.8" fill="${c[0]}"/>`,
        'mq.arcenciel': face + eyes + mouth + `<path d="M12 44a8 8 0 0 1 16 0" stroke="${c[0]}" stroke-width="2.6" fill="none"/><path d="M15 44a5 5 0 0 1 10 0" stroke="${c[1]}" stroke-width="2.6" fill="none"/><path d="M18 44a2 2 0 0 1 4 0" stroke="${c[2]}" stroke-width="2.6" fill="none"/>`,
        'mq.chat': face + eyes + `<ellipse cx="32" cy="38" rx="4" ry="2.6" fill="${c[0]}"/><path d="M32 40v5M13 40l12 1M13 45l12-2M51 40l-12 1M51 45l-12-2" stroke="${c[0]}" stroke-width="1.6" stroke-linecap="round"/>`,
        'mq.heros': face + `<path d="M12 27q4-8 14-6 6 1 6 4 0-3 6-4 10-2 14 6-2 8-12 8-6 0-8-4-2 4-8 4-10 0-12-8z" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.4"/>` + eyes + mouth,
        'mq.papillon': face + `<ellipse cx="22" cy="25" rx="10" ry="7" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.2" transform="rotate(-20 22 25)"/><ellipse cx="42" cy="25" rx="10" ry="7" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.2" transform="rotate(20 42 25)"/><ellipse cx="23" cy="37" rx="6" ry="4.5" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.2"/><ellipse cx="41" cy="37" rx="6" ry="4.5" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.2"/><rect x="30.6" y="20" width="2.8" height="18" rx="1.4" fill="${c[1]}"/>` + eyes + mouth,
        'mq.tigre': face.replace('#f2c7a3', c[0]) + `<ellipse cx="32" cy="45" rx="8" ry="5" fill="#fff"/><path d="M14 30l8 2M13 36l9 1M50 30l-8 2M51 36l-9 1M32 9v7M26 11l2 5M38 11l-2 5" stroke="${c[1]}" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="32" cy="39" rx="3.4" ry="2.4" fill="${c[1]}"/>` + eyes,
      };
      return `<span class="ico face">${on(I[id] || face + eyes + mouth)}</span>`;
    }
    // MAILLOT DE CORPS (hub 2.10) : le haut beige qu'on voit sous les robes d'été, les débardeurs, les hauts ouverts… est un calque à part
    // (« under.top » du pack, peint sur le corps) : sa couleur se choisit ici (gratuit) ; d.ut = ['under.top', couleur 1, couleur 2]
    // Hub 2.12 (src/maillot.js) : plus long (jusque sous la ceinture des bas) ; « Sans maillot » = d.ut = ['', couleur…] : la brassière reste
    // (corps de fille) et, s'il n'y a ni haut ni robe (salopette comprise), le maillot revient tout seul : jamais en sous-vêtements seuls.
    function utNote(d) {
      const ut = Array.isArray(d.ut) ? d.ut : null, off = !!ut && ut[0] === '';
      const covered = PGM && PGM.torsoCovered ? PGM.torsoCovered(d) : true, girl = d.g !== 'm';
      return !off ? 'Le haut qu’on voit sous une robe d’été, un débardeur ou une veste ouverte. Il descend jusqu’à la ceinture.'
        : !covered ? 'Sans haut ni robe, le maillot reste : on ne sort jamais en sous-vêtements. Mets un haut ou une robe pour l’enlever.'
        : girl ? 'Sans maillot : seule la brassière reste dessous, pratique pour les robes et les hauts ouverts.' : 'Sans maillot dessous.';
    }
    function utSet(d) {
      const ut = Array.isArray(d.ut) ? d.ut : null, off = !!ut && ut[0] === '', cur = ut && ut[1] != null ? ut[1] : -1;
      const dot = cur < 0 ? '#ece6da' : palHex(cur);
      return `<div class="chs pgh-utc">` +
        `<button class="pgh-cc${off ? '' : ' on'}" data-a="utoff" data-v="0"><i style="background:${dot}"></i>Avec maillot</button>` +
        `<button class="pgh-cc${off ? ' on' : ''}" data-a="utoff" data-v="1"><i class="no"></i>Sans maillot</button></div>` +
        pst('Couleur', dotBg(dot), 'ut', cur < 0 ? 'Beige (d’origine)' : colName(cur));
    }
    // ---------- le SÉLECTEUR DE COULEUR (s'ouvre au toucher d'une pastille, se referme une fois la couleur choisie) ----------
    function popHTML() {
      if (!pop || !CAT || !D) return '';
      const d = D, sw = (act, v, i, on) => `<button class="pgh-sw${on ? ' on' : ''}" data-a="${act}" data-v="${esc(String(v))}" style="background:${swatch(i)}" title="${esc(colName(i))}" aria-label="${esc(colName(i))}"></button>`;
      const swl = (arr) => '<div class="pgh-sws">' + arr.map((o, i) => [o, rankOf(o), i]).sort((x, y) => x[1] - y[1] || x[2] - y[2]).map(([o]) => tile(o)).join('') + '</div>';
      const hairT = (act, cur) => swl(CAT.hairUI.map((i) => ({ k: 'hc:' + i, act, v: i, name: colName(i), sw: 1, th: `<span class="dot" style="background:${dotBg(palHex(i))}"></span>`, on: cur === i })));
      const same = (act, on, t) => `<div class="chs"><button class="pgh-cc${on ? ' on' : ''}" data-a="${act}" data-v=""><i style="background:${palHex(d.hc)}"></i>${t}</button></div>`;
      let t = '', g = '';
      if (pop === 'hc') { t = 'Couleur des cheveux (derrière)'; g = hairT('hc', d.hc); }
      else if (pop === 'hcf') { t = 'Couleur de la mèche (devant)'; g = same('hcf', d.hcf == null, 'Comme derrière') + hairT('hcf', d.hcf); }
      else if (pop === 'hcb') { t = 'Couleur de la barbe'; g = same('hcb', d.hcb == null, 'Comme les cheveux') + hairT('hcb', d.hcb); }
      else if (pop === 'sk') { t = 'Couleur de peau'; g = swl(CAT.skin.map((s, i) => ({ k: 'sk:' + i, act: 'sk', v: i, name: s[0], sw: 1, th: `<span class="dot" style="background:radial-gradient(circle at 35% 30%,${s[1]},${s[1]} 45%,rgba(0,0,0,.35))"></span>`, on: d.sk === i }))); }
      else if (pop === 'ey') { t = 'Couleur des yeux'; g = swl(CAT.eyes.map((e, i) => ({ k: 'ey:' + i, act: 'ey', v: i, name: e[0], sw: 1, th: `<span class="dot" style="background:radial-gradient(circle at 50% 58%,${e[2]} 0,${e[1]} 60%,#120c14 63%)"></span>`, on: d.ey === i }))); }
      else if (pop === 'ut') {
        const ut = Array.isArray(d.ut) ? d.ut : null, cur = ut && ut[1] != null ? ut[1] : -1;
        t = 'Couleur du maillot de corps';
        g = '<div class="pgh-swg">' + `<button class="pgh-sw${cur < 0 ? ' on' : ''}" data-a="ut" data-v="" style="background:radial-gradient(circle at 35% 30%,#ece6da,#ece6da 50%,rgba(0,0,0,.35))" title="Beige (d’origine)" aria-label="Beige (d’origine)"></button>`
          + CAT.fabricUI.map((i) => sw('ut', i, i, i === cur)).join('') + '</div>';
      } else if (pop === 'so') { t = 'Couleur des chaussettes'; const cur = d.so ? d.so[1] || 0 : -1; g = '<div class="pgh-swg">' + CAT.fabricUI.map((i) => sw('soc', i, i, i === cur)).join('') + '</div>'; }
      else if (pop.startsWith('fxc:')) {
        const id = pop.slice(4), M = MKP()[id]; if (!M || !M.tint) return '';
        const cur = PGM.makeupCols(d, id)[0]; t = 'Teinte · ' + M.n; g = '<div class="pgh-swg">' + M.tint.map((i) => sw('fxc', id + '|' + i, i, i === cur)).join('') + '</div>';
      } else if (pop.startsWith('col:')) {
        const [, slot, chs] = pop.split(':'), ch = +chs, v = d.it[slot], it = v && ITEMS.get(v[0]); if (!it || !it.ch[ch]) return '';
        const cur = v[ch + 1] == null ? it.ch[ch].c : v[ch + 1];
        t = (it.name ? it.name + ' · ' : '') + (it.ch[ch].n || 'Couleur'); g = '<div class="pgh-swg">' + CAT.fabricUI.map((p) => sw('col', slot + '|' + ch + '|' + p, p, p === cur)).join('') + '</div>';
      } else return '';
      return `<div class="pgh-popc" role="dialog" aria-label="${esc(t)}"><div class="pgh-poph"><b>${esc(t)}</b><button class="x" data-pop="" aria-label="Fermer">✕</button></div><div class="pgh-popg">${g}</div></div>`;
    }
    function renderPop() {
      const h = popHTML(); if (!h) pop = '';
      $.dpop.innerHTML = h; $.dpop.classList.toggle('on', !!h);
      box.querySelectorAll('.pgh-pst').forEach((b) => b.classList.toggle('on', b.dataset.pop === pop));
      if (h) { fillIcons($.dpop); const on = $.dpop.querySelector('.on'); if (on) try { on.scrollIntoView({ block: 'nearest' }); } catch (e) { /* rien */ } }
    }
    function renderEd() {
      if (!CAT || !D) return;
      box.querySelectorAll('.pgh-edcat').forEach((b) => { const c = b.dataset.cat; b.classList.toggle('on', c === cat); const n = b.querySelector('em'); if (n) n.textContent = catCount(c); });
      const parts = partsOf(cat), sid = subNow(cat, parts), part = parts.find((p) => p.id === sid);
      $.dsub.innerHTML = parts.length > 1 ? parts.map((p) => `<button class="${p.id === sid ? 'on' : ''}" data-sub="${p.id}" role="tab" aria-selected="${p.id === sid}">${esc(p.n)}</button>`).join('') : '';
      const g = $.dgrid, key = cat + '/' + sid, st = g.dataset.cat === key ? g.scrollTop : 0;
      const set = part.set();
      g.innerHTML = (set ? `<div class="pgh-edset">${set}</div>` : '') + `<div class="pgh-edg on" data-g="${cat}" data-sub="${sid}">${part.grid()}</div>`;
      g.dataset.cat = key; g.scrollTop = st;
      fillIcons(g); fillThumbs(g);
      const lk = lockedIn(D);
      $.ddesc.textContent = lk.length ? '🔒 Essai : ' + lk.map(keyName).join(', ') : describe(D);
      $.dundo.disabled = !hist.length;
      $.dok.classList.toggle('lk', !!lk.length);
      renderLockCard(); renderPop();
    }
    // ouvre le sous-onglet (et la catégorie) qui montre la pièce k (vitrine de l'onglet Moi, essais)
    function showKey(k) {
      if (!CAT || !D || !k) return false;
      const q = `data-key="${esc(k)}"`;
      for (const c of [cat, ...EDCATS.map((x) => x.k).filter((x) => x !== cat)]) {
        const parts = partsOf(c), p = parts.find((x) => x.grid().includes(q));
        if (!p) continue;
        if (c !== cat) selectCat(c);
        if (subNow(c, parts) !== p.id) { subOf[c] = p.id; store.set('jdw.pegase.edsub', JSON.stringify(subOf)); renderEd(); }
        return true;
      }
      return false;
    }
    function renderLockCard() {
      const k = tryKey && lockedIn(D).includes(tryKey) ? tryKey : '';
      if (!k) { $.lock.classList.remove('on'); return; }
      const L = lockOf(k), sec2 = L.r === 'secret';
      $.lock.classList.add('on'); $.lock.dataset.r = L.r; $.lockic.innerHTML = PGH_SVG.lock; $.lockx.textContent = 'Enlever';
      $.lockn.textContent = sec2 ? 'Objet secret' : keyName(k);
      $.lockt.textContent = RAR[L.r]; $.lockt.className = 'pgh-tier ' + L.r;
      const buy = canBuy(L), needT = L.p && L.needs && !buy ? mTitle(L.needs) : '';
      $.lockp.innerHTML = sec2 ? 'Se débloque d\'une manière… mystérieuse.' : !L.p ? esc(L.how)
        : needT ? `${fmtN(L.p)} ${LU()} lucioles, après la mission « ${esc(needT)} »`
        : memberMode() ? `${fmtN(L.p)} ${LU()} lucioles` + (wallet != null ? ` · tu en as ${fmtN(wallet)}` : '')
        : `${fmtN(L.p)} ${LU()} lucioles · essaie-le, achète-le avec un compte`;
      $.lockbuy.hidden = !buy;
    }
    async function fillIcons(el) {
      for (const im of el.querySelectorAll('img[data-src]:not([src])')) {
        iconUrl(im.dataset.src).then((u) => { if (u && !dead) im.src = u; }).catch(() => {});
      }
    }
    function fillThumbs(el) {
      for (const im of el.querySelectorAll('img[data-t]:not([src])')) { const i = +im.dataset.t; if (!STG || stgFail) continue; wantThumb('o' + i, i, 'p'); }
    }
    let lookT = 0;
    function apply(spark) {
      renderEd();
      if (STG) { const k = ++lookT; STG.setLook(D).then(() => { if (dead || !STG || k !== lookT) return; if (spark) STG.gesture('spark'); if (cat === 'cheveux') { const sl = $.dgrid.querySelector('[data-a="hlf"]'), can = !!(D.it && D.it.hf) && fringeOk(); if (sl && sl.disabled === can) renderEd(); } }); }
    }
    function change(fn, k, spark = true) {
      hist.push({ d: lookCopy(D), p: preset, t: tryKey }); if (hist.length > 60) hist.shift();
      fn(D); D = STG ? STG.normalize(D) : D;
      tryKey = k && !owned(k) ? k : (tryKey && lockedIn(D).includes(tryKey) ? tryKey : '');
      tone(620, 930); apply(spark);
    }
    function setItem(slot, id) {
      change((d) => {
        if (!id) { delete d.it[slot]; return; }
        const it = ITEMS.get(id), old = d.it[slot];
        d.it[slot] = [id, ...it.ch.map((c, i) => (old && old[0] !== id && old[i + 1] != null && !it.hair ? old[i + 1] : c.c))];
        if (slot === 'ovr') { delete d.it.top; delete d.it.bot; }
        if (slot === 'hb' && id === 'hb.buzzed') delete d.it.hf;   // « Rasé » : pas de frange qui flotte devant (on peut en remettre une ensuite)
        if ((slot === 'top' || slot === 'bot') && d.it.ovr) { delete d.it.ovr; if (!d.it.top && slot === 'bot') d.it.top = ['top.shirt']; if (!d.it.bot && slot === 'top') d.it.bot = ['bot.shorts']; }
      }, id);
    }
    function selectCat(k) {
      cat = k; store.set('jdw.pegase.edcat', k); pop = '';
      if (STG) { const f = FR_CAT[k] || 'corps'; STG.setFrame(wide && !short ? ({ tete: 'buste', visage: 'buste', buste: 'corps', jambes: 'corps', pieds: 'corps' }[f] || f) : f); }   // grand écran : moins près
      renderEd();
      const b = box.querySelector(`.pgh-edcat[data-cat="${k}"]`); if (b) try { b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (e) { /* rien */ }
    }
    async function openEdit(k, thenKey) {
      if (stgFail) { toast('Ton appareil ne peut pas afficher l’avatar en 3D'); return; }
      if (friendOn) closeFriend();
      if (!STG || !CAT || !D) { toast('Ton avatar arrive…'); return; }
      if (editing) { if (k) selectCat(k); return; }
      editing = true; hist = []; tryKey = ''; hintOff();
      try { $.scroll.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { $.scroll.scrollTop = 0; }
      $.scroll.scrollTop = 0;
      box.classList.add('editing'); $.ed.classList.add('on'); $.name.classList.remove('on');
      selectCat(k || cat);
      STG.face(); activeSync();
      requestAnimationFrame(() => { if (!dead) placeStage(); });
      later(placeStage, 460);
      tone(523, 784);
      if (thenKey) later(() => tapKey(thenKey), 120);
    }
    function closeEdit() {
      if (!editing) return;
      editing = false; tryKey = '';
      box.classList.remove('editing'); $.ed.classList.remove('on');
      if (STG) { STG.setFrame('corps'); if (STG.ready()) $.name.classList.add('on'); }
      lastNX = -1; requestAnimationFrame(() => { if (!dead) { placeStage(); activeSync(); } });
      later(placeStage, 460);
    }
    function cancelEdit() { D = S ? lookCopy(S) : (STG ? STG.descOf(0) : D); if (SV) preset = SV.tenue % 7; closeEdit(); if (STG) STG.setLook(D); }
    function saveEdit() {
      const lk = lockedIn(D);
      if (lk.length) {
        D = stripLocked(D, S || {}); if (STG) D = STG.normalize(D); tryKey = '';
        toast('🔒 ' + lk.slice(0, 2).map(keyName).join(', ') + (lk.length > 2 ? '…' : '') + ' : pas encore à toi. Le reste est enregistré !');
      }
      if (!owned('look:' + preset)) preset = SV && owned('look:' + (SV.tenue % 7)) ? SV.tenue % 7 : 0;
      S = lookCopy(D); for (const k of keysOf(S)) GRAND.add(k);
      saveLocal(); renderMe();
      if (STG) STG.setLook(D).then(() => { if (!dead) meShot(); });
      closeEdit(); tone(784, 1318);
      if (!lk.length) toast(memberMode() ? '✓ Avatar enregistré' : '✓ Avatar enregistré sur cet appareil');
      if (STG) later(() => STG && STG.gesture('jump'), 450);
      if (memberMode()) { srv.dirty = true; srv.t = Date.now(); saveSrv(); srvState = 'wait'; gardePush().then((r) => { if (!dead && r === 'ok' && !lk.length) toast('✓ Avatar enregistré sur ton compte'); }); }
    }
    // un toucher sur une case (créateur ou garde-robe de l'onglet Moi)
    function tapKey(k) { showKey(k); const b = $.dgrid.querySelector(`[data-key="${CSS.escape ? CSS.escape(k) : k}"]`); if (b) b.click(); }
    on($.ed, 'click', (e) => {
      const c = e.target.closest('.pgh-edcat'); if (c) { selectCat(c.dataset.cat); tone(560, 700); return; }
      const h = e.target.closest('[data-h]');
      if (h && h.dataset.h === 'dx') { cancelEdit(); return; }
      if (h && h.dataset.h === 'dno') { cancelEdit(); return; }
      if (h && h.dataset.h === 'dok') { saveEdit(); return; }
      if (h && h.dataset.h === 'dundo') { const u = hist.pop(); if (u) { D = u.d; preset = u.p; tryKey = u.t; apply(false); } return; }
      if (h && h.dataset.h === 'lockx') { const u = hist.pop(); if (u) { D = u.d; preset = u.p; tryKey = ''; apply(false); } return; }
      if (h && h.dataset.h === 'drnd') { randomLook(); return; }
      if (e.target.closest('[data-h="lockbuy"]')) { if (tryKey) openBuy(tryKey); return; }
      const sb = e.target.closest('[data-sub]');
      if (sb && sb.tagName === 'BUTTON') { subOf[cat] = sb.dataset.sub; store.set('jdw.pegase.edsub', JSON.stringify(subOf)); pop = ''; renderEd(); $.dgrid.scrollTop = 0; tone(560, 760); return; }
      const pb = e.target.closest('[data-pop]');
      if (pb) { const pk = pb.dataset.pop; pop = pk && pk !== pop ? pk : ''; renderPop(); if (pop) tone(700, 940); return; }
      if (e.target === $.dpop) { pop = ''; renderPop(); return; }
      const b = e.target.closest('[data-a]'); if (!b || b.tagName === 'INPUT') return;
      if ($.dpop.contains(b)) pop = '';
      const a = b.dataset.a, v = b.dataset.v, k = b.dataset.key;
      if (k && k === tryKey && b.dataset.lock && b.dataset.lock !== 'secret' && canBuy(lockOf(k)) && lockedIn(D).includes(k)) { openBuy(k); return; }
      if (b.dataset.lock === 'secret') { hist.push({ d: lookCopy(D), p: preset, t: tryKey }); tryKey = k; renderEd(); $.lock.classList.add('on'); renderSecret(k); tone(880, 1320); return; }
      if (a === 'look') { const i = +v; change((d) => { const n = STG.descOf(i); for (const x of Object.keys(d)) delete d[x]; Object.assign(d, n); preset = i; }, 'look:' + i); if (STG) STG.gesture('jump'); return; }
      if (a === 'chauve') { change((d) => { delete d.it.hb; delete d.it.hf; delete d.hl; delete d.hlf; }, ''); return; }
      if (a.startsWith('it:')) { setItem(a.slice(3), v); return; }
      if (a === 'g') { change((d) => { d.g = v; d.bd[0] = v === 'm' ? 1 : 0; d.bd[1] = v === 'f' ? 0.55 : 0; }, ''); return; }
      if (a === 'sk' || a === 'ey' || a === 'fc') { change((d) => { d[a] = +v; }, k, false); return; }
      if (a === 'pu' || a === 'br' || a === 'la') { change((d) => { d[a] = v; }, k, false); return; }
      if (a === 'hc') { change((d) => { d.hc = +v; d.hc2 = +v; }, k, false); return; }
      if (a === 'hcf' || a === 'hcb') { change((d) => { if (v === '') delete d[a]; else d[a] = +v; }, k, false); return; }
      if (a === 'fx') { change((d) => { d.fx = d.fx || []; const i = d.fx.indexOf(v); if (i >= 0) d.fx.splice(i, 1); else { const ex = MKP()[v] && MKP()[v].ex; if (v.startsWith('freckles')) d.fx = d.fx.filter((x) => !x.startsWith('freckles')); if (ex) d.fx = d.fx.filter((x) => !(MKP()[x] && MKP()[x].ex === ex)); d.fx.push(v); } }, k); return; }
      if (a === 'fxc') { const [id, ci] = String(v).split('|'); change((d) => { d.fxc = d.fxc || {}; const c = PGM.makeupCols(d, id); c[0] = +ci; d.fxc[id] = c; }, '', false); return; }
      // maillot de corps (hub 2.12) : couleur (gardée aussi « sans maillot », pour la brassière et pour quand il revient) ; avec / sans
      if (a === 'ut') { change((d) => { const off = Array.isArray(d.ut) && d.ut[0] === ''; if (v === '') { if (off) d.ut = ['']; else delete d.ut; } else d.ut = [off ? '' : 'under.top', +v, +v]; }, '', false); return; }
      if (a === 'utoff') { change((d) => { const c = Array.isArray(d.ut) && d.ut[1] != null ? [d.ut[1], d.ut[2] == null ? d.ut[1] : d.ut[2]] : null; if (v === '1') d.ut = c ? ['', ...c] : ['']; else if (c) d.ut = ['under.top', ...c]; else delete d.ut; }, '', false); return; }
      if (a === 'elf') { change((d) => { d.elf = d.elf ? 0 : 1; }, k); return; }
      if (a === 'so') { change((d) => { d.so = v ? [v, (d.so && d.so[1]) || 0] : null; }, k); return; }
      if (a === 'cam') { change((d) => { if (v) d.it.cam = d.it.cam || ['cam', 9, 40, 53]; else delete d.it.cam; }, v ? 'cam' : ''); return; }
      // couleur d'une pièce (sélecteur) : « emplacement|canal|couleur »
      if (a === 'col') { const [s2, c2, p2] = String(v).split('|'); if (D.it[s2]) change((d) => { if (d.it[s2]) d.it[s2][+c2 + 1] = +p2; }, '', false); return; }
      if (a === 'soc') { change((d) => { if (d.so && d.so[0]) d.so = [d.so[0], +v].concat(d.so.slice(2)); }, '', false); return; }
    });
    function renderSecret() {
      $.lock.dataset.r = 'secret'; $.lockic.textContent = '✦'; $.lockx.textContent = 'OK'; $.lockn.textContent = 'Objet secret'; $.lockt.textContent = RAR.secret; $.lockt.className = 'pgh-tier secret';
      $.lockp.textContent = 'Se débloque d\'une manière… mystérieuse.'; $.lockbuy.hidden = true;
    }
    on($.ed, 'input', (e) => { const a = e.target.dataset.a, v = +e.target.value; if (!STG || !STG.A.desc) return;
      if (a === 'w') { D.bd[2] = v / 100; STG.A.desc.bd[2] = v / 100; STG.A.applyMorphs(); }
      if (a === 'h') { D.h = v / 100; STG.A.desc.h = D.h; STG.A.group.scale.setScalar(D.h); }
      if (a === 'hl') { D.hl = v / 100; STG.A.desc.hl = D.hl; STG.A.setHairLength(D.hl, D.hlf); }
      if (a === 'hlf') { D.hlf = v / 100; STG.A.desc.hlf = D.hlf; STG.A.setHairLength(D.hl, D.hlf); } });
    on($.ed, 'change', (e) => { if (e.target.dataset.a) { hist.push({ d: lookCopy(D), p: preset, t: tryKey }); apply(false); } });
    // « au hasard » : seulement parmi ce qu'on possède
    function randomLook() {
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const ownIt = (c) => CAT.items.filter((i) => i.cat === c && owned(i.id)).map((i) => i.id);
      change((d) => {
        const hb = ownIt('hb'), hf = ownIt('hf'), tp = ownIt('top'), bt = ownIt('bot'), ov = ownIt('ovr'), ft = ownIt('feet'), ht = ownIt('hat');
        if (hb.length) d.it.hb = [pick(hb)]; if (hf.length) d.it.hf = [pick(hf)];
        if (ov.length && Math.random() < 0.3) { d.it.ovr = [pick(ov)]; delete d.it.top; delete d.it.bot; } else { delete d.it.ovr; if (tp.length) d.it.top = [pick(tp)]; if (bt.length) d.it.bot = [pick(bt)]; }
        if (ft.length) d.it.feet = [pick(ft)];
        if (ht.length && Math.random() < 0.4) d.it.hat = [pick(ht)]; else delete d.it.hat;
        const hcs = CAT.hairUI.filter((i) => owned('hc:' + i)); d.hc = d.hc2 = pick(hcs); delete d.hcf; delete d.hcb;
        d.sk = Math.floor(Math.random() * 9); d.ey = pick([...EYE_FREE]);
      }, '');
      if (STG) STG.gesture('jump');
    }
    for (const k of ['go-av', 'go-av2', 'go-av3']) on($[k], 'click', () => openEdit());
    on($.wrrow, 'click', (e) => { const b = e.target.closest('[data-key]'); if (!b) return; const k = b.dataset.key, c = b.dataset.cat; openEdit(c, k); });
    on(window, 'keydown', (e) => { if (e.key === 'Escape') { if (HM.open) closeHouse(); else if (BUY) closeBuy(); else if (editing) cancelEdit(); else if (friendOn && !CALL.c) closeFriend(); } });
    // vitrine « à débloquer » de l'onglet Moi : une sélection de belles pièces verrouillées (+ un secret)
    const SHOWCASE = [['ovr.smart_dress', 'tenue'], ['fx:mq.papillon', 'maquillage'], ['hat.fedora', 'chapeau'], ['hb.twin_tail_long', 'cheveux'], ['look:3', 'perso'], ['top.seifuku', 'haut'], ['feet.high_lace_shoe', 'pieds'], ['glass.round_shaded', 'acc'], ['hacc.alien_attena', 'chapeau'], ['hb.wild_tail', 'cheveux'], ['top.hoodie', 'haut'], ['elf', 'visage']];
    function renderShowcase() {
      if (!CAT) return;
      $.wrrow.innerHTML = SHOWCASE.filter(([k]) => !owned(k)).map(([k, c]) => {
        const it = ITEMS.get(k);
        return tile({ k, act: 'show', v: k, name: keyName(k), ico: it && it.icon, th: k.startsWith('look:') ? `<img class="full" alt="" data-t="${k.slice(5)}"${STORE.thumbs.has('o' + k.slice(5)) ? ` src="${STORE.thumbs.get('o' + k.slice(5))}"` : ''}>` : k === 'elf' ? `<span class="ico">${PGH_SVG.ear}</span>` : k.startsWith('fx:') && MKP()[k.slice(3)] ? mqIcon(k.slice(3)) : '' }).replace('<button ', `<button data-cat="${c}" `);
      }).join('');
      fillIcons($.wrrow); fillThumbs($.wrrow);
    }

    // ---------- vignettes (copains, personnages) : rendues une à la fois, au calme, dans le moteur de la page ----------
    const TQ = [], TQK = new Set(); let tBusy = false;
    function wantThumb(key, look, kind) { if (STORE.thumbs.has(key) || TQK.has(key)) return; TQK.add(key); TQ.push({ key, look, kind }); thumbPump(); }
    function thumbPump() {
      if (tBusy || !TQ.length || !STG || stgFail || dead) return;
      tBusy = true;
      const job = TQ.shift();
      const go = () => STG.thumb(job.look).then((u) => { if (u) { STORE.thumbs.set(job.key, u); placeThumb(job.key, u); } }).catch(() => {}).finally(() => { TQK.delete(job.key); tBusy = false; if (!dead) later(thumbPump, 160); });
      (window.requestIdleCallback || ((f) => setTimeout(f, 30)))(() => { if (dead) { tBusy = false; return; } go(); }, { timeout: 500 });
    }
    function placeThumb(key, u) {
      if (key[0] === 'o') box.querySelectorAll(`img[data-t="${key.slice(1)}"]`).forEach((im) => { im.src = u; });
      box.querySelectorAll(`img[data-tk="${CSS.escape ? CSS.escape(key) : key}"]`).forEach((im) => { im.src = u; im.classList.add('on'); });
    }

    // ---------- onglets ----------
    let tab = store.get('jdw.pegase.tab') || 'moi'; if (!['moi', 'amis', 'gram', 'infos'].includes(tab)) tab = 'moi';
    let GRAM = null, CARTES = null;   // PegaGram (pegagram/gram.js), cartes postales dans Messages (pegagram/cartes.js)
    let LIVRE = null;   // Grand livre des espèces (livre/livre.js)
    function tabInd() { const b = box.querySelector(`.pgh-tab[data-tab="${tab}"]`); if (!b) return; $.tabind.style.left = (b.offsetLeft + 14) + 'px'; $.tabind.style.width = Math.max(20, b.offsetWidth - 28) + 'px'; }
    function setTab(t, scroll) {
      tab = t; store.set('jdw.pegase.tab', t);
      box.querySelectorAll('.pgh-tab').forEach((b) => { b.classList.toggle('on', b.dataset.tab === t); b.setAttribute('aria-selected', String(b.dataset.tab === t)); });
      box.querySelectorAll('.pgh-pane').forEach((p) => p.classList.toggle('on', p.dataset.pane === t));
      tabInd();
      const top = $.hero.offsetHeight;
      if (scroll && $.scroll.scrollTop > top) $.scroll.scrollTop = top;
      if (t === 'amis') { renderFriends(); loadAvatars(); loadSms(); }
      if (t === 'moi') { renderShowcase(); renderLink(); }
      if (LIVRE) LIVRE.tab(t);
      if (GRAM) { if (t === 'gram') GRAM.show(); else GRAM.hide(); }
    }
    on($.tabs, 'click', (e) => { const b = e.target.closest('.pgh-tab'); if (b) { setTab(b.dataset.tab, true); tone(560, 760); } });
    const toDl = () => { setTab('infos', false); requestAnimationFrame(() => { const s = $.scroll, t = $.secdl.offsetTop - $.tabs.offsetHeight - 6; try { s.scrollTo({ top: t, behavior: 'smooth' }); } catch (e) { s.scrollTop = t; } }); };
    for (const k of ['go-dl', 'go-dl1']) on($[k], 'click', () => { if (AND.state === 'play') andOpen(); else toDl(); });

    // ---------- LES COPAINS DE LA SALLE ----------
    const FR = { list: [], av: new Map(), sig: '', at: 0, err: '' };
    const hue = (n) => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
    function members() { try { return (PG && PG.members && PG.members()) || []; } catch (e) { return []; } }
    async function loadAvatars(force) {
      const i = pgInfo(); if (!memberMode() || !i.room) return;
      if (!force && Date.now() - FR.at < 60000) return;
      FR.at = Date.now();
      const rid = i.room.id, cache = STORE.roomAv[rid];
      if (cache) for (const [n, a] of cache) FR.av.set(n, a);
      try {
        const rows = await PG.rpc('pg_room_avatars', {}); if (dead) return;
        FR.av.clear(); FR.err = '';
        for (const r of rows || []) {
          const g = r.r_garde && typeof r.r_garde === 'object' && Number.isInteger(r.r_garde.tenue) ? r.r_garde : null;
          FR.av.set(String(r.r_name), { tenue: g ? g.tenue : -1, look: g && g.look && typeof g.look === 'object' ? g.look : null, desc: g ? String(g.desc || '') : '', rev: r.r_rev | 0, alias: r.r_alias || '' });
        }
        STORE.roomAv[rid] = [...FR.av];
      } catch (e) { FR.err = e && e.offline ? 'offline' : 'err'; }
      FR.sig = ''; renderFriends();
    }
    const avKey = (n, a) => 'f:' + n + ':' + a.rev + ':' + a.tenue;
    function friendCard(m) {
      const a = FR.av.get(m.name), has = a && a.tenue >= 0;
      const st = m.online ? 'en ligne' : seen(m.seen);
      let inner;
      if (has) {
        const k = avKey(m.name, a), u = STORE.thumbs.get(k);
        const c = GR.chars[a.tenue % 7];
        inner = `<img class="av${u ? ' on' : ''}" alt="" data-tk="${esc(k)}"${u ? ` src="${u}"` : ''}><span class="wait" style="--skin:${c.skin};--hair:${c.hair};--cloth:${c.c1}"></span>`;
      } else inner = `<span class="none">Pas encore d'avatar</span><span class="sil"></span>${m.photo ? `<img class="hd" alt="" src="${esc(m.photo)}">` : `<span class="ini" style="--h:${hue(m.name)}">${esc(m.display[0] || '?')}</span>`}`;
      return `<button class="pgh-fc${m.online ? ' on' : ''}${has ? '' : ' no'}" data-n="${esc(m.name)}" aria-label="${esc(m.display)}"><span class="st">${inner}<span class="dot"></span></span><b>${esc(m.display)}</b><small>${esc(st)}</small></button>`;
    }
    function seen(t) { if (!t) return 'hors ligne'; const s = (Date.now() - t) / 1000; if (s < 3600) return 'vu il y a ' + Math.max(1, Math.round(s / 60)) + ' min'; if (s < 86400) return 'vu il y a ' + Math.round(s / 3600) + ' h'; const d = Math.round(s / 86400); return d === 1 ? 'vu hier' : 'vu il y a ' + d + ' j'; }
    let frIO = null;
    function renderFriends() {
      const i = pgInfo();
      let html = '', list = [];
      if (!PG) html = '';
      else if (i.guest || !i.name) html = `<div class="pgh-card pgh-frmsg"><span class="em">👫</span><div><h3>Retrouve tes copains</h3><p>Avec un compte (gratuit), tu vois les avatars de tes copains de salle, qui est là en ce moment, et ton avatar te suit partout.</p></div><button class="pgh-cta gold" data-h2="acct">Créer mon compte</button></div>`;
      else if (!i.room) html = `<div class="pgh-card pgh-frmsg"><span class="em">🏠</span><div><h3>Rejoins une salle</h3><p>Tes copains apparaissent ici quand tu es dans une salle de la borne.</p></div></div>`;
      else {
        list = members().filter((m) => !m.me);
        list.sort((a, b) => (b.online - a.online) || ((FR.av.get(b.name) || { tenue: -1 }).tenue >= 0) - ((FR.av.get(a.name) || { tenue: -1 }).tenue >= 0) || a.display.localeCompare(b.display));
        if (!list.length) html = `<div class="pgh-card pgh-frmsg"><span class="em">✉️</span><div><h3>Personne d'autre pour l'instant</h3><p>Invite tes copains dans « ${esc(i.room.name)} » (bouton Inviter de la borne) : leurs avatars arriveront ici.</p></div></div>`;
        else html = `<div class="pgh-frrow" data-h2="frrow">${list.map(friendCard).join('')}</div>` + (FR.err === 'offline' ? '<p class="pgh-sub">Pas de réseau : les avatars reviendront avec la connexion.</p>' : '');
      }
      const sig = html.length + '|' + list.map((m) => m.name + (m.online ? 1 : 0) + ((FR.av.get(m.name) || {}).rev || 0) + (m.photo ? m.photo.length : 0) + (STORE.thumbs.has(avKey(m.name, FR.av.get(m.name) || { rev: 0, tenue: -1 })) ? 'T' : '')).join(',');
      const onN = list.filter((m) => m.online).length;
      $.frbdg.textContent = onN; $.frbdg.classList.toggle('on', onN > 0);
      $.frcount.textContent = list.length ? (onN ? onN + ' en ligne · ' : '') + list.length + ' copain' + (list.length > 1 ? 's' : '') : '';
      FR.list = list;
      renderAmis();
      if (sig === FR.sig) return; FR.sig = sig;
      const row0 = $.frbox.querySelector('.pgh-frrow'), sl = row0 ? row0.scrollLeft : 0;
      $.frbox.innerHTML = html;
      const row = $.frbox.querySelector('.pgh-frrow'); if (row) row.scrollLeft = sl;
      if (frIO) frIO.disconnect();
      if (row && typeof IntersectionObserver === 'function') {
        frIO = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) queueFriend(e.target.dataset.n); }, { root: null, rootMargin: '0px 160px 0px 160px', threshold: 0.01 });
        row.querySelectorAll('.pgh-fc').forEach((c) => frIO.observe(c));
      } else if (row) list.slice(0, 6).forEach((m) => queueFriend(m.name));
    }
    function queueFriend(n) {
      const a = FR.av.get(n); if (!a || a.tenue < 0 || !STG || stgFail || tab !== 'amis') return;
      wantThumb(avKey(n, a), a.look || a.tenue, 'f');
    }
    // ---------- 23 oct. 2026 (demande de l'utilisateur) : l'onglet Amis en TUILES — une tuile par ami (les copains de la salle et ceux
    // avec qui on s'écrit) : son avatar EN PIED, en ligne ou pas, ses nouveaux messages, son livre, le dernier message, 📞. Jamais les
    // habitants (Papi Auguste…) : ce ne sont pas des amis. Une tuile ouvre SA fiche (avatar, gestes, Messages, Son livre, Sa maison) ; un ami
    // d'une autre salle : vos messages.
    let amiSig = '', amiIO = null;
    function amiLivres() { try { return LIVRE && LIVRE.amis ? LIVRE.amis() : []; } catch (e) { return []; } }
    function amiConv() { try { return SMS.list || []; } catch (e) { return []; } }   // (SMS est déclaré plus bas)
    function amiCallOk() { try { return callOk(); } catch (e) { return false; } }        // (les appels aussi)
    function amiTile(x) {
      const a = FR.av.get(x.n), has = !!(a && a.tenue >= 0);
      let inner;   // la scène en pied des cartes d'avant (.pgh-fc) : l'avatar entier, ou sa tête de la borne sur une silhouette
      if (has) {
        const k = avKey(x.n, a), u = STORE.thumbs.get(k), c = GR.chars[a.tenue % 7];
        inner = `<img class="av${u ? ' on' : ''}" alt="" data-tk="${esc(k)}"${u ? ` src="${u}"` : ''}><span class="wait" style="--skin:${c.skin};--hair:${c.hair};--cloth:${c.c1}"></span>`;
      } else inner = `<span class="none">Pas encore sur Pégase</span><span class="sil"></span>${x.photo ? `<img class="hd" alt="" src="${esc(x.photo)}">` : `<span class="ini" style="--h:${hue(x.n)}">${esc((x.display || '?')[0].toUpperCase())}</span>`}`;
      const st = x.online ? 'en ligne' : x.m ? seen(x.seen) : x.c && x.c.room ? 'salle ' + x.c.room : 'une autre salle';
      const last = x.c ? (x.c.mine ? 'Toi : ' : '') + (x.c.last || (x.c.photo ? '📷 Photo' : '')) : '';
      const un = x.un ? x.un + ' nouveau' + (x.un > 1 ? 'x' : '') + ' message' + (x.un > 1 ? 's' : '') : '';
      const bd = (x.c && !x.un ? '<span class="pga-b">✉️ Messages</span>' : '') + (x.b ? `<span class="pga-b">📖 ${x.b.total} espèce${x.b.total > 1 ? 's' : ''}</span>` : '');
      return `<div class="pga-t pga-f${x.online ? ' on' : ''}${x.un ? ' un' : ''}${has ? '' : ' no'}" data-n="${esc(x.n)}">`
        + `<button class="pgh-fc${x.online ? ' on' : ''}${has ? '' : ' no'}" aria-label="${esc(x.display)}${un ? ' : ' + un : ''}"><span class="st">${inner}<span class="dot"></span>${x.un ? `<span class="pga-un">✉️ ${x.un}</span>` : ''}</span>`
        + `<b>${esc(x.display)}</b><small>${esc(st)}</small>${bd ? `<span class="pga-bd">${bd}</span>` : ''}${last ? `<span class="pga-last">${esc(last)}</span>` : ''}</button>`
        + (amiCallOk() ? `<button class="pga-call" data-call="${esc(x.n)}" aria-label="Appeler ${esc(x.display)}">📞 Appeler</button>` : '') + '</div>';
    }
    function renderAmis() {
      if (!$.secami) return;
      const i = pgInfo(), conv = amiConv(), lv = new Map(amiLivres().map((b) => [b.name, b])), by = new Map();
      const ms = !PG || i.guest || !i.name ? [] : members().filter((m) => !m.me);
      for (const m of ms) by.set(m.name, { n: m.name, m, display: m.display, online: !!m.online, seen: m.seen, photo: m.photo, c: null });
      for (const c of conv) if (/^p:/.test(c.w)) {
        const n = c.w.slice(2), x = by.get(n) || { n, m: null, display: smsWho(c.w, c.title).name, online: false, seen: 0, photo: null, c: null };
        x.c = c; by.set(n, x);
      }
      const amis = [...by.values()];
      for (const x of amis) { x.un = x.c ? x.c.unread | 0 : 0; x.b = lv.get(x.n) || null; }
      amis.sort((a, b) => (b.un > 0) - (a.un > 0) || (b.online - a.online) || (!!b.m - !!a.m) || a.display.localeCompare(b.display));
      const on = amis.length > 0;
      $.secami.hidden = !on; $.secami.parentElement.classList.toggle('tuiles', on);
      if (!on) { amiSig = ''; return; }
      const onN = amis.filter((x) => x.online).length;   // seulement les VRAIS amis : jamais les habitants (Papi Auguste…), demande de l'utilisateur
      $.amicount.textContent = (onN ? onN + ' en ligne · ' : '') + amis.length + ' ami' + (amis.length > 1 ? 's' : '');
      const html = amis.map(amiTile).join('');
      if (html === amiSig) return; amiSig = html;
      $.amibox.innerHTML = html;
      if (friendOn) fvAmiSync(friendOn.name);
      // les miniatures d'avatar (la même file que les cartes d'avant), quand la tuile se voit
      if (amiIO) amiIO.disconnect();
      if (typeof IntersectionObserver === 'function') {
        amiIO = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) queueFriend(e.target.dataset.n); }, { root: null, rootMargin: '160px', threshold: 0.01 });
        $.amibox.querySelectorAll('.pga-t[data-n]').forEach((t) => amiIO.observe(t));
      } else amis.slice(0, 8).forEach((x) => queueFriend(x.n));
    }
    // la fiche : ses nouveaux messages, son livre
    function fvAmiSync(n) {
      const c = amiConv().find((x) => x.w === 'p:' + n), un = c ? c.unread | 0 : 0, b = amiLivres().find((x) => x.name === n);
      $.fvsmsn.textContent = un ? un + ' nouveau' + (un > 1 ? 'x' : '') + ' message' + (un > 1 ? 's' : '') : c ? 'vos messages' : 'lui écrire';
      $.fvlivre.hidden = !b; if (b) $.fvlivren.textContent = b.total + ' espèce' + (b.total > 1 ? 's' : '') + ' sur ' + b.sur;
    }
    on($.secami, 'click', (e) => {
      const k = e.target.closest('.pga-call');
      if (k) { const n = k.dataset.call, x = FR.list.find((m) => m.name === n); if (n && !CALL.c) { callOut(x || { name: n, display: smsWho('p:' + n, '').name || n }); tone(560, 840); } return; }
      const t = e.target.closest('.pga-t'); if (!t) return;
      const n = t.dataset.n;
      if (FR.list.some((m) => m.name === n)) openFriend(n);   // un copain de la salle : sa fiche
      else { openThread('p:' + n); tone(560, 840); }          // un ami d'une autre salle : vos messages
    });
    on($.frbox, 'click', (e) => {
      if (e.target.closest('[data-h2="acct"]')) { try { PG && PG.account && PG.account(); } catch (x) { /* rien */ } return; }
      const c = e.target.closest('.pgh-fc'); if (c) openFriend(c.dataset.n);
    });
    // le copain en grand : la scène 3D de la page passe dans la fenêtre, avec SON avatar ; gestes ; Écrire ; Voir sa maison (pg_room_maisons)
    function openFriend(n) { const m = FR.list.find((x) => x.name === n); if (m) openFriendM(m); }
    function openFriendM(m) {
      const n = m.name;
      const a = FR.av.get(n), has = !!(a && a.tenue >= 0) && !stgFail && !!STG;
      friendOn = m; hintOff();
      $.fvname.textContent = m.display; $.fvst.classList.toggle('on', !!m.online); $.fvstt.textContent = m.online ? 'en ligne en ce moment' : seen(m.seen);
      $.fvdesc.textContent = has ? (a.desc || '') : '';
      $.fvemo.style.display = has ? '' : 'none';
      $.fvnone.classList.toggle('on', !has);
      $.fvhead.innerHTML = m.photo ? `<img class="hd" alt="" src="${esc(m.photo)}">` : `<span class="ini" style="--h:${hue(m.name)}">${esc(m.display[0] || '?')}</span>`;
      $.fvnonet.textContent = m.display + ' n\'a pas encore créé son avatar.';
      $.fv.classList.add('on'); $.name.classList.remove('on');
      fvHouseSync(); fvHouseLoad(false); fvAmiSync(m.name); fvCallSync();
      if (has) { { const st = $.gl.style; st.left = st.top = '0px'; st.width = st.height = '100%'; GLB = { x: 0, y: 0, w: 0, h: 0, full: true }; } $.fvstage.appendChild($.gl); STG.setFrame('corps'); STG.setLook(a.look || a.tenue).then(() => { if (!dead && friendOn === m && STG) STG.gesture('wave'); }); STG.face(); }
      requestAnimationFrame(() => { if (!dead) { placeStage(); activeSync(); } });
      tone(523, 784);
    }
    function closeFriend() {
      if (!friendOn) return;
      closeHouse();
      friendOn = null; $.fv.classList.remove('on');
      if (!stgFail && $.gl.parentNode !== $.hero) $.hero.insertBefore($.gl, $.wait);
      if (STG && D) { STG.setLook(D); if (STG.ready() && !editing) $.name.classList.add('on'); }
      lastNX = -1; requestAnimationFrame(() => { if (!dead) { placeStage(); activeSync(); } });
    }
    on($.fv, 'click', (e) => {
      const h = e.target.closest('[data-h]');
      if (h && h.dataset.h === 'fvcall1') { if (friendOn) callOut(friendOn); return; }
      if (h && h.dataset.h === 'clok') { callAnswer(); return; }
      if (h && h.dataset.h === 'clno') { callDecline(); return; }
      if (h && h.dataset.h === 'clend') { callHang(); return; }
      if (h && h.dataset.h === 'clmute') { callMute(); return; }
      if (h && h.dataset.h === 'clcam') { callCam(); return; }
      if (h && h.dataset.h === 'clflip') { callFlip(); return; }
      if (h && h.dataset.h === 'fvx') { closeFriend(); return; }
      if (h && h.dataset.h === 'fvlivre') { const n = friendOn && friendOn.name; if (n && LIVRE && LIVRE.ouvrir) LIVRE.ouvrir(n); return; }   // par-dessus la fiche ; la fermer y ramène
      if (h && h.dataset.h === 'fvsms') { const n = friendOn && friendOn.name; if (n) { openThread('p:' + n); tone(560, 840); } return; }
      if (h && h.dataset.h === 'fvhouse') {
        const m = friendOn, k = h.dataset.k || 'soon';
        if (m && k === 'see') { openHouse(m); tone(660, 880); return; }
        if (m && k === 'retry') {
          h.disabled = true;
          loadMaisons(true).then((ok) => {
            if (dead || friendOn !== m) return; fvHouseSync();
            const x = HM.rows.get(m.name);
            if (ok && x && x.P.length) openHouse(m); else if (!ok && hmOk()) toast(HM.st === 'offline' ? '🏡 Pas de réseau : réessaie dans un moment' : '🏡 Sa maison ne s\'affiche pas pour l\'instant : réessaie dans un moment');
          });
          return;
        }
        if (k !== 'soon') return;
        toast('🏡 Bientôt : visite la maison de ' + (m ? m.display : 'ton copain') + ' dans Pégase'); tone(660, 880); return;
      }
      const b = e.target.closest('.pgh-emo'); if (b && STG && STG.ready()) { STG.gesture(b.dataset.emo); tone(740, 1180); }
    });
    // ---------- APPELS (hub 2.15, 22 oct. ; 23 oct. : la caméra, demande de l'utilisateur : « on peut appeler n'importe qui sur la borne à tout
    // moment, même s'il n'est jamais allé sur Pégase, et ils nous voient normal depuis la borne et en avatar depuis Pégase, et vice versa ») ----------
    // Signalisation = le serveur (pg_appel_*, ~/jdv-tools/pegase/server/APPELS-CONTRAT.md) : signal { t: 'appel' } SANS contenu sur le canal
    // privé des messages (api.pegase.onAppel) → relire pg_appel_attente (sinon toutes les 15 s ; 2 s pendant que ça sonne ; 15 s en ligne, ce qui
    // dit au serveur qu'on est toujours là). Hub fermé : c'est la BORNE qui sonne (bandeau « X t'appelle », shell2.js) ; Décrocher ouvre le hub,
    // qui prend l'appel (api.pegase.appelPris() → callTake). Voix + image = LiveKit : salle privée « pegase-appel-<id> », jeton par
    // api.pegase.voixAppel(id) (pegase-voix v3 : micro + caméra), client = copie locale de la borne (api.pegase.livekit()). Même salle que le jeu.
    // Écran : la fiche du copain en plein écran (classe call). L'autre est sur la borne → SA CAMÉRA plein cadre (classe vid) ; il est dans
    // Pégase (pas de vidéo) → SON avatar en gros plan, sa bouche suit SA voix (levres.js). Dans le coin : MA caméra (classe cam ; c'est ce
    // qu'il voit), sinon (refusée, absente, coupée par 📷) MON avatar (STG.setPip), sa bouche suit mon micro (le flux du 🎤 s'il est ouvert).
    const callOk = () => { if (CALL.off404 || !memberMode()) return false; try { return !!(PG && typeof PG.has === 'function' && PG.has('pg_appel_lancer') && typeof PG.voixAppel === 'function' && typeof PG.livekit === 'function'); } catch (e) { return false; } };
    const callNewId = () => { const a = new Uint8Array(10); crypto.getRandomValues(a); return 'c' + Array.from(a, (b) => b.toString(16).padStart(2, '0')).join(''); };
    const callName = (n) => { const m = FR.list.find((x) => x.name === n); return m ? m.display : String(n || ''); };
    function lkLoad() { try { return PG.livekit(); } catch (e) { return Promise.reject(e); } }   // copie locale de la borne, chargée une fois
    function fvCallSync() { const ok = callOk() && !!friendOn && !CALL.c; $.fvcall1.hidden = !ok; $.fvbtns.classList.toggle('three', ok); }
    // la voix → la bouche (même analyse que le 🎤, sans les expressions ni les mots) ; muet = bouche fermée
    function voiceNew(an, sr) { return { an, td: new Float32Array(an.fftSize), lip: PGM ? PGM.createLipSync(sr) : null, mouth: PGM ? PGM.createMouth() : null, floor: 0.004, pkr: 0.03, env: 0, slow: 0, w: 0, quiet: 9, lv: 0, off: false }; }
    function voiceTalk(V, dt) {
      if (!V || !V.an || !V.lip) return null;
      V.an.getFloatTimeDomainData(V.td); if (V.off) V.td.fill(0);
      let q = 0; for (let i = 0; i < V.td.length; i++) q += V.td[i] * V.td[i];
      const rms = Math.sqrt(q / V.td.length);
      V.floor = rms < V.floor ? V.floor * 0.85 + rms * 0.15 : V.floor * 0.9995 + rms * 0.0005;
      V.pkr = Math.max(rms, V.pkr * Math.exp(-dt / 2.5), 0.012);
      const L = Math.pow(Math.min(1, Math.max(0, rms - V.floor * 1.6) / Math.max(0.008, V.pkr * 0.8 - V.floor * 1.6)), 0.7);
      V.env += (L - V.env) * (L > V.env ? 1 - Math.exp(-dt / 0.03) : 1 - Math.exp(-dt / 0.1)); V.slow += (V.env - V.slow) * (1 - Math.exp(-dt / 0.45)); V.lv = V.env;
      const mo = V.mouth.step(dt, V.lip.analyze(V.td, dt, 0));
      V.quiet = V.env > 0.06 ? 0 : V.quiet + dt;
      V.w += ((V.quiet < 0.5 ? 1 : 0.3) - V.w) * (1 - Math.exp(-dt / (V.quiet < 0.5 ? 0.08 : 0.35)));
      return { w: V.w, v: mo, asym: V.mouth.asym, nod: (V.env - V.slow) * 0.11, tilt: Math.sin(performance.now() / 1300) * 0.04 * V.w };
    }
    // le micro ET la caméra de l'appel (dans le toucher Appeler / Décrocher) : UNE question du navigateur pour les deux ; sans caméra
    // (refusée, absente, occupée) l'appel part quand même, avec mon avatar ; le micro = le flux du 🎤 s'il est ouvert (jamais deux captures)
    const CAM_V = { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } };
    async function callMedia(c) {
      const AC = window.AudioContext || window.webkitAudioContext; c.ctx = new AC();
      try { if (c.ctx.state === 'suspended') await c.ctx.resume(); } catch (e) { /* rien */ }
      const md = navigator.mediaDevices; if (!md || !md.getUserMedia) throw new Error('pas de micro');
      if (MIC.on && MIC.stream && MIC.an) {
        c.stream = MIC.stream; c.own = false; c.mv = voiceNew(MIC.an, MIC.ctx.sampleRate); wordsStop();
        try { c.cam = await md.getUserMedia({ video: CAM_V }); } catch (e) { c.cam = null; }
      } else {
        const AUD = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
        let st = null;
        try { st = await md.getUserMedia({ audio: AUD, video: CAM_V }); } catch (e) { st = null; }
        if (!st) st = await md.getUserMedia({ audio: AUD });   // sans caméra : la voix et l'avatar
        const v = st.getVideoTracks();
        c.stream = new MediaStream(st.getAudioTracks()); c.own = true; c.cam = v.length ? new MediaStream(v) : null;
        const src = c.ctx.createMediaStreamSource(c.stream), an = c.ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0.3; src.connect(an); c.mv = voiceNew(an, c.ctx.sampleRate);
      }
      if (c.end) { callCamStop(c); if (c.own && c.stream) c.stream.getTracks().forEach((t) => t.stop()); return; }
      c.facing = 'user';
      if (c.cam) { try { c.cams = (await md.enumerateDevices()).filter((d) => d.kind === 'videoinput').length; } catch (e) { c.cams = 1; } }
      callCamSync(c);
    }
    // le coin « Moi » : ma caméra (ce que l'autre voit) ou mon avatar
    function callCamSync(c) {
      const on = !!(c && c.cam && !c.camOff && !c.end);
      $.fv.classList.toggle('cam', on); $.fv.classList.toggle('back', !!(c && c.facing === 'environment'));
      if (on) { if ($.clme.srcObject !== c.cam) $.clme.srcObject = c.cam; const p = $.clme.play && $.clme.play(); if (p && p.catch) p.catch(() => {}); }
      if (STG && !stgFail && c && !c.end) {
        if (on) { if (c.pipAv) { STG.setPip(null); c.pipAv = false; } }
        else if (D != null && !c.pipAv) { c.pipAv = true; STG.setPip(D, null).then(() => { if (!dead) pipPlace(); }); STG.setPipTalk((dt) => (c.mv ? voiceTalk(c.mv, dt) : null)); }
      }
      callUi(); activeSync();
    }
    function callCamStop(c) {
      if (c.cam) { try { c.cam.getTracks().forEach((t) => t.stop()); } catch (e) { /* rien */ } }
      c.cam = null; try { $.clme.srcObject = null; } catch (e) { /* rien */ }
    }
    // l'image de l'autre (il est sur la borne) : plein cadre ; coupée (📷) ou absente (il est dans Pégase) : son avatar, ou sa tête
    function callVideo(c, track) {
      if (c.end) return;
      c.rvid = track; c.rvidOff = false;
      try { track.attach($.clvid); const p = $.clvid.play && $.clvid.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* rien */ }
      callVidSync(c);
    }
    function callVidSync(c) {
      const on = !!(c && c.rvid && !c.rvidOff && !c.end);
      $.fv.classList.toggle('vid', on);
      const a = c && FR.av.get(c.peer);
      if (STG && STG.A && c && c.ui) STG.A.group.visible = !on && !!(a && a.tenue >= 0);
      activeSync();
    }
    // l'écran d'appel : la fiche du copain en plein écran ; son avatar en grand (gros plan « parle »), le mien dans le coin
    function callScreen(c) {
      const m = FR.list.find((x) => x.name === c.peer) || { name: c.peer, display: c.peerD || c.peer, online: true, seen: 0, photo: null };
      $.fv.classList.remove('vid', 'cam');
      closeHouse(); if (SMS.th) closeThread(); if (BUY) closeBuy(); if (editing) cancelEdit();
      c.fromFv = !!(friendOn && friendOn.name === m.name);
      if (!c.fromFv) { if (friendOn) closeFriend(); openFriendM(m); }
      c.ui = true; $.fv.classList.add('call'); $.clname.textContent = m.display;
      if (STG && !stgFail) {
        const a = FR.av.get(m.name), has = !!(a && a.tenue >= 0);
        if ($.gl.parentNode !== $.fvstage) { const st = $.gl.style; st.left = st.top = '0px'; st.width = st.height = '100%'; GLB = { x: 0, y: 0, w: 0, h: 0, full: true }; $.fvstage.appendChild($.gl); c.movedGl = true; }
        if (STG.A) STG.A.group.visible = has;
        STG.setFrame('selfie'); STG.setHome(true); STG.face();
        STG.setPipTalk((dt) => (c.mv ? voiceTalk(c.mv, dt) : null));
        if (D != null) { c.pipAv = true; STG.setPip(D, null).then(() => { if (!dead) pipPlace(); }); }
      }
      requestAnimationFrame(() => { if (!dead) { placeStage(); pipPlace(); activeSync(); } });
      callUi(); fvCallSync();
    }
    function pipPlace() {
      const c = CALL.c; if (!STG || !c || !c.ui || $.gl.parentNode !== $.fvstage) return;
      const g = $.gl.getBoundingClientRect(), p = $.clpip.getBoundingClientRect();
      STG.pipRect(p.width ? { x: p.left - g.left, y: p.top - g.top, w: p.width, h: p.height } : null);
    }
    function callUi() {
      const c = CALL.c; if (!c || !c.ui) return;
      const s = c.end ? 'end' : c.dir === 'in' && !c.answered ? 'in' : c.st === 'live' ? 'live' : 'out';
      $.fvcall.dataset.s = s;
      let t;
      if (c.end) t = c.end;
      else if (s === 'in') t = 't\'appelle !';
      else if (s === 'live') { const sec = Math.max(0, Math.floor((Date.now() - c.t0) / 1000)); t = 'En ligne · ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
      else t = c.st === 'sonne' ? 'Ça sonne…' : c.st === 'decroche' ? 'Connexion…' : 'Appel en cours…';
      $.clst.textContent = t;
      $.clmute.classList.toggle('on', !!c.muted); $.clmute.firstChild.textContent = c.muted ? '🔇' : '🎙️'; $.clmute.lastChild.textContent = c.muted ? 'Micro coupé' : 'Micro';
      $.clcam.hidden = !c.cam; $.clcam.classList.toggle('on', !!c.camOff); $.clcam.lastChild.textContent = c.camOff ? 'Caméra coupée' : 'Caméra';
      $.clflip.hidden = !(c.cam && c.cams > 1 && !c.camOff); $.clflip.lastChild.textContent = c.facing === 'environment' ? 'Selfie' : 'Retourner';
      $.clcam.setAttribute('aria-label', c.camOff ? 'Remettre la caméra' : 'Couper la caméra');
    }
    function callRing(on, kind) {
      if (CALL.ringT) { clearInterval(CALL.ringT); ivals.delete(CALL.ringT); CALL.ringT = 0; }
      if (!on) return;
      const f = () => { if (kind === 'in') { tone(784, 988); later(() => tone(988, 1175), 230); try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (e) { /* rien */ } } else tone(440, 440); };
      f(); CALL.ringT = every(f, kind === 'in' ? 1800 : 2600);
    }
    function callPollSoon(ms) { clearTimeout(CALL.pt); CALL.pt = later(callPoll, ms || 0); }
    async function callPoll() {
      if (!callOk() || CALL.polling) return;
      CALL.polling = true; CALL.at = Date.now();
      let r = null;
      try { r = await PG.rpc('pg_appel_attente', {}); }
      catch (e) { if (e && (e.status === 404 || /Could not find the function|PGRST202|fonction refus/.test(String(e.message || e)))) { CALL.off404 = true; fvCallSync(); } }
      finally { CALL.polling = false; }
      if (dead || !r) return;
      const me = pgInfo().name, L = Array.isArray(r.appels) ? r.appels : [];
      for (const a of L) if (a && /^c[0-9a-f]{20}$/.test(String(a.id))) callSeen(a, me);
    }
    function callSeen(a, me) {
      const prev = CALL.seen.get(a.id); CALL.seen.set(a.id, a.etat);
      const c = CALL.c;
      if (c && c.id === a.id) {
        if (c.end) return;
        const nm = callName(c.dir === 'out' ? a.a : a.de);
        if (a.etat === 'sonne' && c.dir === 'out' && c.st === 'appel') { c.st = 'sonne'; callUi(); }
        else if (a.etat === 'decroche' && c.st !== 'live' && !c.joining) { if (c.dir === 'out') { c.answered = true; callRing(false); callJoin(c); } else if (!c.answered) callEnd('Décroché sur un autre appareil'); }
        else if (a.etat === 'refuse') callEnd(nm + ' ne peut pas répondre');
        else if (a.etat === 'occupe') callEnd(nm + ' est déjà en ligne');
        else if (a.etat === 'manque') callEnd(c.dir === 'out' ? nm + ' ne répond pas' : 'Appel manqué', c.dir === 'in' && !c.answered);
        else if (a.etat === 'annule') callEnd(c.dir === 'in' ? 'Appel manqué' : 'Appel annulé', c.dir === 'in' && !c.answered);
        else if (a.etat === 'fini') callEnd(a.par && a.par !== me ? nm + ' a raccroché' : 'Appel terminé');
        return;
      }
      if (prev || a.a !== me || (a.etat !== 'appel' && a.etat !== 'sonne')) return;   // déjà vu, pas pour moi, ou déjà fini
      if (c && !c.end) { PG.rpc('pg_appel_repondre', { p_id: a.id, p_oui: false, p_raison: 'occupe' }).catch(() => {}); return; }   // je suis déjà en ligne
      const n = CALL.c = { id: a.id, peer: a.de, peerD: callName(a.de), dir: 'in', st: 'sonne', started: Date.now() };
      PG.rpc('pg_appel_sonne', { p_id: a.id }).catch(() => {});
      callScreen(n); callRing(true, 'in');
    }
    async function callOut(m) {
      if (!callOk() || CALL.c) return;
      const c = CALL.c = { id: callNewId(), peer: m.name, peerD: m.display, dir: 'out', st: 'appel', started: Date.now() };
      callScreen(c);
      try { await callMedia(c); } catch (e) { callEnd(e && e.name === 'NotAllowedError' ? 'Micro refusé : autorise-le pour appeler' : 'Pas de micro sur cet appareil'); return; }
      if (c.end) return;
      lkLoad().catch(() => {});   // le client de la voix arrive pendant que ça sonne
      let r;
      try { r = await PG.rpc('pg_appel_lancer', { p_to: m.name, p_id: c.id, p_video: !!c.cam }); }
      catch (e) { callEnd(/pas copains/.test(String(e && e.message)) ? 'Vous n\'êtes plus dans la même salle' : e && e.offline ? 'Pas de réseau' : 'L\'appel n\'a pas pu partir'); return; }
      if (c.end) return;
      if (!r || r.ok === false) { callEnd(r && r.raison === 'occupe' ? m.display + ' est déjà en ligne' : 'L\'appel n\'a pas pu partir'); return; }
      c.launched = true; CALL.seen.set(c.id, 'appel'); callRing(true, 'out'); callUi(); callPollSoon(1200);
    }
    async function callAnswer() {
      const c = CALL.c; if (!c || c.dir !== 'in' || c.answered || c.end) return;
      c.answered = true; callRing(false); c.st = 'decroche'; callUi();
      try { await callMedia(c); } catch (e) { PG.rpc('pg_appel_repondre', { p_id: c.id, p_oui: false, p_raison: 'refuse' }).catch(() => {}); callEnd('Micro refusé : autorise-le pour répondre'); return; }
      if (c.end) return;
      lkLoad().catch(() => {});
      let r; try { r = await PG.rpc('pg_appel_repondre', { p_id: c.id, p_oui: true }); } catch (e) { callEnd('L\'appel est perdu'); return; }
      if (c.end) return;
      if (r && r.etat && r.etat !== 'decroche') { callEnd('Appel manqué'); return; }
      c.launched = true; callJoin(c);
    }
    function callDecline() { const c = CALL.c; if (!c || c.end) return; PG.rpc('pg_appel_repondre', { p_id: c.id, p_oui: false, p_raison: 'refuse' }).catch(() => {}); callEnd('Appel refusé'); }
    function callHang() { const c = CALL.c; if (!c || c.end) return; if (c.launched) PG.rpc('pg_appel_fin', { p_id: c.id }).catch(() => {}); callEnd(c.st === 'live' ? 'Appel terminé' : 'Appel annulé'); }
    function callMute() {
      const c = CALL.c; if (!c || c.end) return; c.muted = !c.muted; if (c.mv) c.mv.off = c.muted;
      try { const t = c.pub && c.pub.track; if (t) { if (c.muted) t.mute(); else t.unmute(); } else if (c.stream) c.stream.getAudioTracks().forEach((x) => { x.enabled = !c.muted; }); } catch (e) { /* rien */ }
      callUi(); tone(c.muted ? 392 : 660, c.muted ? 330 : 880);
    }
    // 🔄 (téléphone, 2 caméras) : la caméra de DERRIÈRE pour montrer ce qu'il y a devant moi, puis retour au selfie (demande de l'utilisateur :
    // « comme s'ils font un selfie, en pouvant tourner l'écran pour montrer devant »). Une seule caméra ouverte à la fois (beaucoup de
    // téléphones n'en ouvrent pas deux) : l'ancienne est fermée d'abord ; ratée → on rouvre l'ancienne
    async function callFlip() {
      const c = CALL.c; if (!c || c.end || !c.cam || c.flipping) return;
      c.flipping = true;
      const md = navigator.mediaDevices, was = c.facing === 'environment' ? 'environment' : 'user', face = was === 'user' ? 'environment' : 'user';
      const open = (f) => md.getUserMedia({ video: Object.assign({}, CAM_V, { facingMode: { exact: f } }) }).then((st) => st.getVideoTracks()[0]);
      try { c.cam.getTracks().forEach((t) => t.stop()); } catch (e) { /* rien */ }
      let nt = null, f = face;
      try { nt = await open(face); } catch (e) { nt = null; }
      if (!nt) { f = was; try { nt = await open(was); } catch (e) { nt = null; } toast("Pas d’autre caméra sur cet appareil"); }
      try {
        if (c.end || !nt) { if (nt) nt.stop(); if (!c.end) { callCamStop(c); callCamSync(c); } return; }
        if (c.vpub && c.vpub.track && typeof c.vpub.track.replaceTrack === 'function') await c.vpub.track.replaceTrack(nt);
        c.cam = new MediaStream([nt]); c.facing = f; $.clme.srcObject = null;
        callCamSync(c); if (f !== was) tone(660, 990);
      } catch (e) { /* rien */ } finally { c.flipping = false; }
    }
    function callCam() {   // 📷 : je coupe / remets ma caméra (l'autre voit alors mon avatar, ou ma tête)
      const c = CALL.c; if (!c || c.end || !c.cam) return; c.camOff = !c.camOff;
      try { const t = c.vpub && c.vpub.track; if (t) { if (c.camOff) t.mute(); else t.unmute(); } else c.cam.getVideoTracks().forEach((x) => { x.enabled = !c.camOff; }); } catch (e) { /* rien */ }
      callCamSync(c); tone(c.camOff ? 392 : 660, c.camOff ? 330 : 880);
    }
    // décroché : la salle de l'appel (LiveKit) ; ma voix = la piste du micro de l'appel, mon image = ma caméra (borne) ; sa voix → haut-parleur
    // + la bouche de son avatar ; son image (il est sur la borne) → plein cadre
    async function callJoin(c) {
      if (c.joining || c.room || c.end) return;
      c.joining = true; c.st = 'decroche'; callUi();
      try {
        const [LK, tok] = await Promise.all([lkLoad(), PG.voixAppel(c.id)]);
        if (CALL.c !== c || c.end) return;
        const room = c.room = new LK.Room({ adaptiveStream: false, dynacast: false });
        room.on(LK.RoomEvent.TrackSubscribed, (track) => { if (track && track.kind === 'audio') callRemote(c, track); else if (track && track.kind === 'video') callVideo(c, track); });
        room.on(LK.RoomEvent.TrackUnsubscribed, (track) => { if (track && track === c.rvid) { try { track.detach($.clvid); } catch (e) { /* rien */ } c.rvid = null; callVidSync(c); } });
        room.on(LK.RoomEvent.TrackMuted, (pub, who) => { if (pub && pub.kind === 'video' && who !== room.localParticipant) { c.rvidOff = true; callVidSync(c); } });
        room.on(LK.RoomEvent.TrackUnmuted, (pub, who) => { if (pub && pub.kind === 'video' && who !== room.localParticipant) { c.rvidOff = false; callVidSync(c); } });
        room.on(LK.RoomEvent.Disconnected, () => { if (CALL.c === c && !c.end) callEnd('La liaison est coupée'); });
        room.on(LK.RoomEvent.ParticipantDisconnected, () => { if (CALL.c === c && !c.end) callPollSoon(300); });
        await Promise.race([room.connect(tok.url, tok.token, { autoSubscribe: true }), new Promise((ok, ko) => setTimeout(() => ko(new Error('trop long')), 20000))]);
        if (CALL.c !== c || c.end) { try { room.disconnect(); } catch (e) { /* rien */ } return; }
        const tr = c.stream && c.stream.getAudioTracks()[0];
        if (tr) c.pub = await room.localParticipant.publishTrack(tr, { source: LK.Track.Source.Microphone, name: 'micro' });
        if (c.muted && c.pub && c.pub.track) c.pub.track.mute();
        const vt = c.cam && c.cam.getVideoTracks()[0];   // ma caméra : refusée par le serveur (ancien jeton) → l'appel continue avec mon avatar
        if (vt) {
          try { c.vpub = await room.localParticipant.publishTrack(vt, { source: LK.Track.Source.Camera, name: 'camera', simulcast: false, videoEncoding: { maxBitrate: 700000, maxFramerate: 24 } }); if (c.camOff && c.vpub && c.vpub.track) c.vpub.track.mute(); }
          catch (e) { if (!c.end) { callCamStop(c); callCamSync(c); } }
        }
        for (const p of room.remoteParticipants.values()) for (const pub of p.trackPublications.values()) if (pub.track && pub.kind === 'audio') callRemote(c, pub.track); else if (pub.track && pub.kind === 'video' && !c.rvid) callVideo(c, pub.track);
      } catch (e) {
        if (CALL.c === c && !c.end) { if (c.launched) PG.rpc('pg_appel_fin', { p_id: c.id }).catch(() => {}); callEnd('La voix n\'a pas pu se connecter'); }
      } finally { c.joining = false; }
    }
    function callRemote(c, track) {
      if (c.remote || c.end) return; c.remote = track;
      try { const el = track.attach(); el.autoplay = true; el.style.display = 'none'; document.body.appendChild(el); c.el = el; const pr = el.play && el.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* rien */ }
      try { const src = c.ctx.createMediaStreamSource(new MediaStream([track.mediaStreamTrack])), an = c.ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0.3; src.connect(an); c.rv = voiceNew(an, c.ctx.sampleRate); } catch (e) { c.rv = null; }
      if (STG && c.rv) STG.setTalk((dt) => voiceTalk(c.rv, dt));
      c.st = 'live'; c.t0 = Date.now(); callUi(); tone(880, 1320);
    }
    function callEnd(text, missed) {
      const c = CALL.c; if (!c || c.end) return;
      c.end = text || 'Appel terminé'; callRing(false);
      try { if (c.room) c.room.disconnect(); } catch (e) { /* rien */ }
      try { if (c.el) { if (c.remote && c.remote.detach) c.remote.detach(c.el); c.el.remove(); } } catch (e) { /* rien */ }
      try { if (c.rvid && c.rvid.detach) c.rvid.detach($.clvid); $.clvid.srcObject = null; } catch (e) { /* rien */ }
      c.rvid = null; callCamStop(c); $.fv.classList.remove('vid', 'cam');
      if (c.own && c.stream) { try { c.stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* rien */ } }
      try { if (c.ctx) c.ctx.close(); } catch (e) { /* rien */ }
      if (STG) { STG.setTalk(null); STG.setPipTalk(null); STG.setPip(null); }
      if (missed) toast('📞 Appel manqué de ' + (c.peerD || c.peer));
      if (!dead) { tone(523, 392); callUi(); later(() => callClose(c), missed ? 1500 : 2200); }
    }
    function callClose(c) {
      if (CALL.c !== c) return; CALL.c = null;
      $.fv.classList.remove('call', 'vid', 'cam'); $.fvcall.dataset.s = '';
      if (STG && STG.A) STG.A.group.visible = true;
      if (friendOn) {
        if (!c.fromFv) closeFriend();
        else {
          const a = FR.av.get(friendOn.name), has = !!(a && a.tenue >= 0);
          if (c.movedGl && !has && !stgFail) $.hero.insertBefore($.gl, $.wait);   // copain sans avatar : la scène retourne en haut de page
          if (STG) { STG.setFrame('corps'); STG.setHome(false); }
          requestAnimationFrame(() => { if (!dead) { placeStage(); activeSync(); } });
        }
      }
      if (MIC.on && STG && !friendOn) { STG.setTalk(micTalk); wordsStart(); }   // le 🎤 était ouvert avant l'appel
      fvCallSync();
    }
    function callDestroy() {   // on quitte le hub en plein appel : raccrocher (ou laisser sonner = « manqué ») et tout fermer
      const c = CALL.c; if (CALL.off) { try { CALL.off(); } catch (e) { /* rien */ } CALL.off = null; }
      if (!c || c.end) return;
      if (c.dir === 'in' && !c.answered) PG.rpc('pg_appel_repondre', { p_id: c.id, p_oui: false, p_raison: 'manque' }).catch(() => {});
      else if (c.launched) PG.rpc('pg_appel_fin', { p_id: c.id }).catch(() => {});
      callEnd('Appel terminé');
    }
    // l'appel décroché sur le BANDEAU de la borne (hub fermé à ce moment-là) : la borne vient d'ouvrir le hub, qui le prend en main tout de
    // suite (son avatar s'il joue à Pégase : la liste des avatars de la salle et la scène 3D, 4 s au plus chacune)
    async function callTake() {
      let t = null; try { t = PG && typeof PG.appelPris === 'function' ? PG.appelPris() : null; } catch (e) { t = null; }
      if (!t || !/^c[0-9a-f]{20}$/.test(String(t.id)) || CALL.c || !callOk()) return;
      CALL.seen.set(t.id, 'sonne');
      const c = CALL.c = { id: t.id, peer: String(t.de || ''), peerD: String(t.de || ''), dir: 'in', st: 'sonne', started: Date.now(), taken: true };
      try { await Promise.race([loadAvatars(true), new Promise((ok) => setTimeout(ok, 4000))]); } catch (e) { /* rien */ }
      for (let i = 0; i < 16 && !dead && !stgFail && !(STG && STG.ready()); i++) await new Promise((ok) => setTimeout(ok, 250));
      if (dead || CALL.c !== c || c.end) return;
      c.peerD = callName(c.peer); callScreen(c); callAnswer();
    }
    if (PG && typeof PG.onAppel === 'function') { try { CALL.off = PG.onAppel(() => callPollSoon(150)); } catch (e) { CALL.off = null; } }
    every(() => {
      if (document.hidden || dead) return;
      const c = CALL.c;
      if (c && c.ui && c.st === 'live' && !c.end) callUi();   // le compteur « En ligne · 0:42 »
      const per = c && !c.end ? (c.st === 'live' ? 15000 : 2000) : 15000;
      if (Date.now() - CALL.at >= per - 300) callPoll();
    }, 1000);
    later(() => { callTake(); callPoll(); }, 700);
    if (window.JDW_PG_TEST) window.__pgCALL = CALL;

    // présence : la borne la connaît déjà (direct) ; on relit la liste quand l'onglet Amis se voit
    every(() => { if (!document.hidden && tab === 'amis' && !editing) renderFriends(); }, 5000);
    every(() => { if (!document.hidden && tab === 'amis') loadAvatars(); }, 90000);
    every(() => { if (!document.hidden && tab === 'moi' && !BUY) loadWallet(); }, 120000);

    // ---------- MESSAGES (19 oct.) : les SMS du téléphone de l'avatar, lus et écrits ici aussi (serveur : sms.sql) ----------
    // pg_sms_list (conversations, non-lus) / pg_sms_thread (fil, pages de 30) / pg_sms_send (id fabriqué ici : un renvoi ne fait jamais de
    // doublon) / pg_sms_read (lu → l'autre voit « Lu »). Direct : api.pegase.onSms (canal privé du pseudo, signal sans contenu) → relecture ;
    // sans lui (ancienne borne) : relecture toutes les 15 s quand l'onglet Amis ou une conversation est à l'écran, 60 s sinon.
    // Messages pas encore partis (réseau coupé) : gardés sur l'appareil (jdw.pegase.sms.<PSEUDO>) et renvoyés au retour du réseau.
    // Borne sans les fonctions SMS (pegase.rpc « fonction refusée ») : la carte reste cachée.
    const SMS = { st: 'idle', list: [], unread: 0, at: 0, busy: false, again: false, sig: '', th: null, off: null, pend: [], pendKey: '', lastPoke: 0 };
    const PNJ_FACE = { maire: '👴', concours: '🏆', pegase: '✨' };
    // RÉACTIONS (20 oct., serveur : sms-reactions.sql) : une par personne et par message, liste FERMÉE de 6. Le hub ne propose de réagir que
    // si (1) la borne laisse passer pg_sms_react (api.pegase.has, patch shell2.js) et (2) le fil du serveur rend la colonne r_react (SQL
    // appliqué). Sinon : rien ne change (pas de barre, pas d'erreur). Réaction choisie = affichée tout de suite (en attente), annulée si refusée.
    const RX_SET = ['❤️', '👍', '😂', '😮', '😢', '👎'];
    const RX_NAMES = { '❤️': 'J\'adore', '👍': 'J\'aime', '😂': 'Trop drôle', '😮': 'Waouh', '😢': 'Triste', '👎': 'Bof' };
    const rxNorm = (e) => { const x = String(e == null ? '' : e).replace(/\uFE0F/g, ''); return x === '❤' ? '❤️' : x; };
    const rxOf = (a) => Array.isArray(a) ? a.filter((x) => x && typeof x.w === 'string' && RX_SET.includes(rxNorm(x.e))).map((x) => ({ w: x.w, e: rxNorm(x.e) })) : [];
    const RXS = { open: false, id: '', b: null, at: 0, how: '', seen: new Set(), anim: false };
    SMS.rxWant = new Map();
    SMS.rxRpc = PG && typeof PG.has === 'function' ? (() => { try { return !!PG.has('pg_sms_react'); } catch (e) { return false; } })() : null;   // null : borne qui ne le dit pas → on essaie
    const RXB = '<button class="pgh-rxb" type="button" data-rxb tabindex="-1" data-pad-skip aria-label="Réagir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="12.5" r="7.5"/><path d="M7.4 14.6c1.7 1.9 4.5 1.9 6.2 0"/><circle cx="8" cy="10.6" r=".5" fill="currentColor"/><circle cx="13" cy="10.6" r=".5" fill="currentColor"/><path d="M20 2.8v4.6M17.7 5.1h4.6"/></svg></button>';
    const smsPendKey = () => { const i = pgInfo(); return i.name ? 'jdw.pegase.sms.' + i.name : ''; };
    function smsPendLoad() {
      const k = smsPendKey(); if (k === SMS.pendKey) return; SMS.pendKey = k; SMS.pend = [];
      if (!k) return; try { const a = JSON.parse(store.get(k) || '[]'); if (Array.isArray(a)) SMS.pend = a.filter((p) => p && typeof p.id === 'string' && typeof p.w === 'string' && typeof p.b === 'string').slice(-50); } catch (e) { /* rien */ }
    }
    const smsPendSave = () => { if (SMS.pendKey) store.set(SMS.pendKey, JSON.stringify(SMS.pend.filter((p) => p.st !== 'fail' || p.keep))); };
    const smsId = () => { const b = new Uint8Array(16); try { crypto.getRandomValues(b); } catch (e) { for (let i = 0; i < 16; i++) b[i] = Math.random() * 256 | 0; } return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(''); };
    function smsWho(w, title) {
      if (w.startsWith('pnj:')) return { name: title || w.slice(4), pnj: true, face: PNJ_FACE[w.slice(4)] || '💬' };
      const n = w.slice(2), m = members().find((x) => x.name === n);
      return { name: m ? m.display : n, pnj: false, photo: m && m.photo, online: !!(m && m.online), n };
    }
    const smsFace = (o) => o.pnj ? `<span class="pgh-sma pnj">${o.face}</span>` : `<span class="pgh-sma${o.online ? ' on' : ''}" style="--h:${hue(o.n)}">${o.photo ? `<img alt="" src="${esc(o.photo)}">` : esc((o.name[0] || '?').toUpperCase())}</span>`;
    function smsWhen(t, long) {
      const d = new Date(t); if (isNaN(d)) return '';
      const now = new Date(), day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(), dd = Math.round((day(now) - day(d)) / 86400000);
      const hm = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
      if (!long && Date.now() - d.getTime() < 60000) return 'à l\'instant';
      if (dd === 0) return long ? 'Aujourd\'hui' : hm;
      if (dd === 1) return 'Hier';
      if (dd < 7) return ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][d.getDay()].replace(/^./, (c) => long ? c.toUpperCase() : c) + (long ? ' ' + d.getDate() : '');
      return d.getDate() + '/' + String(d.getMonth() + 1).padStart(2, '0');
    }
    const smsErr = (e) => { const m = String((e && e.message) || ''); return /pas copains/.test(m) ? 'Vous n\'êtes plus dans la même salle.' : /trop de messages|trop d essais/.test(m) ? 'Doucement : attends quelques secondes.'
      : /trop long/.test(m) ? 'Message trop long (500 caractères au plus).' : /vide/.test(m) ? 'Message vide.' : /destinataire inconnu/.test(m) ? 'Ce joueur n\'existe plus.' : /pas de reponse/.test(m) ? 'On ne peut pas répondre ici.' : e && e.offline ? 'Pas de réseau.' : 'Pas envoyé.'; };
    const smsFinal = (e) => /pas copains|trop long|vide|destinataire inconnu|pas de reponse|pas a soi|id deja pris|id invalide|compte requis|photo pas encore/.test(String((e && e.message) || ''));
    async function loadSms(force) {
      if (!memberMode()) { SMS.st = 'guest'; renderSms(); return; }
      if (SMS.st === 'off') return;
      if (SMS.busy) { SMS.again = true; return; }
      if (!force && Date.now() - SMS.at < 4000) return;
      SMS.busy = true; SMS.at = Date.now(); smsPendLoad();
      try {
        const rows = await PG.rpc('pg_sms_list', {}); if (dead) return;
        SMS.list = (rows || []).map((r) => ({ w: String(r.r_with || ''), title: r.r_title || '', kind: r.r_kind || 'joueur', room: r.r_room || '', can: !!r.r_can, last: r.r_last_body || '', mine: !!r.r_last_mine,
          photo: !!r.r_last_photo, at: r.r_last_at, state: r.r_last_state || '', unread: r.r_unread | 0 })).filter((c) => /^(p|pnj):/.test(c.w));
        SMS.unread = SMS.list.reduce((s, c) => s + c.unread, 0); SMS.st = 'ok';
      } catch (e) {
        if (dead) return;
        SMS.st = /fonction refus/.test(String(e && e.message)) ? 'off' : e && e.guest ? 'guest' : e && e.offline ? 'offline' : SMS.list.length ? 'ok' : 'err';
      } finally { SMS.busy = false; }
      renderSms();
      if (SMS.th) { thSub(); if (!SMS.th.loading && Date.now() - (SMS.th.at || 0) > 1500) loadThread(false); }
      smsFlush();
      if (SMS.again) { SMS.again = false; later(() => loadSms(true), 50); }
    }
    function renderSms() {
      $.secsms.hidden = SMS.st === 'off' || !PG;
      $.smsbdg.textContent = SMS.unread > 9 ? '9+' : String(SMS.unread); $.smsbdg.classList.toggle('on', SMS.unread > 0);
      $.smsn.textContent = SMS.unread ? SMS.unread + ' non lu' + (SMS.unread > 1 ? 's' : '') : '';
      let html;
      if (SMS.st === 'guest') html = `<div class="pgh-smempty"><span class="em">💬</span><div><h3>Crée un compte pour écrire à tes copains</h3><p>Les SMS du téléphone de ton avatar arrivent aussi ici : tes copains, le maire, les résultats des concours…</p></div><button class="pgh-cta gold" data-s="acct">Créer mon compte</button></div>`;
      else if (SMS.st === 'idle' || (SMS.st === 'err' && !SMS.list.length) || (SMS.st === 'offline' && !SMS.list.length)) html = `<div class="pgh-smempty"><span class="em">💬</span><div><h3>${SMS.st === 'idle' ? 'Tes messages arrivent…' : 'Messages indisponibles'}</h3><p>${SMS.st === 'offline' ? 'Pas de réseau pour l\'instant : ils reviendront avec la connexion.' : SMS.st === 'err' ? 'Le serveur ne répond pas : on réessaie tout seul.' : 'Un instant.'}</p></div></div>`;
      else {
        const rows = SMS.list.map((c) => {
          const o = smsWho(c.w, c.title), pv = (c.mine ? 'Toi : ' : '') + (c.last || (c.photo ? '📷 Photo' : ''));
          return `<button class="pgh-smc${c.unread ? ' un' : ''}" data-w="${esc(c.w)}">${smsFace(o)}<span class="tx"><b>${esc(o.name)}${o.pnj ? `<em>${c.kind === 'concours' ? 'concours' : c.kind === 'systeme' ? 'Pégase' : 'habitant'}</em>` : ''}</b><span class="pv">${esc(pv)}</span></span><span class="rt"><small>${esc(smsWhen(c.at))}</small>${c.unread ? `<span class="n">${c.unread > 9 ? '9+' : c.unread}</span>` : ''}</span></button>`;
        }).join('');
        const have = new Set(SMS.list.map((c) => c.w)), ms = members().filter((m) => !m.me).sort((a, b) => (b.online - a.online) || a.display.localeCompare(b.display));
        const fresh = ms.filter((m) => !have.has('p:' + m.name)).slice(0, 12);
        const chips = fresh.length ? `<div class="pgh-smnew"><span>✏️ Écrire à</span>${fresh.map((m) => `<button data-w="p:${esc(m.name)}">${smsFace({ n: m.name, name: m.display, photo: m.photo, online: m.online })}${esc(m.display)}</button>`).join('')}</div>` : '';
        html = (rows || `<div class="pgh-smempty"><span class="em">✉️</span><div><h3>Pas encore de message</h3><p>${ms.length ? 'Écris à un copain : il le lira dans le téléphone de son avatar, ou ici sur la borne.' : 'Quand un copain ou un habitant de Pégase t\'écrira, ça arrivera ici.'}</p></div></div>`) + chips
          + (SMS.st === 'offline' ? '<p class="pgh-smwarn">Pas de réseau : les nouveaux messages arriveront avec la connexion.</p>' : '');
      }
      renderAmis();
      if (html === SMS.sig) return; SMS.sig = html;
      $.smbox.innerHTML = html;
    }
    on($.smbox, 'click', (e) => {
      if (e.target.closest('[data-s="acct"]')) { try { PG && PG.account && PG.account(); } catch (x) { /* rien */ } return; }
      const b = e.target.closest('[data-w]'); if (b) { openThread(b.dataset.w); tone(560, 840); }
    });
    // ---------- la conversation ----------
    function openThread(w) {
      if (!memberMode() || !/^(p|pnj):/.test(w)) return;
      if (friendOn) closeFriend();
      smsPendLoad();
      const c = SMS.list.find((x) => x.w === w);
      rxClose(false); RXS.seen.clear(); RXS.anim = false;
      SMS.th = { w, msgs: [], more: false, loading: false, first: true, err: '', rx: false };
      const o = smsWho(w, c && c.title);
      $.thav.outerHTML = smsFace(o).replace('class="pgh-sma', 'data-h="thav" class="pgh-sma'); $.thav = box.querySelector('[data-h="thav"]');
      $.thname.textContent = o.name;
      thSub();
      $.tht.value = store.get('jdw.pegase.smsd.' + w) || ''; thInput();
      $.thl.innerHTML = '<div class="pgh-thempty">…</div>';
      $.th.classList.add('on'); box.scrollTop = 0; thStick = true; thKb();   // la page (overflow caché) a pu glisser (clavier, scrollIntoView) : le panneau couvre tout
      if (!mobile) later(() => { try { $.tht.focus(); } catch (e) { /* rien */ } }, 120);
      loadThread(false);
    }
    function thSub() {
      const T = SMS.th; if (!T) return;
      const c = SMS.list.find((x) => x.w === T.w), o = smsWho(T.w, c && c.title);
      $.thsub.textContent = o.pnj ? (c && c.kind === 'concours' ? 'Les résultats des concours photo' : c && c.kind === 'systeme' ? 'Nouvelles de Pégase' : 'Habitant d\'Ailebrune') : o.online ? 'en ligne sur la borne' : (c && c.room ? 'Salle « ' + c.room + ' »' : 'Copain de Pégase');
      $.thsub.classList.toggle('on', !o.pnj && o.online);
      const can = !o.pnj && (c ? c.can : true);   // habitants : on leur répond dans le jeu (photos au maire…)
      $.thf.hidden = !can; $.thro.hidden = can;
      if (T.can !== undefined && T.can !== can) later(() => { if (SMS.th === T) renderThread('auto'); }, 0);   // réactions : bulles à jour (plus copains → plus de barre)
      T.can = can;
      $.thro.textContent = o.pnj ? (c && c.kind === 'habitant' ? 'Réponds-lui dans le jeu, avec le téléphone de ton avatar.' : 'On ne peut pas répondre à ces messages.') : 'Vous n\'êtes plus dans la même salle : tu peux relire vos messages, mais plus lui écrire.';
    }
    function closeThread() {
      if (!SMS.th) return;
      store.set('jdw.pegase.smsd.' + SMS.th.w, $.tht.value.slice(0, 500));
      rxClose(false);
      SMS.th = null; $.th.classList.remove('on'); try { $.tht.blur(); } catch (e) { /* rien */ }
      thKb();
      loadSms(true);
    }
    // ---------- clavier à l'écran (plainte du S21 : le clavier passait PAR-DESSUS la barre de saisie, le dernier message était coupé) ----------
    // La zone VRAIMENT visible (visualViewport, repli innerHeight) donne ce que le clavier cache en bas (--pgkb) et en haut (--pgkt) du
    // hub : le panneau de la conversation s'y tient, la barre de saisie colle au-dessus du clavier. Marche aussi quand rien ne rapetisse la
    // page (plein écran immersif de l'appli, Safari, plein écran de Chrome) ; quand la page rapetisse elle-même (appli : fitKeyboard,
    // Chrome : resizes-content), le décalage vaut 0 et seule la hauteur change. Le fil reste collé en bas s'il y était (ResizeObserver).
    const KBH = { t: -1, b: -1, cls: '' };
    let thStick = true;
    function thKb() {
      if (dead) return;
      const vv = window.visualViewport, open = !!SMS.th;
      let t = 0, b = 0;
      if (open) {
        const r = box.getBoundingClientRect();
        const ok = !vv || Math.abs((vv.scale || 1) - 1) < 0.05;   // zoom au doigt : on ne touche à rien
        if (ok) {
          const y0 = vv ? vv.offsetTop : 0, y1 = y0 + (vv ? vv.height : (window.innerHeight || r.bottom));
          t = Math.max(0, Math.round(y0 - r.top)); b = Math.max(0, Math.round(r.bottom - y1));
          if (t + b < 24) t = b = 0;                                // arrondis, barre d'adresse : rien
          if (t + b > r.height - 160) { t = 0; b = Math.max(0, Math.round(r.height - 160)); }   // garde au moins l'en-tête et la barre
        }
        // le navigateur (ou la borne : « champ ramené à l'écran ») a pu faire glisser les boîtes (overflow caché) : tout reste à sa place
        for (const el of [box, root, root.parentElement]) if (el && el.scrollTop) el.scrollTop = 0;
      }
      const vis = box.clientHeight - t - b, typing = open && document.activeElement === $.tht;
      const cls = (t + b > 0 || (typing && vis < box.clientHeight * 0.8) ? 'kb' : '') + (open && vis < 300 ? ' kbs' : '');
      if (t !== KBH.t || b !== KBH.b) { KBH.t = t; KBH.b = b; box.style.setProperty('--pgkt', t + 'px'); box.style.setProperty('--pgkb', b + 'px'); }
      if (cls !== KBH.cls) { KBH.cls = cls; $.th.classList.toggle('kb', /kb/.test(cls)); $.th.classList.toggle('kbs', /kbs/.test(cls)); }
      if (open && thStick) $.thl.scrollTop = $.thl.scrollHeight;
    }
    const thKbSoon = () => { thKb(); later(thKb, 120); later(thKb, 380); later(thKb, 800); };   // le clavier met un moment à monter
    if (window.visualViewport) { on(window.visualViewport, 'resize', thKb); on(window.visualViewport, 'scroll', thKb); }
    on(window, 'resize', thKb);
    on($.tht, 'focus', () => { thKbSoon(); });
    on($.tht, 'blur', () => { later(thKb, 120); later(thKb, 400); });
    // le fil reste en bas s'il y était (clavier qui monte, champ qui grandit, téléphone tourné) ; un défilement dû à un changement de
    // taille ne compte pas, seul celui du joueur
    const thBox = { w: -1, h: -1 };
    on($.thl, 'scroll', () => { const L = $.thl; if (L.clientWidth === thBox.w && L.clientHeight === thBox.h) thStick = L.scrollHeight - L.scrollTop - L.clientHeight < 40; }, { passive: true });
    let thRO = null;
    if (typeof ResizeObserver === 'function') {
      thRO = new ResizeObserver(() => { const L = $.thl; if (SMS.th && thStick) L.scrollTop = L.scrollHeight; thBox.w = L.clientWidth; thBox.h = L.clientHeight; });
      thRO.observe($.thl);
    }
    async function loadThread(older) {
      const T = SMS.th; if (!T || T.loading) return;
      T.loading = true;
      const before = older && T.msgs.length ? T.msgs[0].sid : null; if (!older) T.at = Date.now();
      try {
        const rows = await PG.rpc('pg_sms_thread', { p_with: T.w, p_before: before, p_limit: 30 }); if (dead || SMS.th !== T) return;
        const got = (rows || []).map((r) => ({ sid: r.r_sid, id: r.r_id, mine: !!r.r_mine, pnj: !!r.r_pnj, from: r.r_from, b: r.r_body || '', photo: !!r.r_photo, at: r.r_at, st: r.r_state || '', rx: rxOf(r.r_react), ph: r.r_photo || null, data: r.r_data && typeof r.r_data === 'object' ? r.r_data : null }));
        if (got.length) T.rx = Object.prototype.hasOwnProperty.call(rows[0], 'r_react');   // serveur avec les réactions (sms-reactions.sql)
        const by = new Map(T.msgs.map((m) => [m.sid, m])); for (const m of got) by.set(m.sid, m);
        T.msgs = [...by.values()].sort((a, b) => a.sid - b.sid);
        if (older || T.first) T.more = got.length >= 30;
        T.err = '';
        // ce qui est arrivé du serveur n'est plus « en attente »
        const ids = new Set(T.msgs.map((m) => m.id)); const n0 = SMS.pend.length; SMS.pend = SMS.pend.filter((p) => !ids.has(p.id)); if (SMS.pend.length !== n0) smsPendSave();
      } catch (e) { if (SMS.th === T) T.err = e && e.offline ? 'Pas de réseau.' : 'Le serveur ne répond pas.'; }
      finally { T.loading = false; }
      if (SMS.th !== T) return;
      renderThread(older ? 'keep' : T.first ? 'end' : 'auto');
      T.first = false;
      const last = T.msgs[T.msgs.length - 1], c = SMS.list.find((x) => x.w === T.w);
      if (!older && last && !last.mine && (!c || c.unread || T.lastRead !== last.sid) && !document.hidden) {
        T.lastRead = last.sid;
        try { const left = await PG.rpc('pg_sms_read', { p_with: T.w }); if (!dead && typeof left === 'number') { SMS.unread = left; if (c) c.unread = 0; SMS.sig = ''; renderSms(); } } catch (e) { /* rien : réessayé à la prochaine lecture */ }
      }
    }
    const ST_TXT = { envoye: 'Envoyé', distribue: 'Distribué', lu: 'Lu' };
    function renderThread(scroll) {
      const T = SMS.th; if (!T) return;
      const L = $.thl, atEnd = L.scrollHeight - L.scrollTop - L.clientHeight < 60, h0 = L.scrollHeight, t0 = L.scrollTop;
      const pend = SMS.pend.filter((p) => p.w === T.w);
      let html = T.more ? '<button class="pgh-thmore" data-t="more">Messages plus anciens</button>' : '', day = '';
      const all = T.msgs.concat(pend.map((p) => ({ pend: p, mine: true, b: p.b, at: p.at })));
      const lastMine = (() => { for (let i = T.msgs.length - 1; i >= 0; i--) if (T.msgs[i].mine) return T.msgs[i].sid; return null; })();
      for (const m of all) {
        const d = smsWhen(m.at, true); if (d !== day) { day = d; html += `<div class="pgh-thday">${esc(d)}</div>`; }
        const tm = (() => { const x = new Date(m.at); return isNaN(x) ? '' : x.getHours() + ':' + String(x.getMinutes()).padStart(2, '0'); })();
        if (m.pend) {
          const p = m.pend, fail = p.st === 'fail';
          html += `<div class="pgh-bub me${fail ? ' fail' : ' pend'}" data-p="${esc(p.id)}">${esc(p.b)}<small>${fail ? '⚠ ' + esc(p.why || 'Pas envoyé') + ' · toucher pour réessayer' : p.st === 'wait' ? '⏳ ' + esc(p.why || 'En attente du réseau') : 'Envoi…'}</small></div>`;
          continue;
        }
        const pnjName = m.pnj ? smsWho(T.w, (SMS.list.find((x) => x.w === T.w) || {}).title).name : '';
        const can = rxCan(T, m), eff = rxEff(m);
        html += CARTES && CARTES.est(m) ? CARTES.bulle(m, tm) : `<div class="pgh-bub ${m.mine ? 'me' : m.pnj ? 'pnj' : 'th'}${eff.length ? ' rx' : ''}"${can ? ` data-m="${esc(m.id)}" tabindex="0" role="button" aria-haspopup="menu"` : ''}>${m.pnj ? `<i>${esc(pnjName)}</i>` : ''}${esc(m.b || (m.photo ? '📷 Photo' : ''))}<small>${tm}</small>${rxPill(eff, m.id)}${can ? RXB : ''}</div>`;
        if (m.mine && m.sid === lastMine && !pend.length && ST_TXT[m.st]) html += `<div class="pgh-thst${m.st === 'lu' ? ' lu' : ''}">${m.st === 'lu' ? '✓✓ ' : m.st === 'distribue' ? '✓✓ ' : '✓ '}${ST_TXT[m.st]}</div>`;
      }
      if (!all.length) { const o = smsWho(T.w); html += T.err ? `<div class="pgh-thempty"><b>📡</b>${esc(T.err)}</div>` : `<div class="pgh-thempty"><b>👋</b>${o.pnj ? 'Pas encore de message.' : 'Dis bonjour à ' + esc(o.name) + ' !'}</div>`; }
      else if (T.err) html += `<div class="pgh-thst fail">${esc(T.err)}</div>`;
      L.innerHTML = html;
      if (CARTES) CARTES.hook(L);
      if (scroll === 'keep') L.scrollTop = t0 + (L.scrollHeight - h0);
      else if (scroll === 'end' || atEnd) L.scrollTop = L.scrollHeight;
      RXS.anim = true;   // les réactions déjà là à l'ouverture ne « sautent » pas ; les suivantes oui
      if (RXS.open) { const b = [...L.querySelectorAll('.pgh-bub[data-m]')].find((x) => x.dataset.m === RXS.id); if (b) { RXS.b = b; b.classList.add('sel'); rxPlace(); } else rxClose(false); }
    }
    // ---------- réactions ----------
    const rxMe = () => pgInfo().name || '';
    function rxCan(T, m) {
      if (!T || !T.rx || SMS.rxRpc === false || !m || !m.id || !/^[A-Za-z0-9_-]{8,64}$/.test(m.id) || !memberMode()) return false;
      if (T.w.startsWith('pnj:')) return true;                                     // ses messages avec un habitant : oui
      const c = SMS.list.find((x) => x.w === T.w); return c ? c.can : true;          // plus dans la même salle : non (le serveur dirait « pas copains »)
    }
    function rxEff(m) {
      const me = rxMe(); let a = (m.rx || []).slice();
      if (SMS.rxWant.has(m.id)) { const w = SMS.rxWant.get(m.id); a = a.filter((x) => x.w !== me); if (w) a.push({ w: me, e: w }); }
      return a;
    }
    function rxName(w) {
      if (w === rxMe()) return 'toi';
      if (w.startsWith('pnj:')) return smsWho(w, w === 'pnj:maire' ? 'Papi Auguste' : '').name;
      return smsWho('p:' + w).name;
    }
    function rxPill(eff, id) {
      if (!eff.length) return '';
      const g = []; for (const x of eff) { let k = g.find((y) => y.e === x.e); if (!k) g.push(k = { e: x.e, n: 0 }); k.n++; }
      const key = id + ':' + g.map((k) => k.e + k.n).join(','), fresh = !RXS.seen.has(key); RXS.seen.add(key);
      const tip = eff.map((x) => rxName(x.w) + ' ' + x.e).join(' · ');
      return `<span class="pgh-rx${eff.some((x) => x.w === rxMe()) ? ' mine' : ''}${fresh && RXS.anim ? ' new' : ''}" title="${esc(tip)}" aria-label="Réactions : ${esc(tip)}">${g.map((k) => `<i>${k.e}</i>${k.n > 1 ? `<b>${k.n}</b>` : ''}`).join('')}</span>`;
    }
    function rxOpen(b, how) {
      const T = SMS.th; if (!T || !b) return;
      const id = b.dataset.m, m = T.msgs.find((x) => x.id === id); if (!m || !rxCan(T, m)) return;
      // le fil a pu être redessiné pendant l'appui (message ou réaction reçus en direct) : la bulle d'avant n'est plus dans la page
      if (!b.isConnected) { b = [...$.thl.querySelectorAll('.pgh-bub[data-m]')].find((x) => x.dataset.m === id); if (!b) return; }
      if (RXS.open) rxClose(false);
      const cur = (rxEff(m).find((x) => x.w === rxMe()) || {}).e || '';
      $.rxbar.innerHTML = RX_SET.map((e) => `<button type="button" role="menuitem" data-rx="${e}"${e === cur ? ' class="on" aria-pressed="true"' : ''} aria-label="${esc(RX_NAMES[e] + (e === cur ? ' (ta réaction : toucher pour la retirer)' : ''))}" title="${esc(RX_NAMES[e])}">${e}</button>`).join('');
      RXS.open = true; RXS.id = id; RXS.b = b; RXS.at = performance.now(); RXS.how = how;
      b.classList.add('sel'); $.rxveil.hidden = false; $.rxbar.hidden = false;
      rxPlace();
      if (how === 'pad' || how === 'key') later(() => { const f = $.rxbar.querySelector('.on') || $.rxbar.querySelector('button'); try { if (f) f.focus({ preventScroll: true }); } catch (e) { /* rien */ } }, 40);
      tone(660, 990);
    }
    function rxPlace() {
      const b = RXS.b; if (!RXS.open) return; if (!b || !b.isConnected) { rxClose(false); return; }
      const P = $.th.getBoundingClientRect(), r = b.getBoundingClientRect(), Lr = $.thl.getBoundingClientRect();
      const bw = $.rxbar.offsetWidth || 310, bh = $.rxbar.offsetHeight || 60, mine = b.classList.contains('me');
      let top = r.top - P.top - bh - 10; const below = r.top - bh - 10 < Lr.top + 2; if (below) top = r.bottom - P.top + 10;   // pas la place au-dessus : en dessous
      let left = mine ? r.right - P.left - bw : r.left - P.left;
      left = Math.max(8, Math.min(P.width - bw - 8, left)); top = Math.max(4, Math.min(P.height - bh - 4, top));
      $.rxbar.style.left = Math.round(left) + 'px'; $.rxbar.style.top = Math.round(top) + 'px';
      $.rxbar.style.transformOrigin = (mine ? '90%' : '10%') + (below ? ' 0%' : ' 100%');
    }
    function rxClose(refocus) {
      if (!RXS.open) return;
      RXS.open = false; $.rxveil.hidden = true; $.rxbar.hidden = true; $.rxbar.innerHTML = '';
      const b = RXS.b; RXS.b = null; if (b) b.classList.remove('sel');
      if (refocus && b && b.isConnected) { try { b.focus({ preventScroll: true }); } catch (e) { /* rien */ } }
    }
    async function rxChoose(e) {
      const T = SMS.th; if (!T || !RXS.open) return;
      const id = RXS.id, m = T.msgs.find((x) => x.id === id); if (!m) { rxClose(false); return; }
      const me = rxMe(), cur = (rxEff(m).find((x) => x.w === me) || {}).e || null, want = cur === e ? null : e;   // retoucher la même = la retirer
      rxClose(RXS.how === 'pad' || RXS.how === 'key');
      SMS.rxWant.set(id, want); renderThread('auto');
      tone(want ? 880 : 520, want ? 1320 : 390);
      try {
        const r = await PG.rpc('pg_sms_react', { p_msg: id, p_emoji: want }); if (dead) return;
        const all = SMS.th ? SMS.th.msgs.filter((x) => x.id === id) : []; if (!all.includes(m)) all.push(m);
        for (const M of all) { M.rx = (M.rx || []).filter((x) => x.w !== me); if (r && r.e) M.rx.push({ w: me, e: rxNorm(r.e) }); }
      } catch (err) {
        if (dead) return;
        const s = String((err && err.message) || '');
        if (/fonction refus/.test(s)) SMS.rxRpc = false;
        toast(/pas copains/.test(s) ? 'Vous n\'êtes plus dans la même salle.' : /trop d essais/.test(s) ? 'Doucement : attends un peu avant de réagir encore.' : err && err.offline ? 'Pas de réseau : ta réaction n\'est pas partie.' : 'Ta réaction n\'est pas partie.');
      } finally { if (SMS.rxWant.get(id) === want) SMS.rxWant.delete(id); }
      if (SMS.th) renderThread('auto');
    }
    // appui long (doigt, stylet), clic droit, bouton ☺ du survol (souris), A de la manette / Entrée sur une bulle choisie
    let rxPress = null;
    const rxCancel = () => { if (rxPress && !rxPress.fired) { clearTimeout(rxPress.t); rxPress = null; } };
    on($.thl, 'pointerdown', (e) => {
      rxCancel();
      const b = e.target.closest('.pgh-bub[data-m]'); if (!b || e.target.closest('.pgh-rxb') || e.pointerType === 'mouse') return;
      const P = { b, x: e.clientX, y: e.clientY, fired: false }; rxPress = P;
      P.t = later(() => { if (rxPress !== P) return; P.fired = true; rxOpen(b, 'press'); try { if (navigator.vibrate) navigator.vibrate(12); } catch (x) { /* rien */ } later(() => { if (rxPress === P) rxPress = null; }, 700); }, 430);
    });
    on($.thl, 'pointermove', (e) => { if (rxPress && !rxPress.fired && Math.hypot(e.clientX - rxPress.x, e.clientY - rxPress.y) > 9) rxCancel(); }, { passive: true });
    on($.thl, 'pointerup', rxCancel); on($.thl, 'pointercancel', rxCancel);
    on($.thl, 'scroll', () => { rxCancel(); if (RXS.open) rxPlace(); }, { passive: true });
    on($.thl, 'contextmenu', (e) => { const b = e.target.closest('.pgh-bub[data-m]'); if (!b) return; e.preventDefault(); if (!(RXS.open && RXS.id === b.dataset.m)) rxOpen(b, 'menu'); });
    on($.thl, 'click', (e) => {
      const rb = e.target.closest('.pgh-rxb'); if (rb) { e.stopPropagation(); rxOpen(rb.closest('.pgh-bub[data-m]'), 'btn'); return; }
      const b = e.target.closest('.pgh-bub[data-m]'); if (b && e.detail === 0) rxOpen(b, 'pad');   // A de la manette : un clic sans pointeur
    });
    on($.thl, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('.pgh-bub[data-m]')) { e.preventDefault(); rxOpen(e.target, 'key'); } });
    on($.rxbar, 'click', (e) => { const k = e.target.closest('[data-rx]'); if (k) rxChoose(k.dataset.rx); });
    on($.rxbar, 'contextmenu', (e) => e.preventDefault());
    on($.rxveil, 'contextmenu', (e) => e.preventDefault());
    on($.rxveil, 'click', () => { if (performance.now() - RXS.at < 450) return; rxClose(true); });   // le clic qui suit l'appui long ne referme pas
    on($.th, 'keydown', (e) => { if (e.key === 'Escape' && RXS.open) { e.preventDefault(); e.stopPropagation(); rxClose(true); } }, true);
    on(window, 'resize', () => { if (RXS.open) rxPlace(); });
    on($.thl, 'click', (e) => {
      if (e.target.closest('[data-t="more"]')) { loadThread(true); return; }
      const b = e.target.closest('.pgh-bub.fail[data-p]'); if (!b) return;
      const p = SMS.pend.find((x) => x.id === b.dataset.p); if (p) { p.st = 'send'; p.why = ''; smsPendSave(); renderThread('end'); smsSend(p); }
    });
    on($.th, 'click', (e) => { if (e.target.closest('[data-h="thx"]') || e.target === $.th) closeThread(); });
    function thInput() {
      const t = $.tht; t.style.height = 'auto'; t.style.height = Math.min(140, t.scrollHeight) + 'px';
      const n = [...t.value.trim()].length;
      $.thc.textContent = n > 400 ? n + ' / 500' : ''; $.thc.classList.toggle('over', n > 500);
      $.thsend.disabled = !n || n > 500;
    }
    on($.tht, 'input', thInput);
    on($.tht, 'keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !mobile) { e.preventDefault(); thSendNow(); } else if (e.key === 'Escape') closeThread(); });
    on($.thf, 'submit', (e) => { e.preventDefault(); thSendNow(); });
    function thSendNow() {
      const T = SMS.th; if (!T) return;
      const b = $.tht.value.replace(/\r\n?/g, '\n').trim(); if (!b || [...b].length > 500) return;
      const p = { id: smsId(), w: T.w, b, at: new Date().toISOString(), st: 'send', keep: true };
      SMS.pend.push(p); smsPendSave();
      $.tht.value = ''; store.set('jdw.pegase.smsd.' + T.w, ''); thInput();
      renderThread('end'); tone(880, 1320);
      smsSend(p);
    }
    async function smsSend(p) {
      if (p.busy) return; p.busy = true;
      try {
        await PG.rpc('pg_sms_send', { p_to: p.w, p_body: p.b, p_id: p.id });
        if (dead) return;
        p.st = 'sent';
      } catch (e) {
        if (dead) return;
        if (smsFinal(e)) { p.st = 'fail'; p.why = smsErr(e); p.keep = false; } else { p.st = 'wait'; p.why = smsErr(e); }
      } finally { p.busy = false; }
      smsPendSave();
      if (SMS.th && SMS.th.w === p.w) { if (p.st === 'sent') loadThread(false); else renderThread('auto'); }
      else if (p.st === 'sent') loadSms(true);
    }
    // renvoi de ce qui attend (au retour du réseau, ou en rouvrant le hub)
    function smsFlush() { smsPendLoad(); for (const p of SMS.pend) if ((p.st === 'wait' || p.st === 'send') && !p.busy && SMS.st !== 'offline') smsSend(p); }
    // direct : signal du serveur → relecture (regroupe les rafales)
    let smsPokeT = 0;
    // économe (le serveur limite les lectures à 300 / 10 min par pseudo, jeu + hub ensemble) : conversation ouverte → seulement son fil
    // (+ lu) ; la liste au plus toutes les 10 s
    function smsOnPoke() { if (SMS.th) { loadThread(false); if (Date.now() - SMS.at > 10000) loadSms(true); } else loadSms(true); }
    if (PG && typeof PG.onSms === 'function') { try { SMS.off = PG.onSms(() => { SMS.lastPoke = Date.now(); clearTimeout(smsPokeT); smsPokeT = later(smsOnPoke, 250); }); } catch (e) { SMS.off = null; } }
    every(() => {
      if (document.hidden || dead) return;
      const live = !!SMS.off, close = tab === 'amis' || !!SMS.th;
      const per = live ? (close ? 45000 : 120000) : (close ? 15000 : 60000);
      if (Date.now() - SMS.at >= per - 500) loadSms(true);
      else if (SMS.pend.some((p) => p.st === 'wait' && !p.busy) && Date.now() - (SMS.flushAt || 0) > 9500) { SMS.flushAt = Date.now(); for (const p of SMS.pend) if (p.st === 'wait' && !p.busy) smsSend(p); }   // file d'attente : un essai toutes les 10 s
    }, 5000);
    on(window, 'online', () => { if (!dead) loadSms(true); });
    on(document, 'visibilitychange', () => { if (!document.hidden && !dead) loadSms(true); });

    // ---------- téléchargement ----------
    async function renderDl() {
      const m = await pcManifest(); if (dead) return;
      const z = $.dlzone;
      const phone = mobile ? '<div class="pgh-onphone">📱 Tu es sur un téléphone : ouvre cette page sur ton <b>ordinateur Windows</b> pour installer Pégase.</div>' : '';
      if (m.state === 'ok') {
        const meta = [m.version ? 'Version ' + esc(m.version) : '', m.size ? fmtSize(m.size) : '', 'fichier .zip'].filter(Boolean).join(' · ');
        z.innerHTML = `${phone}<a class="pgh-cta gold pgh-dlbtn" data-h="dlbtn" href="${esc(m.url)}" download rel="noopener">${PGH_SVG.dl}<span>Télécharger pour PC (Windows)</span></a><span class="pgh-meta">${meta}</span>` +
          (m.notes.length ? `<span class="pgh-meta" style="margin-top:6px;color:#ffe2ad">Nouveautés :</span><ul class="pgh-notes">${m.notes.map((n) => '<li>' + esc(n) + '</li>').join('')}</ul>` : '') +
          (m.sha256 ? `<span class="pgh-meta" style="opacity:.6;font-size:11px;word-break:break-all">Empreinte SHA-256 : ${m.sha256}</span>` : '');
        const a = z.querySelector('a'); on(a, 'click', () => { toast('⬇ Le téléchargement commence…'); tone(660, 990); });
        let fn = ''; try { fn = decodeURIComponent(new URL(m.url).pathname.split('/').pop() || ''); } catch (e) { fn = ''; }
        if (/^[\w.()\- ]{3,80}\.zip$/i.test(fn) && $.zipn) $.zipn.textContent = fn;
      } else {
        z.innerHTML = `<span class="pgh-soon" data-h="soon"><i></i>Bientôt disponible</span><span class="pgh-meta">${m.state === 'offline' ? 'Pas de réseau pour l\'instant : réessaie quand tu seras connecté.' : 'On fabrique la version PC en ce moment. Reviens très vite : le bouton apparaîtra ici.'}</span>`;
      }
      box.dataset.dl = m.state;
    }
    renderDl();
    every(() => $.win.classList.toggle('two'), 2600);

    // ---------- ANDROID (appli de la borne 1.8+ : window.JDWAndroid ; fiche telecharger/pegase.json) ----------
    // api.natif (CONTRACT.md Ajout 9) : status() → { state: install | update | play | busy | replace | unfit | oldapp | browser | ios | desktop
    // | none | off, versionName, size, installed, page } ; open() = la feuille de la borne (Installer / Mettre à jour / Jouer : pegase://open,
    // question Wi-Fi / données mobiles, progression) ; onChange(fn) = l'état a pu changer (feuille fermée, Android a fini…).
    const NT = api && api.natif && typeof api.natif.status === 'function' ? api.natif : null;
    let AND = { state: 'none' }, andOff = null;
    const andBtn = (txt, cls) => `<button class="pgh-cta ${cls || 'gold'}" data-a="open">${PGH_SVG.android}<span>${esc(txt)}</span></button>`;
    async function renderAndroid(fresh) {
      const ua = navigator.userAgent || '';
      let st = { state: 'none', plat: /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'desktop' };
      if (NT) { try { st = (await NT.status(fresh)) || st; } catch (e) { /* rien */ } }
      if (dead) return;
      AND = st;
      const vn = st.versionName ? 'version ' + esc(st.versionName) : '', size = st.size ? fmtSize(st.size) : '';
      const meta = [vn ? 'Version ' + esc(st.versionName) : '', size, 'Android 8 ou plus'].filter(Boolean).join(' · ');
      let card = '', chip = 'À venir', p = 'La borne l\'installera toute seule, d\'un toucher, sur ton téléphone.', cardMeta = 'L\'appli de la borne l\'installe pour toi';
      switch (st.state) {
        case 'install': card = `<div class="pgh-andbtns">${andBtn('Installer Pégase')}</div><span class="pgh-meta">${meta}</span><span class="pgh-andnote">Une seule fois : la borne télécharge Pégase, vérifie le fichier, puis Android te demande <b>« Installer »</b>. Ensuite, <b>« Jouer »</b> l'ouvre d'un toucher.${size ? ' En Wi-Fi c\'est mieux (' + size + ').' : ''}</span>`; break;
        case 'update': card = `<div class="pgh-andbtns">${andBtn('Mettre à jour' + (vn ? ' (' + vn + ')' : ''))}</div><span class="pgh-meta">${st.installed ? 'Installée : version ' + esc(st.installed) + ' · ' : ''}${meta}</span><span class="pgh-andnote">La mise à jour se fait toute seule, sans question d'Android.</span>`; break;
        case 'play': card = `<div class="pgh-andbtns">${andBtn('Jouer à Pégase')}</div><span class="pgh-meta">Installée${st.installed ? ' · version ' + esc(st.installed) : ''} ✓</span>`; cardMeta = 'Pégase est installé sur ce téléphone'; break;
        case 'busy': { const pc = st.total ? Math.max(0, Math.min(100, Math.floor(st.done / st.total * 100))) : 0;
          card = `<div class="pgh-andbtns">${andBtn(st.step === 'download' ? 'Voir le téléchargement (' + pc + ' %)' : 'Voir l\'installation')}</div><div class="pgh-andbar" style="--p:${st.step === 'download' ? pc : 100}%"><i></i></div><span class="pgh-meta">${meta}</span>`; break; }
        case 'replace': card = `<div class="pgh-andbtns">${andBtn('Installer la vraie version')}</div><span class="pgh-andnote">Une version d'essai de Pégase est déjà sur ce téléphone : la borne t'aide à la remplacer.</span>`; break;
        case 'unfit': chip = 'Pas ce téléphone'; p = 'Pégase demande un téléphone Android 64 bits (Android 8 ou plus).'; break;
        case 'oldapp': card = `<span class="pgh-andnote">Ton appli <b>« Borne d'arcade »</b> est ancienne : installe la nouvelle (1.8), puis reviens ici pour installer Pégase d'un toucher.</span><div class="pgh-andbtns"><a class="pgh-cta gold" href="${esc(st.page || '../telecharger/')}" rel="noopener">${PGH_SVG.dl}<span>Mettre à jour l'appli de la borne</span></a></div>`; cardMeta = 'Il faut l\'appli de la borne 1.8'; break;
        case 'browser': card = `<span class="pgh-andnote"><b>Installe l'appli « Borne d'arcade » pour jouer</b> : c'est elle qui installe Pégase sur ton téléphone, d'un toucher (tuile Pégase → Android → Installer).</span><div class="pgh-andbtns"><a class="pgh-cta gold" href="${esc(st.page || '../telecharger/')}" rel="noopener">${PGH_SVG.dl}<span>Installer l'appli « Borne d'arcade »</span></a></div><span class="pgh-meta">${meta}</span>`; cardMeta = 'Avec l\'appli de la borne'; break;
        case 'desktop': case 'ios': chip = 'Disponible'; p = 'Sur ton téléphone Android : ouvre l\'appli « Borne d\'arcade », touche Pégase, puis « Installer ».'; break;
        default: break;   // none / off : « À venir » (iPhone : Android « Disponible » comme sur PC, la carte iPhone dit « À venir »)
      }
      $.andcard.hidden = !card; if (card) { $.andzone.innerHTML = card; $.andmeta.textContent = cardMeta; }
      $.andsmall.hidden = !!card; $.others.classList.toggle('one', !!card);
      $.andchip.textContent = chip; $.andp.textContent = p;
      const live = !/^(none|off)$/.test(st.state);
      $.small.textContent = live ? 'Gratuit · PC Windows · Android' : 'Gratuit · PC Windows · Android bientôt';
      $.dlsub.textContent = live ? 'Pégase est un vrai jeu à installer, gratuit : sur ordinateur (Windows) et sur les téléphones Android. iPhone un peu plus tard.' : 'Pégase est un vrai jeu à installer, gratuit. Il marche sur ordinateur maintenant, et bientôt sur les téléphones.';
      // en haut de page : « Jouer » si Pégase est déjà sur ce téléphone, « Installer » s'il peut l'être
      const lab = st.state === 'play' ? 'Jouer' : /^(install|update|busy|replace)$/.test(st.state) ? (st.state === 'update' ? 'Mettre à jour' : 'Installer') : '';
      for (const [k, def] of [['go-dl', 'Télécharger le jeu'], ['go-dl1', 'Télécharger']]) { const sp = $[k] && $[k].querySelector('span'); if (sp) sp.textContent = lab ? (k === 'go-dl' && lab === 'Jouer' ? 'Jouer à Pégase' : lab) : def; }
      box.dataset.android = st.state;
      renderLink();
    }
    async function andOpen() {
      if (!NT) return;
      tone(660, 990);
      // appli de la borne 1.9 (pont api 2) + compte : Pégase s'ouvre DÉJÀ CONNECTÉ (billet dans l'extra Android) ; sinon comme avant
      if (AND.state === 'play' && memberMode() && typeof NT.openLinked === 'function') {
        let r = null; try { r = await NT.openLinked(); } catch (e) { r = null; }
        if (dead) return;
        if (r && r.ok) { later(() => renderAndroid(false), 400); return; }
      }
      let ok = false; try { ok = await NT.open(); } catch (e) { ok = false; }
      if (!ok && !dead) toast('Pégase n\'est pas (encore) disponible pour ce téléphone');
      later(() => renderAndroid(false), 400);
    }
    on($.andzone, 'click', (e) => { if (e.target.closest('[data-a="open"]')) andOpen(); });

    // ---------- CONNECTER LE JEU (onglet Moi, 18 oct.) ----------
    // pg_link_make (pegase.sql) : CODE COURT à usage unique (8 caractères Crockford, affiché « K7Q2-9MXA », 120 s, gardé en HMAC poivré par le
    // serveur) que l'on TAPE dans le jeu ; le jeu l'échange contre une session (Edge Function pegase-redeem). Le code n'est jamais enregistré
    // (ni localStorage, ni journal) et disparaît de l'écran à la fin des 120 s. Le billet LONG (64 hexadécimaux, 60 s : p_long = true) ne
    // sert qu'aux passages appli → appli (copié en silence ou dans l'extra Android), jamais affiché.
    // « Ouvrir Pégase connecté » (appli de la borne avec Pégase installé) : api.natif.openLinked si la borne sait passer le billet à l'appli
    // (appli 1.9+ : extra Android, jamais dans l'adresse) ; sinon le code est copié en silence et Pégase s'ouvre (pegase://open).
    const LK = { st: 'idle', code: '', until: 0, ttl: 120, msg: '', tick: 0, busy: false };
    const SHORT = /^[0-9A-HJKMNP-TV-Z]{8}$/, lkPretty = (c) => c.slice(0, 4) + '-' + c.slice(4);
    const lkLeft = () => Math.max(0, Math.ceil((LK.until - performance.now()) / 1000));
    const lkInstalled = () => !!NT && /^(play|update)$/.test(AND.state);
    function lkClear() { LK.code = ''; LK.until = 0; if (LK.tick) { clearTimeout(LK.tick); timers.delete(LK.tick); LK.tick = 0; } }
    function renderLink() {
      if (!$.lk) return;
      if (!PG) { $.seclk.hidden = true; return; }
      $.seclk.hidden = false;
      const head = (p) => `<div class="pgh-lkhd"><span class="pgh-lkic">${PGH_SVG.link}</span><div><h3>Connecter le jeu Pégase</h3><p>${p.replace(/ ([!?:;»])/g, ' $1')}</p></div></div>`;
      const openBtn = lkInstalled() ? `<button class="pgh-cta gold" data-lk="open">${PGH_SVG.open}<span>Ouvrir Pégase connecté</span></button>` : '';
      const direct = lkInstalled() && typeof NT.linkable === 'function' && NT.linkable();   // appli 1.9 : connexion d'un toucher, sans code
      let h;
      if (!memberMode()) {
        h = head('Avec un compte (gratuit), le jeu retrouve ton avatar, tes lucioles et tes missions sur tous tes appareils.') +
          `<div class="pgh-lkbtns"><button class="pgh-cta gold" data-lk="acct"><span>Créer mon compte</span></button></div>`;
      } else if (LK.st === 'code' || LK.st === 'off') {
        const on = LK.st === 'code' && LK.code, n = lkLeft(), C = 2 * Math.PI * 22;
        const ch = on ? LK.code.split('') : Array(8).fill('·'), cell = (x) => '<span>' + esc(x) + '</span>';
        h = head('Ton code est prêt : il ne sert qu\'une fois.') +
          `<div class="pgh-lkbox${on ? ' on' : ' off'}"><div class="pgh-lktop"><div class="pgh-lkring${n <= 10 ? ' low' : ''}"><svg viewBox="0 0 50 50"><circle class="bg" cx="25" cy="25" r="22"/><circle class="fg" data-lk="fg" cx="25" cy="25" r="22" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - n / LK.ttl)).toFixed(2)}"/></svg><b data-lk="n">${on ? n : 0}</b></div>` +
          `<div class="t" data-lk="t">${on ? 'Valable encore <span data-lk="s">' + n + '</span> s<small>Un seul usage, seulement pour ton compte</small>' : 'Ce code a expiré<small>Demande un nouveau code, c\'est instantané</small>'}</div></div>` +
          `<div class="pgh-lkcode" role="text" aria-label="${on ? esc(ch.join(' ')) : 'code expiré'}">${ch.slice(0, 4).map(cell).join('')}<i aria-hidden="true">–</i>${ch.slice(4).map(cell).join('')}</div>` +
          (on ? '<p class="pgh-lknote">Majuscules, minuscules, tiret ou pas : peu importe</p>' : '') + `</div>` +
          `<p class="pgh-lkhow">Dans le jeu&nbsp;: <b>Ton compte</b> <i>›</i> <b>Connexion rapide</b> <i>›</i> tape&nbsp;ce&nbsp;code</p>` +
          `<div class="pgh-lkbtns">${on ? `<button class="pgh-cta glass" data-lk="copy">${PGH_SVG.copy}<span>Copier</span></button>` : ''}<button class="pgh-cta ${on ? 'glass' : 'gold'}" data-lk="new">${PGH_SVG.redo}<span>Nouveau code</span></button>${openBtn}</div>`;
      } else {
        h = head(direct ? 'D\'un toucher, Pégase s\'ouvre déjà connecté à ton compte. Pour un autre appareil (PC…), prends un code à usage unique.' : 'Un code de 8 caractères, valable 2 minutes et à usage unique : tu le tapes dans le jeu et tu retrouves ton compte, sans mot de passe.') +
          (LK.msg ? `<p class="pgh-lkmsg">${esc(LK.msg)}</p>` : '') +
          `<div class="pgh-lkbtns"><button class="pgh-cta ${lkInstalled() ? 'glass' : 'gold'}" data-lk="make"${LK.busy ? ' disabled' : ''}>${PGH_SVG.link}<span>${LK.busy ? 'Un instant…' : 'Obtenir mon code'}</span></button>${openBtn}</div>`;
      }
      if ($.lk.innerHTML !== h) $.lk.innerHTML = h;
      box.dataset.link = memberMode() ? LK.st : 'guest';
    }
    function lkTick() {
      LK.tick = 0;
      if (dead || LK.st !== 'code') return;
      const n = lkLeft();
      if (n <= 0) { lkClear(); LK.st = 'off'; renderLink(); return; }
      const C = 2 * Math.PI * 22, fg = $.lk.querySelector('[data-lk="fg"]'), nb = $.lk.querySelector('[data-lk="n"]'), s = $.lk.querySelector('[data-lk="s"]');
      if (fg) fg.setAttribute('stroke-dashoffset', (C * (1 - (n - 1) / LK.ttl)).toFixed(2));   // l'anneau glisse vers la seconde suivante (transition 1 s)
      if (nb) nb.textContent = n; if (s) s.textContent = n;
      const rg = $.lk.querySelector('.pgh-lkring'); if (rg) rg.classList.toggle('low', n <= 10);
      LK.tick = later(lkTick, ((LK.until - performance.now()) % 1000 + 1000) % 1000 + 5);
    }
    function lkWhy(e) {
      const m = String((e && e.message) || e || '');
      if (e && e.guest) return 'Il faut un compte pour connecter le jeu.';
      if (/trop d essais/.test(m)) return 'Tu as demandé beaucoup de codes : attends quelques minutes, puis réessaie.';
      if (/compte requis|connexion requise|JWT|401|403/i.test(m)) return 'Ta connexion à ton compte a expiré : reconnecte-toi sur la borne, puis réessaie.';
      if (!navigator.onLine || /fetch|network|réseau|failed|timeout|abort/i.test(m)) return 'Pas de réseau pour l\'instant : réessaie quand tu seras connecté.';
      return 'Le code n\'a pas pu être créé. Réessaie dans un instant.';
    }
    async function lkMake() {
      if (LK.busy || !memberMode()) return false;
      LK.busy = true; LK.msg = ''; if (LK.st !== 'code' && LK.st !== 'off') renderLink();
      let r = null, err = null;
      try { r = await PG.rpc('pg_link_make', {}); } catch (e) { err = e; }
      LK.busy = false; if (dead) return false;
      const row = Array.isArray(r) ? r[0] : r, c = row && typeof row.r_code === 'string' ? row.r_code.replace(/[^0-9A-Za-z]/g, '').toUpperCase() : '';
      if (err || !SHORT.test(c)) {
        lkClear(); LK.st = 'idle'; LK.msg = lkWhy(err || 'réponse');
        if (!err) report('Pégase hub : pg_link_make, réponse inattendue');
        renderLink(); return false;
      }
      // durée : celle du serveur si l'horloge de l'appareil est cohérente, sinon 120 s (moins 1 s pour le trajet)
      let ttl = 119; const exp = row.r_exp ? Date.parse(row.r_exp) : NaN;
      if (isFinite(exp)) { const d = (exp - Date.now()) / 1000; if (d >= 5 && d <= 120) ttl = Math.floor(d); }
      lkClear(); LK.code = c; LK.ttl = 120; LK.until = performance.now() + ttl * 1000; LK.st = 'code';
      renderLink(); lkTick(); tone(660, 990);
      return true;
    }
    async function lkClip(text) {
      let ok = false;
      try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { ok = false; }
      if (!ok) {
        try {
          const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
          box.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
        } catch (e) { ok = false; }
      }
      return ok;
    }
    async function lkCopy(silent) {
      if (!LK.code) return false;
      const ok = await lkClip(lkPretty(LK.code));
      if (!silent) toast(ok ? '📋 Code copié : colle-le dans Pégase' : 'Copie impossible ici : tape le code dans le jeu');
      return ok;
    }
    async function lkOpen() {
      if (!NT) return;
      tone(660, 990);
      // appli de la borne qui sait passer le billet à Pégase (extra Android) : rien à copier ni à taper
      if (typeof NT.openLinked === 'function') {
        let r = null; try { r = await NT.openLinked(); } catch (e) { r = null; }
        if (dead) return;
        if (r && r.ok) { later(() => renderAndroid(false), 400); return; }
        if (r && r.why === 'make') { LK.msg = lkWhy(r.err); renderLink(); return; }
      }
      let r = null; try { r = await PG.rpc('pg_link_make', { p_long: true }); } catch (e) { r = null; }   // billet LONG, appli → appli
      if (dead) return;
      const row = Array.isArray(r) ? r[0] : r, c = row && typeof row.r_code === 'string' ? row.r_code.trim().toLowerCase() : '';
      if (/^[0-9a-f]{64}$/.test(c)) await lkClip(c);
      if (dead) return;
      let ok = false; try { ok = await NT.open(); } catch (e) { ok = false; }
      if (!ok && !dead) toast('Pégase n\'est pas (encore) disponible pour ce téléphone');
      later(() => renderAndroid(false), 400);
    }
    on($.lk, 'click', (e) => {
      const b = e.target.closest('[data-lk]'); if (!b) return;
      const k = b.dataset.lk;
      if (k === 'acct') { try { PG && PG.account && PG.account(); } catch (x) { /* rien */ } }
      else if (k === 'make' || k === 'new') lkMake();
      else if (k === 'copy') lkCopy(false);
      else if (k === 'open') lkOpen();
    });
    if (NT && typeof NT.onChange === 'function') andOff = NT.onChange(() => { if (!dead) renderAndroid(false); });
    on(document, 'visibilitychange', () => { if (!document.hidden && !dead) renderAndroid(false); });
    renderAndroid(true);

    // ---------- observateurs ----------
    $.bg.complete && $.bg.naturalWidth ? $.bg.classList.add('on') : on($.bg, 'load', () => $.bg.classList.add('on'));
    on($.bg, 'error', () => { $.bg.style.display = 'none'; });
    let io = null, ro = null;
    if (typeof IntersectionObserver === 'function') { io = new IntersectionObserver((es) => { for (const e of es) heroVis = e.isIntersecting; activeSync(); }, { root: $.scroll, threshold: 0.02 }); io.observe($.hero); }
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(() => { if (dead) return; if (root.clientWidth !== W0 || root.clientHeight !== H0) relayout(); else layCheck(); });
      ro.observe(root); ro.observe($.copy); ro.observe($.emotes);
    } else on(window, 'resize', relayout);
    // polices arrivées après l'ouverture : le titre et la phrase changent de taille → recadrer
    try { if (document.fonts) { document.fonts.ready.then(() => { if (!dead) relayout(); }); on(document.fonts, 'loadingdone', () => { if (!dead) relayout(); }); } } catch (e) { /* rien */ }
    every(layCheck, 1000);
    on(document, 'visibilitychange', activeSync);
    on(window, 'online', () => { if (srv.dirty) gardePush(); loadWallet(); loadCatalogs(); });
    // l'onglet « Créateur » n'a ses numéros qu'avec le catalogue
    box.querySelectorAll('.pgh-edcat').forEach((b) => { if (!b.querySelector('em')) b.insertAdjacentHTML('beforeend', '<em></em>'); });
    catReady.then(() => { if (dead) return; if (!D && !STG) { /* repli : le créateur attend la 3D */ } renderShowcase(); renderMe(); }).catch(() => {});
    GRAM = PGH_GRAM_MOUNT({ box, $, PG, pgInfo, memberMode, on, later, every, store, toast, tone, members, touch, setTab: (x) => setTab(x, false) });
    if (window.JDW_PG_TEST) window.JDW_PG_GRAM = GRAM;
    CARTES = PGH_CARTES_MOUNT({ PG, esc, members });
    LIVRE = PGH_LIVRE_MOUNT({ box, $, PG, pgInfo, memberMode, on, later, every, store, toast, tone, members, touch });
    if (window.JDW_PG_TEST) window.JDW_PG_LIVRE = LIVRE;
    relayout(); setTab(tab, false); activeSync(); renderMe(); renderFriends(); renderToday(); renderLink(); loadWallet(); loadCatalogs(); later(loadHouse, 900);
    // la 3D arrive APRÈS l'affichage (pas d'à-coup à l'ouverture)
    later(() => { (window.requestIdleCallback || ((f) => setTimeout(f, 1)))(() => { if (!dead) start3D(); }, { timeout: 600 }); }, 380);
    later(() => loadAvatars(true), 1500);
    later(() => loadSms(true), 1100);
    return {
      destroy() {
        if (dead) return; dead = true;
        callDestroy(); flySet(false); micStop(); sayStop(); if (WD.w) { try { WD.w.dispose(); } catch (e) { /* rien */ } WD.w = null; }
        for (const [t, ty, fn, o] of listeners) { try { t.removeEventListener(ty, fn, o); } catch (e) { /* rien */ } }
        for (const id of timers) clearTimeout(id); timers.clear();
        for (const id of ivals) clearInterval(id); ivals.clear();
        if (io) io.disconnect(); if (ro) ro.disconnect(); if (frIO) frIO.disconnect(); if (thRO) thRO.disconnect();
        if (SMS.off) { try { SMS.off(); } catch (e) { /* rien */ } SMS.off = null; } if (SMS.th) store.set('jdw.pegase.smsd.' + SMS.th.w, $.tht.value.slice(0, 500));
        if (GRAM) { try { GRAM.destroy(); } catch (e) { /* rien */ } GRAM = null; }
        if (CARTES) { try { CARTES.destroy(); } catch (e) { /* rien */ } CARTES = null; }
        if (LIVRE) { try { LIVRE.destroy(); } catch (e) { /* rien */ } LIVRE = null; }
        if (andOff) { try { andOff(); } catch (e) { /* rien */ } andOff = null; }
        if (nvOff) { try { nvOff(); } catch (e) { /* rien */ } nvOff = null; } if (NVL.on) { try { NV.stopListen(); } catch (e) { /* rien */ } }
        earBilan(); EAR.running = false; clearTimeout(EAR.kickT); earHalt();
        try { if (STG) STG.dispose(); } catch (e) { /* rien */ }
        STG = null; if (window.JDW_PG_HUB) try { delete window.JDW_PG_HUB; } catch (e) { window.JDW_PG_HUB = undefined; }
        root.textContent = '';
      },
      currentScore() { return 0; },   // pas de score : Quitter revient à la borne
      currentLevel() { return 1; }
    };
  }

  // ---------------------------------------------------------------------------
  // MOTS (1.20.5) : le moteur des mots (Vosk, assets/mots.vosk.bin) et le modèle français (assets/mots-fr-<v>.tgz, 42 Mo) INSTALLÉS D'AVANCE,
  // pour que le 1er 🎤 n'attende pas 19 s : la borne appelle JDW_GAMES.pegase.warm() au calme (bibliothèque, en ligne, Wi-Fi, une fois), le hub
  // aussi à son ouverture. Installer = télécharger + extraire + ranger dans IndexedDB (« /vosk », la base de vosk-browser) dans un worker NU,
  // SANS charger Kaldi (pas de 250 Mo en mémoire), puis le worker est arrêté. Ensuite le hub charge le modèle depuis l'appareil (~1-3 s).
  // Jamais sur les données mobiles ni en économie de données ; mémoire annoncée < 3 Go, place libre < 300 Mo ou pas d'IndexedDB : rien
  // (le 1er 🎤 télécharge comme avant). Échec : réessai après 6 h. Journal discret (une fois par séance) ; jamais de son ni de texte.
  const MOTS_V = 1, MOTS_KEY = 'jdw.pegase.mots';
  const MOTS = { inst: null, ls: new Set(), said: new Set() };
  const motsAbs = (p) => new URL(ROOT() + p, location.href).href;
  const motsUrls = () => ({ vosk: motsAbs('assets/mots.vosk.bin'), model: motsAbs('assets/mots-fr-' + MOTS_V + '.tgz') });
  const mStore = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* rien */ } } };
  const motsMetered = () => { try { const c = navigator.connection; return !!c && (!!c.saveData || c.type === 'cellular' || /(^|-)2g$/.test(c.effectiveType || '')); } catch (e) { return false; } };
  function motsReport(key, msg, extra) {
    if (MOTS.said.has(key)) return; MOTS.said.add(key);
    const d = Object.assign({ app: (navigator.userAgent.match(/BorneArcadeV\/([0-9.]+)/) || [])[1] || 'web', v: MOTS_V, mem: navigator.deviceMemory || 0 }, extra || {});
    try { const err = new Error('Pégase hub : ' + msg); err.stack = JSON.stringify(d); const ev = new Event('unhandledrejection'); ev.reason = err; ev.promise = Promise.resolve(); window.dispatchEvent(ev); } catch (e) { /* rien */ }
    if (window.JDW_PG_TEST) (window.__pgMOTSLOG = window.__pgMOTSLOG || []).push(['Pégase hub : ' + msg, d]);
  }
  const motsListen = (fn) => { MOTS.ls.add(fn); return () => MOTS.ls.delete(fn); };
  // le modèle est-il DANS l'appareil ? (clé « extracted.ok » de la base IndexedDB de vosk-browser ; base absente : pas créée par la question)
  function motsHas(modelUrl) {
    return new Promise((res) => {
      try {
        if (!window.indexedDB) return res(false);
        const key = '/vosk/' + modelUrl.replace(/[\W]/g, '_') + '/extracted.ok';
        const rq = indexedDB.open('/vosk'); let up = false;
        rq.onupgradeneeded = () => { up = true; try { rq.transaction.abort(); } catch (e) { /* rien */ } };
        rq.onerror = () => res(false);
        rq.onsuccess = () => { const db = rq.result; if (up) { db.close(); return res(false); }
          try { const tx = db.transaction('FILE_DATA', 'readonly'), g = tx.objectStore('FILE_DATA').getKey(key); g.onsuccess = () => { db.close(); res(g.result != null); }; g.onerror = () => { db.close(); res(false); }; } catch (e) { db.close(); res(false); } };
      } catch (e) { res(false); }
    });
  }
  async function motsVosk(url) {
    if (window.Vosk && window.Vosk.Model) return window.Vosk;
    const r = await fetch(url); if (!r.ok) throw new Error('vosk ' + r.status);
    const u = URL.createObjectURL(new Blob([await r.text()], { type: 'text/javascript' }));
    try { await new Promise((ok, ko) => { const sc = document.createElement('script'); sc.src = u; sc.onload = ok; sc.onerror = () => ko(new Error('vosk : script')); document.head.appendChild(sc); }); } finally { URL.revokeObjectURL(u); }
    if (!window.Vosk || !window.Vosk.Model) throw new Error('vosk : absent');
    return window.Vosk;
  }
  // installation (une à la fois) ; rend { ok, ms, why }
  function motsInstall(from) {
    if (MOTS.inst) return MOTS.inst;
    MOTS.inst = (async () => {
      const t0 = performance.now(), U = motsUrls();
      const V = await motsVosk(U.vosk);
      if (typeof V.jdwWorker !== 'function') throw new Error('moteur ancien');
      const w = V.jdwWorker();
      try {
        await new Promise((ok, ko) => {
          const tm = setTimeout(() => ko(new Error('trop long')), 6 * 60000);
          w.onmessage = (e) => { const m = e.data || {};
            if (m.event === 'jdwprogress') { for (const f of MOTS.ls) { try { f(m.phase, m.phase === 'dl' && m.of ? m.n / m.of : null); } catch (x) { /* rien */ } } }
            else if (m.event === 'jdwinstalled') { clearTimeout(tm); if (m.ok) ok(); else ko(new Error(m.error || 'échec')); } };
          w.onerror = (e) => { try { e.preventDefault(); } catch (x) { /* rien */ } clearTimeout(tm); ko(new Error('worker')); };
          w.postMessage({ action: 'set', key: 'logLevel', value: -1 });
          w.postMessage({ action: 'jdw', install: U.model });
        });
      } finally { try { w.terminate(); } catch (e) { /* rien */ } }
      mStore.set(MOTS_KEY, String(MOTS_V)); mStore.set(MOTS_KEY + '.essai', '');
      const ms = Math.round(performance.now() - t0);
      motsReport('inst', 'mots : installés d’avance (' + (from || '?') + ', ' + ms + ' ms)', { ms });
      return { ok: true, ms };
    })().catch((e) => {
      const why = String(e && e.message || e).slice(0, 100); mStore.set(MOTS_KEY + '.essai', String(Date.now()));
      motsReport('inst-ko', 'mots : installation impossible (' + why + ')', { from });
      return { ok: false, why };
    }).finally(() => { setTimeout(() => { MOTS.inst = null; }, 0); });
    return MOTS.inst;
  }
  // au calme : installer si besoin (rend { deja } | { ok, ms } | { non: raison })
  async function motsWarm(o = {}) {
    try {
      if (MOTS.inst) return MOTS.inst;
      if (typeof WebAssembly !== 'object' || typeof Worker === 'undefined' || !window.indexedDB) return { non: 'navigateur' };
      if (window.JDW_PG_TEST && window.JDW_PG_NOMOTS) return { non: 'essai' };
      const U = motsUrls();
      if (mStore.get(MOTS_KEY) === String(MOTS_V) && await motsHas(U.model)) return { deja: true };
      if (await motsHas(U.model)) { mStore.set(MOTS_KEY, String(MOTS_V)); return { deja: true }; }
      if (motsMetered()) return { non: 'données mobiles' };
      if (navigator.deviceMemory && navigator.deviceMemory < 3) return { non: 'mémoire' };
      const last = +(mStore.get(MOTS_KEY + '.essai') || 0); if (last && Date.now() - last < 6 * 3600e3 && !(window.JDW_PG_TEST && o.force)) return { non: 'réessai plus tard' };
      try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); if (e && e.quota && e.quota - (e.usage || 0) < 300 * 1048576) { motsReport('inst-place', 'mots : pas installés (place libre ' + Math.round((e.quota - (e.usage || 0)) / 1048576) + ' Mo)'); return { non: 'place' }; } } } catch (e) { /* rien */ }
      try { if (navigator.storage && navigator.storage.persist && navigator.storage.persisted && !(await navigator.storage.persisted())) navigator.storage.persist().catch(() => {}); } catch (e) { /* rien */ }
      // ancienne version gardée : place libérée avant la nouvelle
      const have = mStore.get(MOTS_KEY); if (have && have !== String(MOTS_V)) { try { indexedDB.deleteDatabase('/vosk'); } catch (e) { /* rien */ } }
      return await motsInstall(o.from || 'borne');
    } catch (e) { return { non: String(e && e.message || e).slice(0, 60) }; }
  }

  // ---------------------------------------------------------------------------
  // ENREGISTREMENT
  // ---------------------------------------------------------------------------
  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES.pegase = {
    id: 'pegase',
    title: 'Pégase',
    tagline: 'Ton avatar, tes copains, un monde magique… et le jeu à installer',
    accent: '#ffb46a',
    scoreLabel: 'points',
    noScore: true,   // pas de ligne « 👑 record » en haut : c'est une page, pas un jeu
    preview,
    // appelé par la borne au calme (bibliothèque, en ligne) : prépare les mots du micro de Pégase en arrière-plan (voir MOTS)
    warm(o) { return motsWarm(Object.assign({ from: 'borne' }, o || {})); },
    mount(root, api) { return mountHub(root, api); }
  };
})();
;(function () {   // 22 oct. 2026 (Pegase 3) : jour de la semaine + heure du jeu dans le hub, même règle que le jeu (PegaseHorloge.WeekDay, PegaseTemps.HourOf)
  const H = [5, 7, 17, 20, 29], M = [0, 6, 40, 52, 60], J = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  function heure(u) { const f = u / 3600 - Math.floor(u / 3600), m = f * 60; for (let i = 0; i < 4; i++) if (m < M[i + 1] || i === 3) { const h = H[i] + (H[i + 1] - H[i]) * (m - M[i]) / (M[i + 1] - M[i]); return h >= 24 ? h - 24 : h; } return 5; }
  function tick() {
    const els = document.querySelectorAll('.pgh-jour'); if (!els.length) return;
    const u = Date.now() / 1000, d = Math.floor(u / 3600), h = heure(u), hh = Math.floor(h), mm = Math.floor((h - hh) * 60), nuit = h >= 20 || h < 5;
    const t = ' · ' + (nuit ? '☾' : '☀') + ' ' + J[((d % 7) + 7) % 7] + ' ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    els.forEach(e => { if (e.textContent !== t) e.textContent = t; });
  }
  setInterval(tick, 1000);
})();
