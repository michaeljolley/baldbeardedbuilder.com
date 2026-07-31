/*
  Threading and the moderation rules.

  Everything that touches Supabase is left to the soak, because a mocked database that
  agrees with itself proves nothing. What is worth pinning down here is the ordering,
  because a thread that puts a reply under the wrong parent reads as somebody answering a
  question nobody asked, and the edit window, because it is the one rule where being
  wrong by a factor of sixty is invisible until somebody rewrites an old comment.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  order,
  initials,
  hasBody,
  withinEditWindow,
  AUTO_HIDE_REPORTS,
  BODY_MAX,
  COMMENTS_PER_DAY,
  COMMENTS_PER_HOUR,
  EDIT_WINDOW_MINUTES
} from '../src/lib/thread.ts';

function comment(id, parentId = null) {
  return {
    id,
    parentId,
    createdAt: '2026-01-01T00:00:00.000Z',
    editedAt: null,
    status: 'visible',
    html: null,
    tombstone: null,
    authorHandle: id,
    authorName: null,
    authorAvatar: null,
    likes: 0,
    mine: false,
    held: false
  };
}

test('a reply follows its parent rather than its own timestamp', () => {
  const out = order([
    comment('a'),
    comment('b'),
    comment('a1', 'a'),
    comment('b1', 'b')
  ]);
  assert.deepEqual(out.map((c) => c.id), ['a', 'a1', 'b', 'b1']);
});

test('several replies to one comment keep the order they arrived in', () => {
  const out = order([comment('a'), comment('a1', 'a'), comment('a2', 'a'), comment('a3', 'a')]);
  assert.deepEqual(out.map((c) => c.id), ['a', 'a1', 'a2', 'a3']);
});

test('a reply whose parent is not readable still appears, at the end', () => {
  /* Happens when somebody replies to a comment that later gets held or hidden. Dropping
     the reply would delete somebody else's words because of what a third person wrote. */
  const out = order([comment('a'), comment('orphan', 'gone')]);
  assert.deepEqual(out.map((c) => c.id), ['a', 'orphan']);
});

test('an empty thread orders to an empty thread', () => {
  assert.deepEqual(order([]), []);
});

test('nothing is ever duplicated or lost by the ordering', () => {
  const input = [comment('a'), comment('b'), comment('a1', 'a'), comment('x', 'nope')];
  const out = order(input);
  assert.equal(out.length, input.length);
  assert.equal(new Set(out.map((c) => c.id)).size, input.length);
});

test('initials come from the display name when there is one', () => {
  assert.equal(initials('Michael Jolley', 'michaeljolley'), 'MJ');
});

test('a one word name gives two letters rather than one', () => {
  assert.equal(initials('Prisma', 'prisma'), 'PR');
});

test('a handle stands in when there is no display name', () => {
  assert.equal(initials(null, 'a-okoro'), 'AO');
});

test('somebody with neither still gets something drawn', () => {
  assert.equal(initials(null, null), '?');
  assert.equal(initials('   ', ''), '?');
});

test('the edit window is open inside it and shut outside it', () => {
  const made = new Date('2026-01-01T12:00:00.000Z');
  const inside = made.getTime() + 14 * 60 * 1000;
  const outside = made.getTime() + 16 * 60 * 1000;

  assert.equal(withinEditWindow(made.toISOString(), inside), true);
  assert.equal(withinEditWindow(made.toISOString(), outside), false);
});

test('the edit window closes exactly on the boundary, not a minute later', () => {
  const made = new Date('2026-01-01T12:00:00.000Z');
  const edge = made.getTime() + EDIT_WINDOW_MINUTES * 60 * 1000;
  assert.equal(withinEditWindow(made.toISOString(), edge), true);
  assert.equal(withinEditWindow(made.toISOString(), edge + 1), false);
});

test('the settled moderation numbers are the settled moderation numbers', () => {
  /* These are decisions rather than constants. If one of them moves, it should move
     because somebody decided it should, and this test is what makes that visible. */
  assert.equal(COMMENTS_PER_HOUR, 10);
  assert.equal(COMMENTS_PER_DAY, 30);
  assert.equal(EDIT_WINDOW_MINUTES, 15);
  assert.equal(AUTO_HIDE_REPORTS, 3);
  assert.equal(BODY_MAX, 10_000);
});

test('the hourly limit is under the daily one, so the daily one is reachable', () => {
  assert.ok(COMMENTS_PER_HOUR < COMMENTS_PER_DAY);
  assert.ok(COMMENTS_PER_DAY < COMMENTS_PER_HOUR * 24);
});

test('a reader counts exactly the rows they can read', () => {
  /* The rail count and the row branch both come from hasBody. They used to be written
     out separately and drifted, which showed up as the author of a held comment reading
     six bodies under a rail that said five. */
  const rows = [
    { status: 'visible', mine: false },
    { status: 'visible', mine: true },
    { status: 'hidden', mine: false },
    { status: 'deleted', mine: false },
    { status: 'held', mine: false },
    { status: 'held', mine: true }
  ];

  assert.equal(rows.filter(hasBody).length, 3);
});

test('a held comment is a reply to its author and nothing to anybody else', () => {
  const held = { status: 'held', mine: true };
  assert.equal(hasBody(held), true);
  assert.equal(hasBody({ ...held, mine: false }), false);
});

test('a tombstone is never a reply, whichever kind it is', () => {
  /* It holds its slot so the thread keeps its shape, but nobody scrolling past would
     count it, so nothing that prints a number may either. */
  assert.equal(hasBody({ status: 'hidden', mine: false }), false);
  assert.equal(hasBody({ status: 'hidden', mine: true }), false);
  assert.equal(hasBody({ status: 'deleted', mine: false }), false);
  assert.equal(hasBody({ status: 'deleted', mine: true }), false);
});
