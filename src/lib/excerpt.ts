/*
  The opening of a description, for places that drew two lines and get a paragraph.

  A leaf module: it imports nothing, so node runs it directly.

  The mockups were written against hand authored excerpts of about twenty words. Real
  descriptions in the content submodule are search engine summaries and run to six
  sentences. Measured on the built front page at 390px, one of them filled ten lines and
  put the call to action below the fold on an 844px phone, which is the largest element
  on the site being sized by whatever a bot wrote last.

  Cutting mid word with an ellipsis was the other candidate and lost. A complete first
  sentence reads as writing; a severed one reads as a bug.
*/

/*
  A sentence boundary is terminal punctuation, then whitespace, then something that can
  start a sentence.

  The whitespace is what makes this safe on this site: ".NET" has a period followed
  immediately by a letter, so the boundary never fires inside it. Same for "3.5" and
  "vs." when it runs into a lowercase word. An abbreviation followed by a capitalised
  name would split early, which costs a shorter excerpt and never a broken one.
*/
const BOUNDARY = /(?<=[.!?])\s+(?=["'(\[]?[A-Z0-9])/;

/**
 * The first whole sentences of `text`, stopping once `limit` characters are on screen.
 *
 * Always returns at least one sentence, even when that one sentence is longer than the
 * limit, because half a sentence is the thing this exists to avoid.
 */
export function leadSentences(text: string, limit = 180): string {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return '';

  const parts = trimmed.split(BOUNDARY);
  let out = parts[0];
  for (const next of parts.slice(1)) {
    if (out.length + 1 + next.length > limit) break;
    out = `${out} ${next}`;
  }
  return out;
}
