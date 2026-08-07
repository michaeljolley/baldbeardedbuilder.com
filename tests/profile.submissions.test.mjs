/*
  A profile shows its pending stories to one person.

  The submissions block on /builders/[handle] is the owner's own view of their profile:
  stories waiting on a look, held, or turned down. Published ones are already public and
  are drawn above it. Everything else on that page is public by design, so this block is
  the only thing on it that has to ask who is reading.

  The rule is a function rather than a condition in the template because a template can
  only be read, not run. These tests run it. The page test that follows is the smaller half
  and only checks the function is the thing being used.

  The fetch is gated rather than the markup. That distinction is the whole reason this is
  worth a file: gating markup leaves the rows on the page object, one careless edit away
  from being drawn, while gating the fetch means a pending story never enters the render
  for anybody but its author.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ownsProfile } from '../src/lib/ownership.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'builders', '[handle].astro'), 'utf8');

const OWNER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

test('a signed out reader is never the owner', () => {
  assert.equal(ownsProfile(null, OWNER), false);
  assert.equal(ownsProfile(undefined, OWNER), false);
  assert.equal(ownsProfile('', OWNER), false);
});

test('somebody else signed in is never the owner', () => {
  assert.equal(ownsProfile(OTHER, OWNER), false);
});

test('two absent ids are not a match', () => {
  /*
    The case a bare equality check gets wrong. undefined === undefined is true, so a viewer
    with no id reading a profile with no id would own it. Neither value should ever be
    absent, which is exactly why the check has to survive it being absent.
  */
  assert.equal(ownsProfile(undefined, undefined), false);
  assert.equal(ownsProfile(null, null), false);
});

test('the owner is the owner', () => {
  assert.equal(ownsProfile(OWNER, OWNER), true);
});

test('the profile page gates the fetch rather than the markup', () => {
  assert.match(
    page,
    /isOwner \? await readOwnSubmissions\(/,
    'submissions are being read for every visitor and filtered later. A pending story ' +
      'that reaches the page is one edit away from being drawn.'
  );
  assert.match(
    page,
    /ownsProfile\(Astro\.locals\.profile\?\.id, profile\.id\)/,
    'ownership is no longer decided by ownsProfile, so the tested rule and the applied ' +
      'rule are two different things'
  );
});

test('the submissions block is drawn to nobody else', () => {
  assert.match(
    page,
    /\{isOwner && \([\s\S]{0,200}?<SubmissionList/,
    'SubmissionList is outside the owner branch'
  );
});

test('ownership is not decided on the handle', () => {
  assert.doesNotMatch(
    page,
    /profile\.handle ===|=== profile\.handle/,
    'the page is comparing handles. A handle is a label somebody can change and, once ' +
      'freed, somebody else can take.'
  );
});
