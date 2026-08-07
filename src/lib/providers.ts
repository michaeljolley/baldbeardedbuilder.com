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
