/*
  The Start here rail leaves no empty cell.

  Decision 107, and the reason it is not the test that was asked for.

  The ask was to assert START_HERE.length tiles both column counts. That test would pass
  today and the front page would still have a hole in it. START_HERE holds five picks, five
  is one of the lengths that tiles, and the built page renders four, because one pick is
  dated three days out and the draft filter drops it. A gate on the config would have
  reported green over a visible defect, which is the failure this branch keeps cataloguing.

  So the rule is enforced on the number of cards that actually render, and it is enforced by
  making any count fill its row rather than by refusing the counts that do not. fillSpans
  gives the last card whatever columns are left over. A rail of four tiles, a rail of six
  tiles, and Michael can add a pick to a config file without reading this file first.

  The arithmetic, for anybody checking the numbers below. The lead spans two columns and
  every other pick spans one.

    three columns: the rail occupies count + 1 cells
    two columns:   the lead fills a row alone, the remaining count - 1 pair up
    one column:    everything fills, so there is nothing to compute

  The counts that tile with no help are the ones congruent to five modulo six.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fillSpans } from '../src/lib/grid-fill.ts';

/* What the rail occupies at three columns once the last card has taken up the slack. */
const spansAtThree = (count) => count + 1 + (fillSpans(count).three - 1);

/* At two columns the lead has a row to itself, so only the rest have to pair up. */
const spansAtTwo = (count) => count - 1 + (fillSpans(count).two - 1);

test('every rail length from two to twenty fills its rows at three columns', () => {
  const broken = [];
  for (let n = 2; n <= 20; n++) {
    if (spansAtThree(n) % 3 !== 0) broken.push(n);
  }
  assert.deepEqual(
    broken,
    [],
    `these rail lengths leave an empty cell at three columns: ${broken.join(', ')}. ` +
      'The grid paints var(--line) behind cards that paint var(--bg), so an empty cell is ' +
      'a solid rectangle of divider colour on the front page, not blank space. Widen the ' +
      'last card in fillSpans rather than restricting how many picks START_HERE may hold.'
  );
});

test('every rail length from two to twenty fills its rows at two columns', () => {
  const broken = [];
  for (let n = 2; n <= 20; n++) {
    if (spansAtTwo(n) % 2 !== 0) broken.push(n);
  }
  assert.deepEqual(
    broken,
    [],
    `these rail lengths leave an empty cell at two columns: ${broken.join(', ')}. ` +
      'Two columns is every screen from 721px to 1080px. Same defect as three columns, ' +
      'different breakpoint.'
  );
});

test('a rail that already tiles is not stretched', () => {
  /*
    Five and eleven are the lengths that need no help. If these ever came back as anything
    other than one, the last card would be spanning columns it does not need and the rail
    would be lopsided for no reason.
  */
  for (const n of [5, 11, 17]) {
    assert.deepEqual(
      fillSpans(n),
      { three: 1, two: 1 },
      `a rail of ${n} tiles on its own and should not have its last card stretched`
    );
  }
});

test('the four card rail on the front page today is covered', () => {
  /*
    Not a hypothetical. START_HERE holds five, one is dated 2026-08-03, and the draft filter
    drops it, so four render. Before this fix the built page had a hole at 1200px and at
    860px, which check-layout.mjs now measures directly.
  */
  assert.deepEqual(fillSpans(4), { three: 2, two: 2 });
});

test('the spans are never wider than the grid', () => {
  for (let n = 2; n <= 20; n++) {
    const { three, two } = fillSpans(n);
    assert.ok(three >= 1 && three <= 3, `a span of ${three} does not fit three columns`);
    assert.ok(two >= 1 && two <= 2, `a span of ${two} does not fit two columns`);
  }
});
