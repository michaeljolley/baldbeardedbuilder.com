/*
  When a dated item becomes visible.

  Carried over from v1, where posts went live at 8am Central on their publication date
  rather than at midnight. That rule is not cosmetic: a post dated today should not be
  readable while the person who wrote it is still asleep, and the RSS feed and the
  newsletter both key off the same moment.

  v1 hand rolled the Central Time offset with a DST table. This uses Intl instead, which
  gets DST right for free and does not go stale when the rules change.
*/

const ZONE = 'America/Chicago';
const PUBLISH_HOUR = 8;

const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE,
  hour: 'numeric',
  hour12: false,
  timeZoneName: 'longOffset'
});

/** Minutes Central Time is behind UTC on a given instant. 360 in winter, 300 in summer. */
function offsetMinutes(at: Date): number {
  const name = parts.formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-6';
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!match) return 360;
  const sign = match[1] === '-' ? 1 : -1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/**
 * The instant a dated item goes live: 8am Central on its own date.
 *
 * The date is read in UTC because that is how a frontmatter date without a time is
 * parsed, so reading it any other way would shift the day for anyone east of Greenwich.
 */
export function publishTime(date: Date): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();

  /* Guess with the offset at midday, then correct once. One pass is enough because the
     only dates where the guess is wrong are the two changeover days, and 8am is never
     within an hour of the 2am switch. */
  const guess = new Date(Date.UTC(y, m, d, 12, 0, 0));
  return new Date(Date.UTC(y, m, d, PUBLISH_HOUR, 0, 0) + offsetMinutes(guess) * 60_000);
}

/** True once an item's publish moment has passed. */
export function isPublished(date: Date, now: Date = new Date()): boolean {
  return now.getTime() >= publishTime(date).getTime();
}
