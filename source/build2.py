"""Assemble Jeux des WC.
usage: python3 build2.py <artifact.html> <standalone.html> [<site-plain.html> <supabase_url> <supabase_key>]
"""
import re, sys, json
import os
J = os.path.dirname(os.path.abspath(__file__)) + '/'
src = open(J + 'pleingaz-src.html').read()
if '__IMG_' in src:   # photos chiffrées : déchiffrées avec ARCADE_CODE
    import subprocess
    photos = json.loads(subprocess.run(['node', J + 'photos.js', 'dec', J + 'photos.enc.json'], check=True, capture_output=True, text=True).stdout)
    for k, v in photos.items(): src = src.replace('__IMG_' + k + '__', v)
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
GAMES = ['empilo', 'glouton', 'mouches', 'carreaux', 'rouleaux', 'canards']
def page(config=None):
    body = open(J + 'shell2-body.html').read().replace('PG_MARKUP', '<section id="jdw-pg" hidden>\n' + markup + '\n</section>')
    games = ''.join('<script>\n' + open(J + 'games/' + g + '.js').read() + '\n</script>\n' for g in GAMES)
    cfg = ('<script>window.JDW_CONFIG = ' + json.dumps(config) + ';</script>\n' if config else '') + \
          '<script>window.JDW_BUILD = ' + json.dumps(os.environ.get('BUILD_ID', 'dev')) + ';</script>\n'
    return ('<title>Jeux des WC</title>\n'
            '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&family=Chakra+Petch:wght@400;600&display=swap">\n'
            '<style>\n' + pg_css + '\n' + open(J + 'shell2.css').read() + '\n</style>\n' + body + '\n'
            '<script>\n(() => {\n' + script + '\n})();\n</script>\n' + games + cfg +
            '<script>\n' + open(J + 'shell2.js').read() + '\n</script>\n')
def full_doc(p):
    i = p.index('<style>'); head = p[:i]; rest = p[i:]; j = rest.index('</style>') + 8
    return ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">\n'
            '<meta name="theme-color" content="#0b141c">\n' + head + rest[:j] + '\n</head>\n<body>\n' + rest[j:] + '\n</body>\n</html>\n')

art = page()
open(sys.argv[1], 'w').write(art)
open(sys.argv[2], 'w').write(full_doc(art))
if len(sys.argv) > 5:
    open(sys.argv[3], 'w').write(full_doc(page({'url': sys.argv[4], 'key': sys.argv[5]})))
print('built', len(art))
