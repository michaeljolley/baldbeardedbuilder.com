/*
  Every id a page points at has to exist on that page.

  Found by accident, which is the part worth writing down. An edit in progress deleted a
  label element out of ShareMenu.astro and left the aria-labelledby that named it. The
  build did not care, 50 article pages shipped a reference to an id that was not there,
  and the accessibility gate reported clean across 270 audits with the broken markup in
  its audited scope.

  The gate was not wrong. axe checks aria-labelledby under aria-valid-attr-value, and a
  reference to a missing element is only a violation when the element needs an accessible
  name to be usable. The element here is a ul, which is role=list, and a list is perfectly
  usable unnamed. So axe looked straight at it and correctly said nothing.

  That is the whole reason this file exists. A dangling IDREF is a defect whether or not
  the host element required a name: the author wrote a relationship and the page does not
  carry it. axe polices the subset that hurts immediately. Nothing was policing the rest.

  It reads dist rather than src on purpose. A reference and the id it names are routinely
  authored in different components, sometimes in different phases of the build, so the
  only artifact that knows whether the two ever met is the page that shipped.

  Measured at the commit this landed on: 584 aria-labelledby, 102 aria-controls, 160
  same page href fragments and 17 label for, across 102 pages, every one of them
  resolving. So this is not a gate written to a comfortable subset. It covers every
  mechanism the site actually uses and starts from zero failures.
*/

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DIST = path.resolve('dist');

/*
  Space separated ID lists. All of them, not just the ones in use today, because the cost
  of covering an attribute nobody has written yet is one array entry and the cost of
  missing it is another silent reference.
*/
const IDREF_LIST_ATTRS = [
  'aria-labelledby',
  'aria-describedby',
  'aria-controls',
  'aria-owns',
  'aria-details',
  'aria-errormessage',
  'aria-flowto',
];

function htmlFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const routeOf = (file) =>
  '/' + path.relative(DIST, file).replaceAll('\\', '/').replace(/index\.html$/, '');

if (!fs.existsSync(DIST)) {
  console.error('check:aria needs a build. Run pnpm build first.');
  process.exit(1);
}

const pages = htmlFiles(DIST);
const problems = [];
let references = 0;
let duplicateIds = 0;

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeOf(file);

  /*
    Duplicates are collected while the set is being built rather than in a second pass,
    because a duplicated id does not break a reference, it makes the reference ambiguous.
    Same family, and free to see from here.
  */
  const ids = new Set();
  for (const m of html.matchAll(/\sid="([^"]*)"/g)) {
    if (m[1] === '') continue;
    if (ids.has(m[1])) {
      duplicateIds += 1;
      problems.push(`${route}  duplicate id="${m[1]}"`);
    }
    ids.add(m[1]);
  }

  const check = (attr, token) => {
    references += 1;
    if (!ids.has(token)) problems.push(`${route}  ${attr}="${token}" names no element on the page`);
  };

  for (const attr of IDREF_LIST_ATTRS) {
    for (const m of html.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, 'g'))) {
      for (const token of m[1].trim().split(/\s+/).filter(Boolean)) check(attr, token);
    }
  }

  for (const m of html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)) check('label for', m[1]);

  /*
    Same page fragments, which is how the skip link works. A skip link that points at
    nothing still looks and reads correctly and simply does not skip, so it is the exact
    shape of defect nobody reports. Bare "#" is excluded because it is a deliberate no
    target, and the fragment is decoded first because Astro percent encodes non ascii
    heading ids.
  */
  for (const m of html.matchAll(/\shref="#([^"]+)"/g)) {
    let frag = m[1];
    try {
      frag = decodeURIComponent(frag);
    } catch {
      // A fragment that will not decode cannot match an id either. Let it be reported.
    }
    check('href fragment', frag);
  }
}

/*
  Fail closed. A regex that stops matching, a dist that never got built, or a rename of
  the attributes above all produce zero references, and zero references would otherwise
  read as a clean run. This is the same shape as the disclosure counter in a11y.mjs, and
  it is here for the same reason: a gate has to report how much work it did.
*/
if (references === 0) {
  console.error(`check:aria found no id references at all across ${pages.length} pages.`);
  console.error('That is a broken gate, not a clean site. Check the attribute list and the build.');
  process.exit(1);
}

if (problems.length) {
  console.error(`check:aria found ${problems.length} broken reference(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nAn element that names an id has to find it on the same page.');
  process.exit(1);
}

console.log(
  `check:aria clean across ${references} id references and ${duplicateIds} duplicate ids on ${pages.length} pages.`,
);
