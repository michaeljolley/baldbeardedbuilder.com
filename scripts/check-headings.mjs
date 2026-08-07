/*
  Prose heading colour, measured in a browser rather than read back from the file.

  Decision 130. h2, h3 and h4 each take a colour, resolved per theme by gen-themes.mjs
  because CSS cannot ask whether two colours are far apart. Sixteen themes multiplied by
  three levels is 48 answers, none of which a person is going to check by eye, and the
  failure mode is a heading that reads as body text or as a link rather than one that
  looks broken.

  Three things this gate does deliberately.

  IT MEASURES COMPUTED COLOUR, NOT THE GENERATED FILE. Reading themes.css back and
  checking the numbers agree with themselves is not verification, it is the generator
  marking its own homework. What matters is the colour that wins the cascade on a real
  page, which is a question about app.css and themes.css together, and only a browser
  knows the answer.

  IT KILLS TRANSITIONS RATHER THAN WAITING OUT. app.css puts a .18s colour transition on
  body, so a naive gate that switches theme and reads immediately samples a blend of two
  themes and reports a colour that exists nowhere. A longer wait is not the fix: a wait is
  a race that passes on a fast laptop and fails under load in CI. The stylesheet injected
  below removes transitions outright, so the measurement is of the settled state, which is
  the only state a reader is ever in.

  The obvious alternative was to open the context with reducedMotion reduce, which
  app.css already collapses to .01ms, and which is how a11y.mjs avoids this. That would
  work today and is the wrong mechanism, because it makes this gate's correctness depend
  on a rule inside the file it is auditing. Deleting the reduced motion block would then
  silently turn this into a gate that measures mid transition colours and still passes.

  IT IS HELD TO A WRITTEN LIST OF FALLBACKS. Six of the 48 pairs, in this run ten, cannot
  be given a colour and land on --fg-strong. In the output a justified fallback and a lazy
  one are byte identical, so without a record the gate can only assert that every heading
  is some colour the generator emitted, which it always is. gen-themes.mjs writes down
  which pairs it could not colour, and this holds the CSS to exactly that list: a theme
  edit that opens up a colour turns this red until the CSS is regenerated.

  IT INJECTS THE HEADINGS. Real content today has h2 and h3 and no h4, h5 or h6 at all,
  measured across the built output. A gate that looked for real elements would cover two
  of the five levels and would go red the day somebody edits a post, which decision 117
  forbids. The elements are synthetic and everything else is real: a real page, a real
  .prose, the real cascade, the real theme block.

  Run against a built dist, after pnpm build.
*/

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { serveDist } from './lib/serve-dist.mjs';
import { provenanceSuffix } from './lib/provenance.mjs';
import { firstArticlePage } from './lib/archetypes.mjs';
import { THEMES } from '../src/lib/themes.generated.ts';

const record = JSON.parse(
  fs.readFileSync(path.resolve('src/lib/heading-fallbacks.generated.json'), 'utf8')
);
const { thresholds, fallbacks } = record;

const LEVELS = ['h2', 'h3', 'h4'];
const NEUTRAL_LEVELS = ['h5', 'h6'];

/* ---------- colour maths, the same shape the generator uses ---------- */

const parse = (css) => {
  const m = css.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (!m) throw new Error(`cannot read colour from "${css}"`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};
const chan = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (c) => { const [r, g, b] = c.map(chan); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const linearize = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const D65 = [0.95047, 1, 1.08883];
const lab = (c) => {
  const [r, g, b] = c.map(linearize);
  const xyz = [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    r * 0.0193339 + g * 0.1191920 + b * 0.9503041
  ];
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [x, y, z] = xyz.map((v, i) => f(v / D65[i]));
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const deltaE = (a, b) => {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
};
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const show = (c) => `rgb(${c.join(',')})`;

/* ---------- run ---------- */

/* Returns an array of [label, url] pairs so a11y can spread it. Take the first pair. */
const [[articleLabel, article] = []] = firstArticlePage();
if (!article) {
  console.error('check:headings found no article page in dist to measure against.');
  process.exit(1);
}

const { server, base } = await serveDist();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const failures = [];
let measured = 0;
let fellBack = 0;

try {
  const res = await page.goto(base + article, { waitUntil: 'load' });
  if (!res || res.status() !== 200) {
    throw new Error(`${articleLabel} ${article} returned ${res ? res.status() : 'no response'}`);
  }

  const hasProse = await page.locator('.prose').count();
  if (!hasProse) throw new Error(`${articleLabel} ${article} has no .prose to measure in`);

  /*
    Transitions off, and the sample elements in. Both are injected once and survive the
    theme loop, because switching theme is an attribute change on documentElement and
    neither the stylesheet nor the nodes are touched by it.
  */
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }'
  });
  await page.evaluate((levels) => {
    const prose = document.querySelector('.prose');
    const probe = document.createElement('div');
    probe.id = 'heading-probe';
    probe.innerHTML =
      levels.map((l) => `<${l} data-probe="${l}">Heading</${l}>`).join('') +
      '<p data-probe="p">Prose</p><p><a data-probe="a" href="/">A link</a></p>';
    prose.appendChild(probe);
  }, [...LEVELS, ...NEUTRAL_LEVELS]);

  for (const theme of THEMES) {
    await page.evaluate((id) => document.documentElement.setAttribute('data-theme', id), theme.id);

    const read = await page.evaluate(() => {
      const out = {};
      for (const el of document.querySelectorAll('[data-probe]')) {
        out[el.dataset.probe] = getComputedStyle(el).color;
      }
      const root = getComputedStyle(document.documentElement);
      out.__bg = getComputedStyle(document.body).backgroundColor;
      out.__strong = root.getPropertyValue('--fg-strong').trim();
      out.__fg = root.getPropertyValue('--fg').trim();
      /*
        The same level as it renders on real content, so the injected probe is held to
        something rather than only to itself. A probe that is a grandchild of .prose and
        a real heading that is a child of it match the same selector, and asserting that
        rather than assuming it is the difference between measuring the page and
        measuring the measurement.
      */
      const real = document.querySelector('.prose > h2');
      out.__realH2 = real ? getComputedStyle(real).color : null;
      return out;
    });

    const at = (k) => parse(read[k]);
    const bg = at('__bg');
    const prose = at('p');
    const link = at('a');
    const strong = parse(
      read.__strong.startsWith('#')
        ? `rgb(${[1, 3, 5].map((i) => parseInt(read.__strong.slice(i, i + 2), 16)).join(',')})`
        : read.__strong
    );
    const fg = parse(
      read.__fg.startsWith('#')
        ? `rgb(${[1, 3, 5].map((i) => parseInt(read.__fg.slice(i, i + 2), 16)).join(',')})`
        : read.__fg
    );

    const expectedFallbacks = fallbacks[theme.id];
    if (!expectedFallbacks) {
      failures.push(`${theme.id}: no fallback record, so nothing can be held to anything`);
      continue;
    }

    /*
      The clamp. --fg-strong is the more extreme of the seed and --fg, never the weaker,
      because --fg is already at the end of the scale in most themes and is literally
      #000000 in hotdog-stand, where a fixed dark grey would be lighter than the prose it
      is meant to outrank.
    */
    const strongOk = theme.scheme === 'dark' ? lum(strong) >= lum(fg) : lum(strong) <= lum(fg);
    if (!strongOk) {
      failures.push(
        `${theme.id}: --fg-strong ${show(strong)} is weaker than --fg ${show(fg)} in a ` +
          `${theme.scheme} theme, so a fallback heading reads as dimmer than its own paragraph`
      );
    }

    if (!read.__realH2) {
      failures.push(
        `${theme.id}: ${articleLabel} carries no .prose > h2, so the probe is only being ` +
          `held to itself. Point this gate at a page with prose headings on it.`
      );
    } else {
      const realH2 = parse(read.__realH2);
      measured++;
      if (!same(realH2, at('h2'))) {
        failures.push(
          `${theme.id}: a real h2 computes ${show(realH2)} but the probe h2 computes ` +
            `${show(at('h2'))}, so the rule does not reach real content`
        );
      }
    }

    for (const level of NEUTRAL_LEVELS) {      const c = at(level);
      measured++;
      if (!same(c, strong)) {
        failures.push(`${theme.id} ${level}: ${show(c)} is not --fg-strong ${show(strong)}`);
      }
    }

    const assigned = [];
    for (const level of LEVELS) {
      const c = at(level);
      measured++;      const shouldFallBack = expectedFallbacks.includes(level);

      if (shouldFallBack) {
        fellBack++;
        if (!same(c, strong)) {
          failures.push(
            `${theme.id} ${level}: recorded as a fallback but computed ${show(c)}, ` +
              `not --fg-strong ${show(strong)}`
          );
        }
        continue;
      }

      if (same(c, strong)) {
        failures.push(
          `${theme.id} ${level}: fell back to --fg-strong and is not on the recorded list. ` +
            `Either it should have taken a colour, or gen-themes.mjs needs rerunning.`
        );
        continue;
      }

      const dProse = deltaE(c, prose);
      const dLink = deltaE(c, link);
      const onBg = ratio(c, bg);
      if (dProse < thresholds.prose) {
        failures.push(
          `${theme.id} ${level}: ${show(c)} is deltaE ${dProse.toFixed(1)} from prose, ` +
            `under ${thresholds.prose}, so it reads as body text`
        );
      }
      if (dLink < thresholds.link) {
        failures.push(
          `${theme.id} ${level}: ${show(c)} is deltaE ${dLink.toFixed(1)} from the link colour, ` +
            `under ${thresholds.link}, so it reads as a link`
        );
      }
      if (onBg < 4.5) {
        failures.push(
          `${theme.id} ${level}: ${show(c)} is ${onBg.toFixed(2)}:1 on the page background, under AA`
        );
      }
      for (const [other, oc] of assigned) {
        const d = deltaE(c, oc);
        if (d < thresholds.level) {
          failures.push(
            `${theme.id} ${level}: ${show(c)} is deltaE ${d.toFixed(1)} from ${other}, ` +
              `under ${thresholds.level}, so the levels collapse into one colour`
          );
        }
      }
      assigned.push([level, c]);
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (measured === 0) {
  console.error('check:headings measured nothing. Refusing to report clean.');
  process.exit(1);
}

if (failures.length) {
  console.error('check:headings found prose headings that do not hold:\n');
  for (const line of failures) console.error(`  ${line}`);
  console.error(`\n${failures.length} problem(s) across ${measured} measurements.${provenanceSuffix()}`);
  process.exit(1);
}

const coloured = THEMES.length * LEVELS.length - fellBack;
console.log(
  `check:headings clean across ${measured} computed colours in ${THEMES.length} themes. ` +
    `${coloured} of ${THEMES.length * LEVELS.length} theme and level pairs carry a colour, ` +
    `${fellBack} fall back to --fg-strong and every one of them is on the recorded list.` +
    provenanceSuffix()
);
