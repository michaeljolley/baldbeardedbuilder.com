/*
  Auth helpers that are small enough to be worth having in one place and important enough
  that they should not be reimplemented per route.
*/

import type { APIContext } from 'astro';

/**
 * Clears the session cookies Supabase set, so the browser stops presenting a dead token.
 *
 * Both sign out and account deletion need this, and neither can rely on the Supabase
 * client having done it. `signOut` writes the removals through the same `setAll` the
 * server client was given, so it usually works, but it is a network call to the auth
 * server and a network call can fail. A browser still holding an `sb-` cookie after
 * pressing sign out renders as signed in until the token expires, which is the one
 * outcome the button exists to prevent.
 */
export function clearSession(context: APIContext): void {
  for (const cookie of context.cookies.headers()) {
    const name = cookie.split('=')[0];
    if (name.startsWith('sb-')) context.cookies.delete(name, { path: '/' });
  }
}

/**
 * Turn an untrusted `next` parameter into a path we are willing to redirect to.
 *
 * Only a same site absolute path survives. Anything else, including a protocol relative
 * `//evil.example` that a naive "starts with a slash" check would wave through, becomes
 * the front page. An open redirect on a sign in route is how a phishing link borrows the
 * credibility of a domain it does not own.
 */
export function safeReturnPath(raw: string | null | undefined): string {
  if (!raw) return '/';
  if (!raw.startsWith('/')) return '/';
  if (raw.startsWith('//')) return '/';
  if (raw.includes('\\')) return '/';
  return raw;
}

/**
 * How new an account has to be before its first comment waits for a look.
 *
 * Decision 16's hold. Seven days is long enough to be annoying to somebody spinning up
 * accounts to spam and short enough that a real person who just joined to comment here is
 * only held once.
 */
export const NEW_ACCOUNT_HOLD_DAYS = 7;

/**
 * GitHub tells us when the account was made. Discord and Twitch do not, so those fall
 * back to the day the profile was created here.
 *
 * That fallback is the whole point. Without it a Discord account has no provider date,
 * ever, and holding on a null would hold that person's every comment until they gave up.
 * The site's own signup date is weaker evidence, but it still costs a spammer a week.
 */
export function isNewAccount(
  providerCreatedAt: string | null | undefined,
  profileCreatedAt?: string | null,
  now = new Date()
): boolean {
  const raw = providerCreatedAt ?? profileCreatedAt;
  if (!raw) return true;
  const created = new Date(raw);
  if (Number.isNaN(created.getTime())) return true;
  const days = (now.getTime() - created.getTime()) / 86_400_000;
  return days < NEW_ACCOUNT_HOLD_DAYS;
}
