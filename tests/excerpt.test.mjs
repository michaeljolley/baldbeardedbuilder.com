/*
  The front page headline excerpt.

  Measured, not assumed: before this rule the newest post's description filled ten lines
  at 390px and pushed the call to action off an 844px phone. The rule cuts on sentence
  boundaries, so the cases that matter are the ones where a period is not the end of a
  sentence, and ".NET" is in nearly every description on this site.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { leadSentences } from '../src/lib/excerpt.ts';

test('short text is returned whole', () => {
  assert.equal(leadSentences('One short line.'), 'One short line.');
});

test('empty and blank input give an empty string rather than undefined', () => {
  assert.equal(leadSentences(''), '');
  assert.equal(leadSentences('   '), '');
});

test('sentences accumulate until the limit', () => {
  const text = 'Aaa aaa aaa. Bbb bbb bbb. Ccc ccc ccc. Ddd ddd ddd.';
  assert.equal(leadSentences(text, 30), 'Aaa aaa aaa. Bbb bbb bbb.');
});

/*
  The failure this exists to prevent. A single sentence longer than the limit is returned
  whole, because the alternative is a severed one, which reads as a bug rather than as
  writing.
*/
test('one sentence over the limit is still returned whole', () => {
  const long = 'A single sentence that runs well past any limit we would set for it.';
  assert.equal(leadSentences(long, 10), long);
});

test('a period inside .NET is not a sentence boundary', () => {
  const text = 'This is about .NET Core and nothing else. The second sentence.';
  assert.equal(leadSentences(text, 20), 'This is about .NET Core and nothing else.');
});

test('a decimal number is not a sentence boundary', () => {
  const text = 'It shipped in 3.5 and stayed. Then it moved.';
  assert.equal(leadSentences(text, 20), 'It shipped in 3.5 and stayed.');
});

test('question and exclamation marks end sentences too', () => {
  assert.equal(leadSentences('Why bother? Because it works.', 5), 'Why bother?');
  assert.equal(leadSentences('Do not! Then do.', 3), 'Do not!');
});

test('a quoted or bracketed opening is recognised as a new sentence', () => {
  const text = 'The rule is simple. "Records are for data" is where advice stops.';
  assert.equal(leadSentences(text, 5), 'The rule is simple.');
});

test('surrounding whitespace is dropped and internal spacing is normalised to one space', () => {
  assert.equal(leadSentences('  First one.\n\n  Second one.  ', 200), 'First one. Second one.');
});

/*
  A real description from the content submodule, at the length that caused the defect.
  The whole point is that what comes back is shorter than what went in and ends on a
  full stop.
*/
test('a search engine paragraph is cut to its opening', () => {
  const real =
    'Virtual, override and partial are tiny C# keywords with huge impact on design. ' +
    'This post explains how they work, when to use them, and where bugs appear. ' +
    'Learn the difference between override and new, why sealed override matters, and ' +
    'how partial classes and partial methods keep generated and hand written code happy. ' +
    'Every section comes with short, runnable snippets and real project tips.';
  const out = leadSentences(real);
  assert.ok(out.length < real.length, 'the excerpt should be shorter than the description');
  assert.ok(out.endsWith('.'), 'the excerpt should end on a full stop');
  assert.ok(out.length <= 180, `expected at most 180 characters, got ${out.length}`);
});
