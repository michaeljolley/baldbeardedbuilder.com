/*
  Decision 130, the half that does not need a browser.

  check:headings measures computed colour in a real page, which is the only way to know
  what a reader sees. It is also slow, needs chromium, and lives in the one CI job that
  pays for one. These are the assertions that hold the generated artifacts to each other
  and to app.css, and they run in the fast suite where a mistake gets caught in seconds.

  The division is deliberate rather than duplicated. Nothing here reads a computed colour
  and nothing in the browser gate reads a file.
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { THEMES } from '../src/lib/themes.generated.ts';

const ROOT = process.cwd();
const CSS = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'themes.css'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'app.css'), 'utf8');
const GEN = fs.readFileSync(path.join(ROOT, 'scripts', 'gen-themes.mjs'), 'utf8');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const CI = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
const RECORD = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'lib', 'heading-fallbacks.generated.json'), 'utf8')
);

const blocks = Object.fromEntries(
  [...CSS.matchAll(/\[data-theme="([^"]+)"\]\s*\{([\s\S]*?)\n\}/g)].map(([, id, body]) => [id, body])
);
const varOf = (body, name) => (body.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i')) ?? [])[1];

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const chan = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const [r, g, b] = rgb(h).map(chan); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

test('every theme block emits all four heading variables', () => {
  for (const theme of THEMES) {
    const body = blocks[theme.id];
    assert.ok(body, `themes.css has no block for ${theme.id}`);
    for (const name of ['--fg-strong', '--h2-fg', '--h3-fg', '--h4-fg']) {
      assert.ok(varOf(body, name), `${theme.id} is missing ${name}`);
    }
  }
});

/*
  The clamp, checked statically as well as in the browser.

  Michael's rule is white in dark themes and a very dark grey in light ones. Taken
  literally it introduces the defect it exists to prevent, because --fg is already at the
  end of the scale in most themes and is #000000 in hotdog-stand, where a fixed #111111
  would be lighter than the prose it is meant to outrank.
*/
test('--fg-strong is never weaker than --fg', () => {
  for (const theme of THEMES) {
    const body = blocks[theme.id];
    const strong = varOf(body, '--fg-strong');
    const fg = varOf(body, '--fg');
    if (theme.scheme === 'dark') {
      assert.ok(
        lum(strong) >= lum(fg),
        `${theme.id}: --fg-strong ${strong} is darker than --fg ${fg} in a dark theme`
      );
    } else {
      assert.ok(
        lum(strong) <= lum(fg),
        `${theme.id}: --fg-strong ${strong} is lighter than --fg ${fg} in a light theme`
      );
    }
  }
});

test('the fallback record covers every theme and nothing else', () => {
  const recorded = Object.keys(RECORD.fallbacks).sort();
  const known = THEMES.map((t) => t.id).sort();
  assert.deepEqual(recorded, known);
  for (const [id, levels] of Object.entries(RECORD.fallbacks)) {
    for (const level of levels) {
      assert.ok(['h2', 'h3', 'h4'].includes(level), `${id} records an unknown level ${level}`);
    }
  }
});

/*
  A recorded fallback has to actually be --fg-strong in the CSS, and an unrecorded level
  has to not be. This is the same pairing the browser gate enforces on computed colour,
  and it is worth having in both places: this one catches a generator that writes an
  inconsistent pair, the browser one catches a cascade that overrides a correct pair.
*/
test('the record and the CSS agree about which levels fell back', () => {
  for (const theme of THEMES) {
    const body = blocks[theme.id];
    const strong = varOf(body, '--fg-strong');
    const fell = RECORD.fallbacks[theme.id];
    for (const level of ['h2', 'h3', 'h4']) {
      const value = varOf(body, `--${level}-fg`);
      if (fell.includes(level)) {
        assert.equal(value, strong, `${theme.id} ${level} is recorded as a fallback but is ${value}`);
      } else {
        assert.notEqual(value, strong, `${theme.id} ${level} is --fg-strong and is not recorded`);
      }
    }
  }
});

test('the thresholds in the record are the thresholds in the generator', () => {
  assert.match(GEN, new RegExp(`const D_PROSE = ${RECORD.thresholds.prose};`));
  assert.match(GEN, new RegExp(`const D_LINK = ${RECORD.thresholds.link};`));
  assert.match(GEN, new RegExp(`const D_LEVEL = ${RECORD.thresholds.level};`));
});

/*
  app.css must consume the variables and must not decide anything itself. The whole point
  of resolving this in the generator is that CSS cannot ask whether two colours are far
  apart, so a literal colour here would be a colour nobody checked against anything.
*/
test('app.css consumes the heading variables and adds no colour of its own', () => {
  for (const level of ['h2', 'h3', 'h4']) {
    assert.ok(
      new RegExp(`\\.prose ${level} \\{[^}]*color: var\\(--${level}-fg\\)`).test(APP),
      `app.css does not put .prose ${level} on var(--${level}-fg)`
    );
  }
  assert.ok(
    /\.prose h5, \.prose h6 \{[^}]*color: var\(--fg-strong\)/.test(APP),
    'app.css does not put .prose h5 and h6 on var(--fg-strong)'
  );
});

test('the heading gate is wired into package.json, CI and gen:check', () => {
  assert.equal(PKG.scripts['check:headings'], 'node scripts/check-headings.mjs');
  assert.ok(CI.includes('pnpm check:headings'), 'ci.yml must run check:headings');
  assert.ok(
    PKG.scripts['gen:check'].includes('src/lib/heading-fallbacks.generated.json'),
    'gen:check must diff the fallback record, or a hand edit to it would go unnoticed'
  );
});
