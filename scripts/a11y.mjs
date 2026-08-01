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
import { readdirSync, existsSync } from 'node:fs';
import { serveDist } from './lib/serve-dist.mjs';
import { serveDev } from './lib/serve-dev.mjs';

/**
 * The first published disaster's own page, or nothing when none have been published.
 *
 * Returns a list so it can be spread into PAGES, which is how "no archetype yet" is said
 * without a conditional in the middle of the table. The archive's own severity and sort
 * views live under the same directory and are listed explicitly above, so they are
 * excluded here rather than audited twice under the wrong label.
 */
function firstDisasterPage() {
  const dir = 'dist/dev-disasters';
  if (!existsSync(dir)) return [];

  const views = new Set(['all', 'error', 'warning', 'info', 'hint']);
  const slug = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !views.has(e.name))
    .map((e) => e.name)
    .sort()[0];

  return slug ? [['disaster', `/dev-disasters/${slug}/`]] : [];
}

/* One of each archetype rather than all 199 pages. Adding a new archetype means adding
   a line here, which is the point. */
const PAGES = [
  ['home', '/'],
  ['videos', '/videos/'],
  ['topic index', '/csharp/'],
  ['topic filtered', '/csharp/articles/'],
  ['empty topic', '/mcp/'],
  ['article', '/csharp/the-traps-of-nullable-in-c-sharp/'],
  /*
    A video detail page exists only when there is a video_pages row for it, and there are
    none until Michael writes one. So there is no video page archetype to audit yet, and
    hardcoding a URL here just makes the gate fail on a page nobody asked for. The videos
    index above is the surface every video actually has.
  */
  ['disaster archive', '/dev-disasters/'],
  ['disaster filtered', '/dev-disasters/error/newest/'],
  /*
    The disaster detail archetype is discovered rather than named, for the same reason the
    video page above is absent: it only exists once somebody has told a story and Michael
    has published it, and there are none yet.

    This used to be a hardcoded seed slug. When src/config/disasters.seed.json was deleted
    and the wall started reading Supabase, that URL stopped existing and the accessibility
    gate failed on a 404, reporting it as two axe problems. A gate that breaks because its
    fixture data went away is testing the fixture. Reading dist means the archetype is
    audited the day a real story is published, without anybody remembering to come back.
  */
  ...firstDisasterPage(),
  ['about', '/about/'],
  ['conduct', '/conduct/'],
  ['privacy', '/privacy/'],
  ['terms', '/terms/'],
  ['uses', '/uses/'],
  ['search', '/search/'],
  ['not found', '/404.html']
];

/*
  Pages that are rendered on demand, so they are not in dist and a static audit cannot see
  them. The report page reads its prefill on the server, which is what keeps it working
  with JavaScript off, and that is exactly why it must not be the one page nobody checks.
*/
const ON_DEMAND = [
  ['report', '/report/'],
  ['report prefilled', '/report/?type=comment&ref=00000000-0000-4000-8000-000000000000&target=%2Fcsharp%2F'],
  ['report sent', '/report/?sent=1'],
  ['report refused', '/report/?sent=slow'],
  ['submit', '/submit/'],
  ['submit sent', '/submit/?sent=1'],
  ['submit refused', '/submit/?sent=consent']
  /*
    Unsubscribe used to sit here, both halves of it. v1 sends no email, so the page is not
    a route: it lives at src/pages/_unwired/unsubscribe.astro and Astro will not build it.
    Auditing a 404 would pass and prove nothing. Put both entries back when the page comes
    back, per docs/notifications.md.
  */
];

const VIEWPORTS = [
  ['phone', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 900 }]
];

/* One dark and one light. hotdog-stand is the harshest palette the generator emits, so
   it is the one most likely to expose a contrast rule the guard missed. */
const THEMES = ['bbb-dark', 'bbb-light', 'hotdog-stand'];

const { server, base } = await serveDist();
const dev = await serveDev();
const browser = await chromium.launch();

/* One list of absolute URLs, so the audit loop does not have to care which server a page
   came from. Everything after this point treats them identically, which is the point. */
const TARGETS = [
  ...PAGES.map(([label, path]) => [label, base + path]),
  ...ON_DEMAND.map(([label, path]) => [label, dev.base + path])
];

const failures = [];
let checks = 0;
let disclosuresOpened = 0;

for (const [vpName, viewport] of VIEWPORTS) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();

  for (const [label, url] of TARGETS) {
    const res = await page.goto(url, { waitUntil: 'load' });
    if (!res || res.status() !== 200) {
      failures.push(`${label} ${url} returned ${res ? res.status() : 'no response'}`);
      continue;
    }

    /* Expressive Code decides whether a code block needs keyboard access from a resize
       observer with a 250ms debounce followed by an idle callback, so auditing straight
       after load reports a missing tabindex that arrives moments later. Waiting is the
       honest fix. Racing the page is how a gate produces failures nobody can reproduce. */
    await page.waitForTimeout(600);

    /* Same reasoning, different race. target-size measures rendered boxes, and a nav link
       in a fallback font is a different size from the same link in the real one. Without
       this the gate fails a handful of runs in a hundred with a wall of target-size
       violations nobody changed anything to cause. */
    await page.evaluate(() => document.fonts.ready);

    /*
      Open every disclosure before auditing.

      Found while adding the share menu. A closed disclosure is display: none, so axe walks
      straight past it, which means the theme picker menu has been on every page of this
      site since phase one and has never once been audited. Sixteen swatch rows and two
      group labels, in three themes, checked by nothing.

      The panels are opened rather than the triggers clicked, because a click that lands on
      the wrong element navigates and the audit then reports on a different page. Every
      disclosure on this site is either a details element or a panel hidden by the hidden
      attribute, and both open the same way from here.
    */
    const opened = await page.evaluate(() => {
      let count = 0;
      for (const d of document.querySelectorAll('details')) {
        d.open = true;
        count++;
      }
      for (const trigger of document.querySelectorAll('[aria-expanded="false"][aria-controls]')) {
        const panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (!panel) continue;
        panel.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        count++;
      }
      return count;
    });
    disclosuresOpened += opened;

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
dev.stop();

if (failures.length) {
  console.error(`\naxe found ${failures.length} problems across ${checks} audits:\n`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}

if (disclosuresOpened === 0) {
  /*
    Fail closed. Every page carries the theme picker, so zero here means the opening step
    stopped matching anything and the gate has gone back to auditing only what was already
    on screen, which is the state this was written to end.
  */
  console.error('no disclosures were opened, so their contents were never audited.');
  process.exit(1);
}

console.log(`axe clean across ${checks} audits, ${TARGETS.length * VIEWPORTS.length} page loads and ${disclosuresOpened} opened disclosures.`);
