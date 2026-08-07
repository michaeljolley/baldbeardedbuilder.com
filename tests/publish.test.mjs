/*
  The publish clock.

  Two things worth pinning down, because both were silently wrong at some point in the
  port: the hour is 8am Central and not midnight, and the offset follows DST rather than
  being hardcoded to one of the two values.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { publishTime, isPublished } from '../src/lib/publish.ts';

test('a winter date publishes at 8am CST, which is 14:00 UTC', () => {
  assert.equal(publishTime(new Date('2026-01-15')).toISOString(), '2026-01-15T14:00:00.000Z');
});

test('a summer date publishes at 8am CDT, which is 13:00 UTC', () => {
  assert.equal(publishTime(new Date('2026-07-15')).toISOString(), '2026-07-15T13:00:00.000Z');
});

test('the day DST starts still publishes at 8am local', () => {
  /* 8 March 2026 is the second Sunday in March. The switch happens at 2am, five hours
     before publish, so this date is already on summer time. */
  assert.equal(publishTime(new Date('2026-03-08')).toISOString(), '2026-03-08T13:00:00.000Z');
});

test('the day DST ends still publishes at 8am local', () => {
  assert.equal(publishTime(new Date('2026-11-01')).toISOString(), '2026-11-01T14:00:00.000Z');
});

test('a post is not live at one minute to eight', () => {
  assert.equal(isPublished(new Date('2026-01-15'), new Date('2026-01-15T13:59:00Z')), false);
});

test('a post is live at eight on the dot', () => {
  assert.equal(isPublished(new Date('2026-01-15'), new Date('2026-01-15T14:00:00Z')), true);
});

test('a post dated tomorrow is not live today', () => {
  assert.equal(isPublished(new Date('2026-01-16'), new Date('2026-01-15T23:00:00Z')), false);
});
