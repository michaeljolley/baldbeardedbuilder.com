/*
  Site color, generated.

  Reads real VS Code themes through shiki, resolves each one down to our token
  contract, pushes every resolved color away from all three surfaces until it clears
  AA, and emits three artifacts that all agree with each other:

    src/styles/themes.css              one [data-theme] block per theme, chrome color
    src/lib/themes.generated.ts        the list the theme picker renders
    src/lib/ec-themes.generated.mjs    Expressive Code themes built from the same tokens

  Three artifacts rather than one because a hand maintained picker list drifts from the
  generator, and because Expressive Code bakes color at build time. If the code blocks
  were fed the original VS Code themes instead of the resolved ones, the chrome would
  pass AA while the code quietly failed it.

  Decision 34: contrast wins over fidelity. This script exits non zero if any theme
  fails, so the guard is enforced rather than promised.

  Run: pnpm themes
*/

import { bundledThemes, bundledThemesInfo } from 'shiki';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_CSS = path.join(ROOT, 'src', 'styles', 'themes.css');
const OUT_LIST = path.join(ROOT, 'src', 'lib', 'themes.generated.ts');
const OUT_EC = path.join(ROOT, 'src', 'lib', 'ec-themes.generated.mjs');

const TARGET = 4.5;

const PICK = [
  'github-dark', 'github-light', 'dracula', 'one-dark-pro', 'night-owl',
  'tokyo-night', 'catppuccin-mocha', 'catppuccin-latte',
  'vitesse-dark', 'vitesse-light', 'solarized-light', 'nord', 'monokai'];

/*
  shiki's own display names are occasionally the marketplace listing rather than the
  theme, and the picker shows these to readers. Only override where shiki reads wrong.
*/
const NAME_OVERRIDES = {
  'dracula': 'Dracula'
};

/* ---------- color math ---------- */

const hex = (s) => {
  if (!s) return null;
  let h = s.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return '#' + h.toLowerCase();
};
const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = (h) => {
  const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const mix = (a, b, t) => toHex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
// 0 = gray, 1 = fully saturated. Used to reject neutral UI colors as brand accents.
const chroma = (h) => { const c = rgb(h); return (Math.max(...c) - Math.min(...c)) / 255; };

// Push `fg` away from the backgrounds it sits on until it clears `target` against all of
// them. The direction is chosen from the mean luminance of every surface, not just the
// page background, because a theme can mix a dark surface with a light one (Hot Dog
// Stand puts black text on both red and yellow). If the preferred direction cannot get
// there, try the other one, and fall back to whichever attempt scored best.
const enforce = (fg, bgs, target) => {
  if (!fg) return null;
  const list = Array.isArray(bgs) ? bgs.filter(Boolean) : [bgs];
  const ok = (c) => list.every(b => ratio(c, b) >= target);
  if (ok(fg)) return fg;
  const mean = list.reduce((s, b) => s + lum(b), 0) / list.length;
  let best = fg, bestScore = -1;
  for (const goal of (mean > 0.45 ? ['#000000', '#ffffff'] : ['#ffffff', '#000000'])) {
    for (let t = 0; t <= 1.001; t += 0.02) {
      const out = mix(fg, goal, t);
      if (ok(out)) return out;
      const score = Math.min(...list.map(b => ratio(out, b)));
      if (score > bestScore) { bestScore = score; best = out; }
    }
  }
  return best;
};

/* ---------- token color lookup ---------- */

const scopeColor = (theme, needles) => {
  const list = theme.tokenColors || [];
  for (const needle of needles) {
    for (const rule of list) {
      const scopes = Array.isArray(rule.scope) ? rule.scope : (rule.scope ? [rule.scope] : []);
      if (scopes.some(s => s === needle || s.startsWith(needle + '.'))) {
        const c = hex(rule.settings && rule.settings.foreground);
        if (c) return c;
      }
    }
  }
  return null;
};

const first = (...vals) => vals.find(v => !!v) || null;
// Like first(), but skips near-gray candidates. Dracula and Monokai define
// button.background as a neutral, which makes a lifeless accent.
const firstColorful = (...vals) => vals.find(v => v && chroma(v) >= 0.14) || first(...vals);

// Hue in degrees, used to keep the four severity colors telling each other apart.
const hue = (h) => {
  const [r, g, b] = rgb(h).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return 0;
  let deg;
  if (mx === r) deg = ((g - b) / d) % 6;
  else if (mx === g) deg = (b - r) / d + 2;
  else deg = (r - g) / d + 4;
  return (deg * 60 + 360) % 360;
};
const hueGap = (a, b) => { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d); };
// Like firstColorful(), but rejects anything that reads as the same color as `other`.
// Several themes ship no editorWarning.foreground, and the fallback scope lookup lands
// on a red, which would make Warning and Error indistinguishable.
const firstDistinct = (other, minGap, ...vals) =>
  vals.find(v => v && chroma(v) >= 0.14 && (!other || hueGap(v, other) >= minGap)) || first(...vals);

/* ---------- resolve one theme to our token contract ---------- */

function resolve(theme) {
  const c = {};
  for (const [k, v] of Object.entries(theme.colors || {})) c[k] = hex(v);
  const dark = theme.type !== 'light';

  const bg = first(c['editor.background'], dark ? '#1e1e1e' : '#ffffff');
  const rawFg = first(c['editor.foreground'], scopeColor(theme, ['source']), dark ? '#d4d4d4' : '#1f1f1f');

  const raised = first(c['sideBar.background'], c['editorWidget.background'], c['editorGroupHeader.tabsBackground'], mix(bg, rawFg, 0.05));
  const inset = first(c['input.background'], c['editorWidget.background'], mix(bg, rawFg, 0.09));
  const line = first(c['panel.border'], c['editorGroup.border'], c['input.border'], mix(bg, rawFg, 0.18));

  // Text can land on any of the three surfaces, so the guard has to clear all three.
  // Some themes ship body text below AA against their own background (Solarized is
  // 4.13:1). We are committed to AA, so the guard applies to the theme author too.
  const S = [bg, raised, inset];
  const fg = enforce(rawFg, S, TARGET);

  const dim = enforce(first(c['descriptionForeground'], c['editorLineNumber.foreground'], mix(fg, bg, 0.4)), S, TARGET);

  const accent = enforce(firstColorful(
    c['textLink.foreground'],
    scopeColor(theme, ['entity.name.function', 'support.function']),
    scopeColor(theme, ['keyword', 'storage.type']),
    c['button.background'], c['focusBorder']
  ), S, TARGET);

  // Diagnostic severities. These are the dev disaster scale, so all four must exist
  // and, more importantly, must not collapse into each other.
  const err = enforce(firstColorful(
    c['editorError.foreground'], c['errorForeground'], c['list.errorForeground'],
    scopeColor(theme, ['invalid', 'message.error']), dark ? '#f14c4c' : '#cd3131'
  ), S, TARGET);

  const warn = enforce(firstDistinct(err, 30,
    c['editorWarning.foreground'], c['list.warningForeground'], c['editorWarning.border'],
    scopeColor(theme, ['entity.name.type', 'support.type']), dark ? '#cca700' : '#a67100'
  ), S, TARGET);

  const info = enforce(firstDistinct(warn, 30,
    c['editorInfo.foreground'], c['editorLightBulb.foreground'],
    scopeColor(theme, ['entity.name.function', 'support.function']), accent
  ), S, TARGET);

  const hint = enforce(first(
    c['editorHint.foreground'], c['editorLineNumber.foreground'],
    scopeColor(theme, ['comment']), dim
  ), S, TARGET);

  const tok = {
    key: enforce(scopeColor(theme, ['keyword', 'storage.type']), S, TARGET) || accent,
    str: enforce(scopeColor(theme, ['string']), S, TARGET) || fg,
    fn: enforce(scopeColor(theme, ['entity.name.function']), S, TARGET) || accent,
    typ: enforce(scopeColor(theme, ['entity.name.type', 'support.type']), S, TARGET) || accent,
    com: enforce(scopeColor(theme, ['comment']), S, TARGET) || dim,
    num: enforce(scopeColor(theme, ['constant.numeric', 'constant']), S, TARGET) || fg
  };

  return { scheme: dark ? 'dark' : 'light', bg, raised, inset, fg, dim, line, accent, err, warn, info, hint, tok };
}

const block = (sel, t) => `${sel} {
  color-scheme: ${t.scheme};
  --bg: ${t.bg};
  --bg-raised: ${t.raised};
  --bg-inset: ${t.inset};
  --fg: ${t.fg};
  --fg-dim: ${t.dim};
  --line: ${t.line};
  --accent: ${t.accent};
  --sev-error: ${t.err};
  --sev-warn: ${t.warn};
  --sev-info: ${t.info};
  --sev-hint: ${t.hint};
  --tok-key: ${t.tok.key};
  --tok-str: ${t.tok.str};
  --tok-fn: ${t.tok.fn};
  --tok-type: ${t.tok.typ};
  --tok-com: ${t.tok.com};
  --tok-num: ${t.tok.num};
}`;

/* ---------- Expressive Code theme, built from the resolved tokens ---------- */

// Code blocks sit on --bg-inset, which is what .code does in app.css, so the generated
// theme has to agree or a code block will not match the panel it sits in.
const ecTheme = (id, t) => ({
  name: id,
  type: t.scheme,
  semanticHighlighting: true,
  colors: {
    'editor.background': t.inset,
    'editor.foreground': t.fg,
    'editor.lineHighlightBackground': mix(t.inset, t.fg, 0.06),
    'editorLineNumber.foreground': t.dim,
    'editorLineNumber.activeForeground': t.fg,
    'editorGutter.background': t.inset,
    'editorWidget.background': t.raised,
    'editorWidget.border': t.line,
    'panel.border': t.line,
    'focusBorder': t.accent,
    'editorError.foreground': t.err,
    'editorWarning.foreground': t.warn,
    'editorInfo.foreground': t.info,
    'editorHint.foreground': t.hint,
    // Frame chrome. Expressive Code draws a title bar and tabs from these.
    'titleBar.activeBackground': t.raised,
    'titleBar.activeForeground': t.dim,
    'tab.activeBackground': t.inset,
    'tab.activeForeground': t.fg,
    'tab.inactiveBackground': t.raised,
    'tab.inactiveForeground': t.dim,
    'tab.border': t.line,
    'editorGroupHeader.tabsBackground': t.raised,
    'editorGroupHeader.tabsBorder': t.line,
    'terminal.background': t.inset,
    'terminal.foreground': t.fg
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: t.tok.com, fontStyle: 'italic' } },
    { scope: ['string', 'string.quoted', 'string.template', 'punctuation.definition.string'], settings: { foreground: t.tok.str } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character', 'constant'], settings: { foreground: t.tok.num } },
    { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control', 'keyword.operator.expression', 'variable.language'], settings: { foreground: t.tok.key } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call.generic', 'entity.name.function.member'], settings: { foreground: t.tok.fn } },
    { scope: ['entity.name.type', 'entity.name.class', 'entity.name.namespace', 'support.type', 'support.class', 'entity.other.inherited-class'], settings: { foreground: t.tok.typ } },
    { scope: ['variable', 'variable.other', 'meta.definition.variable', 'entity.name.variable'], settings: { foreground: t.fg } },
    { scope: ['keyword.operator', 'punctuation'], settings: { foreground: t.dim } },
    { scope: ['entity.name.tag'], settings: { foreground: t.tok.key } },
    { scope: ['entity.other.attribute-name'], settings: { foreground: t.tok.fn } },
    { scope: ['invalid', 'invalid.illegal'], settings: { foreground: t.err } }
  ]
});

/* ---------- house themes, hand authored ---------- */

const house = {
  'bbb-dark': {
    label: 'BBB Dark',
    scheme: 'dark',
    bg: '#15171a', raised: '#1c1f23', inset: '#22262b',
    fg: '#e9ebee', dim: '#99a1aa', line: '#2b3037',
    accent: '#e9a83c',
    err: '#f0655f', warn: '#e8c547', info: '#6fb6ef', hint: '#8a929b',
    tok: { key: '#e9a83c', str: '#9bd17f', fn: '#6fb6ef', typ: '#5fc9b6', com: '#7f878f', num: '#f0a58c' }
  },
  'bbb-light': {
    label: 'BBB Light',
    scheme: 'light',
    bg: '#fbfaf8', raised: '#f3f1ed', inset: '#eceae5',
    fg: '#1b1a18', dim: '#5f5c57', line: '#ddd9d2',
    accent: '#9a6510',
    err: '#c0392b', warn: '#8a6300', info: '#1a63c7', hint: '#6b6862',
    tok: { key: '#9a6510', str: '#3f6b2f', fn: '#1a63c7', typ: '#0f6f63', com: '#77736c', num: '#a44a2a' }
  },
  // Windows 3.1, Control Panel, Color, Hot Dog Stand. Kept honest: yellow page, white
  // windows, Win 3.1 silver for insets, and pure #ff0000 on every rule line, which is
  // where the theme gets to be as loud as it was in 1992 because borders carry no text.
  // Everything that does carry text goes through the same guard as every other theme.
  'hotdog-stand': {
    label: 'Hot Dog Stand',
    scheme: 'light',
    bg: '#ffff00', raised: '#ffffff', inset: '#c0c0c0',
    fg: '#000000', dim: '#4a4a4a', line: '#ff0000',
    accent: '#cc0000',
    err: '#cc0000', warn: '#7a4a00', info: '#0000cc', hint: '#4a4a4a',
    tok: { key: '#cc0000', str: '#006600', fn: '#0000cc', typ: '#006666', com: '#4a4a4a', num: '#7a4a00' }
  }
};

/* ---------- audit ---------- */

const audit = (id, t) => {
  const surfaces = [t.bg, t.raised, t.inset];
  const worstOn = (col) => Math.min(...surfaces.map(s => ratio(col, s)));
  const checks = {
    fg: worstOn(t.fg), dim: worstOn(t.dim), accent: worstOn(t.accent),
    error: worstOn(t.err), warn: worstOn(t.warn), info: worstOn(t.info), hint: worstOn(t.hint),
    'tok-key': worstOn(t.tok.key), 'tok-str': worstOn(t.tok.str), 'tok-fn': worstOn(t.tok.fn),
    'tok-type': worstOn(t.tok.typ), 'tok-com': worstOn(t.tok.com), 'tok-num': worstOn(t.tok.num)
  };
  const worst = Math.min(...Object.values(checks));
  const failed = Object.entries(checks).filter(([, v]) => v < TARGET).map(([k]) => k);
  return { id, scheme: t.scheme, worst, failed };
};

/* ---------- run ---------- */

const css = ['/* Generated by scripts/gen-themes.mjs. Do not hand edit. */\n'];
const list = [];
const ec = [];
const report = [];

// House themes go through the identical guard. No special treatment for our own palette.
for (const t of Object.values(house)) {
  const S = [t.bg, t.raised, t.inset];
  for (const k of ['fg', 'dim', 'accent', 'err', 'warn', 'info', 'hint']) t[k] = enforce(t[k], S, TARGET);
  for (const k of Object.keys(t.tok)) t.tok[k] = enforce(t.tok[k], S, TARGET);
}

for (const [id, t] of Object.entries(house)) {
  css.push(block(`[data-theme="${id}"]`, t));
  list.push({ id, name: t.label, scheme: t.scheme, house: true });
  ec.push(ecTheme(id, t));
  report.push(audit(id, t));
}

for (const name of PICK) {
  const loader = bundledThemes[name];
  if (!loader) throw new Error(`shiki has no bundled theme named "${name}"`);
  const theme = (await loader()).default;
  const t = resolve(theme);
  const info = bundledThemesInfo.find(i => i.id === name);

  css.push(block(`[data-theme="${name}"]`, t));
  list.push({
    id: name,
    name: NAME_OVERRIDES[name] ?? info?.displayName ?? name,
    scheme: t.scheme,
    house: false
  });
  ec.push(ecTheme(name, t));
  report.push(audit(name, t));
}

const ts = `// Generated by scripts/gen-themes.mjs. Do not hand edit.
// The picker renders this list. It is generated so it cannot drift from themes.css.

export interface ThemeEntry {
  id: string;
  name: string;
  scheme: 'dark' | 'light';
  house: boolean;
}

export const THEMES: ThemeEntry[] = ${JSON.stringify(list, null, 2)};

export const DEFAULT_DARK = 'bbb-dark';
export const DEFAULT_LIGHT = 'bbb-light';
export const THEME_STORAGE_KEY = 'bbb-theme';
`;

fs.mkdirSync(path.dirname(OUT_CSS), { recursive: true });
fs.mkdirSync(path.dirname(OUT_LIST), { recursive: true });
fs.writeFileSync(OUT_CSS, css.join('\n\n') + '\n');
fs.writeFileSync(OUT_LIST, ts);
fs.writeFileSync(
  OUT_EC,
  '// Generated by scripts/gen-themes.mjs. Do not hand edit.\n' +
    '// A module rather than JSON so ec.config.mjs can import it without a resolver that\n' +
    '// changes meaning once the config gets bundled.\n\n' +
    'export default ' +
    JSON.stringify(ec, null, 2) +
    ';\n'
);

const rel = (p) => path.relative(ROOT, p).replaceAll('\\', '/');
for (const r of report) {
  const status = r.failed.length ? `FAIL ${r.failed.join(',')}` : 'pass';
  console.log(`${r.id.padEnd(20)} ${r.scheme.padEnd(6)} worst ${r.worst.toFixed(2)}:1  ${status}`);
}
console.log(`\n${report.length} themes to ${rel(OUT_CSS)}, ${rel(OUT_LIST)}, ${rel(OUT_EC)}`);

const broken = report.filter(r => r.failed.length);
if (broken.length) {
  console.error(`\n${broken.length} theme(s) below ${TARGET}:1. Decision 34 says contrast wins, so this is a build failure.`);
  process.exit(1);
}
