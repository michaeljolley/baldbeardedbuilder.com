/*
  Reversal of every v2 migration, for the database that should never have had them.

  DO NOT RUN THIS. Not from the CLI, not from Studio, not from an agent. It is checked
  in so that it exists, is reviewed and is ready. Michael decides when it executes,
  because he owns that database and it is serving the live site while you read this.

  It deliberately lives in supabase/reversal/ and not supabase/migrations/. A file that
  drops the entire v2 schema must never be picked up by `supabase db push`, which is
  about to be pointed at the NEW project. In migrations/ this file would run last and
  delete everything the other fourteen just created. Run it, if it is ever run, by hand
  and against a named target:

    psql "$LEGACY_DB_URL" -f supabase/reversal/20260731000000_remove_v2_from_legacy.sql

  Why it exists
  -------------
  The ruling was "use a brand new database, not the existing ones". Fourteen v2
  migrations went into bvyerlczpakdlfvybkev instead, which is the project serving
  baldbeardedbuilder.com and bbb.dev and holding 24,574 rows of stream history. Two of
  them are not dormant. They are running right now:

    * on_auth_user_created, an after insert trigger on auth.users, fires on real sign
      ins in the project serving the current site.
    * cron job backfill-badges, jobid 2, at 01:30 UTC daily against real streamEvents.

  Everything else is inert: tables nobody writes to, functions nobody calls, and five
  indexes on legacy tables that cost disk and a little insert time and nothing else.

  Is this data loss?
  ------------------
  Measured on 2026-07-31, before this file was written. Every v2 table was empty:

    profiles 0, comments 0, likes 0, disasters 0, reports 0, badge_grants 0,
    video_transcripts 0, and streamUsers.twitch_user_id 0 non null of 1,854 rows.

  So as of that measurement this reverses cleanly and destroys nothing. That may stop
  being true the moment somebody signs in. Re run the check before executing:

    select (select count(*) from public.profiles)  as profiles,
           (select count(*) from public.comments)  as comments,
           (select count(*) from public.likes)     as likes,
           (select count(*) from public.disasters) as disasters,
           (select count(*) from public.reports)   as reports;

  All zero means clean. Anything else means real people are in there and their rows need
  moving to the new project first.

  Order matters, and it is the reason this is one file
  ---------------------------------------------------
  1. Unschedule the cron job first. Dropping backfill_badges while the job is scheduled
     leaves a job that fails nightly into cron.job_run_details forever.
  2. Drop the auth.users trigger before its function. Postgres refuses the reverse, and
     a half applied reversal on auth.users is a broken sign in on the live site.
  3. Drop v2 triggers explicitly before their tables. Dropping the table would take them,
     but being explicit means a partial run leaves nothing firing.
  4. Then views, functions and tables, in dependency order.
  5. Legacy alterations last, so they only happen once everything else has succeeded.

  What this deliberately does NOT do
  ----------------------------------
  It touches nothing from the baseline. Not streamEvents, streamUsers, streams,
  shorturls, drips, analytics_events, analytics_sessions, blogs, videos, ideas, batches,
  productions, domains, replacements, announcements, dripEmails or social_contacts. It
  leaves the compute-daily-stream-stats cron job, jobid 1, alone: that one is legacy and
  should keep running.

  Verifying afterwards
  --------------------
    select count(*) from cron.job where jobname = 'backfill-badges';           -- 0
    select count(*) from pg_trigger where tgname = 'on_auth_user_created';     -- 0
    select count(*) from pg_tables where schemaname = 'public'
      and tablename in ('profiles','comments','likes','reports','disasters',
                        'badges','badge_grants','badge_rules','bans',
                        'notification_prefs','reserved_handles',
                        'video_transcripts');                                  -- 0
    select count(*) from information_schema.columns
     where table_name = 'streamUsers' and column_name = 'twitch_user_id';      -- 0
*/

begin;

-- 1. The scheduled job, first ------------------------------------------------------

/*
  Guarded because cron.unschedule raises rather than returning quietly when the job is
  already gone, and a reversal that fails on a second run is a reversal nobody dares run
  once. Job 1, compute-daily-stream-stats, is legacy and is left alone.
*/
do $$
begin
  if exists (select 1 from cron.job where jobname = 'backfill-badges') then
    perform cron.unschedule('backfill-badges');
  end if;
end $$;

-- 2. The auth.users trigger, before its function -----------------------------------

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 3. Triggers on v2 tables ---------------------------------------------------------

drop trigger if exists comments_grant_badges on public.comments;
drop trigger if exists comments_one_level on public.comments;
drop trigger if exists disasters_grant_badges on public.disasters;
drop trigger if exists disasters_touch on public.disasters;
drop trigger if exists notification_prefs_touch on public.notification_prefs;
drop trigger if exists profiles_touch on public.profiles;
drop trigger if exists reports_hide_comment on public.reports;

-- 4. Views, then functions, then tables ---------------------------------------------

drop view if exists public.badge_shelf;
drop view if exists public.comments_public;
drop view if exists public.comment_counts;
drop view if exists public.like_counts;

drop function if exists public.backfill_badges();
drop function if exists public.badge_progress(uuid);
drop function if exists public.grant_badges(uuid, text);
drop function if exists public.badge_counts(uuid);
drop function if exists public.badges_after_comment();
drop function if exists public.badges_after_disaster();
drop function if exists public.comments_enforce_one_level();
drop function if exists public.reports_auto_hide();
drop function if exists public.touch_updated_at();

/*
  These two read streamEvents and are the only v2 functions that would still return
  something meaningful after the reversal. They go anyway. A function nobody calls,
  reading a table it does not own, is exactly the leftover that gets mistaken for
  legacy code in a year and then preserved out of caution.
*/
drop function if exists public.streams_watched(text);
drop function if exists public.twitch_first_seen(text);

/*
  Cascade on badges and profiles only, because badge_grants and badge_rules reference
  them. Every other table drops plainly, so an unexpected dependency raises rather than
  silently taking something with it.
*/
drop table if exists public.badge_grants;
drop table if exists public.badge_rules;
drop table if exists public.badges cascade;
drop table if exists public.bans;
drop table if exists public.reports;
drop table if exists public.comments;
drop table if exists public.likes;
drop table if exists public.disasters;
drop table if exists public.notification_prefs;
drop table if exists public.reserved_handles;
drop table if exists public.video_transcripts;
drop table if exists public.profiles cascade;

drop type if exists public.like_target;
drop type if exists public.target_kind;

-- 5. Legacy tables, restored to how they were --------------------------------------

/*
  Five indexes on tables the v2 work did not own. They were added to make badge_counts
  fast over 24,574 rows. With them gone nothing in the legacy project is slower than it
  was before, because nothing in the legacy project ever used them.
*/
drop index if exists public.stream_events_login_lower_idx;
drop index if exists public.stream_events_type_login_idx;
drop index if exists public."streamEvents_login_streamDate_idx";
drop index if exists public.stream_users_login_lower_idx;
drop index if exists public.stream_users_twitch_id_idx;

/*
  Last, and the only statement here that could lose something somebody typed.
  twitch_user_id was added by 20260710000900 and measured at 0 non null values, so on an
  untouched database this drops a column of nulls. Confirm again before running:

    select count(twitch_user_id) from public."streamUsers";   -- expect 0
*/
alter table public."streamUsers" drop column if exists twitch_user_id;

commit;
