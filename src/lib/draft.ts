/*
  Drafting a title, a line, a slug and a severity for a submitted dev disaster.

  Decision 25: none of this is user supplied. Nobody titles their own disaster, because a
  title somebody wrote for their own story is either too modest or a pitch, and the wall
  only works when every card is written in the same voice.

  Two rules shape everything below.

  The first is that a submission must never be lost because a third party had a bad
  minute. Somebody sat down and typed out the worst day of their career. If the model is
  down, the rate limit is hit, or the key is missing, the story still gets saved with a
  draft written from its own words. Every one of these is editable in Studio anyway, which
  is the whole point of pre moderation.

  The second is that a draft is a draft. Nothing here publishes anything.
*/

const AI_URL = () =>
  import.meta.env?.AI_API_URL ?? process.env.AI_API_URL ?? 'https://api.openai.com/v1/chat/completions';

const AI_KEY = () => import.meta.env?.AI_API_KEY ?? process.env.AI_API_KEY ?? '';

const AI_MODEL = () => import.meta.env?.AI_MODEL ?? process.env.AI_MODEL ?? 'gpt-4o-mini';

export type Severity = 'error' | 'warning' | 'info' | 'hint';

const SEVERITIES: Severity[] = ['error', 'warning', 'info', 'hint'];

export interface Draft {
  title: string;
  line: string;
  slug: string;
  severity: Severity;
  /** False when the model was not reachable and the fallback wrote this. */
  fromModel: boolean;
}

const TITLE_MAX = 70;
const LINE_MAX = 160;

/*
  Words that make a slug read like a headline rather than a sentence. Dropping them is
  what turns "the-time-that-a-regex-ate-the-payroll-run" into something anybody would
  type.
*/
const STOP = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'so', 'if', 'of', 'to', 'in', 'on', 'at', 'by',
  'for', 'with', 'from', 'that', 'this', 'it', 'its', 'was', 'were', 'is', 'are', 'be',
  'been', 'as', 'we', 'i', 'my', 'our', 'you', 'your', 'they', 'their'
]);

export function slugify(text: string, { keepStopWords = false } = {}): string {
  const words = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);

  const kept = keepStopWords ? words : words.filter((w) => !STOP.has(w));
  const source = kept.length >= 3 ? kept : words;

  return source.slice(0, 8).join('-').slice(0, 60).replace(/-+$/, '');
}

/*
  A first sentence, for the fallback. Not a general purpose sentence splitter, and it does
  not need to be: it is deciding what to put in a field a human is about to rewrite.
*/
function firstSentence(body: string): string {
  const flat = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const end = flat.search(/[.!?](\s|$)/);
  return (end === -1 ? flat : flat.slice(0, end + 1)).trim();
}

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;

  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:]$/, '');
}

/**
 * What to file when the model cannot be reached.
 *
 * Deliberately plain. A fallback that tried to be clever would be harder to spot in
 * Studio than one that obviously wants rewriting, and spotting it is the job.
 */
export function fallbackDraft(body: string): Draft {
  const opening = firstSentence(body) || 'An untitled disaster';
  const title = clip(opening, TITLE_MAX);

  return {
    title,
    line: clip(opening, LINE_MAX),
    slug: slugify(title) || 'untitled-disaster',
    /* The middle of the scale. A story filed as an error before anybody read it would put
       a claim on the wall that nobody checked. */
    severity: 'info',
    fromModel: false
  };
}

const PROMPT = [
  'You write titles for a collection of true stories about things that went wrong in',
  'software. The people who send them in never title their own.',
  '',
  'Return JSON only, with these keys:',
  '  title: a short mono label, at most 70 characters, no final full stop. Plain and',
  '    concrete. Name the thing that broke, not the lesson. Never a pun on the person.',
  '  line: one sentence, at most 160 characters, that makes somebody want to read it.',
  '  severity: one of error, warning, info, hint. error is production down or data lost.',
  '    warning is real damage that was recovered. info is a scare with no lasting harm.',
  '    hint is a small sharp lesson.',
  '',
  'Never use an em dash, an en dash, or a hyphen used as a dash. Rewrite instead.',
  'Never name a person, a company, or a customer, even if the story does.',
  'Never blame the person telling it.'
].join('\n');

/**
 * A drafted title, line, slug and severity.
 *
 * Never throws and never rejects. The worst case is a fallback draft, because the caller
 * is holding somebody's story and has nowhere good to put a failure.
 */
export async function draftDisaster(body: string, fetchImpl = fetch): Promise<Draft> {
  const key = AI_KEY();
  if (!key) return fallbackDraft(body);

  try {
    const controller = new AbortController();
    /* A submission is a foreground request with a person watching it. Ten seconds is
       already longer than anybody should wait to be told their story was received. */
    const timer = setTimeout(() => controller.abort(), 10_000);

    const res = await fetchImpl(AI_URL(), {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: AI_MODEL(),
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: body.slice(0, 12_000) }
        ]
      })
    }).finally(() => clearTimeout(timer));

    if (!res.ok) return fallbackDraft(body);

    const payload = await res.json();
    const raw = payload?.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') return fallbackDraft(body);

    return parseDraft(raw, body);
  } catch {
    return fallbackDraft(body);
  }
}

/**
 * The model's answer, checked field by field.
 *
 * Anything missing or the wrong shape falls back for that field alone rather than for the
 * whole draft, because a good title with a nonsense severity is still a good title.
 */
export function parseDraft(raw: string, body: string): Draft {
  const fallback = fallbackDraft(body);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }

  const title =
    typeof parsed.title === 'string' && parsed.title.trim()
      ? clip(stripDashes(parsed.title), TITLE_MAX).replace(/[.]+$/, '')
      : fallback.title;

  const line =
    typeof parsed.line === 'string' && parsed.line.trim()
      ? clip(stripDashes(parsed.line), LINE_MAX)
      : fallback.line;

  const severity =
    typeof parsed.severity === 'string' && SEVERITIES.includes(parsed.severity as Severity)
      ? (parsed.severity as Severity)
      : fallback.severity;

  return { title, line, slug: slugify(title) || fallback.slug, severity, fromModel: true };
}

/*
  The voice rule, enforced rather than asked for.

  A model told not to use an em dash will use one eventually, and it will land on a public
  page under somebody else's story. Replacing it with a comma is right far more often than
  it is wrong, and being slightly wrong in Studio is free.
*/
function stripDashes(text: string): string {
  return text
    .replace(/\s*[\u2014\u2013]\s*/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/,\s*,/g, ',')
    .trim();
}

/**
 * A slug nothing else is using.
 *
 * Slugs are unique in the database, and a submission that fails on a duplicate would fail
 * for a reason that has nothing to do with the person submitting it.
 */
export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; n < 500; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
