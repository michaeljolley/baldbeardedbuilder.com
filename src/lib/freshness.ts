/*
  How old a thing is, said out loud.

  A leaf module on purpose: it imports nothing, so node can run it directly and the
  sentences a visitor reads are held against the dates that produce them. The front page
  prints an accent kicker on its headline, and a kicker claiming "New this week" over
  something from March is the same defect this branch has caught fifteen times, a label
  asserting a fact nobody checked.

  Both functions take the comparison time as an argument rather than reading the clock,
  because a function that reads the clock can only be tested on the day it is run.
*/

const DAY = 86_400_000;

/** Whole days between two instants, floored, negative when the date is in the future. */
export function daysOld(date: Date, now: number = Date.now()): number {
  return Math.floor((now - date.getTime()) / DAY);
}

/**
 * The accent kicker over the front page headline.
 *
 * Three bands rather than one sentence, so the loudest claim is only made when it is
 * true. Anything older than a month gets "Latest", which claims recency relative to the
 * rest of the site and nothing about the calendar.
 *
 * A future date reads as new, because a post dated tomorrow that is already on the front
 * page is the newest thing there.
 */
export function freshnessKicker(date: Date, now: number = Date.now()): string {
  const days = daysOld(date, now);
  if (days < 7) return 'New this week';
  if (days < 31) return 'New this month';
  return 'Latest';
}

/**
 * The date on the headline's meta line.
 *
 * Inside a week a weekday is more use than a date, because "posted Thursday" is a thing
 * a reader can place without doing arithmetic. Past that a weekday is ambiguous, so it
 * becomes a real date. Beyond the current year the year goes on, since "3 August" with
 * no year is a claim about this year.
 */
export function postedOn(date: Date, now: number = Date.now()): string {
  const days = daysOld(date, now);
  if (days >= 0 && days < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric'
  });
}
