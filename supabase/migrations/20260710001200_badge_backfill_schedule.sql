/*
  The nightly badge backfill.

  This runs in pg_cron rather than in a Netlify scheduled function for one reason: it needs
  nothing from the site. It reads two tables and writes a third, all of them in this
  database, and routing that through an HTTP function on a different host would add a
  deploy surface, a secret and a failure mode without adding anything.

  Half past one, half an hour after compute-daily-stream-stats, so the stream rollups have
  landed before the badges are counted against them.

  The link callback already grants on the spot, so this is a safety net rather than the
  main path. It catches anybody whose numbers moved after they linked, and anybody whose
  inline grant failed quietly.
*/

select cron.schedule(
  'backfill-badges',
  '30 1 * * *',
  $$ select public.backfill_badges(); $$
);
