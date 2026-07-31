/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  /** Server only. Bypasses row level security, so it must never be prefixed PUBLIC_. */
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  /** Server only. HMAC key for the hashed IP that dedupes anonymous likes. */
  readonly LIKE_IP_SECRET?: string;
  /** Server only. Drafts the title, line and severity for a submitted dev disaster. */
  readonly AI_API_KEY?: string;
  readonly AI_API_URL?: string;
  readonly AI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    /**
     * The signed in reader's profile, or null. Always null on prerendered routes,
     * because a page built once and served from a CDN cannot know who is reading it.
     */
    profile: {
      id: string;
      handle: string;
      display_name: string | null;
      avatar_url: string | null;
      is_private: boolean;
      /** When the GitHub account was made. Feeds the new account hold on comments. */
      github_created_at: string | null;
    } | null;
    userId: string | null;
  }
}
