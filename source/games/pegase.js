(() => {
  'use strict';

  // ===========================================================================
  // Pégase (id technique « pegase ») — LE HUB de Pégase dans la borne (pas le jeu : le jeu est l'appli Pégase, Unity, à installer).
  // EN ESSAI derrière la porte « labo » de la bibliothèque (…/jouer/?labo=pegase, ou 7 touches sur le titre dans l'appli).
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
      CHARS: () => CHARS,
      MOUTH_KEYS: () => MOUTH_KEYS,
      VIS: () => VIS,
      create: () => create,
      createLipSync: () => createLipSync,
      createMouth: () => createMouth,
      decode: () => decode,
      encode: () => encode,
      frenchVisemes: () => frenchVisemes
    });
    module.exports = __toCommonJS(main_exports);
    var T3 = __toESM(require("three"));
    var import_pg_env = require("pg-env");

    // src/avatar.js
    var T = __toESM(require("three"));
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
    var EXPR_OUI = { Mouth_Happy: 0.5, Mouth_Wide: 0.45, Brows_Raised: 0.3, Eyes_LowerClosed: 0.1 };
    var EXPR_NON = { Brows_Lowered: 0.55, Brow_Angry: 0.14, Mouth_Sad: 0.3, Mouth_Press: 0.3 };
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
      compose(rt, layers, size, normal = false, clear = 10119765) {
        const r = this.r, prevTarget = r.getRenderTarget(), prevAuto = r.autoClear, prevClear = r.getClearColor(new T.Color()), prevA = r.getClearAlpha();
        r.setRenderTarget(rt);
        r.autoClear = false;
        r.setClearColor(normal ? 8421631 : clear, normal ? 1 : 0);
        r.clear(true, false, false);
        const S = 2048, u = this.uni;
        for (const L of layers) {
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
        const n = g.attributes.position.count, P = g.attributes.position, N2 = g.attributes.normal, UV = g.attributes.uv;
        const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
        for (let i = 0; i < n; i++) {
          _v.fromBufferAttribute(P, i).applyMatrix4(K);
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
            if (!g.morphTargetsRelative) _v.sub(new T.Vector3().fromBufferAttribute(P, i));
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
        const P = p.geo.attributes.position, N2 = p.geo.attributes.normal, U = p.geo.attributes.uv;
        for (let i = 0; i < P.count; i++, o++) {
          pos.set([P.getX(i), P.getY(i), P.getZ(i)], o * 3);
          nrm.set([N2.getX(i), N2.getY(i), N2.getZ(i)], o * 3);
          const u = U ? U.getX(i) : 0.5, v = U ? U.getY(i) : 0.5;
          const [r0, r1, r2, r3] = p.rect;
          uv[o * 2] = (ax + (r0 + (r2 - r0) * u) * aw) / S;
          uv[o * 2 + 1] = (ay + (r1 + (r3 - r1) * (1 - v)) * ah) / S;
          const y = P.getY(i), z = P.getZ(i);
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
        const layers = await this._layers(d);
        if (token !== this._tok) return false;
        const P = new Map(parts.map((p) => [p.id, p]));
        const hidden = /* @__PURE__ */ new Set();
        for (const id of ids) {
          const it = W.items.get(id);
          if (!it) continue;
          for (const tg of it.tags) if (COVER[tg]) hidden.add(COVER[tg]);
        }
        const bodyParts = [{ p: W.parts.get("body"), hide: hidden }];
        const faceParts = [{ p: W.parts.get("head") }];
        for (const [slot, v] of Object.entries(d.it)) {
          const p = P.get(v[0]);
          if (!p) continue;
          (slot === "beard" ? faceParts : bodyParts).push({ p });
        }
        for (const id of [d.br, d.la, "teeth.stylized_basic_teeth"]) if (P.get(id)) faceParts.push({ p: P.get(id) });
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
        W.composer.compose(this.rt, layers, this.o.atlas);
        if (this.nrt) W.composer.compose(this.nrt, layers, this.o.atlas, true);
        this.group.scale.setScalar(d.h || 1);
        this.applyMorphs();
        this.setHairLength(d.hl);
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
        jobs.push(() => add(C.layers["under.top"].tex, [col("#ece6da"), col("#d8d0c2"), col("#ffffff")]));
        jobs.push(() => add(C.layers["under.bottom"].tex, [col("#5d6b86"), col("#ece6da"), col("#ffffff")]));
        if (d.so && d.so[0] && C.layers[d.so[0]]) jobs.push(() => add(C.layers[d.so[0]].tex, [W.color(d.so[1] || 0), W.color(d.so[2] == null ? 4 : d.so[2]), W.color(0)]));
        const face = FACES[d.fc] || FACES[0];
        jobs.push(() => add(C.base.head.tex[face.tex] || C.base.head.tex.basic, [skin.tone, skin.shade, skin.tone, col("#ffffff"), col("#f1dfd8"), col("#9c3a32"), col("#ffffff"), col("#ffffff"), col("#ffffff")]));
        for (const f of d.fx || []) {
          const l = C.layers[f];
          if (!l) continue;
          const cc = l.cols ? l.cols.map((i) => W.color(i)) : [skin.tone, skin.shade, skin.tone];
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
            cols[0] = hair;
            if (cols.length > 1) cols[1] = hair2;
            if (slot === "beard") cols = [hair, hair2, hair];
          }
          while (cols.length < 9) cols.push(cols[cols.length - 1]);
          jobs.push(() => add(it.tex, cols));
        }
        const res = await Promise.all(jobs.map((j) => j()));
        return res.flat().filter(Boolean);
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
      setHairLength(v) {
        const s = Math.max(0.7, Math.min(1.4, +v || 1));
        this.hairLen = s;
        for (const b of this.hairStrands()) b.scale.setScalar(s);
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
      laugh() {
        this.laughT = 1.8;
      }
      // « oui » : deux hochements de tête (le 2e plus petit) avec un petit sourire ; « non » : la tête fait non, sourcils un peu froncés
      yes() {
        this.yesT = 1.15;
      }
      no() {
        this.noT = 1.3;
      }
      busy() {
        return this.waveT > 0 || this.jumpT > 0 || this.laughT > 0 || this.yesT > 0 || this.noT > 0;
      }
      update(dt, cam) {
        this.t += dt;
        const tgt = this.laughT > 0 ? EXPR.content : this.yesT > 0 ? EXPR_OUI : this.noT > 0 ? EXPR_NON : this.exprFlash > 0 ? this.waveT > 0 ? EXPR.sourire : EXPR.content : this.exprTarget;
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
        ex.Eyes_UpperClosed = Math.min(1, (ex.Eyes_UpperClosed || 0) + bl * (1 - (ex.Eyes_UpperOpen || 0) * 0.3));
        ex.Eyes_UpperOpen = (ex.Eyes_UpperOpen || 0) * (1 - bl);
        if (this.talk && this.talk.w > 0) {
          const w = this.talk.w, v = this.talk.v || {};
          for (const k2 of ["Mouth_Happy", "Mouth_Wide", "Mouth_Oh", "Jaw_Open", "Mouth_Pucker", "Mouth_Press", "Mouth_Grimace", "Mouth_Sad"]) ex[k2] = (ex[k2] || 0) * (1 - 0.92 * w);
          for (const [k2, x] of Object.entries(v)) ex[k2] = Math.min(1.2, (ex[k2] || 0) + x * w);
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
      const P = g.attributes.position, N2 = g.attributes.normal, n = P.count, a = new Float32Array(n);
      const sm2 = (e0, e1, x) => {
        const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
        return t * t * (3 - 2 * t);
      };
      for (let i = 0; i < n; i++) {
        const x = Math.abs(P.getX(i)), y = P.getY(i), z = P.getZ(i), ny = N2.getY(i), nz = N2.getZ(i);
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
        const P = (n) => A.restWP.get(n);
        for (const [a, b] of [["upperarm_l", "lowerarm_l"], ["lowerarm_l", "hand_l"], ["upperarm_r", "lowerarm_r"], ["lowerarm_r", "hand_r"], ["hand_l", "middle_01_l"], ["hand_r", "middle_01_r"]])
          if (P(a) && P(b)) this.dirs.set(a, P(b).clone().sub(P(a)).normalize());
        this.fingers = [];
        for (const s of ["l", "r"]) for (const f of ["index", "middle", "ring", "pinky"]) for (const k of ["01", "02", "03"]) if (A.bones.has(`${f}_${k}_${s}`)) this.fingers.push({ n: `${f}_${k}_${s}`, s, k: +k, f });
        for (const s of ["l", "r"]) for (const k of ["01", "02", "03"]) if (A.bones.has(`thumb_${k}_${s}`)) this.fingers.push({ n: `thumb_${k}_${s}`, s, k: +k, f: "thumb" });
        this.side = {};
        for (const s of ["l", "r"]) {
          const a = P(`pinky_01_${s}`), b = P(`index_01_${s}`);
          if (a && b) this.side[s] = b.clone().sub(a).normalize();
        }
        this.R = /* @__PURE__ */ new Map();
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
      aim(n, child, target, accum) {
        const d0 = this.dirs.get(n);
        if (!d0) return new T.Quaternion();
        const tl = target.clone().applyQuaternion(accum.clone().invert());
        const q = new T.Quaternion().setFromUnitVectors(d0, tl.normalize());
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
        let lg = 0;
        if (A.laughT > 0) {
          A.laughT = Math.max(0, A.laughT - dt);
          const e = 1.8 - A.laughT;
          lg = Math.min(1, e / 0.2, A.laughT / 0.4);
        }
        const shake = lg * Math.sin(t * 26) * 0.5 + lg * 0.5;
        let yes = 0, no = 0;
        if (A.yesT > 0) {
          A.yesT = Math.max(0, A.yesT - dt);
          const p = 1 - A.yesT / 1.15, env2 = Math.min(1, p / 0.06, A.yesT / 0.12);
          yes = env2 * (p < 0.5 ? 0.17 : 0.12) * (1 - Math.cos(p * Math.PI * 4)) / 2;
        }
        if (A.noT > 0) {
          A.noT = Math.max(0, A.noT - dt);
          const p = 1 - A.noT / 1.3, env2 = Math.min(1, p / 0.08, A.noT / 0.2);
          no = env2 * 0.3 * (1 - 0.45 * p) * Math.sin(p * Math.PI * 2 * 2.3);
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
        this.setR("spine_03", qe(br * 0.016 - hop * 0.05 + crouch * 0.12 - air * 0.06 - shake * 0.05, -py * 0.3 - w * 0.08, -pr * 0.4 + w * 0.05));
        this.setR("spine_04", qe(br * 0.012, 0, 0));
        const lt = A.lookTarget, l = A.look;
        const wanderX = Math.sin(t * 0.37 + s) * 0.22 + Math.sin(t * 0.13 + s * 3) * 0.12, wanderY = Math.sin(t * 0.29 + s * 2) * 0.06;
        const gx = A.lookAt ? lt.x : wanderX, gy = A.lookAt ? lt.y : wanderY;
        l.x += (gx - l.x) * (1 - Math.exp(-dt * 3));
        l.y += (gy - l.y) * (1 - Math.exp(-dt * 3));
        this.setR("neck_01", qe(-l.y * 0.35 + yes * 0.35, l.x * 0.35 + no * 0.3, 0));
        const tk = A.talk && A.talk.w > 0 ? A.talk : null, nod = tk ? tk.nod || 0 : 0, tilt = tk ? tk.tilt || 0 : 0;
        this.setR("head", qe(-l.y * 0.55 + br * 0.01 + hop * 0.08 - shake * 0.16 - air * 0.08 + nod + yes, l.x * 0.5 + tilt * 0.5 + no, Math.sin(t * 0.21 + s) * 0.03 + w * 0.12 * Math.sin(t * 2.2)));
        for (const e of ["eyeRoot_l", "eyeRoot_r"]) if (A.bones.has(e)) this.setR(e, qe(-l.y * 0.25, l.x * 0.4, 0));
        if (tk && tk.asym) {
          const as = tk.asym * Math.min(1, tk.w);
          this.setR("jaw", qe(0, as * 0.03, as * 0.04));
          this.setR("mouth", qe(0, 0, as * 0.05));
        }
        this.setR("clavicle_l", qe(0, 0, br * 0.012 + hop * 0.05));
        this.setR("clavicle_r", qe(0, 0, -br * 0.012 - hop * 0.05));
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
          const wv = side === "r" ? w : 0;
          const up = new T.Vector3(sx * spread, -1 + air * 0.5, 0.04 + Math.sin(t * 0.8 + s + sx) * 0.01 + crouch * 0.25).normalize().lerp(new T.Vector3(sx * 0.82, 0.42, 0.3).normalize(), wv).normalize();
          const qU = this.aim("upperarm_" + side, null, up, pa);
          const pa2 = pa.clone().multiply(qU);
          const fo = new T.Vector3(sx * (spread * 0.6), -1, 0.32 + br * 0.01 + hop * 0.2).normalize().lerp(new T.Vector3(sx * 0.12 + Math.sin(t * 10) * 0.45, 1, 0.22).normalize(), wv).normalize();
          const qL = this.aim("lowerarm_" + side, null, fo, pa2);
          const pa3 = pa2.clone().multiply(qL);
          const hd = new T.Vector3(sx * 0.05, -1, 0.18).normalize().lerp(new T.Vector3(sx * 0.1 + Math.sin(t * 10 - 0.6) * 0.5, 1, 0.3).normalize(), wv).normalize();
          this.aim("hand_" + side, null, hd, pa3);
        }
        for (const f of this.fingers) {
          const ax = this.side[f.s];
          if (!ax) continue;
          const curl = (f.f === "thumb" ? 0.15 : 0.22 + (f.f === "pinky" ? 0.12 : f.f === "ring" ? 0.08 : 0)) * (f.k === 1 ? 0.8 : 1);
          this.setR(f.n, new T.Quaternion().setFromAxisAngle(ax, (f.s === "l" ? -1 : 1) * curl));
        }
        for (const b of A.extraBones) this.setR(b.name, qe(Math.sin(t * 1.3 + b.name.length) * 0.03 - hop * 0.06, 0, Math.sin(t * 0.9 + b.name.length * 0.7) * 0.03));
        this.apply();
        if (pel) pel.position.y = rl.p.y + hop * 0;
        A.group.position.y = (A.baseY || 0) + hop * 0.05 + air * 0.24 - crouch * 0.05;
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
    function rnd(seed) {
      let a = seed | 0;
      return () => {
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function makeStage(R, opts = {}) {
      const PHONE = !!opts.phone, r = rnd(11);
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
        const N2 = 56, pos = new Float32Array(N2 * 3), vel = new Float32Array(N2 * 3), life = new Float32Array(N2), seed = new Float32Array(N2);
        const g = new T2.BufferGeometry();
        g.setAttribute("position", new T2.BufferAttribute(pos, 3));
        g.setAttribute("life", new T2.BufferAttribute(life, 1));
        g.setAttribute("seed", new T2.BufferAttribute(seed, 1));
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
              seed[i] = Math.random();
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
      const P = fs > 13e3 ? 14 : 12;
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
      const lagw = new Float32Array(P + 1);
      for (let k = 0; k <= P; k++) lagw[k] = Math.exp(-0.5 * Math.pow(2 * Math.PI * 50 * k / fs, 2));
      const HP1 = biquad("hp", 1e3, sr), HP25 = biquad("hp", 2500, sr), HP55 = biquad("hp", Math.min(5500, sr * 0.4), sr), LP4 = biquad("lp", 400, sr), HP4 = biquad("hp", 400, sr);
      const xd = new Float32Array(ND), r = new Float64Array(P + 1), a = new Float64Array(P + 1), tmp = new Float64Array(P + 1);
      const re = new Float64Array(P), im = new Float64Array(P);
      let rootsOk = false;
      const st = { floor: 3e-3, pk: 0.03, f0m: 0, f0n: 0, k: 1.12, speechT: 9, lab: 0, hist: [], t: 0 };
      const feat = { hm: 0, L: 0, rms: 0, hf: 0, hf2: 0, low: 0, pg: 0, zcr: 0, F1: 0, F2: 0, F3: 0, B1: 0, B2: 0, voiced: 0, k: 1 };
      function lpc() {
        for (let k = 0; k <= P; k++) {
          let s = 0;
          for (let i = k; i < ND; i++) s += xd[i] * xd[i - k];
          r[k] = s * lagw[k];
        }
        if (r[0] < 1e-12) return 0;
        r[0] *= 1.0001;
        a.fill(0);
        a[0] = 1;
        let err = r[0];
        for (let i = 1; i <= P; i++) {
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
        if (!rootsOk) for (let i = 0; i < P; i++) {
          const ang = (i + 0.5) / P * 2 * Math.PI + 0.1, rr = 0.9;
          re[i] = rr * Math.cos(ang);
          im[i] = rr * Math.sin(ang);
        }
        for (let it = 0; it < (rootsOk ? 24 : 70); it++) {
          let mv = 0;
          for (let i = 0; i < P; i++) {
            let pr = 1, pi = 0;
            const zr = re[i], zi = im[i];
            for (let k = 1; k <= P; k++) {
              const nr = pr * zr - pi * zi + a[k], ni = pr * zi + pi * zr;
              pr = nr;
              pi = ni;
            }
            let qr = 1, qi = 0;
            for (let j = 0; j < P; j++) {
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
        for (let i = 0; i < P; i++) if (!isFinite(re[i]) || !isFinite(im[i]) || Math.hypot(re[i], im[i]) > 1.5) {
          rootsOk = false;
          break;
        }
        const out = [];
        if (!rootsOk) return out;
        for (let i = 0; i < P; i++) {
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
      return { analyze, feat, st, fs, P, D };
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
      let seed = (o.seed || Math.random() * 1e6) | 0;
      const rnd2 = () => {
        seed = seed * 1664525 + 1013904223 >>> 0;
        return seed / 4294967296;
      };
      const ps = new Float32Array(NV);
      ps[0] = 1;
      const out = Object.fromEntries(MOUTH_KEYS.map((k) => [k, 0]));
      const S = { cur: 0, dwell: 1, lastV: VI.E, lastVw: 0, lv: 0, t: 0, idle: 0, twT: 2 + rnd2() * 3, tw: 0, twK: 0, asym: 0, asymT: 0, as: (rnd2() - 0.5) * 0.6 };
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
          const P = POSE[v];
          jaw += P[0] * w;
          for (const k in P[1]) tgt[k] += P[1][k] * w;
          sw += w;
        };
        add(cur, 0.65);
        for (let i = 0; i < NV; i++) if (ps[i] > 0.05) add(VIS[i], 0.35 * ps[i]);
        if (!VOWEL.has(cur) && cur !== "M" && cur !== "sil" && S.lastVw > 0) {
          const P = POSE[VIS[S.lastV]], c = (cur === "T" ? 0.5 : 0.3) * S.lastVw;
          for (const k in P[1]) if (k !== "Mouth_Press") tgt[k] += P[1][k] * c;
          jaw += P[0] * c * 0.4;
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
          S.twK = rnd2() < 0.5 ? 0 : 1;
          S.twT = 2.5 + rnd2() * 5;
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
          S.as = (rnd2() - 0.5) * 0.8;
          S.asymT = 1.5 + rnd2() * 3;
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
      const FRAMES = { corps: { y: 0.9, h: 2.5 }, buste: { y: 1.25, h: 1.55 }, tete: { y: 1.58, h: 0.92 }, visage: { y: 1.62, h: 0.7 }, jambes: { y: 0.55, h: 1.35 }, pieds: { y: 0.3, h: 0.95 }, parle: { y: 1.47, h: 1 } };
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
      let gi = 0;
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
          lookT = 2;
          if (kind === "oui") A.yes();
          else A.no();
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
      function hitAvatar(e) {
        const r = canvas.getBoundingClientRect(), p = (x2, y2) => {
          const v = new T3.Vector3(x2, y2, 0).project(cam);
          return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height };
        };
        const a = p(0, 1.95), b = p(0, -0.1), hw = Math.abs(b.y - a.y) * 0.24, x = e.clientX - r.left, y = e.clientY - r.top;
        return y > a.y && y < b.y && Math.abs(x - (a.x + b.x) / 2) < hw;
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
        setFocus(f) {
          view.focus = f;
          layout();
        },
        setTalk(fn) {
          talkFn = typeof fn === "function" ? fn : null;
          if (!talkFn) A.talk = null;
        },
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
    none: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M6.5 6.5l11 11"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.6 6.2 6.7.6-5.1 4.4 1.6 6.6L12 16.8l-5.8 3.5 1.6-6.6-5.1-4.4 6.7-.6z"/></svg>',
    hat: '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="15.5" rx="10.5" ry="3.6" opacity=".55"/><path d="M7 15c0-5 2.2-8 5-8s5 3 5 8c-3 .9-7 .9-10 0z"/><path d="M7.4 13.2c3 .8 6.2.8 9.2 0" stroke="#7a3d1f" stroke-width="1.4" fill="none"/></svg>',
    glasses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/><path d="M11 12.5c.6-.8 1.4-.8 2 0M3 12l-1.5-2M21 12l1.5-2"/></svg>',
    horns: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 19c-2-5-1-11 2-15 0 4 1 7 4 9-2 1-4 3-6 6zM19 19c2-5 1-11-2-15 0 4-1 7-4 9 2 1 4 3 6 6z"/></svg>',
    antenna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 20c0-6-2-10-4-13M16 20c0-6 2-10 4-13"/><circle cx="4" cy="5.5" r="2.4" fill="currentColor"/><circle cx="20" cy="5.5" r="2.4" fill="currentColor"/></svg>',
    dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
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
.pgh-gl{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;z-index:1;outline:none;opacity:0;transition:opacity .8s ease}
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
.pgh-eye{display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:999px;font:700 11px ${FB};letter-spacing:.14em;text-transform:uppercase;color:#ffe2ad;background:rgba(30,16,50,.45);box-shadow:inset 0 0 0 1px rgba(255,214,140,.35);backdrop-filter:blur(4px)}
.pgh-eye i{width:6px;height:6px;border-radius:50%;background:#ffd36a;box-shadow:0 0 10px #ffd36a}
.pgh-title{margin:8px 0 0;font:400 clamp(46px,14vw,64px)/1 ${FD};letter-spacing:.03em;color:#fff3dc;
  background:linear-gradient(180deg,#fffaf0 15%,#ffe2a6 55%,#ffb46a 95%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 3px 0 rgba(106,58,122,.85)) drop-shadow(0 0 22px rgba(255,190,110,.55))}
.pgh-pitch{margin:10px auto 0;max-width:420px;font:600 15px/1.42 ${FB};color:#fff1dd;text-shadow:0 2px 10px rgba(20,8,30,.85)}
.pgh-bottom{position:absolute;z-index:4;left:0;right:0;bottom:0;padding:0 16px 18px;display:grid;gap:12px;justify-items:center;pointer-events:none}
.pgh-bottom > *{pointer-events:auto}
.pgh-emotes{display:flex;gap:9px;justify-content:center}
.pgh-emo{width:50px;height:50px;border-radius:50%;border:0;display:grid;place-items:center;font-size:22px;line-height:1;color:#fff;padding:0;
  background:radial-gradient(circle at 50% 35%,rgba(110,70,140,.78),rgba(34,20,56,.78));box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.5),0 6px 16px rgba(0,0,0,.35);backdrop-filter:blur(3px);transition:transform .12s, box-shadow .2s}
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
.pgh-cta.glass{color:#fff4e2;background:rgba(40,24,66,.62);box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.55),0 8px 20px rgba(0,0,0,.3);backdrop-filter:blur(6px)}
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
@media (min-width:760px){.pgh-soongrid{grid-template-columns:repeat(3,1fr);gap:16px}}
.pgh-fut{position:relative;overflow:hidden;padding:16px 14px 14px;border-radius:20px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}
.pgh-fut::before{content:'';position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,var(--g,rgba(255,190,110,.25)),rgba(0,0,0,0) 70%)}
.pgh-fut .em{position:relative;width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-size:24px;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25)}
.pgh-fut h4{position:relative;margin:12px 0 0;font:700 15px/1.25 ${FB};color:#fff3dc}
.pgh-fut p{position:relative;margin:5px 0 0;font:600 12.5px/1.45 ${FB};color:var(--soft)}
.pgh-fut .pgh-chip{position:absolute;right:10px;top:12px;background:rgba(255,214,140,.16);color:#ffe2ad;box-shadow:inset 0 0 0 1px rgba(255,214,140,.35)}
.pgh-foot{max-width:1080px;margin:0 auto;padding:26px 16px calc(30px + env(safe-area-inset-bottom,0px));text-align:center;font:600 12px/1.5 ${FB};color:rgba(255,240,220,.5)}
/* ---------- onglets (collés en haut en défilant) ---------- */
.pgh-tabs{position:sticky;top:0;z-index:8;display:flex;justify-content:center;gap:4px;padding:8px 12px 0;background:linear-gradient(180deg,rgba(16,12,34,.96),rgba(16,12,34,.9));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 1px 0 rgba(255,214,140,.16),0 10px 24px rgba(0,0,0,.25)}
.pgh-tab{position:relative;flex:1 1 0;max-width:200px;min-height:46px;border:0;background:none;padding:6px 8px 10px;display:flex;align-items:center;justify-content:center;gap:7px;font:700 14.5px ${FB};letter-spacing:.02em;color:rgba(255,240,220,.62);transition:color .2s}
.pgh-tab svg{width:19px;height:19px;flex:none}
.pgh-tab.on{color:#ffe2a6}
.pgh-tab .bdg{min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:none;align-items:center;justify-content:center;font:700 11.5px ${FB};color:#0f2a18;background:#7cf0a0}
.pgh-tab .bdg.on{display:inline-flex}
.pgh-tabs .ind{position:absolute;bottom:0;left:0;width:0;height:3px;border-radius:3px 3px 0 0;background:linear-gradient(90deg,#ffd27a,#ff9ec4);box-shadow:0 0 12px rgba(255,190,110,.7);transition:left .32s cubic-bezier(.3,.8,.3,1),width .32s cubic-bezier(.3,.8,.3,1)}
.pgh-pane{display:none;min-height:60vh}
.pgh-pane.on{display:block;animation:pghPane .35s ease}
@keyframes pghPane{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
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
.pgh-fvbtns .pgh-cta{min-height:52px;font-size:14px;flex-direction:column;gap:2px;line-height:1.1}
.pgh-fvbtns .pgh-cta small{font:700 10px ${FB};letter-spacing:.08em;text-transform:uppercase;color:#ffcf8a}
/* ---------- modifier l'avatar SUR PLACE (panneau du bas ; côté droit en paysage) ---------- */
.pgh-hero .pgh-copy,.pgh-hero .pgh-bottom{transition:opacity .35s,transform .35s}
.pgh.editing .pgh-hero .pgh-copy{opacity:0;transform:translateY(-16px);pointer-events:none}
.pgh.editing .pgh-hero .pgh-bottom{opacity:0;transform:translateY(16px);pointer-events:none}
.pgh.editing .pgh-scroll{overflow:hidden}
.pgh.editing .pgh-name,.pgh.editing .pgh-hint{opacity:0!important}
.pgh-ed{position:absolute;left:0;right:0;bottom:0;z-index:15;height:54%;display:flex;flex-direction:column;border-radius:24px 24px 0 0;background:linear-gradient(180deg,rgba(36,24,66,.94),rgba(20,13,38,.97));backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 -12px 34px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,214,140,.32);transform:translateY(105%);transition:transform .42s cubic-bezier(.2,.85,.25,1),visibility 0s .42s;visibility:hidden}
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
.pgh-emo.say.on{box-shadow:inset 0 0 0 2px #ffd36a,0 0 18px rgba(255,211,106,.55)}
.pgh-micm .pgh-mcard .ic{font-size:44px;line-height:1;margin:6px 0 2px}
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
.pgh-toast{position:absolute;left:50%;top:14px;z-index:40;transform:translate(-50%,-10px);max-width:88%;padding:10px 16px;border-radius:16px;text-align:center;font:700 14px ${FB};color:#3a1a05;
  background:linear-gradient(180deg,#fff1c8,#ffd27e);box-shadow:0 10px 26px rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .35s,transform .35s}
.pgh-toast.on{opacity:1;transform:translate(-50%,0)}
@media (prefers-reduced-motion:reduce){.pgh-bg{animation:none}.pgh-hint{animation:none}}
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
    ['village', 'Le village dans les arbres', 'Ta maison t\'attend parmi celles des habitants'],
    ['pont', 'Le pont rouge', 'Et de l\'autre côté, le pré de Pégase…'],
    ['nuit', 'La nuit aux lanternes', 'Fenêtres allumées et lucioles sur la place'],
    ['chat', 'Le chat des toits', 'Timide : approche-toi doucement… ou zoome !'],
    ['auguste', 'Papi Auguste', 'Le maire t\'accueille et te confie tes premières missions']
  ];
  const FUTURE = [
    ['🗓️', 'Missions du jour', 'Chaque matin, de petites missions : photographier le chat, récolter des radis… et des écus à gagner.', 'rgba(255,200,110,.28)'],
    ['🏡', 'Chez les copains', 'Vois où se promènent tes copains dans Pégase et va visiter leur maison.', 'rgba(255,150,190,.26)'],
    ['🏆', 'Classement', 'La plus belle collection, les plus belles photos, les plus longues séries de jours.', 'rgba(255,220,120,.28)'],
    ['🖼️', 'Album et musée', 'Tes photos du jeu arrivent ici ; le musée de la salle garde les plus belles. Un ❤️ pour voter.', 'rgba(170,150,255,.26)'],
    ['📱', 'Le téléphone de ton personnage', 'Dans le jeu, ton avatar sort son téléphone : missions, messages, carte… comme ici.', 'rgba(120,200,255,.24)'],
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
  function buildPage(FD, FB, who) {
    const steps = [
      ['dl', 'Télécharge', 'Le fichier <q data-h="zipn">Pegase-PC.zip</q> arrive dans ton dossier <q>Téléchargements</q>.'],
      ['zip', 'Extrais-le', 'Clic droit sur le fichier, puis <q>Extraire tout…</q> et <q>Extraire</q>.'],
      ['play', 'Lance Pegase.exe', 'Dans le dossier <q>Pegase</q>, double-clique sur <q>Pegase.exe</q>. Bon voyage !']
    ];
    return `<style>${PGH_CSS(FD, FB)}</style>` + LU_DEFS + nbsp(`
<div class="pgh-scroll" data-h="scroll">
  <section class="pgh-hero" data-h="hero">
    <img class="pgh-bg" data-h="bg" alt="" src="${IMG('lac')}" fetchpriority="high" decoding="async">
    <div class="pgh-veil"></div>
    <canvas class="pgh-fly" data-h="fly"></canvas>
    <canvas class="pgh-gl" data-h="gl" tabindex="-1" aria-label="Ton avatar : glisse pour le faire tourner, touche-le pour qu'il réagisse"></canvas>
    <div class="pgh-wait" data-h="wait"><i></i><span data-h="waitt">Ton avatar arrive…</span><b><u data-h="waitb"></u></b></div>
    <div class="pgh-name" data-h="name">${esc(who)}</div>
    <div class="pgh-hint" data-h="hint">👆 Touche-moi !</div>
    <div class="pgh-copy">
      <span class="pgh-eye"><i></i>Nouveau monde · en essai</span>
      <h1 class="pgh-title">Pégase</h1>
      <p class="pgh-pitch">Ta petite vie dans un monde magique… et quelque part dans le ciel, <b>Pégase</b>, le cheval ailé.</p>
      <div class="pgh-ctas2"><button class="pgh-cta gold" data-h="go-av2">${PGH_SVG.edit}<span data-h="avlab2">Créer mon avatar</span></button><button class="pgh-cta glass" data-h="go-dl">${PGH_SVG.dl}<span>Télécharger le jeu</span></button></div>
    </div>
    <div class="pgh-bottom">
      <div class="pgh-emotes" data-h="emotes">${EMOTES.map(([k, e, t]) => `<button class="pgh-emo" data-emo="${k}" aria-label="${t}" title="${t}">${e}<small>${t}</small></button>`).join('')}<div class="pgh-emowrap"><button class="pgh-emo more" data-h="emomore" aria-label="Autres gestes" title="Autres gestes" aria-expanded="false"><span>⋯</span></button><div class="pgh-emofan" data-h="emofan">${EMOTES_MORE.map(([k, e, t]) => `<button class="pgh-emo" data-emo="${k}" aria-label="${t}" title="${t}">${e}<small>${t}</small></button>`).join('')}</div></div><button class="pgh-emo mic" data-h="mic" aria-label="Parler : la bouche de ton avatar suit ta voix" title="Parler (micro)"><span>🎤</span></button><button class="pgh-emo say" data-h="say" aria-label="Écouter ton avatar dire bonjour" title="Écouter ton avatar parler"><span>💬</span></button></div>
      <div class="pgh-ctas"><button class="pgh-cta gold" data-h="go-av">${PGH_SVG.edit}<span data-h="avlab">Modifier</span></button><button class="pgh-cta glass" data-h="go-dl1">${PGH_SVG.dl}<span>Télécharger</span></button></div>
      <div class="pgh-small" data-h="small">Gratuit · PC Windows · Android bientôt</div>
    </div>
  </section>
  <nav class="pgh-tabs" data-h="tabs" role="tablist" aria-label="Pégase">
    <button class="pgh-tab" role="tab" data-tab="moi">${PGH_SVG.me}<span>Moi</span></button>
    <button class="pgh-tab" role="tab" data-tab="amis">${PGH_SVG.friends}<span>Amis</span><span class="bdg" data-h="frbdg"></span></button>
    <button class="pgh-tab" role="tab" data-tab="infos">${PGH_SVG.info}<span>Infos</span></button>
    <i class="ind" data-h="tabind"></i>
  </nav>
  <div class="pgh-pane" data-pane="moi">
    <section class="pgh-sec" data-h="secav">
      <div class="pgh-frhead"><h2 class="pgh-h2">Mon avatar</h2><span class="pgh-wallet" data-h="wallet" hidden title="Tes lucioles (la monnaie de Pégase)">${LU('big')}<b data-h="walletn">300</b><small>lucioles</small></span></div>
      <p class="pgh-sub">Ton personnage dans Pégase : visage, coiffure, vêtements, accessoires… Crée-le comme tu veux, il te suit dans le jeu.</p>
      <div class="pgh-card pgh-me">
        <div class="pgh-me-ico" data-h="meico"><i></i><b></b><img alt="" data-h="meimg"></div>
        <div><h3 data-h="metitle">Ton avatar</h3><p data-h="mesub">Pas encore choisi : voici l'exploratrice du village.</p><div class="pgh-tags" data-h="metags"></div></div>
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
    <section class="pgh-sec" data-h="secfr">
      <div class="pgh-frhead"><h2 class="pgh-h2">Les copains de la salle</h2><span class="pgh-frcount" data-h="frcount"></span></div>
      <p class="pgh-sub" data-h="frsub">Leurs avatars, et qui est là en ce moment.</p>
      <div data-h="frbox"></div>
    </section>
  </div>
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
      <p class="pgh-sub">Cette page deviendra la place du village : tout ce qui se passe dans Pégase, depuis ton téléphone.</p>
      <div class="pgh-soongrid">${FUTURE.map(([e, t, p, g]) => `<div class="pgh-fut" style="--g:${g}"><span class="pgh-chip">Bientôt</span><div class="em">${e}</div><h4>${esc(t)}</h4><p>${esc(p)}</p></div>`).join('')}</div>
    </section>
    <div class="pgh-foot">Pégase est en essai : merci de tester ! ✦ Les images de cette page viennent du jeu.</div>
  </div>
</div>
<div class="pgh-ed" data-h="ed" role="dialog" aria-label="Modifier mon avatar">
  <div class="pgh-edtop"><div class="t"><b>Mon avatar</b><span data-h="ddesc"></span></div>
    <button data-h="dundo" aria-label="Revenir en arrière" title="Revenir en arrière" disabled>${PGH_SVG.undo}</button><button data-h="dx" aria-label="Fermer sans enregistrer" title="Fermer">✕</button></div>
  <div class="pgh-edcats" role="tablist">${EDCATS.map((c) => `<button class="pgh-edcat" data-cat="${c.k}" role="tab">${PGH_SVG[c.ic] || ''}<span>${c.n}</span><em></em></button>`).join('')}</div>
  <div class="pgh-edgrid" data-h="dgrid"></div>
  <div class="pgh-lock" data-h="lock"><span class="ic" data-h="lockic">${PGH_SVG.lock}</span><div class="t"><b><span data-h="lockn"></span><span class="pgh-tier" data-h="lockt"></span></b><p data-h="lockp"></p></div><button data-h="lockx">Enlever</button></div>
  <div class="pgh-dbtns"><button class="pgh-cta glass rnd" data-h="drnd" aria-label="Au hasard" title="Au hasard">${PGH_SVG.dice}</button><button class="pgh-cta glass" data-h="dno">Annuler</button><button class="pgh-cta gold" data-h="dok">${PGH_SVG.check}<span>Enregistrer</span></button></div>
</div>
<div class="pgh-fv" data-h="fv" role="dialog" aria-label="Un copain">
  <div class="pgh-fvstage" data-h="fvstage"><div class="pgh-fvnone" data-h="fvnone"><div><div class="ped"><span class="sil"></span><span data-h="fvhead"></span></div><p data-h="fvnonet"></p></div></div></div>
  <div class="pgh-fvpanel">
    <div class="pgh-fvhead"><b data-h="fvname"></b><button class="pgh-dclose" data-h="fvx" aria-label="Fermer">✕</button></div>
    <span class="pgh-fvst" data-h="fvst"><i></i><span data-h="fvstt"></span></span>
    <p class="pgh-fvdesc" data-h="fvdesc"></p>
    <div class="pgh-fvemo" data-h="fvemo">${EMOTES_ALL.map(([k, e, t]) => `<button class="pgh-emo" data-emo="${k}" aria-label="${t}" title="${t}">${e}</button>`).join('')}</div>
    <div class="pgh-fvbtns"><button class="pgh-cta glass" data-h="fvcall"><span>📞 Appeler</span><small>bientôt</small></button><button class="pgh-cta glass" data-h="fvhouse"><span>🏡 Visiter sa maison</span><small>bientôt</small></button></div>
  </div>
</div>
<div class="pgh-modal" data-h="pmodal" role="dialog" aria-label="Ma photo de profil"><div class="pgh-mcard">
  <h3>Ma photo de profil</h3>
  <div class="pgh-mprev"><div class="cut"><img alt="" data-h="pimg"></div><div class="rond"><img alt="" data-h="pimg2"></div></div>
  <p data-h="ptext"></p>
  <div class="pgh-mscope" data-h="pscope"></div>
  <div class="pgh-mbtns"><button class="pgh-cta glass" data-h="pno">Annuler</button><button class="pgh-cta gold" data-h="pok">${PGH_SVG.check}<span>Utiliser cette photo</span></button></div>
</div></div>
<div class="pgh-modal pgh-micm" data-h="micm" role="dialog" aria-label="Le micro"><div class="pgh-mcard">
  <div class="ic">🎤</div><h3>Fais parler ton avatar</h3>
  <p>Parle, et la bouche de ton avatar bouge avec ta voix. Le son est analysé <b>ici, sur ton appareil</b> : rien n'est enregistré, rien n'est envoyé. Touche encore 🎤 pour couper le micro.</p>
  <div class="pgh-mbtns"><button class="pgh-cta glass" data-h="micno">Pas maintenant</button><button class="pgh-cta gold" data-h="micok"><span>Autoriser le micro</span></button></div>
</div></div>
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
    return { state: 'ok', version: j.version != null ? String(j.version) : '', size: +j.size || 0, sha256: /^[0-9a-f]{64}$/i.test(j.sha256 || '') ? String(j.sha256).toLowerCase() : '', url, notes: notes.slice(0, 8) };
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
    { k: 'cheveux', n: 'Coiffures', ic: 'hair', fr: 'tete' }, { k: 'barbe', n: 'Barbe', ic: 'beard', fr: 'visage' }, { k: 'haut', n: 'Hauts', ic: 'shirt', fr: 'buste' }, { k: 'bas', n: 'Bas', ic: 'pants', fr: 'jambes' },
    { k: 'tenue', n: 'Robes', ic: 'dress', fr: 'corps' }, { k: 'pieds', n: 'Chaussures', ic: 'shoe', fr: 'pieds' }, { k: 'chapeau', n: 'Chapeaux', ic: 'tophat', fr: 'tete' },
    { k: 'acc', n: 'Accessoires', ic: 'glasses', fr: 'buste' }];
  const SLOT_OF_CAT = { haut: ['top'], bas: ['bot'], tenue: ['ovr'], pieds: ['feet'], chapeau: ['hat', 'hacc'], acc: ['glass', 'glov'] };
  Object.assign(PGH_SVG, {
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
    const $ = {}; box.querySelectorAll('[data-h]').forEach((n) => { $[n.dataset.h] = n; });
    const listeners = [], timers = new Set(), ivals = new Set(); let dead = false;
    const on = (t, ty, fn, o) => { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); };
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };
    const every = (fn, ms) => { const id = setInterval(() => { if (!dead) fn(); }, ms); ivals.add(id); return id; };
    const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* rien */ } } };
    const report = (msg, detail) => { try { const err = new Error(msg); err.stack = detail || msg; const ev = new Event('unhandledrejection'); ev.reason = err; ev.promise = Promise.resolve(); window.dispatchEvent(ev); } catch (e) { /* rien */ } };
    const tone = (a, b) => { try { api && api.audio && api.audio.tone(a, 0.12, 'sine', 0.045, b); } catch (e) { /* rien */ } };
    let toastT = 0;
    const toast = (s) => { $.toast.textContent = s; $.toast.classList.add('on'); clearTimeout(toastT); toastT = later(() => $.toast.classList.remove('on'), 2800); };
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
      if (SECRET.has(k)) return { r: 'secret' };
      if (REWARD[k]) return { r: 'cadeau', how: REWARD[k] };
      if (k.startsWith('look:')) { const [r, p] = LOOK_LOCK[+k.slice(5)] || ['rare', 450]; return { r, p }; }
      if (k.startsWith('sk:')) { const [r, p] = SKIN_LOCK[+k.slice(3)] || ['rare', 300]; return { r, p }; }
      if (k.startsWith('ey:')) return { r: 'rare', p: 200 };
      if (k.startsWith('hc:')) return { r: 'rare', p: 120 };
      if (k.startsWith('fc:')) { const [r, p] = FACE_LOCK[+k.slice(3)] || ['commun', 120]; return { r, p }; }
      if (k.startsWith('pu:')) return { r: 'commun', p: 80 };
      if (k === 'elf') return { r: 'legend', p: 400 };
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

    // ---------- lucioles (porte-monnaie, onglet Moi) ----------
    let wallet = null;
    function renderWallet() { const i = pgInfo(); $.wallet.hidden = !(memberMode() && i.online !== false) || wallet == null; if (wallet != null) $.walletn.textContent = Number(wallet).toLocaleString('fr-FR'); }
    async function loadWallet() {
      if (!memberMode()) { renderWallet(); return; }
      try { const r = await PG.rpc('pg_me', {}); if (dead) return; const j = Array.isArray(r) ? r[0] : r; if (j && Number.isFinite(+j.ecus)) wallet = +j.ecus;
        if (j && Array.isArray(j.owned)) for (const x of j.owned) if (typeof x === 'string') OWNED.add(x); } catch (e) { /* hors ligne : rien */ }
      renderWallet();
    }

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
      const cp = box.querySelector('.pgh-copy').getBoundingClientRect(), top = cp.bottom - r.top + 30, bot = $.emotes.getBoundingClientRect().top - r.top - 6;
      return { x: 0, y: top, w, h: Math.max(180, bot - top) };
    }
    function fvFocus() { const r = $.fvstage.getBoundingClientRect(); return { x: r.width * 0.05, y: wide ? 24 : 12, w: r.width * 0.9, h: r.height - (wide ? 48 : 18) }; }
    let STG = null, PGM = null, editing = false, friendOn = null;
    function placeStage() {
      const f = friendOn ? fvFocus() : heroFocus();
      if (STG) STG.setFocus(f);
      $.wait.style.left = (f.x + f.w / 2) + 'px'; $.wait.style.top = (f.y + f.h * 0.52) + 'px';
    }

    // ---------- Pégase qui passe dans le ciel (2D) ----------
    const fx = $.fly.getContext('2d');
    let flyW = 0, flyH = 0;
    function flySize() { const dpr = Math.min(1.5, window.devicePixelRatio || 1); flyW = $.hero.offsetWidth; flyH = $.hero.offsetHeight; $.fly.width = Math.round(flyW * dpr); $.fly.height = Math.round(flyH * dpr); fx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function flyDraw(t) {
      const w = flyW, h = flyH; fx.clearRect(0, 0, w, h);
      const P = 14, k = (t % P) / P; if (k > 0.62) return;
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
      if (STG) STG.setActive(vis && (editing || !!friendOn || heroVis));
      flySet(vis && heroVis && !editing && !friendOn && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches));
    }
    function onHead(x, y) {
      if (editing || friendOn) return;
      if (Math.abs(x - lastNX) < 0.4 && Math.abs(y - lastNY) < 0.4) return; lastNX = x; lastNY = y;
      const fy = (STG && STG.view.focus) ? STG.view.focus.y + 26 : 26; y = Math.max(fy, y);
      $.name.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
      $.hint.style.transform = `translate(${(x + 46).toFixed(1)}px,${(y + 34).toFixed(1)}px)`;
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
        const mod = PG_FACTORY((n) => (n === 'three' ? window.JDW_PG3 : { env })); PGM = mod;
        const SG = await mod.create($.gl, { onFrame: onHead, onGesture: gestured, keep: !!window.JDW_PG_TEST });
        if (dead) { SG.dispose(); return; }
        STG = SG; placeStage(); activeSync();
        await catReady;
        initLooks();
        await SG.setLook(D);
        if (dead) return;
        $.wait.classList.remove('on'); $.gl.classList.add('on'); if (!editing && !friendOn) $.name.classList.add('on');
        if (!hintDone) later(() => { if (!dead && !editing) $.hint.classList.add('on'); later(() => $.hint.classList.remove('on'), 7000); }, 1200);
        meShot();
        later(() => { if (STG && !editing && !friendOn) STG.gesture('wave'); }, 900);
        window.JDW_PG_HUB = { stage: SG, state: () => ({ saved: SV, look: D, preset, editing, friend: friendOn && friendOn.name, wide, short, tab, info: SG.info(), ready: SG.ready(),
          friends: FR.list.length, thumbs: STORE.thumbs.size, srv: Object.assign({ state: srvState }, srv), wallet, locked: lockedIn(D),
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
      hintOff();
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
      const was = MIC.on; MIC.on = false; if (STG) { STG.setTalk(null); if (was) { STG.setHome(false); STG.setFrame(editing ? (FR_CAT[cat] || 'corps') : 'corps'); } }
      try { if (MIC.stream) MIC.stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* rien */ }
      try { if (MIC.ctx) MIC.ctx.close(); } catch (e) { /* rien */ }
      MIC.stream = MIC.ctx = MIC.an = null; micUi();
    }
    async function micStart() {
      if (MIC.busy || MIC.on) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('🎤 Ce navigateur ne donne pas accès au micro'); return; }
      if (!STG || !STG.ready()) { toast('Ton avatar arrive…'); return; }
      MIC.busy = true;
      try {
        const AC = window.AudioContext || window.webkitAudioContext; MIC.ctx = new AC();          // créé dans le toucher (iPhone)
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
      } catch (e) { micStop(); toast(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? '🎤 Micro refusé : autorise-le dans les réglages du navigateur' : '🎤 Micro indisponible'); }
      finally { MIC.busy = false; }
    }
    function micTalk(dt) {
      const an = MIC.an; if (!an || !MIC.on) return null;
      an.getFloatTimeDomainData(MIC.td); let q = 0; for (let i = 0; i < MIC.td.length; i++) q += MIC.td[i] * MIC.td[i];
      const rms = Math.sqrt(q / MIC.td.length);
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
      const same = hf.length >= Math.max(3, rec.length - 2) && spread(hf) < 0.16 && spread(vr) < 0.6;
      if (rec.length >= 4 && same) {
        const d = []; for (let i = 1; i < rec.length; i++) d.push(rec[i] - rec[i - 1]);
        const m = d.reduce((a, b) => a + b, 0) / d.length, sd = Math.sqrt(d.reduce((a, b) => a + (b - m) * (b - m), 0) / d.length), cv = sd / m, rate = 1 / m;
        laugh = sm(3.2, 4, rate) * (1 - sm(8.5, 10, rate)) * (1 - sm(0.18, 0.3, cv)) * Math.min(1, (rec.length - 2.5) / 2) * (0.75 + 0.5 * sm(0.08, 0.3, MIC.flat));
      }
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
    // ---------- PARLER (démo) : la voix du navigateur dit une phrase ; la bouche suit le TEXTE (règles du français → visèmes), recalée MOT À MOT
    // sur les évènements « boundary » de la voix (sinon au rythme moyen). Phrases fixes : rien de personnel n'est donné à la voix.
    const SAY = { on: false, n: -1 };
    const PHRASES = ['Salut ! Moi, c’est ton avatar. Tu viens jouer avec moi ?', 'Bonjour ! On fait une partie sur la borne, ce soir ?', 'Coucou ! Regarde, je parle avec ma bouche, maintenant.'];
    const OPEN = { A: 0.8, E: 0.45, I: 0.15, O: 0.45, OU: 0.1, EU: 0.35 };
    function sayVoice() {
      let vs = []; try { vs = speechSynthesis.getVoices().filter((v) => /^fr/i.test(v.lang)); } catch (e) { /* rien */ }
      return vs.find((v) => v.localService && /fr.FR/i.test(v.lang)) || vs.find((v) => v.localService) || vs.find((v) => /fr.FR/i.test(v.lang)) || vs[0] || null;
    }
    function sayStop() {
      if (!SAY.on) return; SAY.on = false; SAY.lip = null; SAY.u = null;
      try { speechSynthesis.cancel(); } catch (e) { /* rien */ }
      $.say.classList.remove('on');
      if (STG && !MIC.on) { STG.setTalk(null); STG.setHome(false); STG.setFrame(editing ? (FR_CAT[cat] || 'corps') : 'corps'); }
    }
    function sayStart() {
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { toast('🗣️ Ce navigateur ne sait pas parler'); return; }
      if (!STG || !STG.ready() || !PGM) { toast('Ton avatar arrive…'); return; }
      if (MIC.on) micStop();
      const text = PHRASES[(SAY.n = (SAY.n + 1) % PHRASES.length)], words = PGM.frenchVisemes(text), VIS = PGM.VIS;
      const lip = { words, wi: -1, wt: 0, unit: 0.072, started: false, ended: false, bnd: 0, lastB: 0, t: 0, p: new Float32Array(VIS.length), mouth: PGM.createMouth() };
      const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; const v = sayVoice(); if (v) u.voice = v; u.rate = 1; u.pitch = 1.05;
      u.onstart = () => { if (SAY.lip !== lip) return; lip.started = true; lip.wi = 0; lip.wt = 0; lip.t = 0; };
      u.onboundary = (e) => {
        if (SAY.lip !== lip || (e.name && e.name !== 'word')) return;
        const k = words.findIndex((w) => w.i + w.w.length > e.charIndex); if (k < 0) return;
        // vitesse réelle de la voix : durée du mot d'avant / sa longueur prévue
        if (lip.bnd && k === lip.wi + 1) { const units = words[lip.wi].v.reduce((a, x) => a + x[1], 0), spent = lip.t - lip.lastB; if (spent > 0.05 && units > 0) lip.unit += (Math.max(0.04, Math.min(0.14, spent / (units + 0.6))) - lip.unit) * 0.5; }
        lip.wi = k; lip.wt = 0; lip.bnd++; lip.lastB = lip.t; lip.started = true;
      };
      u.onend = u.onerror = () => { if (SAY.lip === lip) { lip.ended = true; later(() => { if (SAY.lip === lip) sayStop(); }, 350); } };
      SAY.on = true; SAY.lip = lip; SAY.u = u; $.say.classList.add('on'); hintOff(); if (window.JDW_PG_TEST) window.__pgSAY = SAY;   // SAY.u : sinon Chrome peut oublier la phrase et ne jamais dire « fin »
      STG.setFrame('parle'); STG.setHome(true);
      STG.setTalk((dt) => {
        if (!SAY.on || SAY.lip !== lip) return null;
        lip.t += dt; let cur = 'sil';
        // fin sans évènement « end » (certains navigateurs) : la voix ne parle plus depuis 0,4 s
        let speaking = true; try { speaking = speechSynthesis.speaking; } catch (e) { /* rien */ }
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
        return { w: 1, v: Object.assign({}, mo, { Brows_Raised: 0.18 * talking + 0.1 }), asym: lip.mouth.asym, nod: Math.sin(lip.t * 5.3) * 0.025 * talking, tilt: Math.sin(lip.t * 0.9) * 0.05 };
      });
      try { speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { sayStop(); toast('🗣️ La voix du navigateur ne répond pas'); return; }
      // voix muette (aucun début au bout de 2,5 s) : on mime quand même la phrase au rythme moyen
      later(() => { if (SAY.lip === lip && !lip.started) { lip.started = true; lip.wi = 0; lip.wt = 0; later(() => { if (SAY.lip === lip) sayStop(); }, 6000); } }, 2500);
    }
    on($.say, 'click', (e) => { e.stopPropagation(); if (SAY.on) { sayStop(); return; } sayStart(); });
    // pas de voix sur cet appareil (WebView d'Android : pas de speechSynthesis ; ou aucune voix) : 💬 caché (🎤 reste), noté une fois dans le journal
    (function sayCheck() {
      const hide = (why) => { $.say.hidden = true; $.say.style.display = 'none'; try { if (!store.get('jdw.pegase.saylog')) { store.set('jdw.pegase.saylog', '1'); report('Pégase hub : bouton 💬 caché (' + why + ')'); } } catch (e) { /* rien */ } };
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

    // ---------- MA MAISON (pg_docs « maison » : {v, lot:[w,d], p:[[id,x,z,l,r,y]…]}, format du jeu) : petit plan vu de dessus ----------
    async function loadHouse() {
      if (!memberMode()) return;
      let rows; try { rows = await PG.rpc('pg_get_doc', { p_kind: 'maison' }); } catch (e) { return; }
      if (dead) return;
      const rr = Array.isArray(rows) ? rows[0] : rows, d = rr && rr.r_rev > 0 && rr.r_data && typeof rr.r_data === 'object' ? rr.r_data : null;
      const P = d && Array.isArray(d.p) ? d.p.filter((x) => Array.isArray(x) && typeof x[0] === 'string' && Number.isFinite(+x[1]) && Number.isFinite(+x[2])).slice(0, 4000) : [];
      if (!P.length) return;
      drawHouse(P);
      const lv = new Set(P.map((x) => +x[3] || 0)).size;
      $.htxt.textContent = 'Ta maison : ' + P.length + ' pièce' + (P.length > 1 ? 's' : '') + (lv > 1 ? ' sur ' + lv + ' étages' : '') + '. Bientôt, tu pourras la modifier d\'ici et la faire visiter.';
    }
    function drawHouse(P) {
      const c = $.hcv, W = 264, H = 220; c.width = W; c.height = H; const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fff2d6'); g.addColorStop(1, '#f2d39f'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(150,100,50,.15)'; x.lineWidth = 1; for (let i = 0; i <= W; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j <= H; j += 16) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const p of P) { x0 = Math.min(x0, +p[1]); x1 = Math.max(x1, +p[1]); z0 = Math.min(z0, +p[2]); z1 = Math.max(z1, +p[2]); }
      const sp = Math.max(x1 - x0, z1 - z0, 1), k = Math.min((W - 40) / Math.max(1, x1 - x0 || sp), (H - 40) / Math.max(1, z1 - z0 || sp)), ox = (W - (x1 - x0) * k) / 2, oz = (H - (z1 - z0) * k) / 2;
      const col = (id) => /mur|wall/i.test(id) ? '#b9805a' : /porte|door/i.test(id) ? '#7a3f22' : /fen|window/i.test(id) ? '#7fbfe8' : /sol|floor|plancher/i.test(id) ? '#e8c48c' : /toit|roof/i.test(id) ? '#c0482f' : /esc|stair/i.test(id) ? '#9a6a46' : '#6aa36a';
      const sz = Math.max(4, Math.min(14, k * sp / 14));
      const lvls = [...new Set(P.map((p) => +p[3] || 0))].sort((a, b) => a - b);
      for (const lv of lvls) {
        x.globalAlpha = lv === lvls[0] ? 1 : 0.55;
        for (const p of P) if ((+p[3] || 0) === lv) { const px = ox + (+p[1] - x0) * k, pz = oz + (+p[2] - z0) * k; x.fillStyle = col(p[0]); x.beginPath(); x.roundRect ? x.roundRect(px - sz / 2, pz - sz / 2, sz, sz, 2) : x.rect(px - sz / 2, pz - sz / 2, sz, sz); x.fill(); }
      }
      x.globalAlpha = 1; x.strokeStyle = 'rgba(120,70,30,.55)'; x.lineWidth = 2; x.strokeRect(ox - sz, oz - sz, (x1 - x0) * k + sz * 2, (z1 - z0) * k + sz * 2);
      $.house.classList.add('has');
    }
    on($.hgo, 'click', () => { toast('🏡 Bientôt : modifie ta maison d\'ici, puis fais-la visiter aux copains'); tone(660, 880); });

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
    let cat = store.get('jdw.pegase.edcat') || 'perso', hist = [], tryKey = '', colorSlot = '', colorCh = 0;
    if (!EDCATS.some((c) => c.k === cat)) cat = 'perso';
    const FR_CAT = { perso: 'corps', corps: 'corps', visage: 'visage', cheveux: 'tete', barbe: 'visage', haut: 'buste', bas: 'jambes', tenue: 'corps', pieds: 'pieds', chapeau: 'tete', acc: 'buste' };
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
      return { perso: 7, corps: 2 + CAT.skin.length, visage: 6 + CAT.eyes.length + 2 + 4 + 6 + 1, barbe: countOf('beard'), cheveux: countOf('hb') + countOf('hf') + CAT.hairUI.length,
        haut: countOf('top'), bas: countOf('bot'), tenue: countOf('ovr'), pieds: countOf('feet') + 6, chapeau: countOf('hat') + countOf('hacc'), acc: countOf('glass') + countOf('glov') + 1 }[k];
    }
    function gridHTML(k) {
      const d = D; let h = '';
      if (k === 'perso') {
        h += sec('Personnages', 7) + list(CHARS_N.map((n, i) => ({ k: 'look:' + i, act: 'look', v: i, name: n, th: `<img class="full" alt="" data-t="${i}"${STORE.thumbs.has('o' + i) ? ` src="${STORE.thumbs.get('o' + i)}"` : ''}>`, on: preset === i })));
      } else if (k === 'corps') {
        h += sec('Silhouette') + `<button class="pgh-ch${d.g === 'f' ? ' on' : ''}" data-a="g" data-v="f" data-key=""><span class="th"><span class="ico">${PGH_SVG.fem}</span></span><span>Fille</span></button><button class="pgh-ch${d.g === 'm' ? ' on' : ''}" data-a="g" data-v="m" data-key=""><span class="th"><span class="ico">${PGH_SVG.masc}</span></span><span>Garçon</span></button>`;
        h += `<div class="pgh-sl"><label>Carrure</label><span>fine</span><input type="range" min="0" max="100" value="${Math.round((d.bd[2] || 0) * 100)}" data-a="w"><span>ronde</span></div>`;
        h += `<div class="pgh-sl"><label>Taille</label><span>petite</span><input type="range" min="90" max="108" value="${Math.round((d.h || 1) * 100)}" data-a="h"><span>grande</span></div>`;
        h += sec('Peau', CAT.skin.length) + list(CAT.skin.map((s, i) => ({ k: 'sk:' + i, act: 'sk', v: i, name: s[0], sw: 1, th: `<span class="dot" style="background:radial-gradient(circle at 35% 30%,${s[1]},${s[1]} 45%,rgba(0,0,0,.35))"></span>`, on: d.sk === i })));
      } else if (k === 'visage') {
        h += sec('Forme du visage', 6) + list(FACE_N.map((n, i) => ({ k: 'fc:' + i, act: 'fc', v: i, name: n, th: `<span class="ico face">${faceSVG(i)}</span>`, on: d.fc === i })));
        h += sec('Yeux', CAT.eyes.length) + list(CAT.eyes.map((e, i) => ({ k: 'ey:' + i, act: 'ey', v: i, name: e[0], sw: 1, th: `<span class="dot" style="background:radial-gradient(circle at 50% 58%,${e[2]} 0,${e[1]} 60%,#120c14 63%)"></span>`, on: d.ey === i })));
        h += sec('Pupilles', 2) + list(['basic', 'sharp'].map((p) => ({ k: 'pu:' + p, act: 'pu', v: p, name: CAT.layers['pupil.' + p].name, ico: CAT.layers['pupil.' + p].icon, on: d.pu === p })));
        h += sec('Sourcils et cils', 4) + CAT.items.filter((i) => i.cat === 'brow').map((i) => tile({ k: i.id, act: 'br', v: i.id, name: i.name, th: `<span class="ico face">${browSVG(i.id.includes('thick'))}</span>`, on: d.br === i.id })).join('') +
          CAT.items.filter((i) => i.cat === 'lash').map((i) => tile({ k: i.id, act: 'la', v: i.id, name: i.name, th: `<span class="ico face">${lashSVG(i.id.includes('long'))}</span>`, on: d.la === i.id })).join('');
        const fxs = ['freckles.light', 'freckles.full', 'blush', 'lips', 'liner', 'age'];
        h += sec('Petits détails', 7) + list(fxs.map((f) => ({ k: 'fx:' + f, act: 'fx', v: f, name: CAT.layers[f].name, ico: CAT.layers[f].icon, on: (d.fx || []).includes(f) })).concat([
          { k: 'elf', act: 'elf', v: 1, name: 'Oreilles d\'elfe', th: `<span class="ico">${PGH_SVG.ear}</span>`, on: !!d.elf }]));
      } else if (k === 'barbe') {
        h += sec('Barbes et moustaches', countOf('beard')) + itemTiles('beard', 'beard');
        h += sec('Couleur (celle des cheveux)', CAT.hairUI.length) + list(CAT.hairUI.map((i) => ({ k: 'hc:' + i, act: 'hc', v: i, name: CAT.palette[i][0], sw: 1, th: `<span class="dot" style="background:radial-gradient(circle at 35% 30%,${palHex(i)},${palHex(i)} 50%,rgba(0,0,0,.4))"></span>`, on: d.hc === i })));
      } else if (k === 'cheveux') {
        h += sec('Coiffure (derrière)', countOf('hb')) + itemTiles('hb', 'hb') + sec('Frange (devant)', countOf('hf')) + itemTiles('hf', 'hf');
        const strands = !!(STG && STG.A && STG.A.hairStrands && STG.A.hairStrands().length);
        h += `<div class="pgh-sl${strands ? '' : ' off'}"><label>Longueur</label><span>courts</span><input type="range" min="70" max="140" value="${Math.round((d.hl || 1) * 100)}" data-a="hl"${strands ? '' : ' disabled'}><span>longs</span>${strands ? '' : '<em>Cette coiffure n\'a pas de mèches à allonger : choisis-en une plus longue.</em>'}</div>`;
        h += sec('Couleur des cheveux', CAT.hairUI.length) + list(CAT.hairUI.map((i) => ({ k: 'hc:' + i, act: 'hc', v: i, name: CAT.palette[i][0], sw: 1, th: `<span class="dot" style="background:radial-gradient(circle at 35% 30%,${palHex(i)},${palHex(i)} 50%,rgba(0,0,0,.4))"></span>`, on: d.hc === i })));
      } else if (k === 'haut') h += sec('Hauts', countOf('top')) + itemTiles('top', 'top');
      else if (k === 'bas') h += sec('Bas', countOf('bot')) + itemTiles('bot', 'bot');
      else if (k === 'tenue') h += sec('Robes et salopette', countOf('ovr')) + itemTiles('ovr', 'ovr');
      else if (k === 'pieds') {
        h += sec('Chaussures', countOf('feet')) + itemTiles('feet', 'feet');
        const so = ['socks.ankle', 'socks.basic', 'socks.knee', 'socks.thigh', 'socks.stirrup', 'socks.tights'];
        h += sec('Chaussettes', 6) + none('so', !(d.so && d.so[0])) + list(so.map((s) => ({ k: 'so:' + s, act: 'so', v: s, name: CAT.layers[s].name, ico: CAT.layers[s].icon, on: !!(d.so && d.so[0] === s) })));
      } else if (k === 'chapeau') h += sec('Chapeaux', countOf('hat')) + itemTiles('hat', 'hat') + sec('Cornes et antennes', countOf('hacc')) + itemTiles('hacc', 'hacc');
      else if (k === 'acc') {
        h += sec('Lunettes', countOf('glass')) + itemTiles('glass', 'glass') + sec('Gants', countOf('glov')) + itemTiles('glov', 'glov');
        h += sec('Appareil photo') + none('cam', !d.it.cam) + tile({ k: 'cam', act: 'cam', v: 1, name: 'Appareil d\'explorateur', th: `<span class="ico">${PGH_SVG.cam}</span>`, on: !!d.it.cam });
      }
      return h;
    }
    // couleurs de la pièce choisie (tissus : toutes ouvertes)
    function colorsHTML() {
      const slots = SLOT_OF_CAT[cat]; if (!slots || !CAT) return '';
      const slot = slots.find((s) => D.it[s]) || ''; if (!slot) return '';
      const v = D.it[slot], it = ITEMS.get(v[0]); if (!it || !it.ch || !it.ch.length) return '';
      colorSlot = slot; colorCh = Math.min(colorCh, it.ch.length - 1);
      return `<div class="pgh-cols"><div class="chs">${it.ch.map((c, i) => `<button class="pgh-cc${i === colorCh ? ' on' : ''}" data-a="ch" data-v="${i}"><i style="background:${palHex(v[i + 1] == null ? c.c : v[i + 1])}"></i>${esc(c.n || 'Couleur')}</button>`).join('')}</div>` +
        `<div class="sws">${CAT.fabricUI.map((p) => `<button class="pgh-sw${(v[colorCh + 1] == null ? it.ch[colorCh].c : v[colorCh + 1]) === p ? ' on' : ''}" data-a="col" data-v="${p}" style="background:radial-gradient(circle at 35% 30%,${palHex(p)},${palHex(p)} 50%,rgba(0,0,0,.35))" title="${esc(CAT.palette[p][0])}"></button>`).join('')}</div></div>`;
    }
    function renderEd() {
      if (!CAT || !D) return;
      box.querySelectorAll('.pgh-edcat').forEach((b) => { const c = b.dataset.cat; b.classList.toggle('on', c === cat); const n = b.querySelector('em'); if (n) n.textContent = catCount(c); });
      const g = $.dgrid, st = g.dataset.cat === cat ? g.scrollTop : 0;
      g.innerHTML = `<div class="pgh-edg on" data-g="${cat}">${gridHTML(cat)}</div>` + colorsHTML();
      g.dataset.cat = cat; g.scrollTop = st;
      fillIcons(g); fillThumbs(g);
      const lk = lockedIn(D);
      $.ddesc.textContent = lk.length ? '🔒 Essai : ' + lk.map(keyName).join(', ') : describe(D);
      $.dundo.disabled = !hist.length;
      $.dok.classList.toggle('lk', !!lk.length);
      renderLockCard();
    }
    function renderLockCard() {
      const k = tryKey && lockedIn(D).includes(tryKey) ? tryKey : '';
      if (!k) { $.lock.classList.remove('on'); return; }
      const L = lockOf(k), sec2 = L.r === 'secret';
      $.lock.classList.add('on'); $.lock.dataset.r = L.r; $.lockic.innerHTML = PGH_SVG.lock; $.lockx.textContent = 'Enlever';
      $.lockn.textContent = sec2 ? 'Objet secret' : keyName(k);
      $.lockt.textContent = RAR[L.r]; $.lockt.className = 'pgh-tier ' + L.r;
      $.lockp.innerHTML = sec2 ? 'Se débloque d\'une manière… mystérieuse.' : L.p ? `${L.p} ${LU()} lucioles · bientôt dans la boutique du jeu` : esc(L.how);
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
      if (STG) { const k = ++lookT; STG.setLook(D).then(() => { if (dead || !STG || k !== lookT) return; if (spark) STG.gesture('spark'); if (cat === 'cheveux') { const sl = $.dgrid.querySelector('[data-a="hl"]'), on = STG.A.hairStrands().length > 0; if (sl && sl.disabled === on) renderEd(); } }); }
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
        if ((slot === 'top' || slot === 'bot') && d.it.ovr) { delete d.it.ovr; if (!d.it.top && slot === 'bot') d.it.top = ['top.shirt']; if (!d.it.bot && slot === 'top') d.it.bot = ['bot.shorts']; }
      }, id);
    }
    function selectCat(k) {
      cat = k; store.set('jdw.pegase.edcat', k); colorCh = 0;
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
    function tapKey(k) { const b = $.dgrid.querySelector(`[data-key="${CSS.escape ? CSS.escape(k) : k}"]`); if (b) b.click(); }
    on($.ed, 'click', (e) => {
      const c = e.target.closest('.pgh-edcat'); if (c) { selectCat(c.dataset.cat); tone(560, 700); return; }
      const h = e.target.closest('[data-h]');
      if (h && h.dataset.h === 'dx') { cancelEdit(); return; }
      if (h && h.dataset.h === 'dno') { cancelEdit(); return; }
      if (h && h.dataset.h === 'dok') { saveEdit(); return; }
      if (h && h.dataset.h === 'dundo') { const u = hist.pop(); if (u) { D = u.d; preset = u.p; tryKey = u.t; apply(false); } return; }
      if (h && h.dataset.h === 'lockx') { const u = hist.pop(); if (u) { D = u.d; preset = u.p; tryKey = ''; apply(false); } return; }
      if (h && h.dataset.h === 'drnd') { randomLook(); return; }
      const b = e.target.closest('[data-a]'); if (!b || b.tagName === 'INPUT') return;
      const a = b.dataset.a, v = b.dataset.v, k = b.dataset.key;
      if (b.dataset.lock === 'secret') { hist.push({ d: lookCopy(D), p: preset, t: tryKey }); tryKey = k; renderEd(); $.lock.classList.add('on'); renderSecret(k); tone(880, 1320); return; }
      if (a === 'look') { const i = +v; change((d) => { const n = STG.descOf(i); for (const x of Object.keys(d)) delete d[x]; Object.assign(d, n); preset = i; }, 'look:' + i); if (STG) STG.gesture('jump'); return; }
      if (a.startsWith('it:')) { setItem(a.slice(3), v); return; }
      if (a === 'g') { change((d) => { d.g = v; d.bd[0] = v === 'm' ? 1 : 0; d.bd[1] = v === 'f' ? 0.55 : 0; }, ''); return; }
      if (a === 'sk' || a === 'ey' || a === 'fc') { change((d) => { d[a] = +v; }, k, false); return; }
      if (a === 'pu' || a === 'br' || a === 'la') { change((d) => { d[a] = v; }, k, false); return; }
      if (a === 'hc') { change((d) => { d.hc = +v; d.hc2 = +v; }, k, false); return; }
      if (a === 'fx') { change((d) => { d.fx = d.fx || []; const i = d.fx.indexOf(v); if (i >= 0) d.fx.splice(i, 1); else { if (v.startsWith('freckles')) d.fx = d.fx.filter((x) => !x.startsWith('freckles')); d.fx.push(v); } }, k); return; }
      if (a === 'elf') { change((d) => { d.elf = d.elf ? 0 : 1; }, k); return; }
      if (a === 'so') { change((d) => { d.so = v ? [v, (d.so && d.so[1]) || 0] : null; }, k); return; }
      if (a === 'cam') { change((d) => { if (v) d.it.cam = d.it.cam || ['cam', 9, 40, 53]; else delete d.it.cam; }, v ? 'cam' : ''); return; }
      if (a === 'ch') { colorCh = +v; renderEd(); return; }
      if (a === 'col' && colorSlot && D.it[colorSlot]) { const s2 = colorSlot, c2 = colorCh; change((d) => { if (d.it[s2]) d.it[s2][c2 + 1] = +v; }, '', false); }
    });
    function renderSecret() {
      $.lock.dataset.r = 'secret'; $.lockic.textContent = '✦'; $.lockx.textContent = 'OK'; $.lockn.textContent = 'Objet secret'; $.lockt.textContent = RAR.secret; $.lockt.className = 'pgh-tier secret';
      $.lockp.textContent = 'Se débloque d\'une manière… mystérieuse.';
    }
    on($.ed, 'input', (e) => { const a = e.target.dataset.a, v = +e.target.value; if (!STG || !STG.A.desc) return;
      if (a === 'w') { D.bd[2] = v / 100; STG.A.desc.bd[2] = v / 100; STG.A.applyMorphs(); }
      if (a === 'h') { D.h = v / 100; STG.A.desc.h = D.h; STG.A.group.scale.setScalar(D.h); }
      if (a === 'hl') { D.hl = v / 100; STG.A.desc.hl = D.hl; STG.A.setHairLength(D.hl); } });
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
        const hcs = CAT.hairUI.filter((i) => owned('hc:' + i)); d.hc = d.hc2 = pick(hcs);
        d.sk = Math.floor(Math.random() * 9); d.ey = pick([...EYE_FREE]);
      }, '');
      if (STG) STG.gesture('jump');
    }
    for (const k of ['go-av', 'go-av2', 'go-av3']) on($[k], 'click', () => openEdit());
    on($.wrrow, 'click', (e) => { const b = e.target.closest('[data-key]'); if (!b) return; const k = b.dataset.key, c = b.dataset.cat; openEdit(c, k); });
    on(window, 'keydown', (e) => { if (e.key === 'Escape') { if (editing) cancelEdit(); else if (friendOn) closeFriend(); } });
    // vitrine « à débloquer » de l'onglet Moi : une sélection de belles pièces verrouillées (+ un secret)
    const SHOWCASE = [['ovr.smart_dress', 'tenue'], ['hat.fedora', 'chapeau'], ['hb.twin_tail_long', 'cheveux'], ['look:3', 'perso'], ['top.seifuku', 'haut'], ['feet.high_lace_shoe', 'pieds'], ['glass.round_shaded', 'acc'], ['hacc.alien_attena', 'chapeau'], ['hb.wild_tail', 'cheveux'], ['top.hoodie', 'haut'], ['elf', 'visage']];
    function renderShowcase() {
      if (!CAT) return;
      $.wrrow.innerHTML = SHOWCASE.filter(([k]) => !owned(k)).map(([k, c]) => {
        const it = ITEMS.get(k);
        return tile({ k, act: 'show', v: k, name: keyName(k), ico: it && it.icon, th: k.startsWith('look:') ? `<img class="full" alt="" data-t="${k.slice(5)}"${STORE.thumbs.has('o' + k.slice(5)) ? ` src="${STORE.thumbs.get('o' + k.slice(5))}"` : ''}>` : k === 'elf' ? `<span class="ico">${PGH_SVG.ear}</span>` : '' }).replace('<button ', `<button data-cat="${c}" `);
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
    let tab = store.get('jdw.pegase.tab') || 'moi'; if (!['moi', 'amis', 'infos'].includes(tab)) tab = 'moi';
    function tabInd() { const b = box.querySelector(`.pgh-tab[data-tab="${tab}"]`); if (!b) return; $.tabind.style.left = (b.offsetLeft + 14) + 'px'; $.tabind.style.width = Math.max(20, b.offsetWidth - 28) + 'px'; }
    function setTab(t, scroll) {
      tab = t; store.set('jdw.pegase.tab', t);
      box.querySelectorAll('.pgh-tab').forEach((b) => { b.classList.toggle('on', b.dataset.tab === t); b.setAttribute('aria-selected', String(b.dataset.tab === t)); });
      box.querySelectorAll('.pgh-pane').forEach((p) => p.classList.toggle('on', p.dataset.pane === t));
      tabInd();
      const top = $.hero.offsetHeight;
      if (scroll && $.scroll.scrollTop > top) $.scroll.scrollTop = top;
      if (t === 'amis') { renderFriends(); loadAvatars(); }
      if (t === 'moi') renderShowcase();
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
    on($.frbox, 'click', (e) => {
      if (e.target.closest('[data-h2="acct"]')) { try { PG && PG.account && PG.account(); } catch (x) { /* rien */ } return; }
      const c = e.target.closest('.pgh-fc'); if (c) openFriend(c.dataset.n);
    });
    // le copain en grand : la scène 3D de la page passe dans la fenêtre, avec SON avatar ; gestes ; bientôt appeler / visiter
    function openFriend(n) {
      const m = FR.list.find((x) => x.name === n); if (!m) return;
      const a = FR.av.get(n), has = !!(a && a.tenue >= 0) && !stgFail && !!STG;
      friendOn = m; hintOff();
      $.fvname.textContent = m.display; $.fvst.classList.toggle('on', !!m.online); $.fvstt.textContent = m.online ? 'en ligne en ce moment' : seen(m.seen);
      $.fvdesc.textContent = has ? (a.desc || '') : '';
      $.fvemo.style.display = has ? '' : 'none';
      $.fvnone.classList.toggle('on', !has);
      $.fvhead.innerHTML = m.photo ? `<img class="hd" alt="" src="${esc(m.photo)}">` : `<span class="ini" style="--h:${hue(m.name)}">${esc(m.display[0] || '?')}</span>`;
      $.fvnonet.textContent = m.display + ' n\'a pas encore créé son avatar.';
      $.fv.classList.add('on'); $.name.classList.remove('on');
      if (has) { $.fvstage.appendChild($.gl); STG.setFrame('corps'); STG.setLook(a.look || a.tenue).then(() => { if (!dead && friendOn === m && STG) STG.gesture('wave'); }); STG.face(); }
      requestAnimationFrame(() => { if (!dead) { placeStage(); activeSync(); } });
      tone(523, 784);
    }
    function closeFriend() {
      if (!friendOn) return;
      friendOn = null; $.fv.classList.remove('on');
      if (!stgFail && $.gl.parentNode !== $.hero) $.hero.insertBefore($.gl, $.wait);
      if (STG && D) { STG.setLook(D); if (STG.ready() && !editing) $.name.classList.add('on'); }
      lastNX = -1; requestAnimationFrame(() => { if (!dead) { placeStage(); activeSync(); } });
    }
    on($.fv, 'click', (e) => {
      const h = e.target.closest('[data-h]');
      if (h && h.dataset.h === 'fvx') { closeFriend(); return; }
      if (h && h.dataset.h === 'fvcall') { toast('📞 Bientôt : appelle ' + (friendOn ? friendOn.display : 'un copain') + ' depuis le téléphone du jeu'); tone(660, 880); return; }
      if (h && h.dataset.h === 'fvhouse') { toast('🏡 Bientôt : visite la maison de ' + (friendOn ? friendOn.display : 'ton copain') + ' dans Pégase'); tone(660, 880); return; }
      const b = e.target.closest('.pgh-emo'); if (b && STG && STG.ready()) { STG.gesture(b.dataset.emo); tone(740, 1180); }
    });
    // présence : la borne la connaît déjà (direct) ; on relit la liste quand l'onglet Amis se voit
    every(() => { if (!document.hidden && tab === 'amis' && !editing) renderFriends(); }, 5000);
    every(() => { if (!document.hidden && tab === 'amis') loadAvatars(); }, 90000);

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
        case 'desktop': chip = 'Disponible'; p = 'Sur ton téléphone Android : ouvre l\'appli « Borne d\'arcade », touche Pégase, puis « Installer ».'; break;
        default: break;   // none / off / ios : « À venir »
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
    }
    async function andOpen() {
      if (!NT) return;
      tone(660, 990);
      let ok = false; try { ok = await NT.open(); } catch (e) { ok = false; }
      if (!ok && !dead) toast('Pégase n\'est pas (encore) disponible pour ce téléphone');
      later(() => renderAndroid(false), 400);
    }
    on($.andzone, 'click', (e) => { if (e.target.closest('[data-a="open"]')) andOpen(); });
    if (NT && typeof NT.onChange === 'function') andOff = NT.onChange(() => { if (!dead) renderAndroid(false); });
    on(document, 'visibilitychange', () => { if (!document.hidden && !dead) renderAndroid(false); });
    renderAndroid(true);

    // ---------- observateurs ----------
    $.bg.complete && $.bg.naturalWidth ? $.bg.classList.add('on') : on($.bg, 'load', () => $.bg.classList.add('on'));
    on($.bg, 'error', () => { $.bg.style.display = 'none'; });
    let io = null, ro = null;
    if (typeof IntersectionObserver === 'function') { io = new IntersectionObserver((es) => { for (const e of es) heroVis = e.isIntersecting; activeSync(); }, { root: $.scroll, threshold: 0.02 }); io.observe($.hero); }
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => { if (!dead && (root.clientWidth !== W0 || root.clientHeight !== H0)) relayout(); }); ro.observe(root); }
    else on(window, 'resize', relayout);
    on(document, 'visibilitychange', activeSync);
    on(window, 'online', () => { if (srv.dirty) gardePush(); loadWallet(); });
    // l'onglet « Créateur » n'a ses numéros qu'avec le catalogue
    box.querySelectorAll('.pgh-edcat').forEach((b) => { if (!b.querySelector('em')) b.insertAdjacentHTML('beforeend', '<em></em>'); });
    catReady.then(() => { if (dead) return; if (!D && !STG) { /* repli : le créateur attend la 3D */ } renderShowcase(); renderMe(); }).catch(() => {});
    relayout(); setTab(tab, false); activeSync(); renderMe(); renderFriends(); loadWallet(); later(loadHouse, 900);
    // la 3D arrive APRÈS l'affichage (pas d'à-coup à l'ouverture)
    later(() => { (window.requestIdleCallback || ((f) => setTimeout(f, 1)))(() => { if (!dead) start3D(); }, { timeout: 600 }); }, 380);
    later(() => loadAvatars(true), 1500);
    return {
      destroy() {
        if (dead) return; dead = true;
        flySet(false); micStop(); sayStop();
        for (const [t, ty, fn, o] of listeners) { try { t.removeEventListener(ty, fn, o); } catch (e) { /* rien */ } }
        for (const id of timers) clearTimeout(id); timers.clear();
        for (const id of ivals) clearInterval(id); ivals.clear();
        if (io) io.disconnect(); if (ro) ro.disconnect(); if (frIO) frIO.disconnect();
        if (andOff) { try { andOff(); } catch (e) { /* rien */ } andOff = null; }
        try { if (STG) STG.dispose(); } catch (e) { /* rien */ }
        STG = null; if (window.JDW_PG_HUB) try { delete window.JDW_PG_HUB; } catch (e) { window.JDW_PG_HUB = undefined; }
        root.textContent = '';
      },
      currentScore() { return 0; },   // pas de score : Quitter revient à la borne
      currentLevel() { return 1; }
    };
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
    mount(root, api) { return mountHub(root, api); }
  };
})();
