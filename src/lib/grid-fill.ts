/*
  Decision 106 and 108. HOW MANY COLUMNS THE LAST CARD HAS TO COVER.

  .grid paints var(--line) and each card paints var(--bg) over its own cell, so the seams
  are background showing through one pixel gaps. A cell with no card in it is therefore not
  empty space, it is a solid rectangle of divider colour on the front page.

  The lead spans two columns and every other pick spans one, so whether the rail tiles
  depends on how many picks survive the draft filter. At three columns it tiles when
  count + 1 divides by three, at two columns when the picks after the lead are even, and
  the counts that satisfy both are the ones congruent to five modulo six: 5, 11, 17. That is
  a coincidence for any given rail rather than a property of it, and it is one config edit
  away from breaking, so nothing is left depending on it.

  Instead the last card takes whatever is left over. CSS cannot count its own children, so
  the two spans are worked out here and inherited down as custom properties on the grid.
  Both come out as 1 for a rail that already tiles, which costs nothing.

  This is its own module rather than a function in starters.ts because starters.ts imports
  src/config/site, which node cannot resolve extensionless under --test. Same reason
  ownership.ts sits beside profiles.ts. A rule worth testing goes somewhere a test can
  import without dragging the whole content pipeline in behind it.

  Not defined below two cards, which starterItems already refuses to return.
*/
export function fillSpans(count: number): { three: number; two: number } {
  /* Three columns: the lead takes two, so the rail occupies count + 1 of them. */
  const three = 1 + ((3 - ((count + 1) % 3)) % 3);

  /* Two columns: the lead fills a row on its own, leaving the rest to pair up. */
  const two = 1 + ((count - 1) % 2);

  return { three, two };
}
