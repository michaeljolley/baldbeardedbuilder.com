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
import { serveDev } from './lib/serve-dev.mjs';
import { firstArticlePage, firstDisasterPage } from './lib/archetypes.mjs';
import { provenanceSuffix } from './lib/provenance.mjs';

/* One of each archetype rather than all 199 pages. Adding a new archetype means adding
   a line here, which is the point. */
const PAGES = [
  ['home', '/'],
  ['videos', '/videos/'],
  ['topic index', '/csharp/'],
  ['topic filtered', '/csharp/articles/'],
  ['empty topic', '/mcp/'],
  /*
    The article archetype is discovered rather than named. It used to be a hardcoded slug
    sitting in this file alongside the disaster function that exists to avoid exactly that,
    and it named a post in the src/content submodule, which Michael edits without touching
    this repo. One rename for SEO and this gate went red on a build where no site code
    changed, which is decision 117 straight through the middle.
  */
  ...firstArticlePage(),
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
    has published it, and there are none yet. Both discoveries live in scripts/lib/archetypes.mjs
    with the history of why.
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
  Fail closed on the article. Discovery is the fix for a hardcoded slug, but a discovery
  that quietly finds nothing is worse than the slug was: the gate would go green having
  skipped the most read page type on the site, and its summary line would not change.
  There is no state of this repo where zero articles are built.
*/
if (!PAGES.some(([label]) => label === 'article')) {
  console.error(
    'no article page was discovered in dist, so the most read page type went unaudited. ' +
      'Check src/config/taxonomy.json has entries and that pnpm build ran first.'
  );
  process.exit(1);
}

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

/*
  One unexplained failure, 31 July, recorded here and closed rather than chased.

  A single run reported contrast violations on h4 elements. The offending markup was
  located exactly by querying the DOM across every target: /videos/, the sixth .feed, the
  seven external items, each of which draws a span wrapping an h4. Nothing else on any
  target has that shape.

  It has not reproduced. Four full runs since, including one from a clean worktree built
  from committed source, plus 96 targeted audits on /csharp/ and 64 on /videos/ using an
  exact mirror of this file's browser setup. All clean.

  Two things are known and neither explains it. The rule id is gone, because the failing
  run was piped through `Select-Object -Last 2` and the id was above the cut, so never do
  that to a gate that can fail. And the body colour transition at app.css:34 does not
  reach this file: every context here is opened with reducedMotion 'reduce', and
  app.css:1506 collapses transition-duration to .01ms under that. Measured both ways, and
  a probe using a default context instead does report mid transition colours, which is
  what made the transition look like the cause when it is not.

  Left as is on purpose. Chasing an unreproducible failure with no error text is how an
  afternoon goes. If it returns it will return with the rule id attached, and that is a
  better starting point than anything guessed at now.
*/

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
      Find every disclosure on the page and tag it, so its contents can be audited.

      Found while adding the share menu. A closed disclosure is display: none, so axe walks
      straight past it, which means the theme picker menu has been on every page of this
      site since phase one and has never once been audited. Sixteen swatch rows and two
      group labels, in three themes, checked by nothing.

      The panels are opened rather than the triggers clicked, because a click that lands on
      the wrong element navigates and the audit then reports on a different page. Every
      disclosure on this site is either a details element or a panel hidden by the hidden
      attribute, and both open the same way from here.
    */
    const panels = await page.evaluate(() => {
      const found = [];

      for (const d of document.querySelectorAll('details')) {
        d.setAttribute('data-a11y-disclosure', String(found.length));
        found.push({ index: found.length, kind: 'details', label: d.className || 'details' });
      }

      for (const trigger of document.querySelectorAll('[aria-expanded="false"][aria-controls]')) {
        const panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (!panel) continue;
        panel.setAttribute('data-a11y-disclosure', String(found.length));
        trigger.setAttribute('data-a11y-trigger', String(found.length));
        found.push({ index: found.length, kind: 'panel', label: panel.className || panel.id });
      }

      return found;
    });

    /**
     * Open or close one tagged disclosure, in the page.
     *
     * One at a time, and closed again afterwards, which is the whole point. Opening them
     * all and leaving them open put a 581 pixel panel over the top of the videos page and
     * axe then reported contrast failures on the first three titles underneath it. That is
     * text no reader can see, because the panel painting over it is opaque, so the finding
     * was an artifact of the audit rather than anything wrong with the page. It failed
     * about two runs in five, which is worse than failing every time: a gate that goes red
     * at random teaches people to press the button again.
     */
    const setDisclosure = ({ index, open }) => {
      const el = document.querySelector(`[data-a11y-disclosure="${index}"]`);
      if (!el) return;

      if (el.tagName === 'DETAILS') {
        el.open = open;
        return;
      }

      el.hidden = !open;
      const trigger = document.querySelector(`[data-a11y-trigger="${index}"]`);
      if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    for (const theme of THEMES) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      /* The theme picker island writes on idle and would otherwise put the theme back. */
      await page.waitForTimeout(50);
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);

      const audit = () =>
        new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          /* YouTube's own player markup, which we do not control and cannot fix. The iframe
             element itself is still audited, and the title assertion below covers the part
             that is actually ours. */
          .exclude('iframe[src*="youtube"]');

      const record = (results, where) => {
        for (const v of results.violations) {
          failures.push(
            `${label}${where} [${vpName}, ${theme}] ${v.id} (${v.impact}): ${v.help}\n` +
              v.nodes
                .slice(0, 3)
                .map((n) => `      ${n.target.join(' ')}`)
                .join('\n')
          );
        }
      };

      /* The page as it actually ships, with every disclosure shut. */
      record(await audit().analyze(), '');
      checks++;

      /*
        Then each disclosure's own contents, scoped to the panel. Scoping is what keeps the
        two questions apart: whether the page is accessible, and whether the thing a reader
        opens on top of it is. Auditing the whole page with a panel open answers neither
        cleanly, because half the page is behind an opaque box.
      */
      for (const panel of panels) {
        await page.evaluate(setDisclosure, { index: panel.index, open: true });

        record(
          await audit().include(`[data-a11y-disclosure="${panel.index}"]`).analyze(),
          ` (${panel.label} open)`
        );
        checks++;
        disclosuresOpened++;

        await page.evaluate(setDisclosure, { index: panel.index, open: false });
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

console.log(
  `axe clean across ${checks} audits, ${TARGETS.length * VIEWPORTS.length} page loads and ` +
    `${disclosuresOpened} disclosure audits, each scoped to the panel and shut again after.` +
    provenanceSuffix()
);
