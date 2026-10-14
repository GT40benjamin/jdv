// Prépare les données de « Magic Force » (games/magic.js) à partir du projet Unity ILO de l'utilisateur (packs de l'Asset Store) :
//  1) pièces du décor Magic_1_Interior (ithappy) : seulement celles que le jeu utilise (lues dans games/magic.js), un seul GLB,
//     transformations appliquées, une seule carte UV (palette Texture.png) → Blender en ligne de commande ;
//  2) créatures HeroicFantasyCreatures (PROTOFACTOR) : gobelin, kobold, golem — décimées, clips choisis recopiés sur le squelette
//     du modèle (pose de repos différente dans les fichiers de clips), sans images → Blender ;
//  3) compression des GLB (gltfpack : meshopt + quantification ; UV et positions des créatures en flottants) ;
//  4) textures (couleur × occlusion, un peu plus vives, WebP), veines lumineuses du golem, palette → Python (Pillow) ;
//  5) planche d'effets (Cartoon FX Remaster Free, 16 cases 256 px) → Python ;
//  6) sons des sorts (KriptoFX Realistic Effects Pack v4) et des monstres / objets (Imphenzia Universal Sound FX) → AAC (Chrome) ;
//  7) musiques (Ultimate Game Music Collection) → AAC EMBALLÉ, même sel que les autres musiques : assets/music/magic-*.bin, magicboss-1.bin ;
//  8) moteur 3D : three.js (MIT) réduit à ce que le jeu utilise + GLTFLoader + MeshoptDecoder + SkeletonUtils, gzippé : assets/magic.moteur.bin
//     (pas un fichier de l'Asset Store : lisible, mais en .bin pour que le service worker de la borne le garde hors ligne) ;
//  9) EMBALLAGE (clé intégrée au site, source/asset-key.txt ; licence : jamais de modèle, d'image ni de son en clair) : assets/magic.monde1.bin.
//   node pack-magic.js [--tout] [--etapes=pieces,creatures,...]
// Les étapes lentes (Blender, extraction des .unitypackage) gardent leur résultat dans MAGIC_WORK (défaut : <tmp>/magic-work) ;
// --tout les refait. Outils : Blender 5 (BLENDER), Python 3 + Pillow (PYTHON), Chrome (CHROME) + playwright-core (PLAYWRIGHT),
// three + esbuild + gltfpack (npm, dossier MAGIC_NODE, défaut ~/jdv-tools/duotest/magic/node_modules).
// Format de magic.monde1.bin : sel(16) + iv(12) + AES-GCM( [taille de l'en-tête sur 4 octets][en-tête JSON][données] ), clé PBKDF2-SHA256 200 000 tours ;
// en-tête { v: 1, e: { nom: { o, l, t: 'glb'|'webp'|'aac', z: 1 si gzippé } } }.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), http = require('http');
const { execFileSync } = require('child_process'), { webcrypto } = require('crypto'); const subtle = webcrypto.subtle;
const HOME = os.homedir();
const ILO = process.env.ILO_ASSETS || 'D:/Games/ILO/Assets';
const BLENDER = process.env.BLENDER || 'C:/Program Files/Blender Foundation/Blender 5.0/blender.exe';
const PYTHON = process.env.PYTHON || 'python';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PLAYWRIGHT = process.env.PLAYWRIGHT || path.join(HOME, 'jdv-tools/node_modules/playwright-core');
const NODE = process.env.MAGIC_NODE || path.join(HOME, 'jdv-tools/duotest/magic/node_modules');
const WORK = process.env.MAGIC_WORK || path.join(os.tmpdir(), 'magic-work');
const CFX_PKG = process.env.CFX_PKG || path.join(HOME, 'AppData/Roaming/Unity/Asset Store-5.x/Jean Moreno/Particle Systems/Cartoon FX Remaster Free.unitypackage');
const IMPH_PKG = process.env.IMPH_PKG || path.join(HOME, 'AppData/Roaming/Unity/Asset Store-5.x/Imphenzia/AudioSound FX/Universal Sound FX.unitypackage');
const SRC = __dirname, OUT = path.join(SRC, '..', 'assets');
const ARGS = process.argv.slice(2), TOUT = ARGS.includes('--tout');
const ONLY = ((ARGS.find((a) => a.startsWith('--etapes=')) || '').split('=')[1] || '').split(',').filter(Boolean);
const doStep = (s) => !ONLY.length || ONLY.includes(s);
const kb = (n) => (n / 1024).toFixed(0) + ' Ko';
fs.mkdirSync(WORK, { recursive: true });
const W = (...p) => path.join(WORK, ...p);

// ------------------------------------------------------------------ scripts Python (Blender, Pillow) écrits dans le dossier de travail
const PY = {
  'fbxfix.py': String.raw`# Contournement d'un défaut de l'import FBX de Blender 5.0 sur certains fichiers 3ds Max (PROTOFACTOR) :
# « (mmat, amat) = mesh.armature_setup[self] → KeyError » quand le maillage a été lié à un nœud d'armature différent.
# On remplace le dictionnaire armature_setup par un dictionnaire qui rend la première liaison connue.
import io_scene_fbx.import_fbx as F

class _Setup(dict):
    def __missing__(self, key):
        for v in self.values():
            return v
        return (None, None)

_orig_init = F.FbxImportHelperNode.__init__
def _init(self, *a, **k):
    _orig_init(self, *a, **k)
    self.armature_setup = _Setup()
if not getattr(F.FbxImportHelperNode, '_jdv_patched', False):
    F.FbxImportHelperNode.__init__ = _init
    F.FbxImportHelperNode._jdv_patched = True
`,
  'pieces_glb.py': String.raw`# Exporte des pièces Magic_1_Interior (FBX) dans UN seul GLB : un nœud par pièce (nom = nom du FBX), à l'origine,
# transformations appliquées (mètres, Y en haut côté glTF), matériau unique « pal » (palette Texture.png, sans image embarquée).
# blender --background --python pieces_glb.py -- <sortie.glb> <dossier_meshes> <noms...>
import bpy, sys, os, json
argv = sys.argv[sys.argv.index('--') + 1:]
out, mdir, names = argv[0], argv[1], argv[2:]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
pal = bpy.data.materials.new('pal')
info = {}
for n in names:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(mdir, n + '.fbx'))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']
    for o in new:
        if o.type != 'MESH': continue
        o.data.materials.clear(); o.data.materials.append(pal)
    # tout dans un seul objet, transformations appliquées
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = n; o.data.name = n
    for x in new:
        if x != o and x.name in bpy.data.objects: bpy.data.objects.remove(x, do_unlink=True)
    o.location = (0, 0, 0)
    # seulement la 1re carte UV (palette) : ni couleurs de sommets ni 2e UV (poids inutile)
    me = o.data
    while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
    for ca in list(me.color_attributes): me.color_attributes.remove(ca)
    info[n] = len(o.data.polygons)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_materials='EXPORT',
                          export_image_format='NONE', export_texcoords=True, export_normals=True, export_vertex_color='NONE', export_animations=False,
                          export_skins=False, export_cameras=False, export_lights=False)
print('PIECES', json.dumps(info))
`,
  'creature_glb.py': String.raw`# Créature PROTOFACTOR (FBX 3ds Max) → GLB léger : maillages gardés, décimation, clips recopiés sur le squelette du modèle
# (contraintes « copier les transformations » en espace monde puis cuisson : les clips du pack n'ont pas la même pose de repos
# que le modèle), matériaux sans image (les textures sont emballées à part, en WebP).
# blender --background --python creature_glb.py -- <config.json>
#   config : { "sk": "...SK_X.FBX", "out": "...glb", "keep": ["SK_Body", ...] | null, "tris": 6000,
#              "clips": { "idle": "...X@Idle.FBX", ... }, "fps": 30 }
import bpy, sys, os, json
argv = sys.argv[sys.argv.index('--') + 1:]
cfg = json.load(open(argv[0], encoding='utf-8'))
bpy.ops.wm.read_factory_settings(use_empty=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fbxfix
sc = bpy.context.scene
sc.render.fps = 30
bpy.ops.import_scene.fbx(filepath=cfg['sk'])
A = next(o for o in sc.objects if o.type == 'ARMATURE')
if A.animation_data: A.animation_data.action = None
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
keep = cfg.get('keep')
meshes = [o for o in sc.objects if o.type == 'MESH']
for o in meshes:
    if keep is not None and o.name not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in sc.objects if o.type == 'MESH']
# objets parasites (os d'arme, vides…)
for o in list(sc.objects):
    # on garde les « emplacements » (vides accrochés aux os qui portent une arme ou un bouclier)
    if o.type not in ('MESH', 'ARMATURE') and not any(c.type == 'MESH' for c in o.children_recursive):
        bpy.data.objects.remove(o, do_unlink=True)
def tris(objs): return sum(max(1, len(p.vertices) - 2) for o in objs for p in o.data.polygons)
total = tris(meshes)
target = cfg.get('tris', 6000)
rep = {'avant': total, 'meshes': [o.name for o in meshes]}
if total > target:
    ratio = target / float(total)
    for o in meshes:
        bpy.context.view_layer.objects.active = o
        mod = o.modifiers.new(name='Decimer', type='DECIMATE')
        mod.decimate_type = 'COLLAPSE'; mod.ratio = max(ratio, 0.05); mod.use_collapse_triangulate = True
        # on garde les coutures d'UV et de bord (sinon la texture se déchire)
        try: mod.delimit = {'SEAM', 'UV'}
        except Exception: pass
        bpy.ops.object.modifier_apply(modifier=mod.name)
rep['apres'] = tris(meshes)
# une seule carte UV, pas de couleurs de sommets (poids inutile)
for o in meshes:
    me = o.data
    while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
    for ca in list(me.color_attributes): me.color_attributes.remove(ca)
# matériaux : un Principled vide par matériau (le nom sert à brancher la texture dans le jeu)
for o in meshes:
    for s in o.material_slots:
        m = s.material
        if not m: continue
        try: m.use_nodes = True
        except Exception: pass
        nt = m.node_tree
        for n in list(nt.nodes): nt.nodes.remove(n)
        b = nt.nodes.new('ShaderNodeBsdfPrincipled'); out = nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(b.outputs[0], out.inputs[0])
# clips
clips = cfg.get('clips', {})
rep['clips'] = {}
for key, path in clips.items():
    objs = set(sc.objects)
    acts = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=path)
    B = next((o for o in sc.objects if o.type == 'ARMATURE' and o not in objs), None)
    if B is None or not B.animation_data or not B.animation_data.action:
        rep['clips'][key] = 'ECHEC'; continue
    actB = B.animation_data.action
    f0, f1 = int(round(actB.frame_range[0])), int(round(actB.frame_range[1]))
    cons = []
    for pb in A.pose.bones:
        if pb.name in B.pose.bones:
            c = pb.constraints.new('COPY_TRANSFORMS'); c.target = B; c.subtarget = pb.name
            c.target_space = 'WORLD'; c.owner_space = 'WORLD'
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = A; A.select_set(True)
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.select_all(action='SELECT')
    bpy.ops.nla.bake(frame_start=f0, frame_end=f1, only_selected=True, visual_keying=True, clear_constraints=True,
                     use_current_action=False, bake_types={'POSE'})
    bpy.ops.object.mode_set(mode='OBJECT')
    act = A.animation_data.action
    act.name = key; act.use_fake_user = True
    rep['clips'][key] = [f0, f1]
    A.animation_data.action = None
    for o in list(sc.objects):
        if o not in objs: bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions):
        if a not in acts and a != act: bpy.data.actions.remove(a)
# toutes les actions sur des pistes NLA (l'export glTF les sort une par une)
if A.animation_data is None: A.animation_data_create()
for a in bpy.data.actions:
    tr = A.animation_data.nla_tracks.new(); tr.name = a.name
    st = tr.strips.new(a.name, int(a.frame_range[0]), a)
    try:
        if a.slots: st.action_slot = a.slots[0]
    except Exception: pass
    tr.mute = True
bpy.ops.export_scene.gltf(filepath=cfg['out'], export_format='GLB', export_yup=True, export_materials='EXPORT', export_image_format='NONE',
                          export_animations=True, export_animation_mode='NLA_TRACKS', export_skins=True, export_all_influences=False,
                          export_force_sampling=True, export_optimize_animation_size=True, export_def_bones=False,
                          export_cameras=False, export_lights=False, export_morph=False, export_vertex_color='NONE')
rep['os'] = len(A.data.bones)
print('CREATURE', json.dumps(rep))
`,
  'textures.py': String.raw`# Textures des créatures (Asset Store) → WebP légers : couleur × occlusion, un peu plus vives (rendu « jouet »), redimensionnées.
# python -I textures.py <sortie> [racine_ILO_Assets]
import sys, os
from PIL import Image, ImageEnhance, ImageChops
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
ILO = sys.argv[2] if len(sys.argv) > 2 else 'D:/Games/ILO/Assets'
H = ILO + '/HeroicFantasyCreaturesFullPackVol1/'
GOB = H + 'Must Have Fantasy Villains Pack/Goblin/Textures/'
KOB = H + 'Must Have Fantasy Villains Pack/Kobold/Textures/'
GOL = H + 'Demonic Creatures Pack/Golem/Textures/'
def base(col, ao=None, size=1024, sat=1.15, bright=1.08, contrast=1.05, ao_k=0.75, tint=None, tint_k=0.0):
    im = Image.open(col).convert('RGBA')
    a = im.getchannel('A')
    rgb = im.convert('RGB')
    if ao and os.path.exists(ao):
        o = Image.open(ao).convert('L').resize(rgb.size, Image.BILINEAR)
        o = o.point(lambda v: int(255 - ao_k * (255 - v)))           # occlusion adoucie
        rgb = ImageChops.multiply(rgb, Image.merge('RGB', (o, o, o)))
    if tint:
        # teinte (garde le relief : luminance × couleur), mélangée à l'original
        l = rgb.convert('L').point(lambda v: min(255, int(v * 1.6)))
        col2 = ImageChops.multiply(Image.merge('RGB', (l, l, l)), Image.new('RGB', rgb.size, tint))
        rgb = Image.blend(rgb, col2, tint_k)
    rgb = ImageEnhance.Color(rgb).enhance(sat)
    rgb = ImageEnhance.Brightness(rgb).enhance(bright)
    rgb = ImageEnhance.Contrast(rgb).enhance(contrast)
    return Image.merge('RGBA', (*rgb.split(), a)).resize((size, size), Image.LANCZOS)
def save(im, name, q=80, alpha=False):
    p = os.path.join(OUT, name + '.webp')
    if alpha: im.save(p, 'WEBP', quality=q, method=6, alpha_quality=70)
    else: im.convert('RGB').save(p, 'WEBP', quality=q, method=6)
    print(name, im.size, os.path.getsize(p))
save(base(GOB + 'GoblinBody_BaseColor.png', GOB + 'GoblinBody_Occlusion.png', 1024), 'goblin_body', 76)
save(base(GOB + 'GoblinProps_BaseColor.png', GOB + 'GoblinProps_Occlusion.png', 512), 'goblin_props', 76)
save(base(KOB + 'T_KoboldBody_BaseColor.png', KOB + 'T_KoboldBody_Occlusion.png', 1024, bright=1.12), 'kobold_body', 76)
# le kobold gardien porte une capuche rouge brique (plus lisible dans la bibliothèque sombre)
save(base(KOB + 'T_KoboldOutfit_BaseColor.png', KOB + 'T_KoboldOutfit_Occlusion.png', 1024, sat=1.25, bright=1.15, tint=(196, 62, 44), tint_k=0.62), 'kobold_outfit', 76)
save(base(KOB + 'T_StoneAxe_BaseColor.png', KOB + 'T_StoneAxe_Occlusion.png', 512), 'kobold_axe', 76)
save(base(KOB + 'T_Shield_BaseColor.png', KOB + 'T_Shield_Occlusion.png', 512), 'kobold_shield', 76)
save(base(KOB + 'T_KoboldEye.png', None, 128), 'kobold_eye', 80)
save(base(KOB + 'T_WolfFur.png', None, 128), 'kobold_fur', 70, alpha=True)
# golem : roche + veines magiques (motif d'émission de la variante lave, en niveaux de gris)
save(base(GOL + 'T_GolemRock_BaseColor.png', GOL + 'T_GolemRock_Occlusion.png', 1024, sat=1.0, bright=1.0), 'golem_rock', 76)
em = Image.open(GOL + 'T_GolemLava_Emissive.tga').convert('RGB').resize((512, 512), Image.LANCZOS)
lum = em.convert('L').point(lambda v: min(255, int((v / 255.0) ** 0.8 * 255 * 1.4)))
ey = Image.open(GOL + 'T_GolemRock_Emissive.tga').convert('L').resize((512, 512), Image.LANCZOS)
lum = ImageChops.lighter(lum, ey.point(lambda v: min(255, v * 3)))
lum.save(os.path.join(OUT, 'golem_glow.webp'), 'WEBP', quality=72, method=6)
print('golem_glow', os.path.getsize(os.path.join(OUT, 'golem_glow.webp')))
# palette des décors (cases nettes : sans perte)
pal = Image.open(ILO + '/Magic_1_Interior/Textures/Texture.png').convert('RGB')
pal.resize((512, 512), Image.NEAREST).save(os.path.join(OUT, 'palette.webp'), 'WEBP', lossless=True, method=6)
print('palette', os.path.getsize(os.path.join(OUT, 'palette.webp')))
`,
  'fxatlas.py': String.raw`# Planche d'effets (Cartoon FX Remaster Free) : 16 cases de 256 px dans une image 1024², blanc + alpha (teinte dans le jeu).
# python -I fxatlas.py <dossier_png_cfx> <sortie.webp> [sortie_apercu.png]
import sys, os
from PIL import Image, ImageOps, ImageChops
src, out = sys.argv[1], sys.argv[2]
prev = sys.argv[3] if len(sys.argv) > 3 else None
CELLS = [
    ('CFX2_T_GlowSoft', 'l', None), ('CFX3_T_GlowDot', 'l', None), ('cfxr_magic_star', 'l', None), ('cfxr_spikes_impact', 'l', None),
    ('cfxr_aura_runic', 'l', None), ('CFX3_T_HollowCircle', 'l', None), ('cfxr_smoke_cloud_x4', 'a', (0, 0, 0.5, 0.5)), ('CFX2_T_WWSmoke_Glow_AB', 'a', None),
    ('cfxr_flamme_candle', 'l', None), ('cfxr_fire_circle_drawn_blurred', 'l', None), ('cfxr_electric_arcs_x4', 'l', (0, 0, 1, 0.25)), ('cfxr_ring_ice', 'l', None),
    ('cfxr_debris_unlit_3x3', 'a', (0, 0, 1 / 3, 1 / 3)), ('cfxr_star_blurred', 'l', None), ('cfxr_flare', 'l', None), ('cfxr_heart', 'l', None),
]
C = 256
atlas = Image.new('RGBA', (C * 4, C * 4), (255, 255, 255, 0))
for i, (name, mode, crop) in enumerate(CELLS):
    im = Image.open(os.path.join(src, name + '.png')).convert('RGBA')
    if crop:
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    if mode == 'l':
        lum = im.convert('L')
        if 'A' in im.getbands():
            lum = ImageChops.multiply(lum, im.getchannel('A'))
        rgb = Image.new('L', im.size, 255)
        cell = Image.merge('RGBA', (rgb, rgb, rgb, lum))
    else:
        g = im.convert('L')
        cell = Image.merge('RGBA', (g, g, g, im.getchannel('A')))
    # tient dans la case en gardant les proportions (une marge de 2 px évite les fuites entre cases)
    w, h = cell.size; k = min((C - 4) / w, (C - 4) / h)
    nw, nh = max(1, round(w * k)), max(1, round(h * k))
    cell = cell.resize((nw, nh), Image.LANCZOS)
    x0 = (i % 4) * C + (C - nw) // 2; y0 = (i // 4) * C + (C - nh) // 2
    atlas.paste(cell, (x0, y0))
atlas.save(out, 'WEBP', quality=88, method=6, alpha_quality=90)
print('atlas', os.path.getsize(out))
if prev:
    bg = Image.new('RGBA', atlas.size, (20, 18, 30, 255)); bg.alpha_composite(atlas); bg.convert('RGB').save(prev)
`,
  'unitypkg.py': String.raw`# Extrait quelques fichiers d'un .unitypackage (archive tar.gz : un dossier par GUID avec « pathname » et « asset »)
# python -I unitypkg.py cfx  <paquet> <sortie>            → les textures de la planche d'effets, converties en PNG (nom = nom du fichier, espaces → _)
# python -I unitypkg.py imph <paquet> <sortie> <noms…>    → les sons demandés (WAV, par nom de fichier)
import sys, os, tarfile, io
mode, pkg, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
CFX = {'CFX2_T_GlowSoft', 'CFX3_T_GlowDot', 'cfxr magic star', 'cfxr spikes impact', 'cfxr aura runic', 'CFX3_T_HollowCircle', 'cfxr smoke cloud x4',
       'CFX2_T_WWSmoke Glow AB', 'cfxr flamme candle', 'cfxr fire circle drawn blurred', 'cfxr electric arcs x4', 'cfxr ring ice', 'cfxr debris unlit 3x3',
       'cfxr star blurred', 'cfxr flare', 'cfxr heart'}
want = set(sys.argv[4:])
# 1er passage : les chemins (petits fichiers « pathname ») ; 2e passage : les contenus voulus
paths = {}
with tarfile.open(pkg, 'r:gz') as t:
    for m in t:
        if m.name.endswith('/pathname'):
            g = m.name.lstrip('./').split('/')[0]
            paths[g] = t.extractfile(m).read().decode('utf-8', 'replace').splitlines()[0]
pick = {}
for g, p in paths.items():
    base = os.path.basename(p)
    stem = os.path.splitext(base)[0]
    if mode == 'cfx' and stem in CFX and p.lower().endswith(('.png', '.tga')): pick[g] = stem.replace(' ', '_') + '.png'
    if mode == 'imph' and base in want: pick[g] = base
got = 0
with tarfile.open(pkg, 'r:gz') as t:
    for m in t:
        parts = m.name.lstrip('./').split('/')
        if len(parts) == 2 and parts[1] == 'asset' and parts[0] in pick:
            data = t.extractfile(m).read(); name = pick[parts[0]]
            if mode == 'cfx':
                from PIL import Image
                Image.open(io.BytesIO(data)).save(os.path.join(out, name))
            else:
                open(os.path.join(out, name), 'wb').write(data)
            got += 1
print('extraits', got)
`
};
for (const [n, code] of Object.entries(PY)) fs.writeFileSync(W(n), code);

// ------------------------------------------------------------------ créatures : modèle, morceaux gardés, triangles visés, clips
const H = ILO + '/HeroicFantasyCreaturesFullPackVol1/';
const GOB = H + 'Must Have Fantasy Villains Pack/Goblin/FBX Files/', KOB = H + 'Must Have Fantasy Villains Pack/Kobold/FBX Files/', GOL = H + 'Demonic Creatures Pack/Golem/FBX Files/Skinned Golem/';
const CREATURES = {
  goblin: { sk: GOB + 'SK_Goblin.FBX', tris: 4600,
    keep: ['SK_GoblinBody', 'SM_DaggerLeft', 'SM_DaggerRight', 'SK_ShoulderPad', 'SM_ForearmArmorLeft', 'SM_ForearmArmorRight', 'SM_LegArmorLeft', 'SM_LegArmorRight', 'SK_Slingshot'],
    clips: { idle: 'IdleDaggers', run: 'RunDaggers', atk1: 'Attack1Daggers', atk3: 'Attack3Daggers', hit: 'GetHitDaggers', death: 'DeathDaggers',
      s_idle: 'IdleAimSlingshot', s_shoot: 'ShootSlingshot', s_run: 'RunSlingshot', s_hit: 'GetHitSlingshot', s_death: 'DeathSlingshot' }, dir: GOB, pre: 'Goblin@' },
  kobold: { sk: KOB + 'SK_Kobold.FBX', tris: 6000, keep: null,
    clips: { idle: 'IdleCombat', run: 'RunNormal', walk: 'WalkForwardCombat', atk2: 'Attack2', atk4: 'Attack4', hit: 'GetHitFront', death: 'Death' }, dir: KOB, pre: 'Kobold@' },
  golem: { sk: GOL + 'SK_Golem.FBX', tris: 6000, keep: null,
    clips: { idle: 'Idle', walk: 'Walk', roar: 'Roar', atk1: 'Attack1', atk2: 'Attack2', atk3: 'Attack3', atk4: 'Attack4', atk5: 'Attack5', hit: 'GetHitHeavy', hitl: 'GetHitLight', death: 'Death' }, dir: GOL, pre: 'Golem@' }
};
// pièces toujours utiles (référencées autrement que par put(...) dans le jeu)
const PIECES_EXTRA = ['prop_178', 'prop_180', 'prop_182', 'prop_183', 'candle_015', 'jar_009', 'stone_item_141', 'stone_item_146', 'wall_195'];
// sons : nom → [fichier (K: KriptoFX, I: Imphenzia), début, durée max, volume]
const KRIPTO = ILO + '/KriptoFX/Realistic Effects Pack v4/Effects/Audio/';
const SONS = {
  cast: ['I:MAGIC_SPELL_Short_Fast_Burst_Quick_Fade_stereo.wav', 0, 0.55, 0.55], zap: ['K:LightningImpact1.wav', 0, 0.45, 0.6],
  fire: ['K:mag_fire_projectile_001.wav', 0, 1.1, 0.8], boom: ['K:FireExplosion.wav', 0, 1.4, 1], frost: ['K:IceExplosion.wav', 0, 1.4, 0.9],
  slam: ['K:RockImpact.wav', 0, 1.4, 1], quake: ['K:RockExplosion.wav', 0, 2.2, 1], whoosh: ['I:MAGIC_SPELL_Quick_Whoosh_Echo_Out_stereo.wav', 0, 0.7, 0.55],
  portal: ['K:PortalIn.wav', 0, 2.2, 0.8], spawn: ['I:MAGIC_SPELL_Spawn_mono.wav', 0, 0.69, 0.6], shield: ['I:MAGIC_SPELL_Shield_mono.wav', 0, 0.9, 0.7],
  bossdie: ['K:Explosion2.wav', 0, 3.4, 1], gob1: ['I:CREATURE_Squeel_01_mono.wav', 0, 0.92, 0.55], gob2: ['I:CREATURE_Squeel_03_mono.wav', 0, 0.38, 0.55],
  gob3: ['I:CREATURE_Squeel_06_mono.wav', 0, 0.38, 0.55], kob: ['I:MONSTER_Growl_Medium_03_mono.wav', 0, 1.0, 0.55], kobhurt: ['I:MONSTER_Growl_Hurt_mono.wav', 0, 0.8, 0.55],
  roar: ['I:MONSTER_Growl_Deep_01_Long_mono.wav', 0, 2.74, 1], grunt: ['I:MONSTER_Growl_Deep_07_Short_mono.wav', 0, 0.76, 0.8],
  gem: ['I:MUSIC_EFFECT_Bell_Voice_Positive_07_stereo.wav', 0, 1.2, 0.35], potion: ['I:MAGIC_SPELL_Slow_Fade_In_Bright_Pad_stereo.wav', 0, 1.8, 0.6],
  clear: ['I:PUZZLE_Success_Bell_Voice_Three_Note_Climb_Wet_stereo.wav', 0, 1.6, 0.7], page: ['I:BOOK_Turn_Page_01_mono.wav', 0, 0.97, 0.5],
  stone: ['I:IMPACT_Stone_Deep_mono.wav', 0, 0.3, 0.7], power: ['I:MAGIC_SPELL_Power_mono.wav', 0, 0.74, 0.6], hurt: ['I:UI_Select_Medieval_Shield_Hit_stereo.wav', 0, 0.2, 0.8]
};
// musiques (calmes : magic-<n>, énergiques : magic-x<n>, boss : magicboss-1)
const COL = ILO + '/Ultimate Game Music Collection/';
// (une seule variante par ambiance : la borne précharge la variante suivante, on évite de télécharger deux morceaux d'un coup)
const MUSIQUES = { 'magic-1': 'Dungeons/Pretty Dungeon LOOP.wav', 'magic-x1': 'Combat/Close Combat LOOP.wav', 'magicboss-1': 'Combat/Boss Battle 2 Loop.wav' };

function run(cmd, args, quiet) { return execFileSync(cmd, args, { stdio: quiet ? 'pipe' : 'inherit', maxBuffer: 1 << 28 }).toString(); }
function blender(script, args) {
  const out = execFileSync(BLENDER, ['--background', '--python', W(script), '--', ...args], { stdio: 'pipe', maxBuffer: 1 << 28 }).toString();
  const err = out.split('\n').filter((l) => /Traceback|Error:/.test(l));
  if (err.length && !out.includes('PIECES') && !out.includes('CREATURE')) throw new Error(script + ' : ' + err.join(' | '));
  return out;
}
const gltfpack = (i, o, extra) => run(process.execPath, [path.join(NODE, 'gltfpack/cli.js'), '-i', i, '-o', o, '-cc', '-kn', '-km', '-kv', '-vtf', ...extra], true);

(async () => {
  const t0 = Date.now();
  // 1) pièces du décor utilisées par le jeu
  if (doStep('pieces')) {
    const game = fs.readFileSync(path.join(SRC, 'games/magic.js'), 'utf8');
    const used = new Set(PIECES_EXTRA);
    for (const m of game.matchAll(/['"]((?:wall|floor|partition|closet|shelf|prop|candle|table|carpet|flag|window|door|stone_item|picture|cauldron|jar|curtain|nature|chair|lamp)_\d{3})['"]/g)) used.add(m[1]);
    const list = [...used].sort();
    const glb = W('pieces.glb');
    if (TOUT || !fs.existsSync(glb) || fs.readFileSync(W('pieces.txt'), 'utf8') !== list.join(' ')) {
      const o = blender('pieces_glb.py', [glb, ILO + '/Magic_1_Interior/Meshes', ...list]);
      if (!o.includes('PIECES')) throw new Error('pièces : export raté');
      fs.writeFileSync(W('pieces.txt'), list.join(' '));
    }
    gltfpack(glb, W('pieces.pack.glb'), []);
    console.log('pièces :', list.length, '→', kb(fs.statSync(W('pieces.pack.glb')).size));
  }
  // 2) créatures
  if (doStep('creatures')) {
    for (const [name, c] of Object.entries(CREATURES)) {
      const glb = W(name + '.glb');
      if (TOUT || !fs.existsSync(glb)) {
        const cfg = { sk: c.sk, out: glb, tris: c.tris, keep: c.keep, clips: {} };
        for (const [k, clip] of Object.entries(c.clips)) cfg.clips[k] = c.dir + c.pre + clip + '.FBX';
        fs.writeFileSync(W(name + '.json'), JSON.stringify(cfg));
        const o = blender('creature_glb.py', [W(name + '.json')]);
        const line = o.split('\n').find((l) => l.startsWith('CREATURE')); if (!line) throw new Error(name + ' : export raté');
      }
      gltfpack(glb, W(name + '.pack.glb'), ['-vpf', '-af', '20']);
      console.log('créature', name, '→', kb(fs.statSync(W(name + '.pack.glb')).size));
    }
  }
  // 3) textures + planche d'effets
  if (doStep('textures')) { run(PYTHON, ['-I', W('textures.py'), W('tex'), ILO], true); console.log('textures : ok'); }
  if (doStep('effets')) {
    const pngDir = W('cfx_png');
    if (TOUT || !fs.existsSync(path.join(pngDir, 'cfxr_magic_star.png'))) run(PYTHON, ['-I', W('unitypkg.py'), 'cfx', CFX_PKG, pngDir], true);
    fs.mkdirSync(W('tex'), { recursive: true });
    run(PYTHON, ['-I', W('fxatlas.py'), pngDir, W('tex', 'fx.webp')], true);
    console.log('effets :', kb(fs.statSync(W('tex', 'fx.webp')).size));
  }
  // 4) sons (Chrome : WebCodecs) et musiques
  if (doStep('sons') || doStep('musiques')) {
    const imph = W('imph');
    const need = Object.values(SONS).filter((s) => s[0].startsWith('I:')).map((s) => s[0].slice(2));
    if (doStep('sons') && (TOUT || need.some((f) => !fs.existsSync(path.join(imph, f))))) run(PYTHON, ['-I', W('unitypkg.py'), 'imph', IMPH_PKG, imph, ...need], true);
    const srv = http.createServer((q, r) => {
      const u = new URL(q.url, 'http://x');
      if (u.pathname === '/wav') {
        const f = u.searchParams.get('f'); const full = f.startsWith('I:') ? path.join(imph, f.slice(2)) : f.startsWith('K:') ? KRIPTO + f.slice(2) : COL + f.slice(2);
        r.writeHead(200, { 'content-type': 'audio/wav' }); return fs.createReadStream(full).pipe(r);
      }
      r.writeHead(200, { 'content-type': 'text/html' }); r.end('<body></body>');
    });
    await new Promise((res) => srv.listen(0, '127.0.0.1', res));
    const { chromium } = require(PLAYWRIGHT);
    const b = await chromium.launch({ executablePath: CHROME });
    const page = await b.newPage(); await page.goto('http://localhost:' + srv.address().port + '/');
    const enc = (url, t0, dmax, vol, stereo, music) => page.evaluate(async ({ url, t0, dmax, vol, stereo, music }) => {
      const ab = await (await fetch(url)).arrayBuffer(), SR = 44100, nc = stereo ? 2 : 1;
      const buf = await new OfflineAudioContext(nc, 1, SR).decodeAudioData(ab);
      const s0 = Math.floor(t0 * SR), n = Math.min(buf.length - s0, Math.floor(dmax * SR));
      const src = []; for (let c = 0; c < buf.numberOfChannels; c++) src.push(buf.getChannelData(c));
      const ch = []; for (let c = 0; c < nc; c++) { const m = new Float32Array(n); for (let i = 0; i < n; i++) { if (nc === 1) { let v = 0; for (const x of src) v += x[s0 + i]; m[i] = v / src.length; } else m[i] = src[Math.min(c, src.length - 1)][s0 + i]; } ch.push(m); }
      let peak = 0, sum = 0; for (const m of ch) for (let i = 0; i < n; i++) { const a = Math.abs(m[i]); if (a > peak) peak = a; sum += m[i] * m[i]; }
      const rms = Math.sqrt(sum / (n * nc)) || 1e-6, gain = Math.min((music ? 0.12 : 0.2 * vol) / rms, 0.95 / (peak || 1));
      const fi = Math.min(n, music ? 441 : 64), fo = Math.min(n, Math.floor(SR * (music ? 0.03 : 0.12)));
      for (const m of ch) for (let i = 0; i < n; i++) { let g = gain; if (i < fi) g *= i / fi; if (i > n - fo) g *= (n - i) / fo; m[i] *= g; }
      const parts = []; let err = null;
      const e = new AudioEncoder({ output: (c) => { const a = new Uint8Array(c.byteLength); c.copyTo(a); parts.push(a); }, error: (x) => { err = x; } });
      e.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: nc, bitrate: 96000, aac: { format: 'adts' } });
      for (let o = 0; o < n; o += 4096) {
        const k = Math.min(4096, n - o), data = new Float32Array(k * nc);
        for (let c = 0; c < nc; c++) data.set(ch[c].subarray(o, o + k), c * k);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: k, numberOfChannels: nc, timestamp: Math.round(o / SR * 1e6), data });
        e.encode(ad); ad.close();
      }
      await e.flush(); e.close(); if (err) throw err;
      const len = parts.reduce((s, p) => s + p.length, 0), all = new Uint8Array(len); let k = 0; for (const p of parts) { all.set(p, k); k += p.length; }
      await new OfflineAudioContext(nc, 1, SR).decodeAudioData(all.buffer.slice(0));
      return btoa(Array.from(all, (x) => String.fromCharCode(x)).join(''));
    }, { url, t0, dmax, vol, stereo, music });
    if (doStep('sons')) {
      fs.mkdirSync(W('snd'), { recursive: true }); let tot = 0;
      for (const [id, [f, a, d, v]] of Object.entries(SONS)) { const buf = Buffer.from(await enc('/wav?f=' + encodeURIComponent(f), a, d, v, false, false), 'base64'); fs.writeFileSync(W('snd', id + '.aac'), buf); tot += buf.length; }
      console.log('sons :', Object.keys(SONS).length, '→', kb(tot));
    }
    if (doStep('musiques')) {
      const pw = fs.readFileSync(path.join(SRC, 'asset-key.txt'), 'utf8').trim();
      const salt = new Uint8Array(Buffer.from(fs.readFileSync(path.join(SRC, 'music-salt.hex'), 'utf8').trim(), 'hex'));
      const km = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
      const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
      const mdir = path.join(OUT, 'music'); fs.mkdirSync(mdir, { recursive: true });
      for (const [id, rel] of Object.entries(MUSIQUES)) {
        const aac = Buffer.from(await enc('/wav?f=' + encodeURIComponent('C:' + rel), 0, 600, 1, true, true), 'base64');
        const iv = webcrypto.getRandomValues(new Uint8Array(12)), ct = Buffer.from(await subtle.encrypt({ name: 'AES-GCM', iv }, key, aac));
        fs.writeFileSync(path.join(mdir, id + '.bin'), Buffer.concat([Buffer.from(salt), Buffer.from(iv), ct]));
        console.log('musique', id, '→', kb(ct.length));
      }
    }
    await b.close(); srv.close();
  }
  // 5) moteur 3D : three.js réduit à ce que le jeu utilise
  if (doStep('moteur')) {
    const game = fs.readFileSync(path.join(SRC, 'games/magic.js'), 'utf8');
    const extra = new Set(['GLTFLoader', 'MeshoptDecoder', 'skeletonClone', 'mergeGeometries']);
    const names = [...new Set([...game.matchAll(/\bT\.([A-Za-z_][A-Za-z0-9_]*)\b/g)].map((m) => m[1]))].filter((n) => !extra.has(n)).sort();
    const pkg = JSON.parse(fs.readFileSync(path.join(NODE, 'three/package.json'), 'utf8'));
    const entry = W('three-entry.js');
    fs.writeFileSync(entry, "import { " + names.join(', ') + " } from 'three';\n" +
      "import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';\nimport { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';\n" +
      "import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';\nimport { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';\n" +
      'window.JDW_THREE = { ' + names.join(', ') + ', GLTFLoader, MeshoptDecoder, skeletonClone, mergeGeometries };\n');
    const banner = '/* Magic Force — moteur 3D : three.js r' + pkg.version.split('.')[1] + ' (https://threejs.org), (c) 2010-2025 three.js authors, licence MIT ; meshoptimizer (c) Arseny Kapoulkine, licence MIT */';
    const js = W('magic3d.js');
    run(process.execPath, [path.join(NODE, 'esbuild/bin/esbuild'), entry, '--bundle', '--minify', '--format=iife', '--legal-comments=none', '--target=es2019', '--banner:js=' + banner, '--outfile=' + js, '--log-level=warning'], true);
    fs.writeFileSync(path.join(OUT, 'magic.moteur.bin'), zlib.gzipSync(fs.readFileSync(js), { level: 9 }));
    console.log('moteur 3D :', names.length + 4, 'éléments de three.js,', kb(fs.statSync(js).size), '→', kb(fs.statSync(path.join(OUT, 'magic.moteur.bin')).size), 'gzippé');
  }
  // 6) emballage
  if (doStep('emballage')) {
    const entries = [];
    for (const n of ['pieces', 'goblin', 'kobold', 'golem']) entries.push({ name: n, buf: fs.readFileSync(W(n + '.pack.glb')), t: 'glb', z: 1 });
    for (const f of fs.readdirSync(W('tex')).filter((f) => f.endsWith('.webp')).sort()) entries.push({ name: f.slice(0, -5), buf: fs.readFileSync(W('tex', f)), t: 'webp', z: 0 });
    for (const f of fs.readdirSync(W('snd')).filter((f) => f.endsWith('.aac')).sort()) entries.push({ name: 'snd_' + f.slice(0, -4), buf: fs.readFileSync(W('snd', f)), t: 'aac', z: 0 });
    const header = { v: 1, e: {} }, chunks = []; let off = 0;
    for (const e of entries) { const d = e.z ? zlib.gzipSync(e.buf, { level: 9 }) : e.buf; header.e[e.name] = { o: off, l: d.length, t: e.t, z: e.z }; chunks.push(d); off += d.length; }
    const h = Buffer.from(JSON.stringify(header), 'utf8'), hl = Buffer.alloc(4); hl.writeUInt32LE(h.length);
    const plain = Buffer.concat([hl, h, ...chunks]);
    const pw = fs.readFileSync(path.join(SRC, 'asset-key.txt'), 'utf8').trim();
    const salt = webcrypto.getRandomValues(new Uint8Array(16)), iv = webcrypto.getRandomValues(new Uint8Array(12));
    const km = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const ct = Buffer.from(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'magic.monde1.bin'), Buffer.concat([Buffer.from(salt), Buffer.from(iv), ct]));
    console.log('magic.monde1.bin :', kb(fs.statSync(path.join(OUT, 'magic.monde1.bin')).size), '(' + entries.length + ' éléments)');
    for (const e of entries) console.log('   ', e.name.padEnd(16), e.t, kb(header.e[e.name].l));
  }
  console.log('fini en', ((Date.now() - t0) / 1000).toFixed(0), 's');
})().catch((e) => { console.error(e); process.exit(1); });
