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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          browser: string | null
          browser_version: string | null
          country: string | null
          created_at: string
          device_type: string | null
          domain: string
          id: string
          os: string | null
          path: string
          querystring: string | null
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string | null
          timezone: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          domain: string
          id?: string
          os?: string | null
          path: string
          querystring?: string | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string | null
          timezone?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          domain?: string
          id?: string
          os?: string | null
          path?: string
          querystring?: string | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string | null
          timezone?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          command: string | null
          expiration_date: string | null
          id: number
          message: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          command?: string | null
          expiration_date?: string | null
          id?: number
          message?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          command?: string | null
          expiration_date?: string | null
          id?: number
          message?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
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
      batches: {
        Row: {
          created_at: string
          id: number
          openAIBatchId: string | null
          openAIFileId: string | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: number
          openAIBatchId?: string | null
          openAIFileId?: string | null
          status: string
          type: string
        }
        Update: {
          created_at?: string
          id?: number
          openAIBatchId?: string | null
          openAIFileId?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      blogs: {
        Row: {
          batchId: number | null
          blog_image: string | null
          blog_image_alt: string | null
          created_at: string
          genBody: string | null
          genDescription: string | null
          genTitles: string | null
          id: number
          isShared: boolean
          pageBody: string
          pageTitle: string
          pageUrl: string
          releaseDate: string | null
          slug: string | null
          social_bluesky_summary: string | null
          social_linkedin_summary: string | null
          social_summary: string | null
          social_x_summary: string | null
          status: string
        }
        Insert: {
          batchId?: number | null
          blog_image?: string | null
          blog_image_alt?: string | null
          created_at?: string
          genBody?: string | null
          genDescription?: string | null
          genTitles?: string | null
          id?: number
          isShared?: boolean
          pageBody: string
          pageTitle: string
          pageUrl: string
          releaseDate?: string | null
          slug?: string | null
          social_bluesky_summary?: string | null
          social_linkedin_summary?: string | null
          social_summary?: string | null
          social_x_summary?: string | null
          status?: string
        }
        Update: {
          batchId?: number | null
          blog_image?: string | null
          blog_image_alt?: string | null
          created_at?: string
          genBody?: string | null
          genDescription?: string | null
          genTitles?: string | null
          id?: number
          isShared?: boolean
          pageBody?: string
          pageTitle?: string
          pageUrl?: string
          releaseDate?: string | null
          slug?: string | null
          social_bluesky_summary?: string | null
          social_linkedin_summary?: string | null
          social_summary?: string | null
          social_x_summary?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "blogs_batchId_fkey"
            columns: ["batchId"]
            isOneToOne: false
            referencedRelation: "batches"
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
      domains: {
        Row: {
          created_at: string
          domain: string
          id: number
          isBBB: boolean
          isLowQuality: boolean
          isLowSocial: boolean
        }
        Insert: {
          created_at?: string
          domain: string
          id?: number
          isBBB?: boolean
          isLowQuality?: boolean
          isLowSocial?: boolean
        }
        Update: {
          created_at?: string
          domain?: string
          id?: number
          isBBB?: boolean
          isLowQuality?: boolean
          isLowSocial?: boolean
        }
        Relationships: []
      }
      dripEmails: {
        Row: {
          batchId: number | null
          bodyHTML: string | null
          bodyMarkdown: string | null
          created_at: string
          dripDate: string
          id: number
          isApproved: boolean
          isFull: boolean
          isGenerated: boolean
          isScheduled: boolean | null
          isShared: boolean
          oneLiner: string | null
          openingMarkdown: string | null
          social_bluesky_summary: string | null
          social_linkedin_summary: string | null
          social_summary: string | null
          social_x_summary: string | null
        }
        Insert: {
          batchId?: number | null
          bodyHTML?: string | null
          bodyMarkdown?: string | null
          created_at?: string
          dripDate: string
          id?: number
          isApproved?: boolean
          isFull?: boolean
          isGenerated?: boolean
          isScheduled?: boolean | null
          isShared?: boolean
          oneLiner?: string | null
          openingMarkdown?: string | null
          social_bluesky_summary?: string | null
          social_linkedin_summary?: string | null
          social_summary?: string | null
          social_x_summary?: string | null
        }
        Update: {
          batchId?: number | null
          bodyHTML?: string | null
          bodyMarkdown?: string | null
          created_at?: string
          dripDate?: string
          id?: number
          isApproved?: boolean
          isFull?: boolean
          isGenerated?: boolean
          isScheduled?: boolean | null
          isShared?: boolean
          oneLiner?: string | null
          openingMarkdown?: string | null
          social_bluesky_summary?: string | null
          social_linkedin_summary?: string | null
          social_summary?: string | null
          social_x_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dripEmails_batchId_fkey"
            columns: ["batchId"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      drips: {
        Row: {
          batchId: number | null
          blueskyUrl: string | null
          created_at: string
          dripEmailId: number | null
          emailUrl: string | null
          id: number
          isDotNet: boolean
          isHot: boolean
          isShared: boolean
          linkedinUrl: string | null
          pageBody: string
          pageTitle: string
          pageUrl: string
          social_body: string | null
          status: string
          summary: string | null
          webUrl: string | null
          xUrl: string | null
        }
        Insert: {
          batchId?: number | null
          blueskyUrl?: string | null
          created_at?: string
          dripEmailId?: number | null
          emailUrl?: string | null
          id?: number
          isDotNet?: boolean
          isHot?: boolean
          isShared?: boolean
          linkedinUrl?: string | null
          pageBody: string
          pageTitle: string
          pageUrl: string
          social_body?: string | null
          status?: string
          summary?: string | null
          webUrl?: string | null
          xUrl?: string | null
        }
        Update: {
          batchId?: number | null
          blueskyUrl?: string | null
          created_at?: string
          dripEmailId?: number | null
          emailUrl?: string | null
          id?: number
          isDotNet?: boolean
          isHot?: boolean
          isShared?: boolean
          linkedinUrl?: string | null
          pageBody?: string
          pageTitle?: string
          pageUrl?: string
          social_body?: string | null
          status?: string
          summary?: string | null
          webUrl?: string | null
          xUrl?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drips_batchId_fkey"
            columns: ["batchId"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drips_dripEmailId_fkey"
            columns: ["dripEmailId"]
            isOneToOne: false
            referencedRelation: "dripEmails"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          batchId: number | null
          cleanPageUrl: string
          created_at: string
          giveaway_link: string | null
          id: number
          isApproved: boolean
          isBlog: boolean
          isDrip: boolean
          isProcessed: boolean
          isVideo: boolean
          pageBody: string | null
          pageTitle: string | null
          pageUrl: string
          source: string
          submitted_email: string | null
          submitted_name: string | null
          thankyou_sent: boolean
        }
        Insert: {
          batchId?: number | null
          cleanPageUrl: string
          created_at?: string
          giveaway_link?: string | null
          id?: number
          isApproved?: boolean
          isBlog?: boolean
          isDrip?: boolean
          isProcessed?: boolean
          isVideo?: boolean
          pageBody?: string | null
          pageTitle?: string | null
          pageUrl: string
          source: string
          submitted_email?: string | null
          submitted_name?: string | null
          thankyou_sent?: boolean
        }
        Update: {
          batchId?: number | null
          cleanPageUrl?: string
          created_at?: string
          giveaway_link?: string | null
          id?: number
          isApproved?: boolean
          isBlog?: boolean
          isDrip?: boolean
          isProcessed?: boolean
          isVideo?: boolean
          pageBody?: string | null
          pageTitle?: string | null
          pageUrl?: string
          source?: string
          submitted_email?: string | null
          submitted_name?: string | null
          thankyou_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ideas_batchId_fkey"
            columns: ["batchId"]
            isOneToOne: false
            referencedRelation: "batches"
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
      productions: {
        Row: {
          created_at: string
          id: string
          issue_number: number
          release_date: string | null
          short_index: number | null
          sort_order: number
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_number: number
          release_date?: string | null
          short_index?: number | null
          sort_order?: number
          status?: string
          title?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_number?: number
          release_date?: string | null
          short_index?: number | null
          sort_order?: number
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
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
      replacements: {
        Row: {
          fromWord: string
          toWord: string
        }
        Insert: {
          fromWord: string
          toWord: string
        }
        Update: {
          fromWord?: string
          toWord?: string
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
      shorturls: {
        Row: {
          slug: string
          target: string
        }
        Insert: {
          slug: string
          target: string
        }
        Update: {
          slug?: string
          target?: string
        }
        Relationships: []
      }
      social_contacts: {
        Row: {
          bluesky_did: string | null
          bluesky_handle: string | null
          created_at: string | null
          id: string
          linkedin_handle: string | null
          linkedin_urn: string | null
          name: string
          updated_at: string | null
          x_handle: string | null
        }
        Insert: {
          bluesky_did?: string | null
          bluesky_handle?: string | null
          created_at?: string | null
          id?: string
          linkedin_handle?: string | null
          linkedin_urn?: string | null
          name: string
          updated_at?: string | null
          x_handle?: string | null
        }
        Update: {
          bluesky_did?: string | null
          bluesky_handle?: string | null
          created_at?: string | null
          id?: string
          linkedin_handle?: string | null
          linkedin_urn?: string | null
          name?: string
          updated_at?: string | null
          x_handle?: string | null
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
          platform: string
          quantity: number | null
          streamDate: string
        }
        Insert: {
          created_at?: string
          eventType: string
          id?: number
          login: string
          message?: string | null
          platform?: string
          quantity?: number | null
          streamDate: string
        }
        Update: {
          created_at?: string
          eventType?: string
          id?: number
          login?: string
          message?: string | null
          platform?: string
          quantity?: number | null
          streamDate?: string
        }
        Relationships: []
      }
      streams: {
        Row: {
          created_at: string | null
          stream_date: string
          total_chats: number | null
          total_cheer_bits: number | null
          total_cheers: number | null
          total_events: number | null
          total_follows: number | null
          total_giftsub_count: number | null
          total_giftsubs: number | null
          total_raid_viewers: number | null
          total_raids: number | null
          total_subs: number | null
          unique_chatters: number | null
          unique_viewers: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          stream_date: string
          total_chats?: number | null
          total_cheer_bits?: number | null
          total_cheers?: number | null
          total_events?: number | null
          total_follows?: number | null
          total_giftsub_count?: number | null
          total_giftsubs?: number | null
          total_raid_viewers?: number | null
          total_raids?: number | null
          total_subs?: number | null
          unique_chatters?: number | null
          unique_viewers?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          stream_date?: string
          total_chats?: number | null
          total_cheer_bits?: number | null
          total_cheers?: number | null
          total_events?: number | null
          total_follows?: number | null
          total_giftsub_count?: number | null
          total_giftsubs?: number | null
          total_raid_viewers?: number | null
          total_raids?: number | null
          total_subs?: number | null
          unique_chatters?: number | null
          unique_viewers?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      streamUsers: {
        Row: {
          avatar_url: string
          display_name: string | null
          lastUpdated: string | null
          login: string
          platform: string
          twitch_user_id: string | null
        }
        Insert: {
          avatar_url: string
          display_name?: string | null
          lastUpdated?: string | null
          login: string
          platform?: string
          twitch_user_id?: string | null
        }
        Update: {
          avatar_url?: string
          display_name?: string | null
          lastUpdated?: string | null
          login?: string
          platform?: string
          twitch_user_id?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          batchId: number | null
          created_at: string
          genDescription: string | null
          genScript: string | null
          genShortScripts: string | null
          genTags: string | null
          genTitles: string | null
          id: number
          pageBody: string
          pageTitle: string
          pageUrl: string
          status: string | null
        }
        Insert: {
          batchId?: number | null
          created_at?: string
          genDescription?: string | null
          genScript?: string | null
          genShortScripts?: string | null
          genTags?: string | null
          genTitles?: string | null
          id?: number
          pageBody: string
          pageTitle: string
          pageUrl: string
          status?: string | null
        }
        Update: {
          batchId?: number | null
          created_at?: string
          genDescription?: string | null
          genScript?: string | null
          genShortScripts?: string | null
          genTags?: string | null
          genTitles?: string | null
          id?: number
          pageBody?: string
          pageTitle?: string
          pageUrl?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_batchId_fkey"
            columns: ["batchId"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
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
      compute_all_stream_stats: { Args: never; Returns: undefined }
      compute_stream_stats: {
        Args: { target_date: string }
        Returns: undefined
      }
      get_analytics_summary: {
        Args: {
          end_date: string
          filter_browser?: string
          filter_device?: string
          filter_domain?: string
          filter_path?: string
          filter_referrer?: string
          filter_utm_campaign?: string
          filter_utm_content?: string
          filter_utm_medium?: string
          filter_utm_source?: string
          start_date: string
        }
        Returns: Json
      }
      get_dashboard_counts: { Args: never; Returns: Json }
      get_distinct_event_types: {
        Args: never
        Returns: {
          event_type: string
        }[]
      }
      get_user_leaderboard: {
        Args: never
        Returns: {
          cheer_count: number
          cheer_total: number
          event_count: number
          giftsub_count: number
          giftsub_total: number
          last_active: string
          login: string
          message_count: number
          raid_count: number
          raid_total: number
          sub_count: number
        }[]
      }
      grant_badges: {
        Args: { p_profile: string; p_source?: string }
        Returns: number
      }
      streams_watched: { Args: { p_login: string }; Returns: number }
      twitch_first_seen: { Args: { p_login: string }; Returns: string }
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
