/*
  The three ways in, in one place.

  The sign in route, the chooser page and the callback all need to agree on which
  providers exist, what each one is called out loud, and which profile columns it owns.
  Keeping that in three files is how you end up with a provider you can start but cannot
  finish.

  Decisions 4 and 13 used to say GitHub was the only way in and Twitch was link only.
  Both are revised. See the 20260809000000_multi_provider_signin migration for why.
*/

/*
  A sign in, not an integration. Every one of these asks for the profile and the email
  address and nothing else, because the profile is what the site shows and the email is
  where a notification needs somewhere to go. None of them can read a repository, join a
  server, or touch a stream.
*/
export const PROVIDER_SCOPES = {
  github: 'read:user user:email',
  discord: 'identify email',
  twitch: 'user:read:email'
} as const;

export type Provider = keyof typeof PROVIDER_SCOPES;

export const PROVIDERS = Object.keys(PROVIDER_SCOPES) as Provider[];

export function isProvider(value: string): value is Provider {
  return Object.hasOwn(PROVIDER_SCOPES, value);
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  github: 'GitHub',
  discord: 'Discord',
  twitch: 'Twitch'
};

/*
  What each one is actually for, said plainly on /account/.

  A connections list that says "Connected account" three times tells somebody nothing
  about why they might want to attach the two they have not. GitHub is the only provider
  that reports when the account was made, which is what decision 16's hold on a first
  comment reads. Twitch is what the badge backfill matches on. Discord earns nothing yet
  and says so, because implying otherwise is how a settings screen starts lying.
*/
export const PROVIDER_NOTES: Record<Provider, string> = {
  github: 'Account age, which decides whether a first comment waits',
  discord: 'Profile only, for now',
  twitch: 'Chat badges and stream history'
};

/** The profile column holding the display name for each provider. */
export const PROVIDER_LOGIN_COLUMNS = {
  github: 'github_login',
  discord: 'discord_login',
  twitch: 'twitch_login'
} as const satisfies Record<Provider, string>;
