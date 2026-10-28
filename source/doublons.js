// node doublons.js [-v] [fichier.js|fichier.html …]   (sans fichier : tout le JavaScript des pages, à côté de ce fichier : source/*.js, games/,
// duos/, et les <script> des source/*.html)
// Lancé par publier.sh AVANT tout le reste : un nom déclaré deux fois arrête la publication (en urgence : DOUBLONS_SKIP=1 ./publier.sh).
// 28 oct. 2026 — après l'acctAdopt de la 1.50 : deux « function acctAdopt » dans shell2.js, la DERNIÈRE gagnait sans aucune erreur, et la
// régression des comptes est restée en ligne jusqu'à la 1.50.7. Le navigateur accepte deux « function X » (ou « function X » et « var X ») dans
// le même corps de fonction, sans rien dire. Dans un BLOC en mode strict, c'est une erreur de syntaxe : l'outil recompile donc chaque portée comme
// un bloc strict, et c'est le MOTEUR (V8, celui de Chrome) qui dit s'il y a un doublon. Il s'arrête au premier : on renomme celui-là et on
// recompile, jusqu'au bout.
// Les portées vérifiées :
//  - chaque enveloppe « (() => { … })(); » en début de ligne, et ce qui est autour. C'est aussi le moteur qui dit où l'enveloppe se ferme : dans
//    shell2.js, de petites fonctions internes se ferment aussi par « })(); » en début de ligne ;
//  - chaque corps de fonction, trouvé par un lecteur de jetons léger (chaînes, gabarits, commentaires, expressions rationnelles). Dans pegase.js
//    et les jeux, la plupart des fonctions sont DANS une autre (indentation 4).
// Un fichier .html : chacun de ses <script> en ligne.
// Sortie : 0 = aucun nom en double ; 1 = des doublons ou une erreur de syntaxe (listés) ; 2 = fichier illisible.
const fs = require('fs'), path = require('path'), vm = require('vm');
const NL = '\n', DUP = /Identifier '([^']+)' has already been declared/;
const ARGS = process.argv.slice(2), VERB = ARGS.includes('-v');
const ls = (d, re) => { try { return fs.readdirSync(d).filter((f) => re.test(f)).sort().map((f) => d + f); } catch (e) { return []; } };
const S = __dirname.replace(/\\/g, '/') + '/';   // source/
const FILES = ARGS.filter((a) => a !== '-v').length ? ARGS.filter((a) => a !== '-v')
  : [...ls(S, /\.js$/), ...ls(S + 'games/', /\.js$/), ...ls(S + 'duos/', /\.js$/), ...ls(S, /\.html$/)];

// compile sans exécuter : null = ça compile, sinon { msg, line } (line : dans code)
function compile(code) {
  try { new vm.Script(code, { filename: 'portee' }); return null; }
  catch (er) { const m = String(er.stack || '').match(/^portee:(\d+)/); return { msg: String(er.message), line: m ? +m[1] : null }; }
}
const esc = (s) => s.replace(/\$/g, '\\$');
const word = (n) => new RegExp('(^|[^\\w$])' + esc(n) + '(?![\\w$])', 'g');
const declOf = (n, g) => new RegExp('(?:\\bfunction\\s*\\*?\\s*|\\bclass\\s+|\\bconst\\s+|\\blet\\s+|\\bvar\\s+)' + esc(n) + '(?![\\w$])', g);
// renomme la DERNIÈRE déclaration du nom sur la ligne (celle que le moteur refuse : la seconde ; deux sur la même ligne, c'est la dernière) ;
// sinon (déstructuration, « const a = 1, b = 2 ») sa dernière mention : renommer un mot ne casse jamais la syntaxe
function renameLast(line, n, suffix) {
  const pick = (re) => { let m, last = null; while ((m = re.exec(line))) last = m; return last; };
  const d = pick(declOf(n, 'g')), w = d ? null : pick(word(n));
  if (d) return line.slice(0, d.index + d[0].length) + suffix + line.slice(d.index + d[0].length);
  if (w) return line.slice(0, w.index + w[0].length) + suffix + line.slice(w.index + w[0].length);
  return line;
}
// un corps se recompile dans une méthode (return, this, super.x), asynchrone (await), génératrice (yield), ou un constructeur (super())
const WRAPS = [['({ m() {{', '}} })'], ['({ async m() {{', '}} })'], ['({ *m() {{', '}} })'], ['({ async *m() {{', '}} })'], ['(class extends Object { constructor() {{', '}} })']];

// les doublons d'un corps (ses lignes), recompilé en bloc : { dups: [{ name, at }] (at = n° de ligne dans le corps), strict, err }.
// strict = false : le corps n'est valide qu'en mode non strict, où deux « function » du même nom ne sont pas une erreur (on les compte à la main)
function check(lines, hint) {
  const order = hint === 'async' ? [1, 0, 3, 2, 4] : hint === 'gen' ? [2, 3, 0, 1, 4] : [0, 1, 2, 3, 4];
  let best = null;
  for (const strict of [true, false]) for (const w of order.map((k) => WRAPS[k])) {
    const head = (strict ? '"use strict";' + NL : '') + w[0] + NL, h = strict ? 2 : 1, B = lines.slice(), dups = [], seen = new Set();
    let e;
    for (let guard = 0; guard < 500; guard++) {
      e = compile(head + B.join(NL) + NL + w[1]);
      const d = e && e.line != null && e.msg.match(DUP), at = d ? e.line - h - 1 : -1;
      if (!d || at < 0 || at >= B.length || seen.has(d[1] + '@' + at) || d[1].includes('$doublon')) break;
      seen.add(d[1] + '@' + at); dups.push({ name: d[1], at });
      B[at] = renameLast(B[at], d[1], '$doublon' + dups.length);
    }
    if (!e || DUP.test(e.msg)) return { dups, strict };
    if (dups.length && !best) best = { dups, strict, err: e };
  }
  return best || { dups: [], strict: true, err: true };
}
// à la main (mode non strict seulement) : les « function NOM » au niveau d'indentation du corps
function sloppyFns(lines) {
  const first = lines.find((l) => l.trim() && !/^\s*(\/\/|\/\*|\*|['"]use strict['"])/.test(l)), base = first ? first.match(/^\s*/)[0] : '', seen = new Map(), out = [];
  lines.forEach((l, k) => {
    if (!l.startsWith(base) || /^\s/.test(l.slice(base.length))) return;
    const m = l.slice(base.length).match(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/);
    if (m) { if (seen.has(m[1])) out.push({ name: m[1], at: k }); else seen.set(m[1], k); }
  });
  return out;
}

// les enveloppes de premier niveau : le corps compilé comme celui d'une fonction (où les doublons de « function » passent), suivi de tout le reste
// du fichier : l'accolade fermante de l'enveloppe ferme cette fonction, et le « ) » qui la suit est la PREMIÈRE erreur, sur sa ligne
const OPEN = /^\(\s*(?:async\s*)?(?:\(\s*\)\s*=>|function\s*\(\s*\))\s*\{\s*$/;
function envelopes(L) {
  const env = [];
  for (let i = 0; i < L.length; i++) {
    if (!OPEN.test(L[i])) continue;
    const asy = /\basync\b/.test(L[i]), e = compile((asy ? 'async ' : '') + 'function enveloppe() {' + NL + L.slice(i + 1).join(NL));
    const end = e && e.line != null ? i + e.line - 1 : -1;
    if (end <= i || !/^\}/.test(L[end]) || !/^Unexpected token '?\)'?$/.test(e.msg)) return { env, bad: { at: end > i ? end : i, msg: e ? e.msg : 'enveloppe jamais fermée' } };
    env.push({ open: i, close: end, asy });
    i = end;
  }
  return { env };
}

// les corps de fonction d'un texte, lus jeton par jeton : [{ open, close, hint }] (positions des accolades) ; ok = false si la lecture finit
// déséquilibrée (alors des portées internes manquent). Une « { » est un corps de fonction après « => », ou après la « ) » d'une liste de
// paramètres (function f(…), méthode f(…), get x()…) — pas après if (…), for (…), while (…), switch (…), catch (…), with (…).
function bodies(t) {
  const N = t.length, out = [], st = [];
  const KW = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await', 'extends']);
  const BLK = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);
  const idS = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c === '$' || c === '#' || (c > '\x7f' && /\p{L}/u.test(c));
  const idP = (c) => idS(c) || (c >= '0' && c <= '9') || (c > '\x7f' && /[\p{N}\p{Mn}\p{Mc}\u200c\u200d]/u.test(c));
  let i = 0, lt = '', lv = '', pv = '', paren = null;   // le dernier jeton (type, valeur), l'avant-dernier ; la dernière « ( » refermée
  const put = (ty, v) => { pv = lv; lt = ty; lv = v; };
  const tpl = (j) => { while (j < N) { const ch = t[j]; if (ch === '\\') { j += 2; continue; } if (ch === '`') return [j + 1, true]; if (ch === '$' && t[j + 1] === '{') return [j + 2, false]; j++; } return [N, true]; };
  const afterTpl = ([j, done]) => { i = j; if (done) put('s', '`'); else { st.push({ k: '${' }); put('p', '('); } };
  const hintAt = (k) => { const a = Math.max(t.lastIndexOf(';', k), t.lastIndexOf('{', k - 1), t.lastIndexOf('}', k), t.lastIndexOf(NL, k)), s = t.slice(a + 1, k);
    return /\basync\b/.test(s) ? 'async' : /\bfunction\s*\*|\*\s*[\w$]+\s*\(/.test(s) ? 'gen' : ''; };
  while (i < N) {
    const c = t[i];
    if (c === ' ' || c === NL || c === '\t' || c === '\r' || c === '\u00a0' || c === '\ufeff') { i++; continue; }
    if (c === '/' && t[i + 1] === '/') { const j = t.indexOf(NL, i); i = j < 0 ? N : j; continue; }
    if (c === '/' && t[i + 1] === '*') { const j = t.indexOf('*/', i + 2); i = j < 0 ? N : j + 2; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < N && t[j] !== c && t[j] !== NL) j += t[j] === '\\' ? 2 : 1; i = j + 1; put('s', c); continue; }
    if (c === '`') { afterTpl(tpl(i + 1)); continue; }
    if (c === '/') {
      if (lt === '' || (lt === 'p' && lv !== ')' && lv !== ']') || (lt === 'w' && KW.has(lv))) {   // une expression rationnelle
        let j = i + 1, cls = false;
        while (j < N && t[j] !== NL) { const ch = t[j]; if (ch === '\\') { j += 2; continue; } if (cls) { if (ch === ']') cls = false; } else if (ch === '[') cls = true; else if (ch === '/') break; j++; }
        j++; while (j < N && idP(t[j])) j++;
        i = j; put('r', '/'); continue;
      }
      i++; put('p', '/'); continue;
    }
    if (idS(c)) { let j = i + 1; while (j < N && idP(t[j])) j++; put('w', t.slice(i, j)); i = j; continue; }
    if ((c >= '0' && c <= '9') || (c === '.' && t[i + 1] >= '0' && t[i + 1] <= '9')) { let j = i + 1; while (j < N && (idP(t[j]) || t[j] === '.')) j++; i = j; put('n', '0'); continue; }
    if (c === '=' && t[i + 1] === '>') { i += 2; put('p', '=>'); continue; }
    if (c === '(' || c === '[') { st.push({ k: c, pre: lv, pre2: pv }); i++; put('p', c); continue; }
    if (c === ')' || c === ']') { const o = st.pop(); paren = c === ')' && o && o.k === '(' ? o : null; i++; put('p', c); continue; }
    if (c === '{') {
      const fn = lt === 'p' && (lv === '=>' || (lv === ')' && paren && !BLK.has(paren.pre) && paren.pre2 !== 'for'));
      st.push({ k: '{', fn, open: i }); i++; put('p', '{'); continue;
    }
    if (c === '}') {
      const o = st.pop();
      if (o && o.k === '${') { afterTpl(tpl(i + 1)); continue; }
      if (o && o.k === '{' && o.fn) out.push({ open: o.open, close: i, hint: hintAt(o.open) });
      i++; put('p', '}'); continue;
    }
    i++; put('p', c);
  }
  return { list: out, ok: st.length === 0 };
}

// un texte (un fichier .js, ou un <script> d'un .html) : { issues: [texte], scopes, unverified, partial }
function run(src) {
  const T = src.text, L = T.split(NL), res = { issues: [], scopes: 0, unverified: 0, partial: false };
  const starts = [0]; for (let k = 0; k < T.length; k++) if (T.charCodeAt(k) === 10) starts.push(k + 1);
  const lineAt = (pos) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= pos) lo = m; else hi = m - 1; } return lo; };
  const at = (k) => src.line0 + k;   // n° de ligne dans le fichier
  const scopes = [], env = envelopes(L);
  if (env.bad) res.issues.push('erreur de syntaxe, ligne ' + at(env.bad.at) + ' : ' + env.bad.msg);
  env.env.forEach((e) => scopes.push({ label: 'enveloppe de la ligne ' + at(e.open), lines: L.slice(e.open + 1, e.close), base: e.open + 1, hint: e.asy ? 'async' : '' }));
  if (!env.bad) {   // ce qui est autour des enveloppes (ou tout le fichier, s'il n'en a pas)
    const inEnv = new Uint8Array(L.length); env.env.forEach((e) => inEnv.fill(1, e.open, e.close + 1));
    const LL = L.map((l, k) => (inEnv[k] ? '' : l));
    if (LL.some((l) => l.trim() && !/^\s*(\/\/|\/\*|\*)/.test(l))) scopes.push({ label: env.env.length ? 'hors des enveloppes' : 'niveau du fichier', lines: LL, base: 0, hint: '' });
  }
  const opened = new Set(env.env.map((e) => e.open)), B = bodies(T);
  res.partial = !B.ok;
  for (const b of B.list) {
    const k = lineAt(b.open); if (opened.has(k) && /^\(/.test(L[k])) continue;   // une enveloppe, déjà vue
    scopes.push({ label: 'fonction de la ligne ' + at(k), lines: T.slice(b.open + 1, b.close).split(NL), base: k, hint: b.hint });
  }
  const done = new Set();
  for (const sc of scopes) {
    res.scopes++;
    const r = check(sc.lines, sc.hint);
    if (r.err && !r.dups.length) { res.unverified++; if (VERB) res.issues.push('(non vérifiée : ' + sc.label + ')'); continue; }
    const dups = r.dups.concat(r.strict ? [] : sloppyFns(sc.lines)), by = new Map();
    for (const d of dups) {
      const key = d.name + '@' + (sc.base + d.at); if (done.has(key)) continue; done.add(key);
      if (!by.has(d.name)) {   // la première déclaration, plus haut (même indentation de préférence) : pour la lire
        const ind = sc.lines[d.at].match(/^\s*/)[0], re = declOf(d.name); let first = -1;
        for (let k = d.at - 1; k >= 0 && first < 0; k--) if (re.test(sc.lines[k]) && sc.lines[k].match(/^\s*/)[0] === ind) first = k;
        for (let k = d.at - 1; k >= 0 && first < 0; k--) if (re.test(sc.lines[k])) first = k;
        by.set(d.name, first >= 0 ? [at(sc.base + first)] : []);
      }
      by.get(d.name).push(at(sc.base + d.at));
    }
    for (const [n, ls2] of by) res.issues.push('« ' + n + ' » déclaré ' + (ls2.length > 1 ? ls2.length : 'deux') + ' fois dans la même portée (' + sc.label + (r.strict ? '' : ', non strict') + ') : ligne' + (ls2.length > 1 ? 's ' : ' ') + ls2.join(', '));
  }
  return res;
}
function sourcesOf(f) {
  const raw = fs.readFileSync(f, 'utf8').split('\r' + NL).join(NL), name = path.basename(f);
  if (!/\.html?$/i.test(f)) return [{ tag: name, text: raw, line0: 1 }];
  const out = [], re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi; let m, n = 0;
  while ((m = re.exec(raw))) {
    n++;
    const ty = (m[1].match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
    if (/\bsrc\s*=/i.test(m[1]) || (ty && !/^(text\/javascript|application\/javascript|module)$/i.test(ty)) || !m[2].trim()) continue;
    out.push({ tag: name + ' <script> n° ' + n, text: m[2], line0: raw.slice(0, m.index + m[0].indexOf('>') + 1).split(NL).length });
  }
  return out;
}

let bad = 0, nf = 0, nsc = 0, nun = 0; const partial = [], t0 = Date.now();
for (const f of FILES) {
  let srcs; try { srcs = sourcesOf(f); } catch (e) { console.error('illisible : ' + f); process.exit(2); }
  nf++;
  const issues = [];
  let sc = 0, un = 0;
  for (const s of srcs) {
    const r = run(s); sc += r.scopes; un += r.unverified;
    r.issues.forEach((x) => issues.push((srcs.length > 1 || s.tag !== path.basename(f) ? s.tag + ' : ' : '') + x));
    if (r.partial) partial.push(s.tag);
  }
  nsc += sc; nun += un;
  const real = issues.filter((x) => !/\(non vérifiée/.test(x));
  if (real.length) { bad++; console.log('✗ ' + path.basename(f) + NL + '   ' + issues.join(NL + '   ')); }
  else if (VERB) console.log('✓ ' + path.basename(f) + ' : ' + sc + ' portée(s)' + (un ? ', dont ' + un + ' non vérifiée(s)' : '') + (issues.length ? NL + '   ' + issues.join(NL + '   ') : ''));
}
console.log((bad ? '✗ ' + bad + ' fichier(s) sur ' + nf + ' avec un nom déclaré deux fois (ou une erreur de syntaxe)' : '✓ aucun nom déclaré deux fois') + ' — ' + nf + ' fichier(s), ' +
  nsc + ' portées' + (nun ? ' (' + nun + ' non vérifiées : -v pour les voir)' : '') + (partial.length ? ' ; lecture incomplète des fonctions internes : ' + partial.join(', ') : '') + ', ' + (Date.now() - t0) + ' ms');
process.exit(bad ? 1 : 0);
