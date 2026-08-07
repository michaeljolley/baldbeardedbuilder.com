/*
  Decision 118. The front page headline carries an accent kicker and a posted date, and
  both are claims about the calendar.

  This branch has now caught fifteen labels asserting something nobody checked, so the
  sentences get held against the dates that produce them rather than read and believed.
  Every case passes a fixed `now`, because a test that reads the clock only proves
  something about the day it ran.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { daysOld, freshnessKicker, postedOn } from '../src/lib/freshness.ts';

/* A Thursday. Every case below is relative to it. */
const NOW = new Date('2025-07-31T12:00:00Z').getTime();
const at = (iso) => new Date(iso);

test('daysOld floors to whole days', () => {
  assert.equal(daysOld(at('2025-07-31T00:00:00Z'), NOW), 0);
  assert.equal(daysOld(at('2025-07-30T00:00:00Z'), NOW), 1);
  assert.equal(daysOld(at('2025-07-01T12:00:00Z'), NOW), 30);
});

test('a date in the future is negative rather than zero', () => {
  assert.equal(daysOld(at('2025-08-03T12:00:00Z'), NOW), -3);
});

test('this week is the only thing called new this week', () => {
  assert.equal(freshnessKicker(at('2025-07-31T09:00:00Z'), NOW), 'New this week');
  assert.equal(freshnessKicker(at('2025-07-25T09:00:00Z'), NOW), 'New this week');
});

test('the boundary at seven days is exclusive', () => {
  assert.equal(freshnessKicker(at('2025-07-25T11:00:00Z'), NOW), 'New this week');
  assert.equal(freshnessKicker(at('2025-07-24T11:00:00Z'), NOW), 'New this month');
});

test('a month old is not claimed to be this week', () => {
  assert.equal(freshnessKicker(at('2025-07-10T12:00:00Z'), NOW), 'New this month');
  assert.equal(freshnessKicker(at('2025-07-01T13:00:00Z'), NOW), 'New this month');
});

test('anything older claims recency against the site and not the calendar', () => {
  assert.equal(freshnessKicker(at('2025-06-01T12:00:00Z'), NOW), 'Latest');
  assert.equal(freshnessKicker(at('2019-01-01T12:00:00Z'), NOW), 'Latest');
});

/*
  A staged post is dated ahead and reaches the front page the moment its date passes, so
  the kicker has to have an answer for a date that has not happened yet. The newest thing
  on the page is new, whichever side of midnight it sits.
*/
test('a future date reads as new rather than falling through to Latest', () => {
  assert.equal(freshnessKicker(at('2025-08-03T12:00:00Z'), NOW), 'New this week');
});

test('inside a week the date is a weekday', () => {
  assert.equal(postedOn(at('2025-07-29T12:00:00Z'), NOW), 'Tuesday');
});

test('past a week a weekday would be ambiguous, so it becomes a date', () => {
  assert.equal(postedOn(at('2025-07-19T12:00:00Z'), NOW), 'July 19');
});

test('a different year says which year', () => {
  assert.equal(postedOn(at('2024-07-19T12:00:00Z'), NOW), 'July 19, 2024');
});

/*
  A weekday for a future date would read as one that already happened. "posted Sunday"
  three days before Sunday is the wrong tense and the wrong claim.
*/
test('a future date never prints as a weekday', () => {
  assert.equal(postedOn(at('2025-08-03T12:00:00Z'), NOW), 'August 3');
});
