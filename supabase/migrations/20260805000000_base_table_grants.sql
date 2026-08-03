/*
  Table and function grants, stated here rather than inherited from the project.

  Every migration before this one creates tables and then goes straight to row level
  security, on the assumption that Supabase's default privileges have already handed the
  three API roles a sensible grant on anything new in public. That assumption is not
  reliable. On the v2 project it produced service_role rows carrying truncate, references
  and trigger and none of select, insert, update or delete, which is every privilege
  except the four that matter. The first symptom was the build dying on

      Could not read published dev disasters: permission denied for table disasters

  and it would have been every other table a second later. A schema whose readability
  depends on a project level setting nobody in this repository controls is a schema that
  works on one project and not the next, so the grants are written down here.

  Two things worth being clear about, because the shape below looks lopsided.

  The first is that a grant and a policy are different locks and this file only turns one
  of them. Row level security decides which rows a role may see. A grant decides whether
  the role may touch the table at all. A table with a perfect policy and no grant raises
  permission denied, and a table with a grant and no policy returns nothing, and the two
  failures read nothing like each other. Everything the earlier migrations say about
  policies still stands untouched.

  The second is that service_role is the only role that gets anything, which is not an
  oversight. Nothing in this site reads or writes public as anon or as authenticated.
  browserClient is exported and never called. serverClient appears six times and every
  one of them is an auth handshake: sign in, sign out, the OAuth callback, the Twitch
  link, and the getUser in middleware. There is not a single .from or .rpc among them.
  Every read and every write, including the profile settings form that the
  profiles_self_update policy was written for, goes through serviceClient.

  So the anon key, which ships in the browser bundle by design and is meant to, is given
  no way to touch public at all. That is strictly better than granting it select and
  trusting row level security to hold, because it means row level security is a second
  lock rather than the only one. If an island is ever added that genuinely reads in the
  browser, this fails loudly on the first request and the grant it needs is one line.
*/

-- Service role, which is what the site actually runs as -----------------------------------

grant usage on schema public to service_role;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

/*
  So the next migration to create a table does not land back here. Default privileges
  attach to the role that sets them, and migrations are applied as postgres, which is the
  same role that creates the tables.
*/
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Two functions the site calls that service_role cannot currently execute ------------------

/*
  Execute on a function is granted to public by default, so revoking from public takes it
  away from every role including service_role unless that role holds a grant of its own.
  The badge engine revoked from public and then granted back to anon and authenticated,
  which is the exact set of roles that never call them, and skipped the one that does.

    badge_progress  src/lib/profiles.ts, drawing the badge shelf on a profile page
    grant_badges    src/pages/auth/link/twitch/callback.ts, granting on the way in

  Both are the same defect as the tables above and would have surfaced one page later.
*/
grant execute on function public.badge_progress(uuid)      to service_role;
grant execute on function public.grant_badges(uuid, text)  to service_role;

-- Taking back what was granted to roles that never call it --------------------------------

/*
  This hunk is the only one that removes anything, so it is the one to argue with.

  badge_progress and badge_counts are both security definer and neither checks whether the
  profile it is asked about is private or deleted, which is correct for a server that has
  already decided the page may render. Reachable by anon over the REST RPC endpoint it is
  something else: anybody holding the public key, which is everybody, can ask for badge
  data on any profile id including one whose owner set their profile to private.

  Nothing calls either from a browser, so this costs nothing to close.
*/
revoke execute on function public.badge_progress(uuid) from anon, authenticated;
revoke execute on function public.badge_counts(uuid)   from anon, authenticated;

/*
  And the tables. On a project whose default privileges did fire, anon and authenticated
  hold select, insert, update and delete on all sixteen tables, with nothing but row level
  security between the published key and the data. Since nothing reads as either role, the
  grant is surface with no function attached to it.

  The four views are already revoked from anon and authenticated by earlier migrations and
  are covered again here, which is harmless and means this file describes the whole
  position rather than half of it.
*/
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

/*
  Schema usage stays. Revoking it would break PostgREST's ability to resolve names for a
  signed in visitor during the auth handshake, and it buys nothing once every object in
  the schema is unreadable anyway.
*/
grant usage on schema public to anon, authenticated;

-- Make PostgREST notice --------------------------------------------------------------------

notify pgrst, 'reload schema';
