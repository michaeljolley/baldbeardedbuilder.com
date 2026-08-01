/*
  Where a share control sends a reader, and what it is allowed to record.

  A leaf module. It imports nothing, touches no database and reads no globals, so the
  rules can be tested without a browser or a Supabase connection in scope. Everything
  here is a pure function of a url, a title and a platform name.

  Decision 122 in one sentence: these are intents. Pressing one of these opens a compose
  box somewhere else, and whether anything gets posted happens in a window this site
  never sees. Nothing in this file, and nothing that reads it, may call the result a
  share.
*/

/*
  The four outbound destinations plus copy.

  copy is in the same list rather than special cased, because it is the same event from
  the reader's side: a press of a control that hands the page to somebody else. It is
  also the one we can never follow up on at all, which is worth having in the same table
  as the four we can.
*/
export const SHARE_PLATFORMS = ['x', 'bluesky', 'linkedin', 'facebook', 'copy'] as const;

export type SharePlatform = (typeof SHARE_PLATFORMS)[number];

/** The four that open somewhere else. copy stays here. */
export type OutboundPlatform = Exclude<SharePlatform, 'copy'>;

export function isSharePlatform(value: unknown): value is SharePlatform {
  return typeof value === 'string' && (SHARE_PLATFORMS as readonly string[]).includes(value);
}

/** What the menu draws, in the order it draws it. Copy sits below the rule. */
export const SHARE_LABELS: Record<SharePlatform, string> = {
  x: 'X',
  bluesky: 'Bluesky',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  copy: 'Copy link'
};

export const OUTBOUND_PLATFORMS: OutboundPlatform[] = ['x', 'bluesky', 'linkedin', 'facebook'];

/**
 * The compose url for one platform.
 *
 * Every parameter is encoded, which matters more than it looks. A title carrying an
 * ampersand would otherwise end the text parameter early and silently drop the rest of
 * the headline, and several posts on this site have one.
 *
 * Bluesky takes a single text field rather than separate text and url, so the two are
 * joined with a space and encoded together. LinkedIn and Facebook take the url alone and
 * read the title off the page's own metadata, which is why passing a title to them would
 * be ignored rather than helpful.
 */
export function shareIntentUrl(platform: OutboundPlatform, url: string, title: string): string {
  const u = encodeURIComponent(url);

  switch (platform) {
    case 'x':
      return `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${u}`;
    case 'bluesky':
      return `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${url}`)}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
  }
}

/**
 * The address a share should carry, given the one it was handed.
 *
 * The fragment goes, because a reader who followed a link to a comment and then shared
 * the page would otherwise send everybody else to that comment. The query string goes for
 * the same reason: nothing on this site needs one to render a page, and the ones that
 * turn up in practice are campaign tags from wherever the reader arrived from, which
 * would then be attributed to whoever they share with.
 *
 * ShareMenu runs every url through this before building anything, so a caller cannot
 * hand it a path with a fragment on the end and quietly leak it to four platforms.
 */
export function shareableUrl(href: string): string {
  const cut = href.search(/[?#]/);
  return cut === -1 ? href : href.slice(0, cut);
}
