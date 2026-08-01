/*
  Types for schema that exists in a migration but not yet in database.types.ts.

  database.types.ts is generated from a live project, and there is no live project to
  generate from until Michael hands over the new ref. Hand editing it would be worse than
  this: it says GENERATED at the top, and a hand edit there survives exactly until the
  first real `pnpm types` and then vanishes with no sign it was ever needed.

  So the not yet generated parts live here, in a file that is obviously temporary, and
  are applied with one cast at each call site. When `pnpm types` can run against the new
  project this file is deleted and the casts come out with it. If it is still here in six
  months, that is the smell it is meant to be.

  Covers 20260801000000_notifications.sql and 20260802000000_video_pages.sql only.
*/

import type { Json } from './database.types';

export interface PendingDatabase {
  public: {
    Tables: {
      video_pages: {
        Row: {
          video_id: string;
          summary: string | null;
          intro_markdown: string | null;
          published_at: string;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          video_id: string;
          summary?: string | null;
          intro_markdown?: string | null;
          published_at?: string;
        };
        Update: {
          summary?: string | null;
          intro_markdown?: string | null;
          published_at?: string;
        };
        Relationships: [];
      };
      email_outbox: {
        Row: {
          id: number;
          kind: string;
          profile_id: string;
          payload: Json;
          dedupe_key: string;
          created_at: string;
          sent_at: string | null;
          attempts: number;
          last_error: string | null;
          last_attempt_at: string | null;
        };
        Insert: {
          kind: string;
          profile_id: string;
          payload?: Json;
          dedupe_key: string;
        };
        Update: {
          sent_at?: string | null;
          attempts?: number;
          last_error?: string | null;
          last_attempt_at?: string | null;
        };
        Relationships: [];
      };
      notification_prefs: {
        Row: {
          profile_id: string;
          story_published: boolean;
          story_featured: boolean;
          comment_reply: boolean;
          unsubscribe_token: string;
          updated_at: string;
        };
        Insert: { profile_id: string };
        Update: {
          story_published?: boolean;
          story_featured?: boolean;
          comment_reply?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    /*
      Empty on purpose. The only function this file ever declared was
      unsubscribe_by_token, and that is created by the notifications migration, which is
      parked in supabase/deferred/ and is not in the applied chain.

      A declaration here is a promise that .rpc() can call the thing. Leaving it would
      have let a typed call compile against a function Postgres does not have, which fails
      at runtime and nowhere earlier. Same shape as a preference for an email that never
      sends, one layer down.

      It lives on DeferredDatabase below, so the parked page still typechecks against
      exactly the schema it would run on. types.test.mjs asserts the split holds.
    */
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/*
  What the schema gains when supabase/deferred/20260801000100_notifications.sql is moved
  into the applied chain. Nothing in src/pages or src/lib outside _unwired may use this,
  because none of it exists in the database as shipped.
*/
export interface DeferredDatabase {
  public: PendingDatabase['public'] & {
    Functions: {
      unsubscribe_by_token: {
        Args: { p_token: string; p_kind: string };
        Returns: boolean;
      };
    };
  };
}
