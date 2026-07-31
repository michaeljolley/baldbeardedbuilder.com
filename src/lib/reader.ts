/*
  Who left a like, in the weakest sense the site can get away with.

  Kept apart from the database layer on purpose. Nothing here reads or writes anything: it
  identifies a browser well enough to stop the same one liking a thing twice, and it turns
  an address into something that is not an address. Keeping it separate means the rules
  can be tested without a database in scope, and it means a change to how readers are
  identified is a change to one small file rather than to the query layer.
*/

import { createHmac, randomUUID } from 'node:crypto';
import type { APIContext } from 'astro';

/*
  Two kinds, matching the target_kind enum in the schema.

  Content covers articles and videos together because target_key already carries the
  collection prefix, so splitting them would put the same fact in two columns and let them
  disagree. A disaster is its own kind because it is keyed by a number rather than a path.
*/
export type TargetKind = 'content' | 'disaster';

export const KINDS: TargetKind[] = ['content', 'disaster'];

export const TOKEN_COOKIE = 'bbb_t';

/* Just over a year, so somebody who reads once a winter is still recognised next winter. */
const TOKEN_MAX_AGE = 60 * 60 * 24 * 400;

export function isTargetKind(value: unknown): value is TargetKind {
  return typeof value === 'string' && KINDS.includes(value as TargetKind);
}

/*
  A key is a content key like "blog:some-post", a disaster id, or a slug.

  The colon and the slash are allowed because content keys are "collection:id" and some
  ids are nested paths. The bound is what makes this a validator rather than decoration:
  anything longer than a real key is somebody feeding the unique index junk.
*/
const KEY_RE = /^[a-z0-9][a-z0-9._:/-]{0,127}$/i;

export function isTargetKey(value: unknown): value is string {
  return typeof value === 'string' && KEY_RE.test(value);
}

/**
 * The reader's own token, minted on first use.
 *
 * Not httpOnly, because the like island needs to know whether this browser has already
 * liked the thing it is drawing without asking the server on every page. It identifies a
 * browser and nothing else: no name, no address, nothing that survives clearing cookies.
 */
export function browserToken(context: APIContext): string {
  const existing = context.cookies.get(TOKEN_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;

  const minted = randomUUID();
  context.cookies.set(TOKEN_COOKIE, minted, {
    path: '/',
    maxAge: TOKEN_MAX_AGE,
    sameSite: 'lax',
    secure: import.meta.env?.PROD ?? false
  });
  return minted;
}

/**
 * Turns an address into a dedupe token.
 *
 * Falls back to a constant when there is no secret configured, which collapses the address
 * half of the dedupe rather than silently hashing with an empty key and pretending the
 * protection is there. Rotating the secret forgets who liked what, which is the property
 * that makes this a token with a shelf life rather than a record of where readers live.
 *
 * The secret is a parameter with a default so the rotation behaviour can be tested. Call
 * it with one argument everywhere else.
 */
export function hashIp(ip: string, secret: string | undefined = likeSecret()): string {
  if (!secret) return 'no-secret';
  return createHmac('sha256', secret).update(ip).digest('base64url').slice(0, 32);
}

function likeSecret(): string | undefined {
  /* import.meta.env under Astro, process.env under a plain node test or script. */
  return import.meta.env?.LIKE_IP_SECRET ?? process.env.LIKE_IP_SECRET;
}

/** The address a proxy says the request came from, or the socket if nobody said. */
export function clientIp(context: APIContext): string {
  const forwarded = context.request.headers.get('x-nf-client-connection-ip')
    ?? context.request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return context.clientAddress ?? '0.0.0.0';
}
