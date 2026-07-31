/*
  Your own submissions, as a test.

  v1 sends no email, so this list is the entire feedback loop for somebody who handed
  over the worst thing that ever happened to them at work. If it says the wrong thing, or
  links somewhere that is not there, nothing else corrects it. There is no inbox holding
  a second copy of the truth.

  So the assertions here are about what a person reads, not about the shape of the data.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { submissionState, submissionTitle } from '../src/lib/submissions.ts';

const base = {
  id: 'a1',
  title: 'The migration that ran twice',
  slug: 'the-migration-that-ran-twice',
  status: 'pending',
  isAnonymous: false,
  submittedAt: new Date('2026-03-04T09:00:00Z'),
  publishedAt: null,
  note: null
};

const at = (over) => submissionState({ ...base, ...over });

test('a waiting story says it is waiting and links nowhere', () => {
  const s = at({ status: 'pending' });
  assert.equal(s.label, 'Waiting');
  assert.equal(s.tone, 'waiting');
  assert.equal(s.href, null);
});

test('a published story links to where it actually lives', () => {
  const s = at({ status: 'published' });
  assert.equal(s.label, 'Published');
  assert.equal(s.tone, 'live');
  assert.equal(s.href, '/dev-disasters/the-migration-that-ran-twice/');
});

test('a published story with no slug says it is up rather than linking to a 404', () => {
  /*
    This should not happen, and if it does the honest failure is no link. A dead link
    here would read as the story having been taken down, which is the one thing it must
    never accidentally say.
  */
  const s = at({ status: 'published', slug: null });
  assert.equal(s.label, 'Published');
  assert.equal(s.href, null);
});

test('an anonymous story still appears, and says the byline is off it', () => {
  /*
    Anonymous is about the byline, not the author. Hiding it here would make the only
    feedback loop somebody has lie to them about their own submission.
  */
  const s = at({ status: 'published', isAnonymous: true });
  assert.equal(s.href, '/dev-disasters/the-migration-that-ran-twice/');
  assert.match(s.detail, /name and handle off it/);
});

test('a story that is not running says so without apologising', () => {
  const s = at({ status: 'rejected' });
  assert.equal(s.label, 'Not running');
  assert.equal(s.tone, 'closed');
  assert.equal(s.href, null);
  assert.match(s.detail, /not a judgement/);
});

test('a moderation note replaces the stock line rather than joining it', () => {
  const s = at({ status: 'rejected', note: 'It names the client in the third paragraph.' });
  assert.equal(s.detail, 'It names the client in the third paragraph.');
  assert.equal(s.detail.includes('not a judgement'), false);
});

test('every state is visually distinct from every other', () => {
  /*
    Three states drawn in two colours is a component that is correct about the data and
    wrong about what somebody is looking at, which is the bug family this build keeps
    producing. The first version of this had Published and Waiting both on --sev-info.
  */
  const tones = [
    at({ status: 'pending' }).tone,
    at({ status: 'published' }).tone,
    at({ status: 'rejected' }).tone
  ];
  assert.equal(new Set(tones).size, 3, `two states share a marker colour: ${tones.join(', ')}`);
});

test('a story with no title yet is still recognisable as yours', () => {
  /*
    Nothing in the queue has a title until the model has drafted one and Michael has been
    past it, so the first thing anybody sees after submitting is this fallback.
  */
  const title = submissionTitle({ ...base, title: null });
  assert.equal(title, 'Your story from 4 March 2026');
});

test('a real title is used as it stands', () => {
  assert.equal(submissionTitle(base), 'The migration that ran twice');
});
