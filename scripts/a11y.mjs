/*
  Accessibility gate.

  WCAG 2.2 AA is a decision, not an aspiration, so it is checked by a script that fails
  the build rather than by remembering to look. Every page archetype is audited, under a
  dark theme and a light theme, at a phone width and a desktop width, because contrast
  and reflow failures only show up in some of those combinations.

  Run it against a built dist. `pnpm a11y` serves dist and does the rest.
*/

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { serveDist } from './lib/serve-dist.mjs';

/* One of each archetype rather than all 199 pages. Adding a new archetype means adding
   a line here, which is the point. */
const PAGES = [
  ['home', '/'],
  ['topic index', '/csharp/'],
  ['topic filtered', '/csharp/articles/'],
  ['empty topic', '/mcp/'],
  ['article', '/csharp/the-traps-of-nullable-in-c-sharp/'],
  ['video', '/windows/keep-track-of-vs-code-windows-with-peacock/'],
  ['disaster archive', '/dev-disasters/'],
  ['disaster filtered', '/dev-disasters/error/newest/'],
  ['disaster', '/dev-disasters/a-regex-ate-the-payroll-run/'],
  ['about', '/about/'],
  ['conduct', '/conduct/'],
  ['submit', '/submit/'],
  ['uses', '/uses/'],
  ['search', '/search/'],
  ['not found', '/404.html']
];

const VIEWPORTS = [
  ['phone', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 900 }]
];

/* One dark and one light. hotdog-stand is the harshest palette the generator emits, so
   it is the one most likely to expose a contrast rule the guard missed. */
const THEMES = ['bbb-dark', 'bbb-light', 'hotdog-stand'];

const { server, base } = await serveDist();
const browser = await chromium.launch();

const failures = [];
let checks = 0;

for (const [vpName, viewport] of VIEWPORTS) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();

  for (const [label, path] of PAGES) {
    const res = await page.goto(base + path, { waitUntil: 'load' });
    if (!res || res.status() !== 200) {
      failures.push(`${label} ${path} returned ${res ? res.status() : 'no response'}`);
      continue;
    }

    /* Expressive Code decides whether a code block needs keyboard access from a resize
       observer with a 250ms debounce followed by an idle callback, so auditing straight
       after load reports a missing tabindex that arrives moments later. Waiting is the
       honest fix. Racing the page is how a gate produces failures nobody can reproduce. */
    await page.waitForTimeout(600);

    for (const theme of THEMES) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      /* The theme picker island writes on idle and would otherwise put the theme back. */
      await page.waitForTimeout(50);
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        /* YouTube's own player markup, which we do not control and cannot fix. The iframe
           element itself is still audited, and the title assertion below covers the part
           that is actually ours. */
        .exclude('iframe[src*="youtube"]')
        .analyze();
      checks++;

      for (const v of results.violations) {
        failures.push(
          `${label} [${vpName}, ${theme}] ${v.id} (${v.impact}): ${v.help}\n` +
            v.nodes
              .slice(0, 3)
              .map((n) => `      ${n.target.join(' ')}`)
              .join('\n')
        );
      }
    }

    /* Excluding the embed's insides means nothing checks the frame itself any more, and
       a frame with no name is the one accessibility failure an embed can have that is
       genuinely ours to fix. */
    const unnamedFrames = await page.evaluate(() =>
      [...document.querySelectorAll('iframe')].filter((f) => !f.title?.trim()).length
    );
    if (unnamedFrames > 0) {
      failures.push(`${label} [${vpName}] has ${unnamedFrames} iframes with no title`);
    }

    /* Reflow, WCAG 2.2 success criterion 1.4.10. A page that scrolls sideways on a phone
       fails whether or not axe has a rule for it. */
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    if (overflow > 1) {
      failures.push(`${label} [${vpName}] scrolls sideways by ${overflow}px`);
    }
  }

  await context.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.error(`\naxe found ${failures.length} problems across ${checks} audits:\n`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}

console.log(`axe clean across ${checks} audits and ${PAGES.length * VIEWPORTS.length} page loads.`);
