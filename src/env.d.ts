/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string
  readonly SUPABASE_ANON_KEY: string
	readonly HOST: string
	readonly TWITCH_CLIENT_ID: string
	readonly TWITCH_CLIENT_SECRET: string
	readonly TWITCH_CHANNEL_ID: string
	readonly TWITCH_ACCESS_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
