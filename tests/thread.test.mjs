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
  emptyLine,
  nameOwnHeld,
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

/*
  Held bylines.

  comments_public strips the name off anything not visible, and readThread hands a held
  comment back to the one person allowed to read it. Those two together signed somebody's
  own words "somebody", under an Edit button, which is what got reported.
*/
const held = (over = {}) => ({
  ...comment('h'),
  status: 'held',
  held: true,
  mine: true,
  authorHandle: null,
  authorName: null,
  authorAvatar: null,
  ...over
});

const reader = (over = {}) => ({
  id: 'me',
  handle: 'a-okoro',
  name: 'Ada Okoro',
  avatar: 'https://example.com/a.png',
  isPrivate: false,
  ...over
});

test('the author of a held comment is named on it rather than left as somebody', () => {
  const [row] = nameOwnHeld([held()], reader());
  assert.equal(row.authorHandle, 'a-okoro');
  assert.equal(row.authorName, 'Ada Okoro');
  assert.equal(row.authorAvatar, 'https://example.com/a.png');
});

test('somebody else with a held comment in the thread is still not named', () => {
  /* It never reaches them, but if the filter ever changed this is the line that keeps
     the hold from becoming a list of who is waiting on a look. */
  const [row] = nameOwnHeld([held({ mine: false })], reader());
  assert.equal(row.authorHandle, null);
});

test('going private hides your name from your own held comment too', () => {
  /* Held has to read the way it will read once it clears, and once it clears the view
     hides a private byline from everybody. Anything else is a preview of a page that
     does not exist. */
  const [row] = nameOwnHeld([held()], reader({ isPrivate: true }));
  assert.equal(row.authorHandle, null);
  assert.equal(row.authorAvatar, null);
});

test('a signed out reader names nothing', () => {
  const [row] = nameOwnHeld([held()], null);
  assert.equal(row.authorHandle, null);
});

test('a tombstone of your own stays unnamed, held or not', () => {
  /* The tombstone exists so that nobody carries a public marker saying this specific
     person had something taken down. Handing the name back would undo it. */
  const rows = nameOwnHeld(
    [held({ status: 'hidden', held: false }), held({ status: 'deleted', held: false })],
    reader()
  );
  for (const row of rows) assert.equal(row.authorHandle, null);
});

test('a visible comment keeps the byline the view gave it', () => {
  const row = { ...comment('v'), mine: true, authorHandle: 'from-the-view' };
  const [out] = nameOwnHeld([row], reader());
  assert.equal(out.authorHandle, 'from-the-view');
});

/* The empty thread line ------------------------------------------------------------- */

test('an empty thread with no badge to offer just invites a first reply', () => {
  assert.equal(emptyLine(null), 'No replies yet. Yours would be the first.');
});

test('one away names the badge without counting it out', () => {
  assert.equal(
    emptyLine({ label: 'First Reply I', unit: 'reply', remaining: 1 }),
    'No replies yet. Yours would be the first, and it earns you First Reply I.'
  );
});

test('further out quotes the number and the unit it counts', () => {
  assert.equal(
    emptyLine({ label: 'First Reply II', unit: 'thread', remaining: 21 }),
    'No replies yet. Yours would be the first, and you are 21 threads off First Reply II.'
  );
});

test('a counter with no noun still reads as a sentence', () => {
  assert.equal(
    emptyLine({ label: 'Raider', unit: null, remaining: 3 }),
    'No replies yet. Yours would be the first, and you are 3 off Raider.'
  );
});
