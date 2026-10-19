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
GAMES = [g for g in ['ilo', 'empilo', 'glouton', 'mouches', 'carreaux', 'rouleaux', 'magic', 'pegase'] if os.path.exists(J + 'games/' + g + '.js') and g not in SKIP]
# jeux de duel (deux joueurs face à face) : source/duos/<id>.js, contrat DUO-CONTRACT.md
DUOS = [d for d in ['kombat', 'pingpong', 'trouve', 'palet', 'briques', 'boum', 'souris', 'spatial', 'mots', 'guerre'] if os.path.exists(J + 'duos/' + d + '.js') and d not in SKIP]
def notes_list():
    # nouveautés de la version (une par ligne), affichées après une mise à jour
    f = J + 'nouveautes.txt'
    return [l.strip() for l in open(f, encoding='utf-8').read().splitlines() if l.strip()] if os.path.exists(f) else []
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
    games = ''.join('<script>\n' + open(J + 'games/' + g + '.js').read() + '\n</script>\n' for g in GAMES)
    games += ''.join('<script>\n' + open(J + 'duos/' + d + '.js', encoding='utf-8').read() + '\n</script>\n' for d in DUOS)
    cfg = ('<script>window.JDW_CONFIG = ' + json.dumps(config) + ';</script>\n' if config else '') + \
          '<script>window.JDW_BUILD = ' + json.dumps(os.environ.get('BUILD_ID', 'dev')) + '; window.JDW_VERSION = ' + json.dumps(os.environ.get('SITE_VERSION', '')) + '; window.JDW_NOTES = ' + json.dumps(notes_list()) + ';</script>\n' + \
          '<script>window.JDW_MUSIC = ' + json.dumps(music_list()) + '; window.JDW_MUSIC_ENC = ' + json.dumps(music_enc()) + ';</script>\n' + \
          '<script>window.JDW_ASSET_KEY = ' + json.dumps(open(J + 'asset-key.txt', encoding='utf-8').read().strip()) + '; window.JDW_ROOT = ' + json.dumps(ROOT) + ';</script>\n'
    return ('<title>Borne d\'arcade entre amis</title>\n'
            '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '<link rel="stylesheet" href="' + FONT_CSS + '">\n'
            '<style>\n' + pg_css + '\n' + open(J + 'shell2.css').read() + '\n' + open(J + 'accessoires.css', encoding='utf-8').read() + '\n' + open(J + 'manette.css', encoding='utf-8').read() + '\n</style>\n' + body + '\n'
            '<script>\n(() => {\n' + script + '\n})();\n</script>\n' + games + cfg +
            # manette (API Gamepad) : glyphes, api.pad des jeux, navigation ; avant la bibliothèque, qui s'en sert
            '<script>\n' + open(J + 'manette.js', encoding='utf-8').read() + '\n</script>\n'
            # accessoires de la tête (dessins, onglets, miniatures) : avant la bibliothèque, qui s'en sert
            '<script>\n' + open(J + 'accessoires.js', encoding='utf-8').read() + '\n</script>\n'
            '<script>\n' + open(J + 'shell2.js').read() + '\n</script>\n')
def full_doc(p):
    i = p.index('<style>'); head = p[:i]; rest = p[i:]; j = rest.index('</style>') + 8
    return ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">\n'
            '<meta name="theme-color" content="#0b141c">\n<meta name="robots" content="noindex">\n'
            # aperçu des liens partagés (invitation ?salle=…, défi ?duel=…) : même texte pour tous, jamais le nom d'une salle
            '<meta property="og:type" content="website">\n<meta property="og:locale" content="fr_FR">\n'
            '<meta property="og:site_name" content="Borne d\'arcade entre amis">\n'
            '<meta property="og:title" content="Viens jouer avec nous sur la Borne d\'arcade !">\n'
            '<meta property="og:description" content="Tes copains t\'invitent : 17 jeux gratuits, classements, chat et duels entre amis. Touche le lien pour nous rejoindre.">\n'
            '<meta property="og:image" content="https://gt40benjamin.github.io/jdv/accueil/partage.jpg">\n'
            '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
            '<meta property="og:image:alt" content="Borne d\'arcade entre amis : les vignettes des jeux">\n'
            '<meta name="twitter:card" content="summary_large_image">\n'
            '<meta name="description" content="Tes copains t\'invitent : 17 jeux gratuits, classements, chat et duels entre amis. Touche le lien pour nous rejoindre.">\n'
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
    for d, sub in ((A, ''), (os.path.join(A, 'music'), 'music/')):
        if not os.path.isdir(d): continue
        for f in sorted(os.listdir(d)):
            if re.match(r'^[a-z0-9_.-]+\.(bin|mp3)$', f) and os.path.isfile(os.path.join(d, f)):
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
if len(sys.argv) > 5 and ROOT:      # borne publiée (jouer/) : sw.js à côté de la page
    write_sw(os.path.join(os.path.dirname(os.path.abspath(sys.argv[3])), 'sw.js'))
print('built', len(art))
