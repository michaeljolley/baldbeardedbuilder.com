/*
  Tests for the badge shelf.

  Nothing here touches a database. shelf.ts was split out of profiles.ts precisely so these
  could run under plain node, because the shelf is where the rules live and the rules are
  where the mistakes will be.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shapeShelf, numeral, nextStep, unitFor } from '../src/lib/shelf.ts';

const row = (id, family, tier, extra = {}) => ({
  badge_id: id,
  family,
  tier,
  name: id,
  description: `how you get ${id}`,
  category: 'presence',
  tone: 'info',
  sort_order: tier ?? 0,
  ...extra
});

const prog = (id, n, threshold, earned) => ({
  badge_id: id,
  event: 'stream:attended',
  n,
  threshold,
  earned
});

/* Numerals -------------------------------------------------------------------------- */

test('a family with one step gets no numeral', () => {
  assert.equal(numeral(1, 1), null);
});

test('a family with several steps gets roman numerals', () => {
  assert.equal(numeral(1, 4), 'I');
  assert.equal(numeral(4, 4), 'IV');
});

test('an untiered badge gets no numeral even in a big family', () => {
  assert.equal(numeral(null, 4), null);
});

test('a tier past the numeral table falls back to a digit', () => {
  assert.equal(numeral(11, 12), '11');
});

/* Progress ------------------------------------------------------------------------- */

test('progress appears only on the lowest unearned tier in a family', () => {
  const shelf = [
    row('front-row', 'front-row', 1),
    row('front-row-2', 'front-row', 2),
    row('front-row-3', 'front-row', 3)
  ];
  const progress = [
    prog('front-row', 12, 5, true),
    prog('front-row-2', 12, 15, false),
    prog('front-row-3', 12, 30, false)
  ];

  const out = shapeShelf(shelf, progress);
  const by = Object.fromEntries(out.map((b) => [b.id, b]));

  assert.equal(by['front-row'].progress, null, 'an earned badge shows no progress');
  assert.deepEqual(by['front-row-2'].progress, { n: 12, threshold: 15 });
  assert.equal(by['front-row-3'], undefined, 'a tier further out is not shown at all');
});

/* Which badges are shown at all ------------------------------------------------------ */

test('a locked tier beyond the next one is dropped rather than dimmed', () => {
  const shelf = [
    row('fr', 'front-row', 1),
    row('fr2', 'front-row', 2),
    row('fr3', 'front-row', 3),
    row('fr4', 'front-row', 4)
  ];

  const out = shapeShelf(shelf, [prog('fr', 6, 5, true), prog('fr2', 6, 15, false)]);
  assert.deepEqual(out.map((b) => b.id), ['fr', 'fr2']);
});

test('an empty shelf shows one plaque per family, not the whole catalogue', () => {
  const shelf = [
    row('fr', 'front-row', 1),
    row('fr2', 'front-row', 2),
    row('fr3', 'front-row', 3),
    row('t', 'talker', 1),
    row('t2', 'talker', 2),
    row('raider', 'raider', 1)
  ];

  const out = shapeShelf(shelf, []);
  assert.deepEqual(out.map((b) => b.id), ['fr', 't', 'raider']);
  assert.ok(out.every((b) => !b.earned));
});

test('a fully earned family still shows every step it earned', () => {
  const shelf = [row('a', 'f', 1), row('a2', 'f', 2)];
  const out = shapeShelf(shelf, [prog('a', 9, 1, true), prog('a2', 9, 5, true)]);
  assert.deepEqual(out.map((b) => b.id), ['a', 'a2']);
});

test('a threshold of one shows no progress bar', () => {
  const out = shapeShelf([row('raider', 'raider', 1)], [prog('raider', 0, 1, false)]);
  assert.equal(out[0].progress, null);
});

test('a badge nobody has started shows no progress bar', () => {
  const out = shapeShelf([row('talker', 'talker', 1)], [prog('talker', 0, 50, false)]);
  assert.equal(out[0].progress, null, 'an empty bar is decoration');
});

test('one step in is enough to show a bar', () => {
  const out = shapeShelf([row('talker', 'talker', 1)], [prog('talker', 1, 50, false)]);
  assert.deepEqual(out[0].progress, { n: 1, threshold: 50 });
});

test('an untiered badge is its own family and still gets progress', () => {
  const out = shapeShelf([row('helpful', null, null)], [prog('helpful', 4, 25, false)]);
  assert.deepEqual(out[0].progress, { n: 4, threshold: 25 });
});

test('progress survives a count that has passed the threshold but not been granted yet', () => {
  const out = shapeShelf([row('talker', 'talker', 1)], [prog('talker', 90, 50, false)]);
  assert.deepEqual(out[0].progress, { n: 90, threshold: 50 });
});

/* Shape and ordering ---------------------------------------------------------------- */

test('earned badges sort ahead of locked ones', () => {
  const shelf = [row('a', 'a', 1), row('b', 'b', 1), row('c', 'c', 1)];
  const progress = [prog('a', 0, 1, false), prog('b', 1, 1, true), prog('c', 0, 1, false)];

  const out = shapeShelf(shelf, progress);
  assert.equal(out[0].id, 'b');
  assert.ok(!out[1].earned && !out[2].earned);
});

test('a badge with no progress row is locked rather than dropped', () => {
  const out = shapeShelf([row('mystery', null, null)], []);
  assert.equal(out.length, 1);
  assert.equal(out[0].earned, false);
  assert.equal(out[0].progress, null);
});

test('rows missing an id, a name or a description are dropped', () => {
  const shelf = [
    row('good', null, null),
    { ...row('x', null, null), badge_id: null },
    { ...row('y', null, null), name: null },
    { ...row('z', null, null), description: null }
  ];

  const out = shapeShelf(shelf, []);
  assert.deepEqual(out.map((b) => b.id), ['good']);
});

test('a null category or tone falls back rather than reaching the page as null', () => {
  const out = shapeShelf([{ ...row('a', null, null), category: null, tone: null }], []);
  assert.equal(out[0].category, 'presence');
  assert.equal(out[0].tone, 'info');
});

test('an empty shelf produces an empty list rather than throwing', () => {
  assert.deepEqual(shapeShelf([], []), []);
});

test('a fully earned family shows no progress anywhere', () => {
  const shelf = [row('t', 't', 1), row('t2', 't', 2)];
  const progress = [prog('t', 900, 50, true), prog('t2', 900, 250, true)];

  const out = shapeShelf(shelf, progress);
  assert.ok(out.every((b) => b.progress === null));
  assert.ok(out.every((b) => b.earned));
});

/* The next step in one family ------------------------------------------------------- */

const step = (id, n, threshold, earned, event = 'site:comment') => ({
  badge_id: id,
  event,
  n,
  threshold,
  earned
});

const reply = [
  { ...row('first-reply', 'first-reply', 1), name: 'First Reply' },
  { ...row('helpful', 'first-reply', 2), name: 'First Reply' }
];

test('the next step is the lowest tier not earned', () => {
  const out = nextStep(reply, [
    step('first-reply', 4, 1, true),
    step('helpful', 4, 25, false, 'site:comment-thread')
  ], 'first-reply');

  assert.equal(out.id, 'helpful');
  assert.equal(out.label, 'First Reply II');
  assert.equal(out.unit, 'thread');
  assert.equal(out.remaining, 21);
});

test('nothing earned yet points at tier one', () => {
  const out = nextStep(reply, [
    step('first-reply', 0, 1, false),
    step('helpful', 0, 25, false, 'site:comment-thread')
  ], 'first-reply');

  assert.equal(out.id, 'first-reply');
  assert.equal(out.label, 'First Reply I');
  assert.equal(out.remaining, 1);
});

test('a finished family has no next step', () => {
  const out = nextStep(reply, [
    step('first-reply', 30, 1, true),
    step('helpful', 30, 25, true, 'site:comment-thread')
  ], 'first-reply');

  assert.equal(out, null);
});

test('a count past the threshold that has not been granted still reads as one away', () => {
  const out = nextStep(reply, [
    step('first-reply', 1, 1, false)
  ], 'first-reply');

  assert.equal(out.remaining, 1, 'never zero, and never negative');
});

test('a step with no counter behind it is not quoted', () => {
  const out = nextStep([row('good-neighbour', null, null)], [], 'good-neighbour');
  assert.equal(out, null);
});

test('an unknown family has no next step', () => {
  assert.equal(nextStep(reply, [], 'front-row'), null);
});

test('a single step family gets no numeral in its label', () => {
  const out = nextStep(
    [{ ...row('raider', 'raider', 1), name: 'Raider' }],
    [step('raider', 0, 1, false, 'twitch:raid')],
    'raider'
  );

  assert.equal(out.label, 'Raider');
});

test('event names turn into nouns a reader would say', () => {
  assert.equal(unitFor('site:comment'), 'reply');
  assert.equal(unitFor('site:comment-thread'), 'thread');
  assert.equal(unitFor('twitch:raid'), null, 'an unmapped counter gets no noun');
  assert.equal(unitFor(null), null);
});

test('numerals come from family size, not from how many are shown', () => {
  const shelf = [row('f', 'f', 1), row('f2', 'f', 2), row('f3', 'f', 3)];
  const out = shapeShelf(shelf, [prog('f', 5, 5, true), prog('f2', 5, 20, false)]);
  const by = Object.fromEntries(out.map((b) => [b.id, b]));

  /* f3 is dropped as a tier too far out, but it still counts towards the numerals. */
  assert.equal(by.f.numeral, 'I');
  assert.equal(by.f2.numeral, 'II');
  assert.equal(by.f3, undefined);
});
