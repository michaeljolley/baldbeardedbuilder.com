/// <reference path="../.astro/types.d.ts" />
interface ImportMetaEnv {
  readonly HOST: string
  readonly SUPABASE_URL: string
  readonly SUPABASE_ANON_KEY: string
  readonly WEBMENTION_IO_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
