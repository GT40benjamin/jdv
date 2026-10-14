// Prépare les images des « P'tits Rouleaux » à partir du projet Unity ILO de l'utilisateur (packs de l'Asset Store) :
//  1) rend en images détourées (fond transparent, éclairage doux) les objets 3D low-poly choisis dans Magic_1_Interior,
//     avec Blender en ligne de commande (script Python intégré ci-dessous, écrit dans un dossier temporaire) ;
//  2) recadre, ajoute un fin contour sombre (le style dessiné du jeu), redimensionne et compresse en WebP (Chrome) ;
//  3) EMBALLE (chiffre) le tout avec la clé intégrée au site, source/asset-key.txt (licence : jamais d'image en clair dans le dépôt).
//   node pack-rouleaux.js [dossier_test]
// Sortie : ../assets/rouleaux.bin ; si dossier_test est donné, les WebP en clair y sont aussi écrits (tests locaux, hors dépôt),
// avec manifest.json { nom: nombre d'images } (harnais de test du jeu).
// Variables : ILO_ASSETS (projet Unity, défaut D:/Games/ILO/Assets), BLENDER (blender.exe), RENDUS (dossier de rendus déjà faits : Blender sauté).
// Format de rouleaux.bin : comme ilo.bin — sel(16) + iv(12) + AES-GCM( [taille de l'en-tête sur 4 octets][en-tête JSON][WebP concaténés] ),
// clé PBKDF2-SHA256 200 000 tours ; en-tête { nom: [{ off, len, size }] } → api.assets() donne { nom: [image] }.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process'), { webcrypto } = require('crypto'); const subtle = webcrypto.subtle;
const ILO = process.env.ILO_ASSETS || 'D:/Games/ILO/Assets';
const BLENDER = process.env.BLENDER || 'C:/Program Files/Blender Foundation/Blender 5.0/blender.exe';
const MESH = ILO + '/Magic_1_Interior/Meshes/';
const TEX = ILO + '/Magic_1_Interior/Textures/Texture.png';
// nom (clé dans le jeu), objet FBX, vue (34 = trois-quarts, face), hauteur finale en pixels
const ITEMS = [
  ['wc_bain', 'bathroom_item_013', '34', 300], ['wc_chateau', 'bathroom_item_015', '34', 360],
  ['tub', 'bathroom_item_001', '34', 220], ['sink', 'bathroom_item_010', 'face', 260], ['mirror', 'bathroom_item_009', 'face', 260],
  ['curtain', 'bathroom_item_012', 'face', 300], ['washer', 'bathroom_item_005', '34', 240], ['tp', 'bathroom_item_014', 'face', 140],
  ['mirror_orne', 'bathroom_item_017', 'face', 300], ['sconce', 'candle_002', 'face', 180], ['candelabra', 'candle_027', '34', 300],
  ['cauldron', 'cauldron_001', 'face', 240], ['throne', 'chair_050', '34', 280], ['flag_violet', 'flag_001', 'face', 240],
  ['flag_rouge', 'flag_002', 'face', 300], ['flag_royal', 'flag_004', 'face', 320], ['clock', 'clock_001', 'face', 300],
  ['shield', 'shield_001', 'face', 220], ['globe', 'prop_051', '34', 220], ['crystal', 'prop_089', '34', 160],
  ['lectern', 'shelf_035', '34', 220], ['potions', 'jar_008', 'face', 180]
];
// planètes (Galaxy Wars : même pack) pour les hublots de la station spatiale
const PLANETS = [10, 12, 27, 33].map(n => ILO + '/Andrey Zashikhin/Planets Bundle Part 5/Planet Bundle (' + n + ').png');
const PY = String.raw`
import bpy, sys, os, math
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
out_dir, size, view, tex = argv[0], int(argv[1]), argv[2], argv[3]
files = argv[4:]
os.makedirs(out_dir, exist_ok=True)
def node(nt, typ, ident):
    n = next((x for x in nt.nodes if x.type == typ), None)
    return n if n else nt.nodes.new(ident)
for f in files:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    eng = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in eng else 'BLENDER_EEVEE_NEXT'
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    try: sc.view_settings.view_transform = 'Standard'
    except Exception: pass
    w = bpy.data.worlds.new('w'); sc.world = w
    try: w.use_nodes = True
    except Exception: pass
    bg = node(w.node_tree, 'BACKGROUND', 'ShaderNodeBackground')
    outw = node(w.node_tree, 'OUTPUT_WORLD', 'ShaderNodeOutputWorld')
    w.node_tree.links.new(bg.outputs[0], outw.inputs[0])
    bg.inputs[0].default_value = (0.82, 0.85, 0.9, 1); bg.inputs[1].default_value = 0.75
    bpy.ops.import_scene.fbx(filepath=f)
    objs = [o for o in sc.objects if o.type == 'MESH']
    m = bpy.data.materials.new('pal')
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree
    bsdf = node(nt, 'BSDF_PRINCIPLED', 'ShaderNodeBsdfPrincipled')
    outm = node(nt, 'OUTPUT_MATERIAL', 'ShaderNodeOutputMaterial')
    nt.links.new(bsdf.outputs[0], outm.inputs[0])
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(tex, check_existing=True); t.interpolation = 'Closest'
    nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.85
    for o in objs:
        o.data.materials.clear(); o.data.materials.append(m)
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    ctr = (mn + mx) / 2; ext = (mx - mn).length
    cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'
    cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
    d = Vector((0, -1, 0.0)) if view == 'face' else Vector((0.55, -1, 0.38))
    d.normalize()
    cam.location = ctr + d * (ext * 3)
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted(); loc = [inv @ p for p in pts]
    ww = max(p.x for p in loc) - min(p.x for p in loc); hh = max(p.y for p in loc) - min(p.y for p in loc)
    cx = (max(p.x for p in loc) + min(p.x for p in loc)) / 2; cy = (max(p.y for p in loc) + min(p.y for p in loc)) / 2
    cd.ortho_scale = max(ww, hh) * 1.08; cd.shift_x = cx / cd.ortho_scale; cd.shift_y = cy / cd.ortho_scale
    for (e, ang, rot) in ((2.6, 0.6, (50, -12, -35)), (0.9, 1.0, (-60, 20, 150))):
        L = bpy.data.lights.new('l', 'SUN'); L.energy = e; L.angle = ang
        lo = bpy.data.objects.new('l', L); sc.collection.objects.link(lo)
        lo.rotation_euler = tuple(math.radians(a) for a in rot)
    sc.render.filepath = os.path.join(out_dir, os.path.splitext(os.path.basename(f))[0] + '.png')
    bpy.ops.render.render(write_still=True)
    print('OK', f)
`;
(async () => {
  const pw = fs.readFileSync(path.join(__dirname, 'asset-key.txt'), 'utf8').trim();   // clé d'emballage intégrée au site (pas un secret)
  const testDir = process.argv[2];
  // 1) rendus Blender (sauf si RENDUS pointe vers des rendus déjà faits : fichiers <objet>.png)
  let renders = process.env.RENDUS;
  if (!renders) {
    renders = path.join(os.tmpdir(), 'rouleaux-rendus'); fs.mkdirSync(renders, { recursive: true });
    const py = path.join(os.tmpdir(), 'rouleaux-rendre.py'); fs.writeFileSync(py, PY);
    for (const view of ['34', 'face']) {
      const files = ITEMS.filter(i => i[2] === view).map(i => MESH + i[1] + '.fbx');
      execFileSync(BLENDER, ['--background', '--python', py, '--', renders, '512', view, TEX, ...files], { stdio: 'ignore' });
    }
  }
  // 2) recadrage, contour, WebP (Chrome)
  const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/Benjamin/jdv-tools/node_modules/playwright-core');
  const b = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
  const page = await b.newPage();
  const tmp = path.join(os.tmpdir(), 'pack-rouleaux.html'); fs.writeFileSync(tmp, '<body></body>'); await page.goto('file:///' + tmp.replace(/\\/g, '/'));
  const header = {}, chunks = []; let off = 0;
  const add = (name, buf, size) => {
    (header[name] = header[name] || []).push({ off, len: buf.length, size });
    chunks.push(buf); off += buf.length;
    if (testDir) { fs.mkdirSync(path.join(testDir, name), { recursive: true }); fs.writeFileSync(path.join(testDir, name, String(header[name].length).padStart(2, '0') + '.webp'), buf); }
  };
  const prep = (url, h, outline) => page.evaluate(async ({ url, h, outline }) => {
    const im = new Image(); im.src = url; await im.decode();
    const c0 = document.createElement('canvas'); c0.width = im.naturalWidth; c0.height = im.naturalHeight;
    const g0 = c0.getContext('2d'); g0.drawImage(im, 0, 0);
    const d = g0.getImageData(0, 0, c0.width, c0.height).data;
    let x0 = c0.width, y0 = c0.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c0.height; y++) for (let x = 0; x < c0.width; x++) if (d[(y * c0.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < x0) { x0 = 0; y0 = 0; x1 = c0.width - 1; y1 = c0.height - 1; }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = h / bh, o = outline ? 3 : 0;
    const W = Math.round(bw * k) + o * 2, H = Math.round(bh * k) + o * 2;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    if (outline) {
      // contour sombre : la silhouette décalée tout autour, puis l'image par-dessus
      const s = document.createElement('canvas'); s.width = W; s.height = H;
      const gs = s.getContext('2d'); gs.imageSmoothingQuality = 'high';
      gs.drawImage(c0, x0, y0, bw, bh, o, o, W - o * 2, H - o * 2);
      gs.globalCompositeOperation = 'source-in'; gs.fillStyle = 'rgba(28,36,46,0.92)'; gs.fillRect(0, 0, W, H);
      for (let a = 0; a < 16; a++) { const r = o - 0.6; g.drawImage(s, Math.cos(a * Math.PI / 8) * r, Math.sin(a * Math.PI / 8) * r); }
    }
    g.drawImage(c0, x0, y0, bw, bh, o, o, W - o * 2, H - o * 2);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.86));
    return { bytes: Array.from(new Uint8Array(await blob.arrayBuffer())), w: W, h: H };
  }, { url, h, outline });
  for (const [name, fbx, , h] of ITEMS) {
    const src = path.join(renders, fbx + '.png');
    const r = await prep(encodeURI('file:///' + src.replace(/\\/g, '/')), h, true);
    add(name, Buffer.from(r.bytes), Math.max(r.w, r.h));
  }
  for (const src of PLANETS) {
    const r = await page.evaluate(async (url) => {
      const im = new Image(); im.src = url; await im.decode();
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, 256, 256);
      const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.84));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, encodeURI('file:///' + src));
    add('planets', Buffer.from(r), 256);
  }
  await b.close();
  // 3) emballage
  const h = Buffer.from(JSON.stringify(header), 'utf8'), hl = Buffer.alloc(4); hl.writeUInt32LE(h.length);
  const plain = Buffer.concat([hl, h, ...chunks]);
  const salt = webcrypto.getRandomValues(new Uint8Array(16)), iv = webcrypto.getRandomValues(new Uint8Array(12));
  const km = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = Buffer.from(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  const out = path.join(__dirname, '..', 'assets', 'rouleaux.bin');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.concat([Buffer.from(salt), Buffer.from(iv), ct]));
  if (testDir) { const m = {}; for (const k of Object.keys(header)) m[k] = header[k].length; fs.writeFileSync(path.join(testDir, 'manifest.json'), JSON.stringify(m)); }
  console.log('rouleaux.bin :', (fs.statSync(out).size / 1024).toFixed(0), 'Ko |', ITEMS.length, 'objets,', PLANETS.length, 'planètes');
})().catch(e => { console.error(e); process.exit(1); });
