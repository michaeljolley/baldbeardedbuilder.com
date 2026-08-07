/*
  Drafting a title for a submitted dev disaster.

  The model call itself is not exercised here, because a test that asserts what a language
  model returns is a test of the model. What is worth pinning down is everything around
  it: the fallback that runs when the model is unreachable, the parser that decides how
  much of the model's answer to believe, the slug rules, and the dash strip.

  That last one matters more than it looks. A model told not to use an em dash will use
  one eventually, and it will land on a public page under somebody else's story.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, fallbackDraft, parseDraft, uniqueSlug, draftDisaster } from '../src/lib/draft.ts';

const STORY =
  'A regex ate the payroll run. I had written it on a Friday to strip a prefix off ' +
  'employee ids, and it was greedy, and it took the last four digits with it. Nobody ' +
  'noticed until the bank rejected the file.';

test('a slug drops the words that make it read like a sentence', () => {
  assert.equal(slugify('The time that a regex ate the payroll run'), 'time-regex-ate-payroll-run');
});

test('a slug keeps every word when dropping them would leave nothing', () => {
  assert.equal(slugify('It was the one'), 'it-was-the-one');
});

test('a slug has no punctuation, no accents and no trailing dash', () => {
  assert.equal(slugify('Café crashed! (again) -'), 'cafe-crashed-again');
});

test('a slug is capped, so a whole paragraph cannot become a URL', () => {
  const slug = slugify('one two three four five six seven eight nine ten eleven twelve', {
    keepStopWords: true
  });
  assert.ok(slug.length <= 60);
  assert.equal(slug.split('-').length, 8);
});

test('the fallback titles a story from its own opening', () => {
  const draft = fallbackDraft(STORY);
  assert.equal(draft.title, 'A regex ate the payroll run.');
  assert.equal(draft.slug, 'regex-ate-payroll-run');
  assert.equal(draft.fromModel, false);
});

test('the fallback files at info, never at error', () => {
  /* A story filed as an error before anybody read it puts a claim on the wall that
     nobody checked. */
  assert.equal(fallbackDraft(STORY).severity, 'info');
});

test('the fallback ignores a code fence when looking for an opening line', () => {
  const draft = fallbackDraft('```sql\nDELETE FROM users;\n```\nI forgot the where clause.');
  assert.equal(draft.title, 'I forgot the where clause.');
});

test('a story with nothing usable in it still gets something filed', () => {
  const draft = fallbackDraft('');
  assert.equal(draft.title, 'An untitled disaster');
  assert.ok(draft.slug.length > 0);
});

test('a good answer from the model is taken as given', () => {
  const draft = parseDraft(
    JSON.stringify({ title: 'A greedy regex ate the payroll run', line: 'It took four digits with it.', severity: 'error' }),
    STORY
  );
  assert.equal(draft.title, 'A greedy regex ate the payroll run');
  assert.equal(draft.severity, 'error');
  assert.equal(draft.slug, 'greedy-regex-ate-payroll-run');
  assert.equal(draft.fromModel, true);
});

test('an em dash in the answer never reaches the page', () => {
  const draft = parseDraft(
    JSON.stringify({ title: 'The regex \u2014 greedy \u2014 ate payroll', line: 'One line \u2013 two clauses', severity: 'hint' }),
    STORY
  );
  assert.ok(!/[\u2014\u2013]/.test(draft.title));
  assert.ok(!/[\u2014\u2013]/.test(draft.line));
});

test('a hyphen used as a dash is treated the same way', () => {
  const draft = parseDraft(JSON.stringify({ title: 'It broke - badly', severity: 'info' }), STORY);
  assert.equal(draft.title, 'It broke, badly');
});

test('a nonsense severity falls back without losing a good title', () => {
  const draft = parseDraft(JSON.stringify({ title: 'A very good title', severity: 'catastrophic' }), STORY);
  assert.equal(draft.title, 'A very good title');
  assert.equal(draft.severity, 'info');
});

test('an answer that is not JSON falls back whole', () => {
  const draft = parseDraft('sorry, I cannot help with that', STORY);
  assert.equal(draft.title, fallbackDraft(STORY).title);
});

test('a title longer than the field is cut on a word', () => {
  const long = 'word '.repeat(40).trim();
  const draft = parseDraft(JSON.stringify({ title: long, severity: 'info' }), STORY);
  assert.ok(draft.title.length <= 70);
  assert.ok(!draft.title.endsWith('wor'));
});

test('a slug nobody is using comes back untouched', () => {
  assert.equal(uniqueSlug('regex-ate-payroll', new Set()), 'regex-ate-payroll');
});

test('a taken slug gets a number rather than a failed submission', () => {
  const taken = new Set(['regex-ate-payroll', 'regex-ate-payroll-2']);
  assert.equal(uniqueSlug('regex-ate-payroll', taken), 'regex-ate-payroll-3');
});

test('a model that returns an error never loses the story', async () => {
  process.env.AI_API_KEY = 'test-key';
  const draft = await draftDisaster(STORY, async () => new Response('nope', { status: 500 }));
  delete process.env.AI_API_KEY;

  assert.equal(draft.fromModel, false);
  assert.equal(draft.title, 'A regex ate the payroll run.');
});

test('a model that throws never loses the story either', async () => {
  process.env.AI_API_KEY = 'test-key';
  const draft = await draftDisaster(STORY, async () => {
    throw new Error('connect ECONNREFUSED');
  });
  delete process.env.AI_API_KEY;

  assert.equal(draft.fromModel, false);
  assert.ok(draft.title.length > 0);
});

test('no key at all means the fallback and no request', async () => {
  let called = false;
  const draft = await draftDisaster(STORY, async () => {
    called = true;
    return new Response('{}');
  });

  assert.equal(called, false);
  assert.equal(draft.fromModel, false);
});
