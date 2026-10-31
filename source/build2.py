"""Assemble Jeux des WC.
usage: python3 build2.py <artifact.html> <standalone.html> [<site-plain.html> <supabase_url> <supabase_key>]
"""
import re, sys, json
import os
J = os.path.dirname(os.path.abspath(__file__)) + '/'
src = open(J + 'pleingaz-src.html').read()
if '__IMG_' in src:   # personnages neutres dessinés (jamais de photo de copain dans les fichiers publiés)
    import base64
    for k in ('PILOT', 'HEAD', 'FACE'):
        svg = open(J + 'pg-neutral/' + k.lower() + '.svg', 'rb').read()
        src = src.replace('__IMG_' + k + '__', 'data:image/svg+xml;base64,' + base64.b64encode(svg).decode())
    assert '__IMG_' not in src
css = src[src.index('<style>') + 7: src.index('</style>')]
after_style = src[src.index('</style>') + 8:]
markup = after_style[:after_style.index('<script>')].strip()
script = after_style[after_style.index('<script>') + 8: after_style.rindex('</script>')]

# ---------- CSS Plein Gaz : variables globales, le reste préfixé #jdw-pg ----------
def split_rules(s):
    out, i, depth, start = [], 0, 0, 0
    while i < len(s):
        ch = s[i]
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: out.append(s[start:i + 1].strip()); start = i + 1
        i += 1
    return [r for r in out if r]
GLOBAL = {':root', '[hidden]', '*', 'button:focus-visible'}
DROP = {'html,body', 'body'}
def scope(css_text):
    res = []
    for rule in split_rules(re.sub(r'/\*.*?\*/', '', css_text, flags=re.S)):
        head = rule[:rule.index('{')].strip(); body = rule[rule.index('{') + 1: rule.rindex('}')]
        if head.startswith('@keyframes'): res.append(rule); continue
        if head.startswith('@media'): res.append(head + '{' + scope(body) + '}'); continue
        if head in DROP: continue
        if head in GLOBAL: res.append(rule); continue
        res.append(','.join('#jdw-pg ' + p.strip() for p in head.split(',') if p.strip()) + '{' + body + '}')
    return '\n'.join(res)
pg_css = scope(css).replace('#jdw-pg #stage{position:fixed;inset:0;', '#jdw-pg #stage{position:absolute;inset:0;')
assert '#jdw-pg #stage{position:absolute' in pg_css
pg_css += '\n#jdw-pg{position:absolute;inset:0;overflow:hidden}\n#jdw-pg #mute{display:none}\n'

# ---------- script Plein Gaz : branchement bibliothèque + têtes ----------
def rep(a, b, n=1):
    global script
    c = script.count(a); assert c == n, (c, a[:80]); script = script.replace(a, b)
rep("function frame(t) {\n  const dt", "function frame(t) {\n  if (!PG_ACTIVE) { last = t; requestAnimationFrame(frame); return; }\n  const dt")
rep("""  $('banner').hidden = true; bannerT = 0;
  $('over').hidden = false;
  updateBestText();
  $('retry').focus({ preventScroll: true });""", """  $('banner').hidden = true; bannerT = 0;
  updateBestText();
  if (PG_API) PG_API.gameOver(m);""")
rep("addEventListener('keydown', e => {\n  const k = e.code;", "addEventListener('keydown', e => {\n  if (!PG_ACTIVE || (e.target && e.target.tagName === 'INPUT')) return;\n  const k = e.code;")
rep("addEventListener('keyup', e => { if (", "addEventListener('keyup', e => { if (!PG_ACTIVE) return; if (")
rep("  if (document.hidden && performance.now() - resumedAt > 1500) pause();", "  if (PG_ACTIVE && document.hidden && performance.now() - resumedAt > 1500) pause();")
rep("$('menu').hidden = false; $('over').hidden = true;", "$('menu').hidden = true; $('over').hidden = true;")
rep("tags.push({ ", "tags.push({ img: pgPickHead(), ", 2)
rep("  if (HEAD.complete && HEAD.naturalWidth) ctx.drawImage(HEAD, -17, -32, 34, 64);",
    "  if (g.img) { const ih = 66, iw = ih * (g.img.naturalWidth || g.img.width) / (g.img.naturalHeight || g.img.height); ctx.drawImage(g.img, -iw / 2, -ih / 2, iw, ih); }\n  else if (HEAD.complete && HEAD.naturalWidth) ctx.drawImage(HEAD, -17, -32, 34, 64);")
rep("ctx.drawImage(PILOT, -15, -39 + bob, 30.7, 40);", "ctx.drawImage(PG_PILOT_IMG || PILOT, -15, -39 + bob, 30.7, 40);")
rep("  const hh = 130, hw = FACE.naturalWidth ? hh * FACE.naturalWidth / FACE.naturalHeight : 82;",
    "  const IMG = PG_INTRO_IMG || FACE, iwN = IMG.naturalWidth || IMG.width, ihN = IMG.naturalHeight || IMG.height;\n  const hh = 130, hw = iwN ? hh * iwN / ihN : 82;")
rep("  if (FACE.complete && FACE.naturalWidth) ctx.drawImage(FACE, -hw / 2, -hh / 2, hw, hh);",
    "  if (PG_INTRO_IMG || (FACE.complete && FACE.naturalWidth)) ctx.drawImage(IMG, -hw / 2, -hh / 2, hw, hh);")
rep("function letsGo(sub) {", "function letsGo(sub) {\n  PG_INTRO_IMG = pgPickHead();")
hook = open(J + 'pg-hook.js').read()
idx = script.rindex('})();')
script = script[:idx] + hook + '\n' + script[idx:]
script = "let PG_ACTIVE = false, PG_API = null, PG_HEADS = [], PG_PILOT_IMG = null, PG_INTRO_IMG = null, PG_PREVIEW_PILOT = null, PG_BOSS_SAD = null, PG_BOSS_COUNT = 0, PG_BOSS_LAST = '';\n" + script

# ---------- assemblage ----------
SKIP = [x for x in os.environ.get('SKIP_GAMES', '').split(',') if x]   # ex. SKIP_GAMES=ilo : jeu pas encore prêt
GAMES = [g for g in ['abracadabra', 'flechettes', 'sensinterdit', 'coffres', 'chrono', 'neon', 'smoothie', 'ilo', 'empilo', 'glouton', 'mouches', 'carreaux', 'rouleaux', 'magic', 'pegase'] if os.path.exists(J + 'games/' + g + '.js') and g not in SKIP]
# jeux de duel (deux joueurs face à face) : source/duos/<id>.js, contrat DUO-CONTRACT.md
DUOS = [d for d in ['bolides', 'tirsaubut', 'toupies', 'kombat', 'pingpong', 'trouve', 'palet', 'briques', 'boum', 'souris', 'spatial', 'mots', 'guerre'] if os.path.exists(J + 'duos/' + d + '.js') and d not in SKIP]
# 28 oct. 2026 (Benjamin : « On va séparer la borne de Pégase […] Pégase sera dans sa propre fenêtre ») : la MÊME bibliothèque fait deux pages.
# PAGE=borne (jouer/, publier.sh la construit avec SKIP_GAMES=pegase) : l'arcade seule ; PAGE=pegase (pegase/) : Pégase seul, sans les jeux
# d'arcade ni les duels (plus légère). shell2.js le lit dans window.JDW_PAGE.
PAGE = os.environ.get('PAGE', 'borne')
assert PAGE in ('borne', 'pegase'), PAGE
if PAGE == 'pegase': GAMES = [g for g in GAMES if g == 'pegase']; DUOS = []
def notes_list():
    # nouveautés de la version (une par ligne), affichées après une mise à jour
    f = J + 'nouveautes.txt'
    if not os.path.exists(f): return []
    out, seen = [], set()
    for l in open(f, encoding='utf-8').read().splitlines():
        l = l.strip().replace('{version}', os.environ.get('SITE_VERSION', ''))
        if not l or l[0] == '#': continue
        # règle de Benjamin (25 oct. 2026) : chaque bloc [id] commence par « ## … <numéro de version> »
        m = re.match(r'^\[([a-z0-9-]+)\]\s*(##)?\s*(.*)$', l)
        if not m: raise SystemExit('nouveautes.txt : ligne sans [id], numéro de version impossible : ' + l)
        if m.group(2) and not re.search(r'\d+\.\d+', m.group(3)): raise SystemExit('nouveautes.txt : sous-titre sans numéro de version : ' + l)
        if m.group(1) not in seen and not m.group(2): raise SystemExit('nouveautes.txt : le bloc [' + m.group(1) + '] doit commencer par « ## … <version> »')
        # 27 oct. 2026 : chaque sous-titre dit dans QUELLE version de la borne il sort, « (borne 1.46.3) » : la cloche ne montre que ce qui est
        # plus récent que la dernière version vue par l'appareil, et les tuiles concernées sont marquées « Mis à jour »
        if m.group(2) and not re.search(r'\(borne \d+\.\d+(?:\.\d+)?\)', m.group(3)): raise SystemExit('nouveautes.txt : sous-titre sans « (borne X.Y) » : ' + l)
        seen.add(m.group(1)); out.append(l)
    if os.environ.get('NOTES_CHECK'): notes_check(out)
    return out
def notes_check(lines):
    # PUBLICATION (publier.sh) : un jeu dont les fichiers changent depuis la dernière publication doit avoir sa note « [id] ## … (borne <cette version>) ».
    # Règle de PATOU (27 oct. 2026 : « les briques de jeux concernées ne sont pas pointées pour la mise à jour »). Échappatoire volontaire et
    # rare : NOTES_SKIP=id1,id2 (changement invisible pour les joueurs), écrit en clair dans la sortie.
    import subprocess
    ver = os.environ.get('SITE_VERSION', '')
    if not ver: return
    root = os.path.normpath(J + '..')
    try:
        base = subprocess.run(['git', 'log', '-1', '--format=%H', '--', 'source/version.txt'], cwd=root, capture_output=True, text=True).stdout.strip()
        changed = subprocess.run(['git', 'diff', '--name-only', base], cwd=root, capture_output=True, text=True).stdout.split() if base else []
        changed += subprocess.run(['git', 'ls-files', '--others', '--exclude-standard'], cwd=root, capture_output=True, text=True).stdout.split()
    except Exception as e:
        print('notes : vérification impossible (' + str(e) + ')'); return
    ids = set(GAMES) | set(DUOS)
    touched = set()
    for f in changed:
        m = re.match(r'^source/(?:games|duos)/([a-z0-9]+)\.js$', f) or re.match(r'^assets/([a-z0-9]+)(?:\.[^/]*)?\.bin$', f) or re.match(r'^telecharger/(pegase)(?:-pc)?\.json$', f)
        if m and m.group(1) in ids: touched.add(m.group(1))
    have = set()
    for l in lines:
        m = re.match(r'^\[([a-z0-9-]+)\]\s*##.*\(borne ' + re.escape(ver) + r'\)', l)
        if m: have.add(m.group(1))
    skip = set(x for x in os.environ.get('NOTES_SKIP', '').split(',') if x)
    for x in sorted(skip & touched): print('notes : ' + x + ' changé SANS note (NOTES_SKIP)')
    miss = sorted(touched - have - skip)
    if miss: raise SystemExit('nouveautes.txt : ces jeux changent dans la ' + ver + ' sans note « [id] ## … (borne ' + ver + ') » : ' + ', '.join(miss) + ' — (changement invisible pour les joueurs : NOTES_SKIP=' + ','.join(miss) + ')')
def music_list():
    # {jeu: [numéros de variantes]} d'après les fichiers assets/music/<jeu>-<n>.mp3
    # calmes : <jeu>-<n>.mp3 ; énergiques (niveaux difficiles) : <jeu>-x<n>.mp3
    d = os.path.join(J, '..', 'assets', 'music'); out = {}
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            m = re.match(r'^([a-z0-9]+)-(x?)(\d+)\.(?:mp3|bin)$', f)
            if m: out.setdefault(m.group(1), {'c': [], 'x': []})['x' if m.group(2) else 'c'].append(m.group(1) + '-' + m.group(2) + m.group(3))
    return out
def music_enc():
    # morceaux chiffrés (assets/music/<nom>.bin, collection de l'Asset Store) : la page les déchiffre avec le mot de passe
    d = os.path.join(J, '..', 'assets', 'music')
    return sorted(f[:-4] for f in os.listdir(d) if f.endswith('.bin')) if os.path.isdir(d) else []
# dossier racine du site vu depuis la borne : publiée dans jouer/ -> SITE_ROOT=../ (publier.sh) ; site de test : vide
ROOT = os.environ.get('SITE_ROOT', '')
FONT_CSS = 'https://fonts.googleapis.com/css2?family=Bungee&family=Chakra+Petch:wght@400;600&display=swap'
def page(config=None):
    body = open(J + 'shell2-body.html').read().replace('PG_MARKUP', '<section id="jdw-pg" hidden>\n' + markup + '\n</section>')
    # regarder un copain : tout l'écran du jeu pour le spectateur ; avant les jeux (il note la sorte de chaque canvas créé)
    games = '<script>\n' + open(J + 'regarder.js', encoding='utf-8').read() + '\n</script>\n'
    games += ''.join('<script>\n' + open(J + 'games/' + g + '.js').read() + '\n</script>\n' for g in GAMES)
    games += ''.join('<script>\n' + open(J + 'duos/' + d + '.js', encoding='utf-8').read() + '\n</script>\n' for d in DUOS)
    cfg = ('<script>window.JDW_CONFIG = ' + json.dumps(config) + ';</script>\n' if config else '') + \
          '<script>window.JDW_BUILD = ' + json.dumps(os.environ.get('BUILD_ID', 'dev')) + '; window.JDW_VERSION = ' + json.dumps(os.environ.get('SITE_VERSION', '')) + '; window.JDW_NOTES = ' + json.dumps(notes_list()) + ';</script>\n' + \
          '<script>window.JDW_MUSIC = ' + json.dumps(music_list()) + '; window.JDW_MUSIC_ENC = ' + json.dumps(music_enc()) + ';</script>\n' + \
          '<script>window.JDW_ASSET_KEY = ' + json.dumps(open(J + 'asset-key.txt', encoding='utf-8').read().strip()) + '; window.JDW_ROOT = ' + json.dumps(ROOT) + '; window.JDW_PAGE = ' + json.dumps(PAGE) + ';</script>\n'
    return (('<title>Pégase · Elixir Game Studio</title>\n' if PAGE == 'pegase' else '<title>Borne d\'arcade entre amis</title>\n') +
            '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '<link rel="stylesheet" href="' + FONT_CSS + '">\n'
            '<style>\n' + pg_css + '\n' + open(J + 'shell2.css').read() + '\n' + open(J + 'accessoires.css', encoding='utf-8').read() + '\n' + open(J + 'manette.css', encoding='utf-8').read() + '\n</style>\n' + body + '\n'
            '<script>\n(() => {\n' + script + '\n})();\n</script>\n' + games + cfg +
            # manette (API Gamepad) : glyphes, api.pad des jeux, navigation ; avant la bibliothèque, qui s'en sert
            '<script>\n' + open(J + 'manette.js', encoding='utf-8').read() + '\n</script>\n'
            # accessoires de la tête (dessins, onglets, miniatures) : avant la bibliothèque, qui s'en sert
            '<script>\n' + open(J + 'accessoires.js', encoding='utf-8').read() + '\n</script>\n'
            '<script>\n' + open(J + 'shell2.js').read() + '\n</script>\n')
OG = {
    'borne': {
        'site': 'Borne d\'arcade entre amis', 'title': 'Viens jouer avec nous sur la Borne d\'arcade !',
        'desc': 'Tes copains t\'invitent : 17 jeux gratuits, classements, chat et duels entre amis. Touche le lien pour nous rejoindre.',
        'img': 'https://elixirgamestudio.com/accueil/partage.jpg', 'alt': 'Borne d\'arcade entre amis : les vignettes des jeux', 'url': '', 'theme': '#0b141c'},
    'pegase': {
        'site': 'Elixir Game Studio', 'title': 'Viens dans Pégase avec moi !',
        'desc': 'Viens photographier les animaux de l\'île avec moi dans Pégase ! Gratuit, sur ton téléphone ou ton PC.',
        'img': 'https://elixirgamestudio.com/accueil/partage-pegase.jpg', 'alt': 'Pégase : une prairie fleurie de l\'île, au pied des falaises',
        'url': 'https://elixirgamestudio.com/pegase/', 'theme': '#060c22'},
}
# borne publiée : un lien de Pégase (?pegase, ?ile=<id>&regarder=1, ?appel=<id> d'un appel décroché, ?appeler) part tout de suite vers pegase/
# (mêmes paramètres) ; ?borne (le site du studio) reste sur la borne
REDIRECT_PG = ('<script>(function(){try{var s=location.search;if(/[?&](pegase|ile|appel|appeler)(=|&|$)/.test(s)&&!/[?&]borne(=|&|$)/.test(s)){'
               'document.documentElement.style.visibility="hidden";location.replace(' + json.dumps(ROOT + 'pegase/') + '+s+location.hash)}}catch(e){}})();</script>\n')
def full_doc(p):
    i = p.index('<style>'); head = p[:i]; rest = p[i:]; j = rest.index('</style>') + 8
    o = OG[PAGE]
    return ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
            # déménagement sur elixirgamestudio.com : dans l'appli 1.11+, les réglages gardés à l'ancienne adresse (profils, connexion…)
            # sont repris UNE fois, avant tout le reste (BorneApp.reprise, MainActivity.java) ; une clé déjà là n'est jamais écrasée
            '<script>try{var B=window.BorneApp;if(B&&B.reprise&&!localStorage.getItem("jdw.reprise")){var d=B.reprise(location.origin);'
            'if(d){var o=JSON.parse(d);for(var k in o)if(localStorage.getItem(k)===null)localStorage.setItem(k,o[k]);'
            'localStorage.setItem("jdw.reprise",String(Date.now()))}}}catch(e){}</script>\n' + (REDIRECT_PG if PAGE == 'borne' and ROOT else '') +
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">\n'
            '<meta name="theme-color" content="' + o['theme'] + '">\n<meta name="robots" content="noindex">\n'
            # aperçu des liens partagés (invitation ?salle=…, défi ?duel=…) : même texte pour tous, jamais le nom d'une salle
            '<meta property="og:type" content="website">\n<meta property="og:locale" content="fr_FR">\n'
            '<meta property="og:site_name" content="' + o['site'] + '">\n'
            '<meta property="og:title" content="' + o['title'] + '">\n'
            '<meta property="og:description" content="' + o['desc'] + '">\n' + ('<meta property="og:url" content="' + o['url'] + '">\n' if o['url'] else '') +
            '<meta property="og:image" content="' + o['img'] + '">\n'
            '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
            '<meta property="og:image:alt" content="' + o['alt'] + '">\n'
            '<meta name="twitter:card" content="summary_large_image">\n'
            '<meta name="description" content="' + o['desc'] + '">\n'
            '<link rel="manifest" href="' + ROOT + 'manifest.webmanifest">\n<link rel="icon" href="' + ROOT + 'favicon.ico" sizes="16x16 32x32 48x48">\n<link rel="apple-touch-icon" href="' + ROOT + 'icon-180.png">\n' + head + rest[:j] + '\n</head>\n<body>\n' + rest[j:] + '\n</body>\n</html>\n')

art = page()
open(sys.argv[1], 'w').write(art)
open(sys.argv[2], 'w').write(full_doc(art))
if len(sys.argv) > 5:
    open(sys.argv[3], 'w').write(full_doc(page({'url': sys.argv[4], 'key': sys.argv[5]})))

# ---------- service worker (jouer/sw.js, à côté de la borne publiée) : jeu hors ligne ----------
# numéro de cache = BUILD_ID ; empreinte de chaque asset (un fichier changé est retéléchargé) ; assets gardés dès l'installation
def write_sw(out):
    import hashlib
    A = os.path.join(J, '..', 'assets'); assets = {}
    for d, sub in ((A, ''), (os.path.join(A, 'music'), 'music/'), (os.path.join(A, 'pegase'), 'pegase/')):
        if not os.path.isdir(d): continue
        for f in sorted(os.listdir(d)):
            if re.match(r'^[a-z0-9_.-]+\.(bin|mp3)$' if sub != 'pegase/' else r'^[a-z0-9_.-]+\.(jpg|webp|json)$', f) and os.path.isfile(os.path.join(d, f)):   # pegase/ : affiches, carte, île 3D, decor.json
                assets['assets/' + sub + f] = hashlib.sha1(open(os.path.join(d, f), 'rb').read()).hexdigest()[:12]
    enc = set(music_enc()); ext = lambda n: n + ('.bin' if n in enc else '.mp3')
    pre = [k for k in assets if re.match(r'^assets/[a-z0-9_-]+\.bin$', k)]                        # images des jeux (ilo.bin)
    pre += ['assets/music/' + ext(n) for n in sorted(enc) if n.startswith('sting-')]           # jingles
    acc = music_list().get('accueil', {}); first = (acc.get('c') or acc.get('x') or [None])[0]
    if first: pre.append('assets/music/' + ext(first))                                          # une musique de l'accueil
    sw = open(J + 'sw.js', encoding='utf-8').read()
    sw = sw.replace("'__BUILD__'", json.dumps(os.environ.get('BUILD_ID', 'dev'))).replace('__ASSETS__', json.dumps(assets)) \
           .replace('__PRE__', json.dumps([p for p in pre if p in assets])).replace('__FONT_CSS__', json.dumps(FONT_CSS))
    assert ('__' + 'BUILD__') not in sw and ('__' + 'ASSETS__') not in sw and ('__' + 'PRE__') not in sw
    open(out, 'w', encoding='utf-8').write(sw)
if len(sys.argv) > 5 and ROOT and PAGE == 'borne':      # borne publiée (jouer/) : sw.js à côté de la page (pas pour pegase/)
    write_sw(os.path.join(os.path.dirname(os.path.abspath(sys.argv[3])), 'sw.js'))
print('built', PAGE, len(art))
