/*
  A markdown body that opens with its own title used to put a second h1 on the page.

  Three articles in the catalogue start with a `# ` line restating the title, so the built
  page carried two level one headings: the one the layout draws from frontmatter, and a
  differently worded copy of it a few lines below. Two document titles is not an outline a
  reader or a screen reader can act on, and the page h1 is the one the site controls.

  This is the same ruling src/lib/markdown.ts already makes for comments, where headings
  become bold paragraphs so a comment cannot inject an h1 into a page that has one. That
  reasoning was written down in one renderer and never applied to the other, which is why
  the defect only ever existed for markdown that came through Astro.

  It shifts every heading in the document rather than only the h1, and that is the whole
  point. Renaming h1 to h2 alone reads fine against these three, because each of them uses
  h1 once and h2 for its sections. It is wrong against a body that alternates h1 sections
  with h2 subsections: those collapse into one level and the structure is silently gone.
  Shifting the whole document preserves every relationship, so the transform cannot invent
  an outline no matter what a future post does. If a body carries its own title, its h2s
  really are one level deeper than a body whose top level is h2.

  It fixes nothing when there is no h1, which is 47 of the 50 articles and every other
  collection, so this is inert on almost everything it runs over.

  Written against hast directly rather than pulling in unist-util-visit, because the whole
  traversal is six lines and a dependency added for six lines is a dependency to keep
  current forever.
*/

const LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

/**
  @param {any} node
  @param {(el: any) => void} fn
*/
function walk(node, fn) {
  if (node && node.type === 'element') fn(node);
  for (const child of node?.children ?? []) walk(child, fn);
}

export function rehypeDemoteHeadings() {
  /** @param {any} tree */
  return (tree) => {
    /** @type {any[]} */
    const headings = [];
    walk(tree, (el) => {
      if (LEVELS.includes(el.tagName)) headings.push(el);
    });

    if (!headings.some((el) => el.tagName === 'h1')) return;

    /*
      Clamped at h6 because there is no h7. A body deep enough to hit the clamp has two
      levels that were distinct and are now the same, which is a loss, and it is a smaller
      loss than emitting a tag no browser has an outline position for.
    */
    for (const el of headings) {
      const next = LEVELS.indexOf(el.tagName) + 1;
      el.tagName = LEVELS[Math.min(next, LEVELS.length - 1)];
    }
  };
}
