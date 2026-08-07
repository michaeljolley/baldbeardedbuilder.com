/*
  The dev disaster row logic, executed rather than read.

  Everything in here was previously covered only by tests that read source with a regular
  expression. `load()` opens with `if (!supabaseWritable) return []`, there are no v2 keys,
  so that early return has been the only branch any gate ever took. A source assertion
  proves a line exists. It does not prove the line does what its comment claims, and on this
  branch the gap between those two has been the whole story.

  So this hands the row logic real rows. What is still unproven after this file is the query
  itself and the shape Supabase hands back, which needs the project ref and nothing else
  will substitute for it.

  Warnings are captured rather than printed, because a test suite that prints five warnings
  every run teaches everybody to ignore warnings, and because what the warning says is part
  of what is being asserted.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  authorIdsToResolve,
  shapeDisasters,
  tellerFor,
  tellersFromProfiles
} from '../src/lib/disaster-rows.ts';

const SEVERITY_IDS = ['error', 'warning', 'info'];

const row = (over = {}) => ({
  id: 1,
  slug: 'a-story',
  severity: 'error',
  title: 'Something broke',
  line: 'It went badly.',
  body: 'One paragraph.',
  is_anonymous: false,
  author_id: 'u1',
  published_at: '2026-07-01T00:00:00Z',
  featured_at: null,
  ...over
});

const shape = async (rows, tellers = new Map(), over = {}) => {
  const warnings = [];
  const out = await shapeDisasters(rows, tellers, {
    severityIds: SEVERITY_IDS,
    likesById: new Map(),
    repliesById: new Map(),
    warn: (m) => warnings.push(m),
    ...over
  });
  return { out, warnings };
};

test('a private profile is named anonymous rather than by handle', () => {
  /*
    Occurrence fifteen, and the first time the fix has actually run. tellersFor reads through
    the service key, which bypasses RLS, so this restates the public read policy on profiles:
    using (is_private = false and deleted_at is null).
  */
  const tellers = tellersFromProfiles([
    { id: 'u1', handle: 'open', is_private: false, deleted_at: null },
    { id: 'u2', handle: 'hidden', is_private: true, deleted_at: null },
    { id: 'u3', handle: 'gone', is_private: false, deleted_at: '2026-07-01T00:00:00Z' }
  ]);

  assert.deepEqual(tellers.get('u1'), { shown: 'handle', handle: 'open' });
  assert.deepEqual(tellers.get('u2'), { shown: 'anonymous', why: 'private' });
  assert.deepEqual(tellers.get('u3'), { shown: 'anonymous', why: 'private' });
});

test('a hidden profile stays in the map rather than being dropped', () => {
  /*
    The predicate is applied over the returned rows and not in the .in() filter, so that a
    private profile is present and marked rather than absent. An absent row is the same
    shape as a profile that does not exist, and one of those is a decision while the other
    is damage.
  */
  const tellers = tellersFromProfiles([{ id: 'u2', handle: 'hidden', is_private: true, deleted_at: null }]);
  assert.equal(tellers.has('u2'), true, 'a private profile was dropped, so it is now indistinguishable from a missing one');
});

test('a failed lookup draws no byline and says so', () => {
  const warnings = [];
  const teller = tellerFor(row({ author_id: 'nobody' }), new Map(), (m) => warnings.push(m));

  assert.deepEqual(teller, { shown: 'nothing' });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /matched no profile/);
  assert.match(
    warnings[0],
    /misreport a choice/,
    'the warning no longer says why this is not drawn as anonymous, which is the whole ' +
      'distinction the Teller union exists to keep'
  );
});

test('chosen anonymity and enforced anonymity stay distinguishable', () => {
  const chosen = tellerFor(row({ is_anonymous: true }), new Map(), () => {});
  const enforced = tellersFromProfiles([
    { id: 'u1', handle: 'hidden', is_private: true, deleted_at: null }
  ]).get('u1');

  assert.deepEqual(chosen, { shown: 'anonymous', why: 'chosen' });
  assert.deepEqual(enforced, { shown: 'anonymous', why: 'private' });
  assert.notDeepEqual(chosen, enforced, 'the two reasons collapsed into one value, so the union no longer records which happened');
});

test('an anonymous story asks for no profile at all', () => {
  const ids = authorIdsToResolve([
    row({ id: 1, is_anonymous: true, author_id: 'u1' }),
    row({ id: 2, is_anonymous: false, author_id: 'u2' }),
    row({ id: 3, is_anonymous: false, author_id: 'u2' }),
    row({ id: 4, is_anonymous: false, author_id: null })
  ]);
  assert.deepEqual(ids, ['u2'], 'anonymous rows must not send their author id to the profiles query');
});

test('an unknown severity is left off the site and reported with its id', async () => {
  const { out, warnings } = await shape([row({ id: 7, severity: 'catastrophe' })]);

  assert.equal(out.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Dev disaster 7/, 'the warning does not name the row, so nobody can find it');
  assert.match(warnings[0], /catastrophe/);
});

test('an incomplete published row is left off rather than half drawn', async () => {
  for (const missing of ['slug', 'title', 'line', 'body', 'published_at']) {
    const { out, warnings } = await shape([row({ [missing]: null })]);
    assert.equal(out.length, 0, `a row with no ${missing} was drawn anyway`);
    assert.match(warnings[0], /published but incomplete/);
  }
});

test('one bad row does not take the rest of the wall with it', async () => {
  const { out } = await shape([
    row({ id: 1, slug: 'good', published_at: '2026-07-01T00:00:00Z' }),
    row({ id: 2, severity: 'nonsense' }),
    row({ id: 3, slug: 'also-good', published_at: '2026-07-02T00:00:00Z' })
  ]);

  assert.deepEqual(
    out.map((d) => d.id),
    [3, 1],
    'skip and warn is meant to drop one row, not truncate the wall at the first bad one'
  );
});

test('stories come back newest first whatever order the rows arrived in', async () => {
  const { out } = await shape([
    row({ id: 1, published_at: '2026-01-01T00:00:00Z' }),
    row({ id: 2, published_at: '2026-07-01T00:00:00Z' }),
    row({ id: 3, published_at: '2026-03-01T00:00:00Z' })
  ]);
  assert.deepEqual(out.map((d) => d.id), [2, 3, 1]);
});

test('a story body is rendered from markdown rather than left as plain paragraphs', async () => {
  const { out } = await shape([row({ body: 'One **bold** paragraph.\n\nAnd a second one.' })]);
  assert.equal(out[0].body, '<p>One <strong>bold</strong> paragraph.</p><p>And a second one.</p>');
});

test('a heading in a story body is demoted the same way a heading in a comment is', async () => {
  const { out } = await shape([row({ body: '# Not a page title' })]);
  assert.equal(out[0].body, '<p><strong>Not a page title</strong></p>');
});

test('counts default to zero rather than undefined', async () => {
  const { out } = await shape([row({ id: 42 })], new Map(), {
    likesById: new Map([['42', 11]]),
    repliesById: new Map()
  });

  assert.equal(out[0].likes, 11);
  assert.equal(out[0].replies, 0, 'a story nobody has replied to must read zero, not undefined');
});

test('the url is built from the slug and stays under dev-disasters', async () => {
  /*
    A disaster never belongs to a topic. If this ever starts reading a topic field, the
    whole URL scheme decision has been undone somewhere upstream.
  */
  const { out } = await shape([row({ slug: 'the-time-i-dropped-prod' })]);
  assert.equal(out[0].url, '/dev-disasters/the-time-i-dropped-prod/');
});

test('featured_at becomes a date or null, never an invalid date', async () => {
  const { out } = await shape([
    row({ id: 1, featured_at: '2026-07-15T00:00:00Z' }),
    row({ id: 2, featured_at: null, published_at: '2026-06-01T00:00:00Z' })
  ]);

  assert.equal(out.find((d) => d.id === 1).featuredAt.toISOString(), '2026-07-15T00:00:00.000Z');
  assert.equal(out.find((d) => d.id === 2).featuredAt, null);
});

test('an empty read produces an empty wall and no warnings', async () => {
  const { out, warnings } = await shape([]);
  assert.deepEqual(out, []);
  assert.deepEqual(warnings, []);
});
