/*
  GENERATED FILE. Do not edit by hand.

  Source of truth is the live Supabase schema, which is itself the product of everything
  in supabase/migrations. Regenerate with:

    pnpm types

  If the diff surprises you, somebody changed the schema in Studio instead of writing a
  migration, and that change will vanish the next time the project is rebuilt.
*/

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      badge_grants: {
        Row: {
          badge_id: string
          granted_at: string
          note: string | null
          profile_id: string
          source: string
        }
        Insert: {
          badge_id: string
          granted_at?: string
          note?: string | null
          profile_id: string
          source?: string
        }
        Update: {
          badge_id?: string
          granted_at?: string
          note?: string | null
          profile_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_grants_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_shelf"
            referencedColumns: ["badge_id"]
          },
          {
            foreignKeyName: "badge_grants_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_grants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_rules: {
        Row: {
          badge_id: string
          event: string
          threshold: number
        }
        Insert: {
          badge_id: string
          event: string
          threshold?: number
        }
        Update: {
          badge_id?: string
          event?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "badge_rules_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: true
            referencedRelation: "badge_shelf"
            referencedColumns: ["badge_id"]
          },
          {
            foreignKeyName: "badge_rules_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: true
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string
          created_at: string
          description: string
          family: string | null
          id: string
          is_manual: boolean
          name: string
          sort_order: number
          tier: number | null
          tone: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          family?: string | null
          id: string
          is_manual?: boolean
          name: string
          sort_order?: number
          tier?: number | null
          tone?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          family?: string | null
          id?: string
          is_manual?: boolean
          name?: string
          sort_order?: number
          tier?: number | null
          tone?: string
        }
        Relationships: []
      }
      bans: {
        Row: {
          banned_at: string
          expires_at: string | null
          profile_id: string
          reason: string
        }
        Insert: {
          banned_at?: string
          expires_at?: string | null
          profile_id: string
          reason: string
        }
        Update: {
          banned_at?: string
          expires_at?: string | null
          profile_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "bans_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          body_html: string | null
          body_markdown: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          parent_id: string | null
          report_count: number
          status: string
          target_key: string
          target_kind: Database["public"]["Enums"]["target_kind"]
        }
        Insert: {
          author_id?: string | null
          body_html?: string | null
          body_markdown: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          report_count?: number
          status?: string
          target_key: string
          target_kind: Database["public"]["Enums"]["target_kind"]
        }
        Update: {
          author_id?: string | null
          body_html?: string | null
          body_markdown?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          report_count?: number
          status?: string
          target_key?: string
          target_kind?: Database["public"]["Enums"]["target_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      disasters: {
        Row: {
          author_id: string | null
          blast_radius: string | null
          body: string
          featured_at: string | null
          id: number
          is_anonymous: boolean
          line: string | null
          moderation_note: string | null
          published_at: string | null
          severity: string
          slug: string | null
          status: string
          submitted_at: string
          tags: string[] | null
          time_to_recover: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          blast_radius?: string | null
          body: string
          featured_at?: string | null
          id?: number
          is_anonymous?: boolean
          line?: string | null
          moderation_note?: string | null
          published_at?: string | null
          severity: string
          slug?: string | null
          status?: string
          submitted_at?: string
          tags?: string[] | null
          time_to_recover?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          blast_radius?: string | null
          body?: string
          featured_at?: string | null
          id?: number
          is_anonymous?: boolean
          line?: string | null
          moderation_note?: string | null
          published_at?: string | null
          severity?: string
          slug?: string | null
          status?: string
          submitted_at?: string
          tags?: string[] | null
          time_to_recover?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disasters_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempts: number
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          dedupe_key: string
          id: number
          kind: string
          last_attempt_at: string | null
          last_error: string | null
          next_attempt_at: string
          payload: Json
          profile_id: string
          sent_at: string | null
        }
        Insert: {
          attempts?: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          dedupe_key: string
          id?: number
          kind: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          profile_id: string
          sent_at?: string | null
        }
        Update: {
          attempts?: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          dedupe_key?: string
          id?: number
          kind?: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          profile_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          browser_token: string
          created_at: string
          id: string
          ip_hash: string
          profile_id: string | null
          target_key: string
          target_kind: Database["public"]["Enums"]["like_target"]
        }
        Insert: {
          browser_token: string
          created_at?: string
          id?: string
          ip_hash: string
          profile_id?: string | null
          target_key: string
          target_kind: Database["public"]["Enums"]["like_target"]
        }
        Update: {
          browser_token?: string
          created_at?: string
          id?: string
          ip_hash?: string
          profile_id?: string | null
          target_key?: string
          target_kind?: Database["public"]["Enums"]["like_target"]
        }
        Relationships: [
          {
            foreignKeyName: "likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          comment_reply: boolean
          profile_id: string
          story_featured: boolean
          story_published: boolean
          unsubscribe_token: string
          updated_at: string
        }
        Insert: {
          comment_reply?: boolean
          profile_id: string
          story_featured?: boolean
          story_published?: boolean
          unsubscribe_token?: string
          updated_at?: string
        }
        Update: {
          comment_reply?: boolean
          profile_id?: string
          story_featured?: boolean
          story_published?: boolean
          unsubscribe_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          discord_id: string | null
          discord_login: string | null
          github_created_at: string | null
          github_id: number | null
          github_login: string | null
          handle: string
          id: string
          is_private: boolean
          links: Json
          twitch_linked_at: string | null
          twitch_login: string | null
          twitch_user_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          discord_id?: string | null
          discord_login?: string | null
          github_created_at?: string | null
          github_id?: number | null
          github_login?: string | null
          handle: string
          id: string
          is_private?: boolean
          links?: Json
          twitch_linked_at?: string | null
          twitch_login?: string | null
          twitch_user_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          discord_id?: string | null
          discord_login?: string | null
          github_created_at?: string | null
          github_id?: number | null
          github_login?: string | null
          handle?: string
          id?: string
          is_private?: boolean
          links?: Json
          twitch_linked_at?: string | null
          twitch_login?: string | null
          twitch_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          kind: string
          reason: string
          reporter_email: string | null
          reporter_hash: string | null
          reporter_id: string | null
          resolved_at: string | null
          status: string
          target_ref: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          kind: string
          reason: string
          reporter_email?: string | null
          reporter_hash?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
          status?: string
          target_ref?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          kind?: string
          reason?: string
          reporter_email?: string | null
          reporter_hash?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
          status?: string
          target_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_handles: {
        Row: {
          handle: string
        }
        Insert: {
          handle: string
        }
        Update: {
          handle?: string
        }
        Relationships: []
      }
      share_intents: {
        Row: {
          created_at: string
          id: number
          ip_hash: string
          platform: string
          target_key: string
          target_kind: string
        }
        Insert: {
          created_at?: string
          id?: never
          ip_hash: string
          platform: string
          target_key: string
          target_kind: string
        }
        Update: {
          created_at?: string
          id?: never
          ip_hash?: string
          platform?: string
          target_key?: string
          target_kind?: string
        }
        Relationships: []
      }
      streamEvents: {
        Row: {
          created_at: string
          eventType: string
          id: number
          login: string
          message: string | null
          quantity: number | null
          streamDate: string
        }
        Insert: {
          created_at?: string
          eventType: string
          id?: number
          login: string
          message?: string | null
          quantity?: number | null
          streamDate: string
        }
        Update: {
          created_at?: string
          eventType?: string
          id?: number
          login?: string
          message?: string | null
          quantity?: number | null
          streamDate?: string
        }
        Relationships: []
      }
      streamUsers: {
        Row: {
          avatar_url: string
          display_name: string | null
          lastUpdated: string | null
          login: string
          twitch_user_id: string | null
        }
        Insert: {
          avatar_url: string
          display_name?: string | null
          lastUpdated?: string | null
          login: string
          twitch_user_id?: string | null
        }
        Update: {
          avatar_url?: string
          display_name?: string | null
          lastUpdated?: string | null
          login?: string
          twitch_user_id?: string | null
        }
        Relationships: []
      }
      video_pages: {
        Row: {
          created_at: string
          included: boolean
          intro_markdown: string | null
          published_at: string
          summary: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          created_at?: string
          included?: boolean
          intro_markdown?: string | null
          published_at?: string
          summary?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          created_at?: string
          included?: boolean
          intro_markdown?: string | null
          published_at?: string
          summary?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: []
      }
      video_transcripts: {
        Row: {
          body: string | null
          chapters: Json | null
          chapters_updated_at: string | null
          created_at: string
          duration: number | null
          language: string
          segments: Json | null
          source: string | null
          transcript_updated_at: string | null
          video_id: string
        }
        Insert: {
          body?: string | null
          chapters?: Json | null
          chapters_updated_at?: string | null
          created_at?: string
          duration?: number | null
          language?: string
          segments?: Json | null
          source?: string | null
          transcript_updated_at?: string | null
          video_id: string
        }
        Update: {
          body?: string | null
          chapters?: Json | null
          chapters_updated_at?: string | null
          created_at?: string
          duration?: number | null
          language?: string
          segments?: Json | null
          source?: string | null
          transcript_updated_at?: string | null
          video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      badge_shelf: {
        Row: {
          badge_id: string | null
          category: string | null
          description: string | null
          event: string | null
          family: string | null
          is_manual: boolean | null
          name: string | null
          sort_order: number | null
          threshold: number | null
          tier: number | null
          tone: string | null
        }
        Relationships: []
      }
      comment_counts: {
        Row: {
          replies: number | null
          target_key: string | null
          target_kind: Database["public"]["Enums"]["target_kind"] | null
        }
        Relationships: []
      }
      comments_public: {
        Row: {
          author_avatar: string | null
          author_handle: string | null
          author_id: string | null
          author_name: string | null
          body_markdown: string | null
          created_at: string | null
          edited_at: string | null
          id: string | null
          parent_id: string | null
          status: string | null
          target_key: string | null
          target_kind: Database["public"]["Enums"]["target_kind"] | null
          tombstone: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      like_counts: {
        Row: {
          likes: number | null
          target_key: string | null
          target_kind: Database["public"]["Enums"]["like_target"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      backfill_badges: { Args: never; Returns: number }
      badge_counts: {
        Args: { p_profile: string }
        Returns: {
          event: string
          n: number
        }[]
      }
      badge_progress: {
        Args: { p_profile: string }
        Returns: {
          badge_id: string
          earned: boolean
          event: string
          n: number
          threshold: number
        }[]
      }
      claim_email_batch: {
        Args: { p_limit?: number; p_now?: string }
        Returns: {
          attempts: number
          claim_token: string
          created_at: string
          dedupe_key: string
          id: number
          kind: string
          last_attempt_at: string
          payload: Json
          profile_id: string
        }[]
      }
      enqueue_email: {
        Args: {
          p_dedupe_key: string
          p_kind: string
          p_payload: Json
          p_profile_id: string
        }
        Returns: undefined
      }
      grant_badges: {
        Args: { p_profile: string; p_source?: string }
        Returns: number
      }
      streams_watched: { Args: { p_login: string }; Returns: number }
      twitch_first_seen: { Args: { p_login: string }; Returns: string }
      unsubscribe_by_token: {
        Args: { p_kind: string; p_token: string }
        Returns: boolean
      }
    }
    Enums: {
      like_target: "content" | "disaster" | "comment"
      target_kind: "content" | "disaster"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      like_target: ["content", "disaster", "comment"],
      target_kind: ["content", "disaster"],
    },
  },
} as const
