/*
  Layout gate. The things only a browser can see.

  Every automated gate in this repo so far checks data, markup or output files. That has
  repeatedly missed a whole class of bug where the data is right and the rendering is
  wrong: a progress bar drawn in the divider colour, a reply count correct about the
  database and wrong about the reader, two status markers resolving to the same colour, a
  linked title drawn identically to an unlinked one. None of those were reachable by a
  test that never laid out a page.

  This one measures geometry against intent.

  THUMBNAIL CROPPING. .card .thumb declares aspect-ratio 16/9 and .card .thumb img uses
  object-fit cover, so the moment the box stops being 16/9 the image gets cut. The wide
  lead card is the exposed one: .card.wide is a grid with align-content stretch, and its
  thumb drops the base max-height, so on the face of it the row height should drive the
  thumb height and crop the picture.

  It does not, and the reason is worth writing down because it is load bearing and easy to
  delete by accident. A definite inline size plus a specified aspect-ratio gives the box a
  definite block size, and align-self stretch does not apply to an item that already has
  one. So the row stretches, .body fills it, and the thumb keeps its ratio. Forcing the
  neighbouring card to 2000px tall leaves the thumb at exactly its 16/9 box.

  That is a CSS subtlety, not a promise. Setting an explicit height on .card .thumb, or
  removing its aspect-ratio, would silently start cropping every thumbnail on the site,
  and nothing else here would notice.

  Run against a built dist, after pnpm build.
*/

import { chromium } from 'playwright';
import { serveDist } from './lib/serve-dist.mjs';
import { provenanceSuffix } from './lib/provenance.mjs';

/* Pages that carry thumbnails, one per layout that can produce them. */
const PAGES = [
  ['home', '/'],
  ['videos', '/videos/'],
  ['topic index', '/csharp/']
];

const WIDTHS = [1200, 860, 390];

/*
  A one pixel border on a 135 pixel box is most of a percent on its own, so the floor has
  to clear rounding without letting a real crop through. Anything genuinely stretched
  lands far above this: the failure mode being guarded costs about 27 percent.
*/
const MAX_CROP_PERCENT = 3;

const { server, base } = await serveDist();
const browser = await chromium.launch();

const failures = [];
const cropHint =
  'Check whether .card .thumb still has its aspect-ratio and no explicit height. A box ' +
  'with both a width and a height ignores aspect-ratio, and object-fit cover then cuts ' +
  'the picture to fit.';
let cropped = false;
let measured = 0;

for (const [name, url] of PAGES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 1200 } });
    await page.goto(base + url, { waitUntil: 'networkidle' });

    const thumbs = await page.evaluate(() => {
      const out = [];
      for (const thumb of document.querySelectorAll('.thumb')) {
        const img = thumb.querySelector('img');
        if (!img || !img.naturalWidth || !img.naturalHeight) continue;

        const box = thumb.getBoundingClientRect();
        if (!box.width || !box.height) continue;

        out.push({
          boxRatio: box.width / box.height,
          srcRatio: img.naturalWidth / img.naturalHeight,
          box: `${Math.round(box.width)}x${Math.round(box.height)}`,
          wide: Boolean(thumb.closest('.card.wide')),
          alt: (img.getAttribute('alt') || '').slice(0, 40)
        });
      }
      return out;
    });

    for (const t of thumbs) {
      measured += 1;

      /*
        cover scales to fill the box, so whichever axis is relatively short gets cut.
        Report the proportion of the source lost, whichever way round it is.
      */
      const lost =
        t.boxRatio < t.srcRatio
          ? 1 - t.boxRatio / t.srcRatio
          : 1 - t.srcRatio / t.boxRatio;
      const percent = lost * 100;

      if (percent > MAX_CROP_PERCENT) {
        cropped = true;
        failures.push(
          `${name} at ${width}px: ${t.wide ? 'wide ' : ''}thumb ${t.box} loses ` +
            `${percent.toFixed(1)}% of "${t.alt}" ` +
            `(box ${t.boxRatio.toFixed(3)} against source ${t.srcRatio.toFixed(3)})`
        );
      }
    }

    await page.close();
  }
}

/*
  The measurements above only prove today's layout is fine. The risk is that a future
  change makes the thumb's height come from the row, and the row's height comes from
  whatever card sits beside it. So force that: make the neighbour absurdly tall and check
  the thumb has not moved. If aspect-ratio ever stops winning, this is what says so, and
  it says so without waiting for a summary long enough to trigger it naturally.
*/
const stress = await (async () => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });

  const result = await page.evaluate(() => {
    const card = document.querySelector('.card.wide');
    if (!card) return { skipped: 'no wide card on the home page' };

    const thumb = card.querySelector('.thumb');
    const sibling = [...card.parentElement.children].find((el) => el !== card);
    if (!thumb || !sibling) return { skipped: 'no thumb or no neighbour to stretch' };

    const before = thumb.getBoundingClientRect();
    sibling.style.minHeight = '2000px';
    void card.offsetHeight;
    const after = thumb.getBoundingClientRect();
    const cardHeight = card.getBoundingClientRect().height;
    sibling.style.minHeight = '';

    return {
      cardGrewTo: Math.round(cardHeight),
      before: `${Math.round(before.width)}x${Math.round(before.height)}`,
      after: `${Math.round(after.width)}x${Math.round(after.height)}`,
      grewBy: Math.round(after.height - before.height)
    };
  });

  await page.close();
  return result;
})();

if (stress.skipped) {
  failures.push(`could not run the stretch check: ${stress.skipped}`);
} else if (stress.grewBy > 1) {
  cropped = true;
  failures.push(
    `the wide card's thumb stretched with its neighbour: ${stress.before} became ` +
      `${stress.after} when the card grew to ${stress.cardGrewTo}px. The row height is ` +
      `driving the thumb, so object-fit cover will crop the image.`
  );
}

/*
  DEAD SPACE IN THE LEAD CARD. The wide card sits in a grid row whose height is set by
  whichever card beside it had the most to say. If the lead has less, the difference has to
  go somewhere, and it shows up either as a hole between the title and the foot line or as a
  band of nothing under the whole row. Both read as a broken card rather than a lead.

  MEASURE INK, NOT BOXES. The first version of this compared element rectangles, and it
  scored a card 24px clean while 64px of dead space sat inside it, because a stray padding
  shorthand had inflated the foot element itself. Every box was flush against its
  neighbour and the card still had a hole in it. What a person sees is where the last
  pixel of text or picture is, so that is what gets measured: walk the text nodes, take
  the lowest one, and compare it to the card's content edge.
*/
/*
  The limit is 12px, and it is tight on purpose. Clean measures 1.8px, because the lead's
  foot sits on the same baseline as its neighbours'. The regression this is really guarding
  is align-content going back to start on .card.wide, which measures 26.1px and reads as a
  visible hole under the lead. A limit of 48 passed that happily, so it was a gate that
  could not fail for the one bug it was written after.
*/
const DEAD_SPACE_LIMIT = 12;

const deadSpace = await (async () => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });

  const result = await page.evaluate(() => {
    const card = document.querySelector('.card.wide');
    if (!card) return { skipped: 'no wide card on the home page' };

    const inkBottom = (root) => {
      let lowest = -Infinity;
      const range = document.createRange();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        range.selectNodeContents(n);
        const r = range.getBoundingClientRect();
        if (r.height) lowest = Math.max(lowest, r.bottom);
      }
      for (const img of root.querySelectorAll('img')) {
        const r = img.getBoundingClientRect();
        if (r.height) lowest = Math.max(lowest, r.bottom);
      }
      return lowest;
    };

    const style = getComputedStyle(card);
    const box = card.getBoundingClientRect();
    const contentBottom = box.bottom - parseFloat(style.paddingBottom);
    const ink = inkBottom(card);
    if (!Number.isFinite(ink)) return { skipped: 'the wide card drew no text or images' };

    const body = card.querySelector('.body');
    return {
      trailing: Math.round(contentBottom - ink),
      hasSummary: Boolean(body?.querySelector('p')?.textContent?.trim()),
      cardHeight: Math.round(box.height)
    };
  });

  await page.close();
  return result;
})();

if (deadSpace.skipped) {
  failures.push(`could not measure the lead card: ${deadSpace.skipped}`);
} else if (deadSpace.trailing > DEAD_SPACE_LIMIT) {
  failures.push(
    `the wide lead card has ${deadSpace.trailing}px of nothing below its last text, ` +
      `in a card ${deadSpace.cardHeight}px tall` +
      (deadSpace.hasSummary
        ? '. Two known causes, in the order they are worth checking: align-content on ' +
          '.card.wide is start rather than stretch, so .body never fills the card and the ' +
          "foot's margin-top: auto has no free space to push into. Or a padding or margin " +
          'shorthand is reaching the foot from another rule, which is how the site footer ' +
          'once leaked 4rem into every card.'
        : ', and it has no summary. A video has no description in the collection, so the ' +
          'lead needs a blurb in START_HERE in src/config/site.ts.')
  );
}

/*
  EMPTY CELLS AND SHORT CARDS. Decision 106.

  .grid is display:grid with gap 1px and background var(--line), and every card paints
  var(--bg) over its own cell. The seams between cards are not borders, they are the grid's
  background showing through one pixel gaps. That makes the divider system elegant and it
  makes one thing dangerous: anything that does not cover its cell shows up as divider
  colour, at full strength, in the shape of whatever is missing.

  Two shapes of the same defect, and both are measured here.

  A SHORT CARD leaves a horizontal band. That is what a lead card with align-content start
  produced: the card stopped at its content while the row carried on, and the difference
  drew as a coloured bar.

  AN EMPTY CELL is worse and is the one nothing on this branch could see. The lead spans two
  columns and the rest span one, so the number of cards that tiles cleanly is fixed by the
  column count. Miss it and a whole cell of var(--line) lands on the page as a solid block.
  Adding one curated pick to a config file is enough to cause it, and no data test, no
  markup test and no accessibility gate can see a rectangle of the wrong colour.

  Measured per row rather than per grid, because a hole in the middle of a grid and a hole
  at the end are the same defect and only the last row is intuitive.

  THE PAGE LIST IS DERIVED, NOT WRITTEN DOWN. The thumbnail checks above run against three
  hand picked layouts, which is right for them: they exist to cover one page per layout that
  can produce a thumbnail. Reusing that list here would have left the check guarding the
  pages somebody remembered rather than the pages that have a grid on them.

  So this walks the built output and visits every page that actually contains one. Today
  that is exactly one page. The point is the day it is not, when somebody puts a grid on the
  about page and nothing in this file has to be edited for it to be measured. Adding a grid
  is the same shape of edit as adding a curated pick: it looks like content and it can paint
  a coloured rectangle.
*/
let cellsMeasured = 0;
const cellFailures = [];

/** Every built page carrying a .grid, as urls, found by reading dist rather than by memory. */
async function pagesWithGrids() {
  const { readdir, readFile } = await import('node:fs/promises');
  const found = [];

  const walk = async (dir, prefix) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(full, `${prefix}${entry.name}/`);
        continue;
      }
      if (entry.name !== 'index.html') continue;
      const html = await readFile(full, 'utf8');
      /*
        A class list and not a substring. `class="grid"` alone would miss `class="grid tight"`,
        and a loose /\bgrid\b/ would match `foot-grid`, because a hyphen is a word boundary.
        foot-grid has no painted background so it cannot hole, and pulling it in here would
        make this check report on a grid it has nothing to say about.
      */
      const hasGrid = [...html.matchAll(/class="([^"]*)"/g)].some((m) =>
        m[1].split(/\s+/).includes('grid')
      );
      if (hasGrid) {
        found.push([prefix === '' ? 'home' : prefix.replace(/\/$/, ''), `/${prefix}`]);
      }
    }
  };

  await walk('dist', '');
  return found;
}

const GRID_PAGES = await pagesWithGrids();

for (const [name, url] of GRID_PAGES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 1200 } });
    await page.goto(base + url, { waitUntil: 'networkidle' });

    const grids = await page.evaluate(() => {
      const out = [];

      for (const grid of document.querySelectorAll('.grid')) {
        const cs = getComputedStyle(grid);
        const tracks = cs.gridTemplateColumns.split(' ').filter(Boolean);
        const cols = tracks.length;
        const colW = parseFloat(tracks[0]) || 0;
        const gap = parseFloat(cs.columnGap) || 0;
        if (!cols || !colW) continue;

        const cards = [...grid.children]
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              top: r.top,
              bottom: r.bottom,
              height: r.height,
              span: Math.max(1, Math.round((r.width + gap) / (colW + gap))),
              label: (el.querySelector('h3')?.textContent || el.className || '').trim().slice(0, 44)
            };
          })
          .filter((c) => c.height > 0);
        if (!cards.length) continue;

        /* Group into rows by top edge, with a couple of pixels of tolerance for rounding. */
        const rows = [];
        for (const c of [...cards].sort((a, b) => a.top - b.top)) {
          const row = rows.find((r) => Math.abs(r.top - c.top) <= 2);
          if (row) row.cards.push(c);
          else rows.push({ top: c.top, cards: [c] });
        }

        const holes = [];
        const short = [];
        for (const [i, row] of rows.entries()) {
          const spans = row.cards.reduce((n, c) => n + c.span, 0);
          if (spans < cols) holes.push({ row: i + 1, missing: cols - spans, spans });

          const rowBottom = Math.max(...row.cards.map((c) => c.bottom));
          for (const c of row.cards) {
            const below = rowBottom - c.bottom;
            if (below > 1) {
              short.push({ row: i + 1, label: c.label, below: Math.round(below) });
            }
          }
        }

        out.push({ cols, cards: cards.length, rows: rows.length, holes, short });
      }

      return out;
    });

    for (const g of grids) {
      cellsMeasured += g.cards;

      for (const h of g.holes) {
        cellFailures.push(
          `${name} at ${width}px: row ${h.row} of a ${g.cols} column grid fills only ` +
            `${h.spans} of ${g.cols} columns, so ${h.missing} cell` +
            `${h.missing === 1 ? '' : 's'} of divider colour ` +
            `${h.missing === 1 ? 'is' : 'are'} drawn as a solid block. The grid paints ` +
            `var(--line) behind cards that paint var(--bg), so an unoccupied cell is not ` +
            `empty space, it is a coloured rectangle.`
        );
      }

      for (const s of g.short) {
        cellFailures.push(
          `${name} at ${width}px: the card "${s.label}" ends ${s.below}px above the bottom ` +
            `of row ${s.row}, so a band of divider colour shows under it. A card has to ` +
            `cover its own cell, because the seams are grid background rather than borders.`
        );
      }
    }

    await page.close();
  }
}

failures.push(...cellFailures);

/*
  The topic nav keeps one row and reveals fewer destinations as the viewport narrows.
  Dev disasters stays visible at the end rather than being sacrificed with the
  lower-priority topics. Measure the geometry so clipping, scrolling, or wrapping
  cannot make a nominally visible topic unreachable.
*/
const NAV_WIDTHS = [1024, 640, 560, 480, 420, 390, 360];
let navMeasured = 0;
let previousVisibleCount;

for (const width of NAV_WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });

  const nav = await page.evaluate(() => {
    const list = document.querySelector('.nav');
    if (!list) return null;
    const box = list.getBoundingClientRect();
    const items = [...list.querySelectorAll('li')]
      .filter((li) => li.getClientRects().length > 0)
      .map((li) => {
        const r = li.getBoundingClientRect();
        return { label: li.textContent.trim(), right: r.right, left: r.left, top: r.top };
      });
    return {
      count: items.length,
      labels: items.map((i) => i.label),
      /* One pixel of tolerance, because a subpixel layout can round a flush edge over. */
      clipped: items.filter((i) => i.right > box.right + 1 || i.left < box.left - 1).map((i) => i.label),
      scrollable: list.scrollWidth > list.clientWidth + 1,
      rows: new Set(items.map((i) => Math.round(i.top))).size
    };
  });

  await page.close();

  if (!nav) {
    failures.push(`the front page at ${width}px has no .nav, so the topic reach check proved nothing.`);
    continue;
  }

  navMeasured += nav.count;

  if (previousVisibleCount !== undefined && nav.count > previousVisibleCount) {
    failures.push(
      `front page at ${width}px shows ${nav.count} topics after the wider viewport showed ` +
        `${previousVisibleCount}. Topic visibility must only decrease as space tightens.`
    );
  }
  previousVisibleCount = nav.count;

  if (nav.labels.at(-1) !== 'dev disasters') {
    failures.push(
      `front page at ${width}px ends its visible topic nav with "${nav.labels.at(-1)}" ` +
        `instead of dev disasters.`
    );
  }

  if (nav.rows !== 1) {
    failures.push(`front page at ${width}px wraps its visible topics across ${nav.rows} rows.`);
  }

  if (nav.clipped.length) {
    failures.push(
      `front page at ${width}px: ${nav.clipped.length} topic` +
        `${nav.clipped.length === 1 ? '' : 's'} sit outside the nav box (${nav.clipped.join(', ')}). ` +
        `A topic a phone cannot reach is a section of the site that does not exist on a phone.`
    );
  }

  if (nav.scrollable) {
    failures.push(
      `front page at ${width}px: the nav scrolls horizontally instead of showing fewer topics.`
    );
  }
}

if (previousVisibleCount === undefined || previousVisibleCount >= 8) {
  failures.push('the narrowest viewport did not reduce the number of visible topics.');
}

/*
  The reading layout is also a shell, so it has to keep the shell's inline gutter.

  A padding shorthand on .read erased .shell's padding-inline at every width above the
  phone breakpoint. At 1200px, which is also what a zoomed desktop commonly resolves to,
  the metadata rail touched the viewport edge. At the 1080px stack breakpoint the article
  did the same. Measure the geometry rather than the declaration so another selector can
  never recreate the defect unnoticed.
*/
const READ_WIDTHS = [1200, 1080, 720, 390];
let readLayoutsMeasured = 0;

for (const width of READ_WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.goto(
    `${base}/aspnetcore/tame-configuration-in-aspnet-core-with-ivalidateoptions/`,
    { waitUntil: 'networkidle' }
  );

  const reading = await page.evaluate(() => {
    const shell = document.querySelector('.shell.read');
    const rail = shell?.querySelector(':scope > .rail');
    const article = shell?.querySelector(':scope > article');
    if (!shell || !rail || !article) return null;

    const shellBox = shell.getBoundingClientRect();
    const railBox = rail.getBoundingClientRect();
    const articleBox = article.getBoundingClientRect();
    const style = getComputedStyle(shell);

    return {
      paddingLeft: parseFloat(style.paddingLeft),
      paddingRight: parseFloat(style.paddingRight),
      contentLeft: shellBox.left + parseFloat(style.paddingLeft),
      contentRight: shellBox.right - parseFloat(style.paddingRight),
      railLeft: railBox.left,
      railRight: railBox.right,
      articleLeft: articleBox.left,
      articleRight: articleBox.right
    };
  });

  await page.close();

  if (!reading) {
    failures.push(
      `article at ${width}px has no .shell.read with direct rail and article children, ` +
        `so the reading gutter check proved nothing.`
    );
    continue;
  }

  readLayoutsMeasured += 1;
  if (reading.paddingLeft < 20 || reading.paddingRight < 20) {
    failures.push(
      `article at ${width}px has ${reading.paddingLeft}px left and ` +
        `${reading.paddingRight}px right shell padding. Reading pages need at least a ` +
        `20px gutter so the rail or article never touches the viewport edge.`
    );
  }

  const tolerance = 1;
  const outside =
    reading.railLeft < reading.contentLeft - tolerance ||
    reading.railRight > reading.contentRight + tolerance ||
    reading.articleLeft < reading.contentLeft - tolerance ||
    reading.articleRight > reading.contentRight + tolerance;
  if (outside) {
    failures.push(
      `article at ${width}px places the rail or article outside the shell's padded content ` +
        `box (${Math.round(reading.contentLeft)}-${Math.round(reading.contentRight)}px).`
    );
  }
}

await browser.close();
server.close();

if (failures.length) {
  /*
    The heading has to cover both halves of this gate. It said "thumbnails are being
    cropped" while reporting a dead space failure, which sent the reader looking at
    aspect-ratio for a problem that was a missing summary.
  */
  console.error('layout problems:\n' + failures.map((f) => `  ${f}`).join('\n'));
  if (cropped) console.error('\n' + cropHint);
  process.exit(1);
}

if (measured === 0) {
  console.error('no thumbnails were measured, so this gate proved nothing. Check the selectors.');
  process.exit(1);
}

if (cellsMeasured === 0) {
  /*
    Fail closed. This now covers two ways of proving nothing: the .grid selector no longer
    matching anything on a page, and the discovery walk finding no pages to visit. Both end
    with a gate that reports clean over a site it never looked at.
  */
  console.error(
    `no grid cells were measured, so the cell fill check proved nothing. ` +
      `The walk over dist found ${GRID_PAGES.length} page(s) carrying a grid. ` +
      `Check the .grid selector and the class list match in pagesWithGrids.`
  );
  process.exit(1);
}

if (navMeasured === 0) {
  console.error('no nav topics were measured, so the topic reach check proved nothing.');
  process.exit(1);
}

if (readLayoutsMeasured === 0) {
  console.error('no reading layouts were measured, so the article gutter check proved nothing.');
  process.exit(1);
}

console.log(
  `layout is clean across ${measured} thumbnail measurements, ${cellsMeasured} grid ` +
    `cells on ${GRID_PAGES.length} page(s) found by walking dist and ${navMeasured} visible ` +
    `topic placements across responsive widths, ${readLayoutsMeasured} reading layouts, the wide card's thumb ` +
    `held its ratio with a 2000px neighbour, and the lead card has ` +
    `${deadSpace.trailing}px below its last text.` +
    provenanceSuffix()
);
